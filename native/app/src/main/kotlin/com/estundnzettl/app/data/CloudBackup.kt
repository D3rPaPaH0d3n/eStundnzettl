package com.estundnzettl.app.data

import android.content.Context
import android.util.Log
import com.estundnzettl.core.backup.BackupSections
import java.io.File
import java.time.Instant
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Nextcloud-Verbindungsverwaltung — Port von nextcloudSecret.ts +
 * useNextcloudBackup-Persistenz. Credentials: URL/User in den Settings
 * (wie die TS-App), App-Passwort in [SecretStore].
 */
class NextcloudManager(
    private val settings: SettingsRepository,
    private val secrets: SecretStore,
) {

    data class Credentials(val url: String, val user: String, val appPassword: String)

    /** Verbunden = URL + User + Passwort vorhanden UND Toggle aktiv. */
    suspend fun isConnected(): Boolean = getCredentials() != null

    /**
     * Credentials laden; migriert dabei einmalig das Legacy-Passwort
     * ("nextcloud_pass" + "crypto_mk_v1" aus der importierten DB) in den
     * SecretStore, falls der neue Speicher noch leer ist.
     */
    suspend fun getCredentials(): Credentials? {
        val url = settings.getString(SettingsRepository.Keys.NEXTCLOUD_URL) ?: return null
        val user = settings.getString(SettingsRepository.Keys.NEXTCLOUD_USER) ?: return null
        if (url.isEmpty() || user.isEmpty()) return null

        var pass = secrets.get(SecretStore.NEXTCLOUD_SECRET_KEY)
        if (pass.isNullOrEmpty()) {
            val legacyRaw = settings.getString("nextcloud_pass")
            if (!legacyRaw.isNullOrEmpty()) {
                val masterKey = settings.getString("crypto_mk_v1")
                val decrypted = secrets.deobfuscateLegacy(legacyRaw, masterKey)
                if (decrypted.isNotEmpty()) {
                    secrets.set(SecretStore.NEXTCLOUD_SECRET_KEY, decrypted)
                    pass = decrypted
                }
            }
        }
        if (pass.isNullOrEmpty()) return null
        return Credentials(url, user, pass)
    }

    suspend fun persistLogin(server: String, loginName: String, appPassword: String) {
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_URL, server)
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_USER, loginName)
        secrets.set(SecretStore.NEXTCLOUD_SECRET_KEY, appPassword)
        settings.setBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED, true)
    }

    suspend fun disconnect() {
        settings.setBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED, false)
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_URL, "")
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_USER, "")
        secrets.delete(SecretStore.NEXTCLOUD_SECRET_KEY)
        settings.setString(AutoBackupManager.KEY_NC_FAIL_COUNT, "0")
        settings.setString(AutoBackupManager.KEY_NC_LAST_ERROR, "")
        settings.setString(AutoBackupManager.KEY_NC_BACKOFF_UNTIL, "")
    }
}

/**
 * Automatischer Hintergrund-Sync — Port von useAutoBackup.ts.
 * Ziele: lokaler App-Ordner (wie Directory.Data der Capacitor-App) und
 * Nextcloud. Google Drive folgt mit der GDrive-Anbindung; solange der
 * Toggle aus der Migration aktiv ist, wird das Ziel still übersprungen.
 */
