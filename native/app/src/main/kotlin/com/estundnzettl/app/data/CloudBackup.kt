package com.estundnzettl.app.data

import android.content.Context
import android.util.Log
import com.estundnzettl.core.backup.BackupSections
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.net.SocketException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.cert.CertificateException
import java.time.Instant
import java.time.LocalDate
import javax.net.ssl.SSLException
import javax.net.ssl.SSLPeerUnverifiedException
import kotlin.coroutines.cancellation.CancellationException

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
                if (decrypted.isNotEmpty() && secrets.set(SecretStore.NEXTCLOUD_SECRET_KEY, decrypted)) {
                    clearLegacySecretMaterial()
                    pass = decrypted
                }
            }
        }
        if (pass.isNullOrEmpty()) return null
        return Credentials(url, user, pass)
    }

    /**
     * The app password is stored before the server address. A failed write
     * must not leave a new server paired with an older password.
     */
    suspend fun persistLogin(server: String, loginName: String, appPassword: String): Boolean {
        if (!secrets.set(SecretStore.NEXTCLOUD_SECRET_KEY, appPassword)) return false
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_URL, server)
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_USER, loginName)
        settings.setBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED, true)
        clearLegacySecretMaterial()
        return true
    }

    suspend fun disconnect() {
        settings.setBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED, false)
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_URL, "")
        settings.setString(SettingsRepository.Keys.NEXTCLOUD_USER, "")
        secrets.delete(SecretStore.NEXTCLOUD_SECRET_KEY)
        clearLegacySecretMaterial()
        settings.setString(AutoBackupManager.KEY_NC_FAIL_COUNT, "0")
        settings.setString(AutoBackupManager.KEY_NC_LAST_ERROR, "")
        settings.setString(AutoBackupManager.KEY_NC_BACKOFF_UNTIL, "")
    }

    private suspend fun clearLegacySecretMaterial() {
        settings.delete("nextcloud_pass")
        settings.delete("crypto_mk_v1")
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
    /**
     * A cloud upload that loses its network because the app left the
     * foreground is not a broken target; it waits for the next foreground run.
     */
    private val visibility: AppVisibility,
) {

    companion object {
        private const val TAG = "AutoBackup"
        const val KEY_CLOUD_FAIL_COUNT = "backup_fail_count"
        const val KEY_CLOUD_LAST_ERROR = "backup_last_error"
        const val KEY_CLOUD_BACKOFF_UNTIL = "backup_backoff_until"
        const val KEY_CLOUD_LAST_SUCCESS = "backup_google_drive_last_success"
        const val KEY_CLOUD_WARNING_SHOWN = "backup_google_drive_warning_shown"
        const val KEY_NC_FAIL_COUNT = "nextcloud_backup_fail_count"
        const val KEY_NC_LAST_ERROR = "nextcloud_backup_last_error"
        const val KEY_NC_BACKOFF_UNTIL = "nextcloud_backoff_until"
        const val KEY_NC_LAST_SUCCESS = "backup_nextcloud_last_success"
        const val KEY_LOCAL_LAST_SUCCESS = "backup_local_last_success"
        const val KEY_LAST_BACKUP = "last_backup"

        /** 2/4/8/16/30-min-Backoff wie calculateBackoffDelay. */
        fun backoffDelayMs(failCount: Int): Long {
            if (failCount <= 0) return 0
            val ms = Math.pow(2.0, failCount.toDouble()).toLong() * 60_000
            return minOf(ms, 30 * 60_000L)
        }
    }

    enum class Source { AUTO, BACKGROUND, MANUAL }

    enum class Target { GOOGLE_DRIVE, NEXTCLOUD, LOCAL }

    data class Outcome(
        val ran: Boolean,
        val anySucceeded: Boolean = false,
        val allSatisfied: Boolean = false,
        val succeededTargets: Set<Target> = emptySet(),
        val failedTargets: Set<Target> = emptySet(),
        /**
         * Übersprungen, weil es keine Einträge zu sichern gab. Kein Fehler —
         * die UI meldet das wie die Web-App als "Keine Daten zum Sichern".
         */
        val skippedEmpty: Boolean = false,
        /**
         * Cloud targets that had no network while the app was in the
         * background. Not a failure: they stay pending and run again on
         * the next foreground backup.
         */
        val deferredTargets: Set<Target> = emptySet(),
    ) {
        val isPartial: Boolean get() = anySucceeded && !allSatisfied
    }

    /** Runs wait for each other instead of being dropped while one uploads. */
    private val backupLock = Mutex()

    /**
     * Per target: destination + data hash of the last successful upload in
     * this process. A target that already holds the current state is not
     * uploaded again by automatic runs.
     */
    private val uploadedStates = HashMap<Target, String>()
    private val localFolder = LocalBackupFolder(context, settings)

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

    internal suspend fun registerGoogleDriveFailure(message: String, requiresReconnect: Boolean = false) {
        val count = (settings.getString(KEY_CLOUD_FAIL_COUNT)?.toIntOrNull() ?: 0) + 1
        settings.setString(KEY_CLOUD_FAIL_COUNT, count.toString())
        settings.setString(KEY_CLOUD_LAST_ERROR, message)
        settings.setString(
            KEY_CLOUD_BACKOFF_UNTIL,
            Instant.ofEpochMilli(System.currentTimeMillis() + backoffDelayMs(count)).toString(),
        )
        if (requiresReconnect) {
            settings.setBoolean(GoogleDriveManager.KEY_BACKUP_RECONNECT_REQUIRED, true)
        }
    }

    internal suspend fun clearGoogleDriveErrorState() {
        settings.setString(KEY_CLOUD_FAIL_COUNT, "0")
        settings.setString(KEY_CLOUD_LAST_ERROR, "")
        settings.setString(KEY_CLOUD_BACKOFF_UNTIL, "")
        settings.setBoolean(KEY_CLOUD_WARNING_SHOWN, false)
        settings.setBoolean(GoogleDriveManager.KEY_BACKUP_RECONNECT_REQUIRED, false)
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

    internal suspend fun clearNextcloudErrorState() {
        settings.setString(KEY_NC_FAIL_COUNT, "0")
        settings.setString(KEY_NC_LAST_ERROR, "")
        settings.setString(KEY_NC_BACKOFF_UNTIL, "")
    }

    /**
     * Writes the chosen folder when one is persisted, and always keeps
     * the private app copy. A chosen folder that cannot be written fails
     * the local target.
     */
    private suspend fun writeLocalBackup(content: String) {
        val folderOk = if (localFolder.hasPersistedTree()) localFolder.writeText(content) else true
        writeInternalBackup(content)
        if (!folderOk) error("Chosen backup folder could not be written")
    }

    /** Private copy — Directory.Data/eStundnzettl of the previous app. */
    private fun writeInternalBackup(content: String) {
        val dir = File(context.filesDir, NextcloudClient.BACKUP_FOLDER).apply { mkdirs() }
        val target = File(dir, NextcloudClient.BACKUP_FILENAME)
        val temp = File(dir, ".${NextcloudClient.BACKUP_FILENAME}.tmp")
        temp.writeText(content)
        try {
            Files.move(
                temp.toPath(), target.toPath(),
                StandardCopyOption.REPLACE_EXISTING,
                StandardCopyOption.ATOMIC_MOVE,
            )
        } catch (_: Exception) {
            Files.move(temp.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }

        val dated = File(dir, "estundnzettl_backup_${LocalDate.now()}.json")
        if (!dated.exists()) target.copyTo(dated)
        dir.listFiles { file ->
            file.name.startsWith("estundnzettl_backup_") && file.name.endsWith(".json")
        }?.sortedByDescending { it.name }?.drop(7)?.forEach { it.delete() }
    }

    suspend fun performBackup(source: Source): Outcome = backupLock.withLock { runBackup(source) }

    private suspend fun runBackup(source: Source): Outcome {
        val cloudActive = settings.getBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED)
        val localActive = settings.getBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED)
        val ncActive = settings.getBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED)

        if (!cloudActive && !localActive && !ncActive) return Outcome(ran = false)

        val ignoreBackoff = source == Source.MANUAL
        val cloudBlocked = cloudActive && !ignoreBackoff && isBackoffActive(KEY_CLOUD_BACKOFF_UNTIL)
        val ncBlocked = ncActive && !ignoreBackoff && isBackoffActive(KEY_NC_BACKOFF_UNTIL)
        val anyRunnable = localActive || (cloudActive && !cloudBlocked) || (ncActive && !ncBlocked)
        if (!anyRunnable) return Outcome(ran = false)

        try {
            val sections = backupRepo.collectSections()
            // Ein leerer Datenstand darf ein vollständiges Backup niemals
            // überschreiben — etwa direkt nach der Installation oder wenn
            // ein Restore die Einträge (noch) nicht eingespielt hat.
            // Entspricht den Guards in useAutoBackup.ts.
            if (sections.entries.isEmpty()) return Outcome(ran = false, skippedEmpty = true)

            // Ziel + Datenstand: ein neu verbundenes Konto oder ein anderer
            // Ordner zählt als neues Ziel und bekommt sofort eine Kopie.
            val dataHash = hashSections(sections)
            val ncCreds = if (ncActive && !ncBlocked) nextcloud.getCredentials() else null
            val localState = "${settings.getString(LocalBackupFolder.KEY_TREE_URI).orEmpty()}|$dataHash"
            val driveState = "${settings.getString(GoogleDriveManager.KEY_ACCOUNT_EMAIL).orEmpty()}|$dataHash"
            val ncState = "${ncCreds?.url}|${ncCreds?.user}|$dataHash"
            // Ein gemeldeter Fehler (auch aus "Verbindung prüfen") bleibt nur
            // stehen, bis der nächste Lauf das Ziel erneut versucht.
            val driveHasError = (settings.getString(KEY_CLOUD_FAIL_COUNT)?.toIntOrNull() ?: 0) > 0
            val ncHasError = (settings.getString(KEY_NC_FAIL_COUNT)?.toIntOrNull() ?: 0) > 0
            fun needsRun(target: Target, state: String, hasError: Boolean = false) =
                source == Source.MANUAL || hasError || uploadedStates[target] != state
            val runLocal = localActive && needsRun(Target.LOCAL, localState)
            val runCloud = cloudActive && needsRun(Target.GOOGLE_DRIVE, driveState, driveHasError)
            val runNc = ncActive && needsRun(Target.NEXTCLOUD, ncState, ncHasError)
            if (!runLocal && !runCloud && !runNc) return Outcome(ran = false)

            // Exakt den geprüften Stand hochladen, nicht neu einlesen.
            val payload = backupRepo.createBackupPayload(
                note = "eStundnzettl Auto-Sync",
                sections = sections,
            )
            val content = backupRepo.toFileContent(payload)

            var anySucceeded = false
            var allSatisfied = true
            val succeededTargets = linkedSetOf<Target>()
            val failedTargets = linkedSetOf<Target>()
            val deferredTargets = linkedSetOf<Target>()

            // War die App während des Laufs im Hintergrund, heißt ein
            // Netzwerkfehler "kein Netz für die App", nicht "Ziel kaputt" —
            // kein Fehlerzähler, kein Backoff.
            val backgroundEntriesAtStart = visibility.backgroundEntries
            fun deferInsteadOfFailing(error: Exception): Boolean {
                val leftForeground = !visibility.isForeground ||
                    visibility.backgroundEntries != backgroundEntriesAtStart
                return source != Source.MANUAL && leftForeground && isConnectivityFailure(error)
            }

            if (runLocal) {
                try {
                    writeLocalBackup(content)
                    anySucceeded = true
                    succeededTargets += Target.LOCAL
                    uploadedStates[Target.LOCAL] = localState
                    settings.setString(KEY_LOCAL_LAST_SUCCESS, Instant.now().toString())
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    allSatisfied = false
                    failedTargets += Target.LOCAL
                    Log.w(TAG, "Lokales Backup fehlgeschlagen: ${e.message}")
                }
            }

            if (runCloud) {
                if (cloudBlocked || googleDrive == null) {
                    allSatisfied = false
                    failedTargets += Target.GOOGLE_DRIVE
                } else {
                    try {
                        // Stille Autorisierung — wenn Zustimmung nötig wäre,
                        // wirft authorize AuthRequiredException (wie das
                        // AUTH_REQUIRED der TS-App).
                        val token = googleDrive.authorize(GoogleDriveManager.SCOPE_APPDATA)
                        googleDrive.uploadOrUpdateBackup(token, NextcloudClient.BACKUP_FILENAME, content)
                        anySucceeded = true
                        succeededTargets += Target.GOOGLE_DRIVE
                        uploadedStates[Target.GOOGLE_DRIVE] = driveState
                        settings.setString(KEY_CLOUD_LAST_SUCCESS, Instant.now().toString())
                        clearGoogleDriveErrorState()
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        allSatisfied = false
                        if (deferInsteadOfFailing(e)) {
                            deferredTargets += Target.GOOGLE_DRIVE
                            Log.i(TAG, "Cloud-Backup im Hintergrund ohne Netz, folgt später: ${e.message}")
                        } else {
                            failedTargets += Target.GOOGLE_DRIVE
                            val message = if (e is GoogleDriveManager.AuthRequiredException) {
                                "Google Drive Anmeldung erforderlich"
                            } else {
                                e.message ?: "Cloud-Backup fehlgeschlagen"
                            }
                            registerGoogleDriveFailure(
                                message,
                                requiresReconnect = googleDriveFailureNeedsReconnect(e),
                            )
                            Log.w(TAG, "Cloud-Backup fehlgeschlagen: $message")
                        }
                    }
                }
            }

            if (runNc) {
                if (ncBlocked) {
                    allSatisfied = false
                } else if (ncCreds == null) {
                    allSatisfied = false
                    failedTargets += Target.NEXTCLOUD
                    registerNextcloudFailure("Nextcloud-Verbindung nicht vollständig")
                } else {
                    try {
                        NextcloudClient.uploadBackup(ncCreds.url, ncCreds.user, ncCreds.appPassword, content)
                        anySucceeded = true
                        succeededTargets += Target.NEXTCLOUD
                        uploadedStates[Target.NEXTCLOUD] = ncState
                        settings.setString(KEY_NC_LAST_SUCCESS, Instant.now().toString())
                        clearNextcloudErrorState()
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        allSatisfied = false
                        if (deferInsteadOfFailing(e)) {
                            deferredTargets += Target.NEXTCLOUD
                            Log.i(TAG, "Nextcloud-Backup im Hintergrund ohne Netz, folgt später: ${e.message}")
                        } else {
                            failedTargets += Target.NEXTCLOUD
                            registerNextcloudFailure(e.message ?: "Nextcloud-Backup fehlgeschlagen")
                            Log.w(TAG, "Nextcloud-Backup fehlgeschlagen: ${e.message}")
                        }
                    }
                }
            }

            if (anySucceeded) {
                settings.setString(KEY_LAST_BACKUP, Instant.now().toString())
            }

            return Outcome(
                ran = true,
                anySucceeded = anySucceeded,
                allSatisfied = allSatisfied,
                succeededTargets = succeededTargets,
                failedTargets = failedTargets,
                deferredTargets = deferredTargets,
            )
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "Backup übersprungen: ${e.message}")
            return Outcome(ran = true, anySucceeded = false, allSatisfied = false)
        }
    }
}

internal fun googleDriveFailureNeedsReconnect(error: Throwable): Boolean =
    error is GoogleDriveManager.AuthRequiredException ||
        (error is GoogleDriveManager.DriveApiException && error.statusCode == 401)

/**
 * True for transport errors without a server answer: DNS, connect, socket
 * and aborted TLS connections. Android reports an app whose network was cut
 * in the background as "Unable to resolve host", a cut TLS connection as an
 * SSLException without cause. Certificate errors are not included; they
 * point at a misconfigured server.
 */
internal fun isConnectivityFailure(error: Throwable): Boolean {
    val chain = generateSequence(error) { it.cause }.take(8).toList()
    if (chain.any { it is CertificateException || it is SSLPeerUnverifiedException }) return false
    return chain.any { cause ->
        cause is UnknownHostException ||
            cause is SocketException ||
            cause is SocketTimeoutException ||
            cause is SSLException ||
            (cause is ApiException && cause.statusCode == CommonStatusCodes.NETWORK_ERROR)
    }
}
