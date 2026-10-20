package com.estundnzettl.app.data

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.estundnzettl.app.data.db.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Lesende Selbstauskunft für den Hausmasta-Modus.
 *
 * Zwei Regeln, die hier nicht verhandelbar sind:
 *
 *  1. **Whitelist statt Dump.** Jedes Feld wird einzeln benannt. Der
 *     Settings-Table wird bewusst NICHT durchiteriert — dort liegen unter
 *     anderem `nextcloud_pass` und `crypto_mk_v1`. Eine Diagnose-Ansicht
 *     ist genau das, was Nutzer abfotografieren und verschicken.
 *  2. **Keine Nebenwirkungen.** Kein Schreibzugriff, keine Fehlerzähler,
 *     kein Backoff. Ein Blick in die Diagnose darf den echten
 *     Backup-Zustand nicht verändern.
 */

/** Datei im lokalen Backup-Ordner der App. */
data class LocalBackupFile(
    val name: String,
    val sizeBytes: Long,
    val modified: String,
)

data class DiagnosticsReport(
    val appVersion: String,
    val versionCode: Int,
    /** Paketname + Signatur-SHA-1: genau das prüft Google gegen den OAuth-Client. */
    val packageName: String,
    val signingSha1: List<String>,
    val dbSchemaVersion: Int,
    val entryCount: Int,
    val oldestEntryDate: String?,
    val newestEntryDate: String?,
    val workCodeCount: Int,
    val attachmentCount: Int,
    val cloudSyncEnabled: Boolean,
    val localBackupEnabled: Boolean,
    val nextcloudEnabled: Boolean,
    val cloudLastSuccess: String?,
    val localLastSuccess: String?,
    val nextcloudLastSuccess: String?,
    val cloudFailCount: Int,
    val cloudBackoffUntil: String?,
    val cloudReconnectRequired: Boolean,
    val cloudLastErrorKind: GoogleDriveErrorKind?,
    val cloudLastErrorDetail: String?,
    /** Maskiert — nie die vollständige Adresse. */
    val googleAccount: String?,
    /** Maskiert — nie der vollständige Benutzername. */
    val nextcloudUser: String?,
    /** Nur "gesetzt / nicht gesetzt", niemals der Wert. */
    val nextcloudSecretSet: Boolean,
    val localBackupFiles: List<LocalBackupFile>,
)

/** Zustand der Drive-Abfrage — bewusst getrennt, weil sie Netz und Zustimmung braucht. */
sealed interface DriveProbe {
    data object Idle : DriveProbe
    data object Loading : DriveProbe
    data class Loaded(val files: List<GoogleDriveManager.AppDataFile>) : DriveProbe {
        /** Dateinamen, die mehr als einmal vorkommen — der Duplikat-Nachweis. */
        val duplicates: Map<String, Int>
            get() = files.groupingBy { it.name }.eachCount().filterValues { it > 1 }
    }

    data class Failed(val message: String, val detail: String? = null) : DriveProbe
}

/**
 * Maskiert eine E-Mail-Adresse: erster Buchstabe + Domain. Reicht, um das
 * richtige Konto wiederzuerkennen, ohne die Adresse preiszugeben.
 */
internal fun maskAccount(value: String?): String? {
    if (value.isNullOrBlank()) return null
    val at = value.indexOf('@')
    if (at <= 0) return value.take(1) + "***"
    return value.take(1) + "***" + value.substring(at)
}

/** Drive-/ISO-Zeitstempel als lokale "yyyy-MM-dd HH:mm"-Anzeige. */
internal fun formatTimestamp(iso: String?): String? {
    if (iso.isNullOrBlank()) return null
    return runCatching {
        LOCAL_MINUTES.format(Instant.parse(iso))
    }.getOrDefault(iso)
}

/** Zertifikat → "AB:CD:…" wie in der Cloud Console und `keytool -list`. */
internal fun sha1Fingerprint(certificate: ByteArray): String =
    MessageDigest.getInstance("SHA-1").digest(certificate)
        .joinToString(":") { "%02X".format(it) }

private val LOCAL_MINUTES: DateTimeFormatter = DateTimeFormatter
    .ofPattern("yyyy-MM-dd HH:mm")
    .withZone(ZoneId.systemDefault())