class AutoBackupManager(
    private val context: Context,
    private val settings: SettingsRepository,
    private val backupRepo: BackupRepository,
    private val nextcloud: NextcloudManager,
    private val googleDrive: GoogleDriveManager? = null,
) {

    companion object {
        private const val TAG = "AutoBackup"
        const val KEY_CLOUD_FAIL_COUNT = "backup_fail_count"
        const val KEY_CLOUD_LAST_ERROR = "backup_last_error"
        const val KEY_CLOUD_BACKOFF_UNTIL = "backup_backoff_until"
        const val KEY_NC_FAIL_COUNT = "nextcloud_backup_fail_count"
        const val KEY_NC_LAST_ERROR = "nextcloud_backup_last_error"
        const val KEY_NC_BACKOFF_UNTIL = "nextcloud_backoff_until"
        const val KEY_LAST_BACKUP = "last_backup"

        /** 2/4/8/16/30-min-Backoff wie calculateBackoffDelay. */
        fun backoffDelayMs(failCount: Int): Long {
            if (failCount <= 0) return 0
            val ms = Math.pow(2.0, failCount.toDouble()).toLong() * 60_000
            return minOf(ms, 30 * 60_000L)
        }
    }

    enum class Source { AUTO, BACKGROUND, MANUAL }

    data class Outcome(val ran: Boolean, val anySucceeded: Boolean = false, val allSatisfied: Boolean = false)

    private val isUploading = AtomicBoolean(false)
    private var lastHash: String = ""

    private suspend fun isBackoffActive(key: String): Boolean {
        val iso = settings.getString(key) ?: return false
        if (iso.isEmpty()) return false
        return try {
            Instant.parse(iso).isAfter(Instant.now())
        } catch (_: Exception) {
            false
        }
    }

    /** djb2 über die Sektions-Daten (App-intern stabil; steuert nur den Skip). */
    private fun hashSections(sections: BackupSections): String {
        val str = buildString {
            append(sections.user?.toString())
            append(sections.entries.toString())
            append(sections.workCodes.toString())
            append(sections.attachments.toString())
            append(sections.attachmentLabels.toString())
            append(sections.calculationConfig?.toString())
            append(sections.locale)
            append(sections.theme)
        }
        var hash = 5381
        for (ch in str) hash = (hash shl 5) + hash + ch.code
        return hash.toString()
    }

    private suspend fun registerCloudFailure(message: String) {
        val count = (settings.getString(KEY_CLOUD_FAIL_COUNT)?.toIntOrNull() ?: 0) + 1
        settings.setString(KEY_CLOUD_FAIL_COUNT, count.toString())
        settings.setString(KEY_CLOUD_LAST_ERROR, message)
        settings.setString(
            KEY_CLOUD_BACKOFF_UNTIL,
            Instant.ofEpochMilli(System.currentTimeMillis() + backoffDelayMs(count)).toString(),
        )
    }

    private suspend fun clearCloudErrorState() {
        settings.setString(KEY_CLOUD_FAIL_COUNT, "0")
        settings.setString(KEY_CLOUD_LAST_ERROR, "")
        settings.setString(KEY_CLOUD_BACKOFF_UNTIL, "")
    }

    private suspend fun registerNextcloudFailure(message: String) {
        val count = (settings.getString(KEY_NC_FAIL_COUNT)?.toIntOrNull() ?: 0) + 1
        settings.setString(KEY_NC_FAIL_COUNT, count.toString())
        settings.setString(KEY_NC_LAST_ERROR, message)
        settings.setString(
            KEY_NC_BACKOFF_UNTIL,
            Instant.ofEpochMilli(System.currentTimeMillis() + backoffDelayMs(count)).toString(),
        )
    }

    private suspend fun clearNextcloudErrorState() {
        settings.setString(KEY_NC_FAIL_COUNT, "0")
        settings.setString(KEY_NC_LAST_ERROR, "")
        settings.setString(KEY_NC_BACKOFF_UNTIL, "")
    }

    /** Lokales Backup — wie writeBackupFile (Directory.Data/eStundnzettl/). */
    private fun writeLocalBackup(content: String) {
        val dir = File(context.filesDir, NextcloudClient.BACKUP_FOLDER).apply { mkdirs() }
        File(dir, NextcloudClient.BACKUP_FILENAME).writeText(content)
    }

    suspend fun performBackup(source: Source): Outcome {
        val cloudActive = settings.getBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED)
        val localActive = settings.getBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED)
        val ncActive = settings.getBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED)

        if (!cloudActive && !localActive && !ncActive) return Outcome(ran = false)

        val ignoreBackoff = source == Source.MANUAL
        val cloudBlocked = cloudActive && !ignoreBackoff && isBackoffActive(KEY_CLOUD_BACKOFF_UNTIL)
        val ncBlocked = ncActive && !ignoreBackoff && isBackoffActive(KEY_NC_BACKOFF_UNTIL)
        val anyRunnable = localActive || (cloudActive && !cloudBlocked) || (ncActive && !ncBlocked)
        if (!anyRunnable) return Outcome(ran = false)

        if (!isUploading.compareAndSet(false, true)) return Outcome(ran = false)
        try {
            val sections = backupRepo.collectSections()
            if (sections.entries.isEmpty()) return Outcome(ran = false)

            val currentHash = hashSections(sections)
            if (currentHash == lastHash && source == Source.AUTO) return Outcome(ran = false)

            val payload = backupRepo.createBackupPayload(note = "eStundnzettl Auto-Sync")
            val content = backupRepo.toFileContent(payload)

            var anySucceeded = false
            var allSatisfied = true

            if (localActive) {
                try {
                    writeLocalBackup(content)
                    anySucceeded = true
                } catch (e: Exception) {
                    allSatisfied = false
                    Log.w(TAG, "Lokales Backup fehlgeschlagen: ${e.message}")
                }
            }

            if (cloudActive) {
                if (cloudBlocked || googleDrive == null) {
                    allSatisfied = false
                } else {
                    try {
                        // Stille Autorisierung — wenn Zustimmung nötig wäre,
                        // wirft authorize AuthRequiredException (wie das
                        // AUTH_REQUIRED der TS-App).
                        val token = googleDrive.authorize(GoogleDriveManager.SCOPE_APPDATA)
                        googleDrive.uploadOrUpdateBackup(token, NextcloudClient.BACKUP_FILENAME, content)
                        anySucceeded = true
                        clearCloudErrorState()
                    } catch (e: Exception) {
                        allSatisfied = false
                        val message = if (e is GoogleDriveManager.AuthRequiredException) {
                            "Google Drive Anmeldung erforderlich"
                        } else {
                            e.message ?: "Cloud-Backup fehlgeschlagen"
                        }
                        registerCloudFailure(message)
                        Log.w(TAG, "Cloud-Backup fehlgeschlagen: $message")
                    }
                }
            }

            if (ncActive) {
                if (ncBlocked) {
                    allSatisfied = false
                } else {
                    try {
                        val creds = nextcloud.getCredentials()
                        if (creds != null) {
                            NextcloudClient.uploadBackup(creds.url, creds.user, creds.appPassword, content)
                            anySucceeded = true
                            clearNextcloudErrorState()
                        } else {
                            allSatisfied = false
                        }
                    } catch (e: Exception) {
                        allSatisfied = false
                        registerNextcloudFailure(e.message ?: "Nextcloud-Backup fehlgeschlagen")
                        Log.w(TAG, "Nextcloud-Backup fehlgeschlagen: ${e.message}")
                    }
                }
            }

            if (anySucceeded) {
                settings.setString(KEY_LAST_BACKUP, Instant.now().toString())
            }
            if (anySucceeded && allSatisfied) {
                lastHash = currentHash
            }

            return Outcome(ran = true, anySucceeded = anySucceeded, allSatisfied = allSatisfied)
        } catch (e: Exception) {
            Log.w(TAG, "Backup übersprungen: ${e.message}")
            return Outcome(ran = true, anySucceeded = false, allSatisfied = false)
        } finally {
            isUploading.set(false)
        }
    }
}
