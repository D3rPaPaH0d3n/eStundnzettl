package com.estundnzettl.app.data

import android.content.Context
import android.util.Log
import com.estundnzettl.core.backup.BackupSections
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import java.io.File
import java.net.SocketException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.util.concurrent.atomic.AtomicBoolean
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
        settings.setString(AutoBackupManager.KEY_NC_UPLOADED_HASH, "")
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
        settings.setString(AutoBackupManager.KEY_NC_UPLOADED_HASH, "")
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
) {

    companion object {
        private const val TAG = "AutoBackup"
        const val KEY_CLOUD_FAIL_COUNT = "backup_fail_count"
        const val KEY_CLOUD_LAST_ERROR = "backup_last_error"
        /** [GoogleDriveErrorKind]-Name zum letzten Fehler; leer = unbekannt. */
        const val KEY_CLOUD_LAST_ERROR_KIND = "backup_last_error_kind"
        const val KEY_CLOUD_BACKOFF_UNTIL = "backup_backoff_until"
        const val KEY_CLOUD_LAST_SUCCESS = "backup_google_drive_last_success"
        const val KEY_CLOUD_WARNING_SHOWN = "backup_google_drive_warning_shown"
        const val KEY_NC_FAIL_COUNT = "nextcloud_backup_fail_count"
        const val KEY_NC_LAST_ERROR = "nextcloud_backup_last_error"
        const val KEY_NC_BACKOFF_UNTIL = "nextcloud_backoff_until"
        const val KEY_NC_LAST_SUCCESS = "backup_nextcloud_last_success"
        const val KEY_LOCAL_LAST_SUCCESS = "backup_local_last_success"
        const val KEY_LAST_BACKUP = "last_backup"
        /** Stand ([hashSections]), den das Ziel zuletzt erfolgreich bekommen hat. */
        const val KEY_CLOUD_UPLOADED_HASH = "backup_google_drive_uploaded_hash"
        const val KEY_NC_UPLOADED_HASH = "backup_nextcloud_uploaded_hash"

        val ALL_TARGETS: Set<Target> = Target.entries.toSet()
        val CLOUD_TARGETS: Set<Target> = setOf(Target.GOOGLE_DRIVE, Target.NEXTCLOUD)

        /**
         * Solange ein Ziel in dieser Frist zuletzt erfolgreich war, gilt ein
         * Verbindungsfehler nicht als Fehler, sondern wird nachgeholt.
         */
        val CONNECTIVITY_GRACE: Duration = Duration.ofHours(24)

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
         * Nur mangels Verbindung gescheitert (Funkloch, oder Android sperrt
         * das Netz) — wird über [CloudBackupWorker] nachgeholt und zählt
         * nicht als Fehler. Teilmenge von [failedTargets].
         */
        val deferredTargets: Set<Target> = emptySet(),
        /** Ein anderer Lauf sicherte gerade. */
        val busy: Boolean = false,
        /** Gesicherter Stand, sofern die Daten gelesen wurden. */
        val contentHash: String? = null,
    ) {
        val isPartial: Boolean get() = anySucceeded && !allSatisfied
    }

    private val isUploading = AtomicBoolean(false)
    private var lastHash: String = ""
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
            // Welche Dokument-Dateien drin sind (Inhalt hängt fest an der Id):
            // so läuft nach dem Update auch das erste Backup mit Dateien
            append(sections.attachmentFiles.keys.sorted().toString())
            append(sections.calculationConfig?.toString())
            append(sections.locale)
            append(sections.theme)
        }
        var hash = 5381
        for (ch in str) hash = (hash shl 5) + hash + ch.code
        return hash.toString()
    }

    internal suspend fun registerGoogleDriveFailure(
        message: String,
        requiresReconnect: Boolean = false,
        kind: GoogleDriveErrorKind? = null,
    ) {
        val count = (settings.getString(KEY_CLOUD_FAIL_COUNT)?.toIntOrNull() ?: 0) + 1
        settings.setString(KEY_CLOUD_FAIL_COUNT, count.toString())
        settings.setString(KEY_CLOUD_LAST_ERROR, message)
        settings.setString(KEY_CLOUD_LAST_ERROR_KIND, kind?.name.orEmpty())
        settings.setString(
            KEY_CLOUD_BACKOFF_UNTIL,
            Instant.ofEpochMilli(System.currentTimeMillis() + backoffDelayMs(count)).toString(),
        )
        if (requiresReconnect) {
            settings.setBoolean(GoogleDriveManager.KEY_BACKUP_RECONNECT_REQUIRED, true)
        }
    }

    /**
     * Fehlgeschlagene Anmeldung festhalten, damit Einstellungen und Diagnose
     * die Ursache zeigen — ohne Zähler und Backoff, denn es lief kein Backup.
     */
    internal suspend fun recordGoogleDriveError(error: GoogleDriveError) {
        settings.setString(KEY_CLOUD_LAST_ERROR, error.detail)
        settings.setString(KEY_CLOUD_LAST_ERROR_KIND, error.kind.name)
    }

    internal suspend fun clearGoogleDriveErrorState() {
        settings.setString(KEY_CLOUD_FAIL_COUNT, "0")
        settings.setString(KEY_CLOUD_LAST_ERROR, "")
        settings.setString(KEY_CLOUD_LAST_ERROR_KIND, "")
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

    private suspend fun clearNextcloudErrorState() {
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

    /**
     * Sichert auf [targets] (nur die aktivierten). Der Hintergrund-Lauf
     * ([Source.BACKGROUND], aus [CloudBackupWorker]) überspringt Ziele, die
     * diesen Stand schon haben.
     */
    suspend fun performBackup(source: Source, targets: Set<Target> = ALL_TARGETS): Outcome {
        val cloudActive = Target.GOOGLE_DRIVE in targets &&
            settings.getBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED)
        val localActive = Target.LOCAL in targets &&
            settings.getBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED)
        val ncActive = Target.NEXTCLOUD in targets &&
            settings.getBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED)

        if (!cloudActive && !localActive && !ncActive) return Outcome(ran = false)

        val ignoreBackoff = source == Source.MANUAL
        val cloudBlocked = cloudActive && !ignoreBackoff && isBackoffActive(KEY_CLOUD_BACKOFF_UNTIL)
        val ncBlocked = ncActive && !ignoreBackoff && isBackoffActive(KEY_NC_BACKOFF_UNTIL)
        val anyRunnable = localActive || (cloudActive && !cloudBlocked) || (ncActive && !ncBlocked)
        if (!anyRunnable) return Outcome(ran = false)

        if (!isUploading.compareAndSet(false, true)) return Outcome(ran = false, busy = true)
        try {
            val sections = backupRepo.collectSections()
            // Ein leerer Datenstand darf ein vollständiges Backup niemals
            // überschreiben — etwa direkt nach der Installation oder wenn
            // ein Restore die Einträge (noch) nicht eingespielt hat.
            // Entspricht den Guards in useAutoBackup.ts.
            if (sections.entries.isEmpty()) return Outcome(ran = false, skippedEmpty = true)

            val currentHash = hashSections(sections)
            if (currentHash == lastHash && source == Source.AUTO) {
                return Outcome(ran = false, contentHash = currentHash)
            }

            val skipUnchanged = source == Source.BACKGROUND
            val uploadDrive = cloudActive &&
                !(skipUnchanged && settings.getString(KEY_CLOUD_UPLOADED_HASH) == currentHash)
            val uploadNc = ncActive &&
                !(skipUnchanged && settings.getString(KEY_NC_UPLOADED_HASH) == currentHash)
            if (!localActive && !uploadDrive && !uploadNc) {
                return Outcome(ran = false, contentHash = currentHash)
            }

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

            if (localActive) {
                try {
                    writeLocalBackup(content)
                    anySucceeded = true
                    succeededTargets += Target.LOCAL
                    settings.setString(KEY_LOCAL_LAST_SUCCESS, Instant.now().toString())
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    allSatisfied = false
                    failedTargets += Target.LOCAL
                    Log.w(TAG, "Lokales Backup fehlgeschlagen: ${e.message}")
                }
            }

            if (uploadDrive) {
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
                        settings.setString(KEY_CLOUD_LAST_SUCCESS, Instant.now().toString())
                        clearGoogleDriveErrorState()
                        settings.setString(KEY_CLOUD_UPLOADED_HASH, currentHash)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        allSatisfied = false
                        failedTargets += Target.GOOGLE_DRIVE
                        if (shouldDeferBackupFailure(e, lastSuccessOf(KEY_CLOUD_LAST_SUCCESS), Instant.now())) {
                            deferredTargets += Target.GOOGLE_DRIVE
                            Log.i(TAG, "Google Drive nicht erreichbar, wird nachgeholt: ${e.javaClass.simpleName}")
                        } else {
                            val error = describeGoogleDriveError(e)
                            registerGoogleDriveFailure(
                                error.detail,
                                requiresReconnect = googleDriveFailureNeedsReconnect(e),
                                kind = error.kind,
                            )
                            Log.w(TAG, "Cloud-Backup fehlgeschlagen: ${error.kind} – ${error.detail}")
                        }
                    }
                }
            }

            if (uploadNc) {
                if (ncBlocked) {
                    allSatisfied = false
                } else {
                    try {
                        val creds = nextcloud.getCredentials()
                        if (creds != null) {
                            NextcloudClient.uploadBackup(creds.url, creds.user, creds.appPassword, content)
                            anySucceeded = true
                            succeededTargets += Target.NEXTCLOUD
                            settings.setString(KEY_NC_LAST_SUCCESS, Instant.now().toString())
                            clearNextcloudErrorState()
                            settings.setString(KEY_NC_UPLOADED_HASH, currentHash)
                        } else {
                            allSatisfied = false
                            failedTargets += Target.NEXTCLOUD
                            registerNextcloudFailure("Nextcloud-Verbindung nicht vollständig")
                        }
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        allSatisfied = false
                        failedTargets += Target.NEXTCLOUD
                        if (shouldDeferBackupFailure(e, lastSuccessOf(KEY_NC_LAST_SUCCESS), Instant.now())) {
                            deferredTargets += Target.NEXTCLOUD
                            Log.i(TAG, "Nextcloud nicht erreichbar, wird nachgeholt: ${e.javaClass.simpleName}")
                        } else {
                            registerNextcloudFailure(e.message ?: "Nextcloud-Backup fehlgeschlagen")
                            Log.w(TAG, "Nextcloud-Backup fehlgeschlagen: ${e.message}")
                        }
                    }
                }
            }

            if (anySucceeded) {
                settings.setString(KEY_LAST_BACKUP, Instant.now().toString())
            }
            // Nur ein Lauf über alle Ziele darf den AUTO-Skip auslösen.
            if (anySucceeded && allSatisfied && targets.containsAll(ALL_TARGETS)) {
                lastHash = currentHash
            }
            // Der Worker plant seine Wiederholung selbst (Result.retry).
            if (deferredTargets.isNotEmpty() && source != Source.BACKGROUND) {
                CloudBackupWorker.enqueue(context)
            }

            return Outcome(
                ran = true,
                anySucceeded = anySucceeded,
                allSatisfied = allSatisfied,
                succeededTargets = succeededTargets,
                failedTargets = failedTargets,
                deferredTargets = deferredTargets,
                contentHash = currentHash,
            )
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "Backup übersprungen: ${e.message}")
            return Outcome(ran = true, anySucceeded = false, allSatisfied = false)
        } finally {
            isUploading.set(false)
        }
    }

    /**
     * Beim Verlassen der App. Seit Android 15 darf eine App, die nicht mehr
     * sichtbar ist, nicht mehr ins Netz — ein Upload von hier aus scheiterte
     * mit UnknownHostException. Darum: lokal sofort sichern, den Cloud-Upload
     * an [CloudBackupWorker] übergeben, und das nur, wenn ein Cloud-Ziel
     * diesen Stand noch nicht hat.
     */
    suspend fun backupOnLeave(): Outcome {
        val outcome = performBackup(Source.BACKGROUND, setOf(Target.LOCAL))
        if (!outcome.skippedEmpty && cloudUploadPending(outcome.contentHash)) {
            CloudBackupWorker.enqueue(context)
        }
        return outcome
    }

    /** Ohne bekannten Stand ([hash] = null) entscheidet erst der Worker. */
    private suspend fun cloudUploadPending(hash: String?): Boolean {
        val drive = settings.getBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED)
        val nc = settings.getBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED)
        if (hash == null) return drive || nc
        return (drive && settings.getString(KEY_CLOUD_UPLOADED_HASH) != hash) ||
            (nc && settings.getString(KEY_NC_UPLOADED_HASH) != hash)
    }

    private suspend fun lastSuccessOf(key: String): Instant? =
        settings.getString(key)?.let { runCatching { Instant.parse(it) }.getOrNull() }
}