class DiagnosticsCollector(
    private val context: Context,
    private val db: AppDatabase,
    private val settings: SettingsRepository,
    private val secrets: SecretStore,
) {

    suspend fun collect(appVersion: String, versionCode: Int): DiagnosticsReport {
        val entries = EntriesRepository(db).getAll()
        val entryDates = entries.map { it.date }.filter { it.isNotEmpty() }

        return DiagnosticsReport(
            appVersion = appVersion,
            versionCode = versionCode,
            packageName = context.packageName,
            signingSha1 = readSigningSha1(),
            dbSchemaVersion = readSchemaVersion(),
            entryCount = entries.size,
            oldestEntryDate = entryDates.minOrNull(),
            newestEntryDate = entryDates.maxOrNull(),
            workCodeCount = WorkCodesRepository(db).getAll().size,
            attachmentCount = AttachmentsRepository(db).getAll().size,
            cloudSyncEnabled = settings.getBoolean(SettingsRepository.Keys.CLOUD_SYNC_ENABLED),
            localBackupEnabled = settings.getBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED),
            nextcloudEnabled = settings.getBoolean(SettingsRepository.Keys.NEXTCLOUD_ENABLED),
            cloudLastSuccess = formatTimestamp(settings.getString(AutoBackupManager.KEY_CLOUD_LAST_SUCCESS)),
            localLastSuccess = formatTimestamp(settings.getString(AutoBackupManager.KEY_LOCAL_LAST_SUCCESS)),
            nextcloudLastSuccess = formatTimestamp(settings.getString(AutoBackupManager.KEY_NC_LAST_SUCCESS)),
            cloudFailCount = settings.getString(AutoBackupManager.KEY_CLOUD_FAIL_COUNT)?.toIntOrNull() ?: 0,
            cloudBackoffUntil = formatTimestamp(settings.getString(AutoBackupManager.KEY_CLOUD_BACKOFF_UNTIL)),
            cloudReconnectRequired = settings.getBoolean(GoogleDriveManager.KEY_BACKUP_RECONNECT_REQUIRED),
            cloudLastErrorKind = GoogleDriveErrorKind.fromName(
                settings.getString(AutoBackupManager.KEY_CLOUD_LAST_ERROR_KIND),
            ),
            cloudLastErrorDetail = settings.getString(AutoBackupManager.KEY_CLOUD_LAST_ERROR)
                ?.takeIf { it.isNotBlank() },
            googleAccount = maskAccount(settings.getString(GoogleDriveManager.KEY_ACCOUNT_EMAIL)),
            nextcloudUser = maskAccount(settings.getString(SettingsRepository.Keys.NEXTCLOUD_USER)),
            nextcloudSecretSet = readSecretPresent(),
            localBackupFiles = readLocalBackupFiles(),
        )
    }

    /** Signatur-Zertifikat(e) der installierten APK als SHA-1. */
    private fun readSigningSha1(): List<String> = runCatching {
        val pm = context.packageManager
        val certificates = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signing = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
                .signingInfo ?: return@runCatching emptyList()
            if (signing.hasMultipleSigners()) signing.apkContentsSigners else signing.signingCertificateHistory
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES).signatures
        }
        certificates.orEmpty().map { sha1Fingerprint(it.toByteArray()) }.distinct()
    }.getOrDefault(emptyList())

    /** Schema-Version der geöffneten DB — Datei-I/O, daher nie auf dem Main-Thread. */
    private suspend fun readSchemaVersion(): Int = withContext(Dispatchers.IO) {
        runCatching { db.openHelper.readableDatabase.version }.getOrDefault(-1)
    }

    /**
     * Nur die Anwesenheit des Secrets, nie der Wert. Der erste Zugriff auf
     * den EncryptedSharedPreferences-Store macht Keystore- und Datei-I/O.
     */
    private suspend fun readSecretPresent(): Boolean = withContext(Dispatchers.IO) {
        !secrets.get(SecretStore.NEXTCLOUD_SECRET_KEY).isNullOrEmpty()
    }

    private suspend fun readLocalBackupFiles(): List<LocalBackupFile> = withContext(Dispatchers.IO) {
        val dir = File(context.filesDir, NextcloudClient.BACKUP_FOLDER)
        val files = dir.listFiles()?.filter { it.isFile }
            ?: return@withContext emptyList<LocalBackupFile>()
        files
            .sortedByDescending { it.lastModified() }
            .map { file ->
                LocalBackupFile(
                    name = file.name,
                    sizeBytes = file.length(),
                    modified = LOCAL_MINUTES.format(Instant.ofEpochMilli(file.lastModified())),
                )
            }
    }
}