internal fun googleDriveFailureNeedsReconnect(error: Throwable): Boolean =
    error is GoogleDriveManager.AuthRequiredException ||
        (error is GoogleDriveManager.DriveApiException && error.statusCode == 401)

/**
 * Kam der Fehler nur mangels Netz zustande? DNS-Auflösung, Verbindungsaufbau
 * oder Timeout — genau so scheitert auch ein Zugriff, den Android im
 * Hintergrund sperrt. TLS- und HTTP-Fehler zählen nicht: Die deuten auf ein
 * echtes Problem mit dem Server oder der Anmeldung.
 */
internal fun isConnectivityError(error: Throwable): Boolean =
    generateSequence(error) { it.cause }.take(8).any {
        it is UnknownHostException ||
            it is SocketException ||
            it is SocketTimeoutException ||
            (it is ApiException && it.statusCode in setOf(CommonStatusCodes.NETWORK_ERROR, CommonStatusCodes.TIMEOUT))
    }

/**
 * Verbindungsfehler werden nachgeholt statt gemeldet — aber nur, solange das
 * Ziel innerhalb von [AutoBackupManager.CONNECTIVITY_GRACE] erfolgreich war.
 * Bleibt es länger unerreichbar (oder klappte es noch nie), soll man das sehen.
 */
internal fun shouldDeferBackupFailure(error: Throwable, lastSuccess: Instant?, now: Instant): Boolean =
    isConnectivityError(error) &&
        lastSuccess != null &&
        Duration.between(lastSuccess, now) < AutoBackupManager.CONNECTIVITY_GRACE
