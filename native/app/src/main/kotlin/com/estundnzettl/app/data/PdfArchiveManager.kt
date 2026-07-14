package com.estundnzettl.app.data

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.pdf.ReportPdfGenerator
import com.estundnzettl.app.pdf.ReportPdfInput
import com.estundnzettl.core.calc.applyEffectiveDurations
import com.estundnzettl.core.calc.buildArchiveFilename
import com.estundnzettl.core.calc.calculatePeriodStats
import com.estundnzettl.core.calc.filterEntriesForMonth
import com.estundnzettl.core.calc.generateHolidayEntries
import com.estundnzettl.core.calc.hashMonthContent
import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import java.io.File
import java.io.IOException
import java.time.LocalDate
import java.time.YearMonth
import java.util.Locale as JavaLocale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Automatisches monatliches PDF-Archiv — Port von useAutoPdfArchive.ts
 * + pdfArchiveTargets.ts (lokales Ziel; Nextcloud/Google Drive folgen
 * mit den Cloud-Backups in Phase 5).
 *
 * Strategie wie im Original: höchstens ein Lauf pro Tag (last_run),
 * bei Monatswechsel wird zuerst der Vormonat finalisiert, und ein
 * Content-Hash pro Monat überspringt Generierung/Schreiben, wenn sich
 * nichts geändert hat.
 */
class PdfArchiveManager(
    private val context: Context,
    private val settings: SettingsRepository,
    private val nextcloud: NextcloudManager? = null,
    private val googleDrive: GoogleDriveManager? = null,
) {

    companion object {
        private const val TAG = "PdfArchive"

        // Settings-Keys — identisch zu den SQL-Keys der TS-App, damit die
        // per Legacy-Import übernommenen Werte weitergelten.
        const val KEY_ENABLED = "pdf_archive_enabled"
        const val KEY_LOCAL = "pdf_archive_local"
        const val KEY_NEXTCLOUD = "pdf_archive_nextcloud"
        const val KEY_GDRIVE = "pdf_archive_gdrive"
        const val KEY_LAST_RUN = "pdf_archive_last_run"
        const val KEY_LAST_MONTH = "pdf_archive_last_month"
        const val KEY_FAIL_COUNT = "pdf_archive_fail_count"
        const val KEY_LAST_ERROR = "pdf_archive_last_error"

        /** Hash-Key trägt (wie in der TS-App) den langen Prefix. */
        fun hashKey(year: Int, month: Int): String =
            "estundnzettl_pdf_archive_last_hash_%04d-%02d".format(year, month)
    }

    /** Eingabedaten eines Laufs — Pendant zu latestDataRef im Hook. */
    data class Data(
        val entries: List<Entry>,
        val userData: UserData?,
        val workCodes: List<WorkCode>,
        val locale: AppLocale,
        val calculationConfig: CalculationConfig?,
    )

    data class TargetResult(
        val ok: Boolean,
        val target: String,
        val error: String? = null,
        val note: String? = null,
    )

    data class MonthResult(
        val month: String,
        val skipped: Boolean,
        val filename: String,
        val results: List<TargetResult> = emptyList(),
    ) {
        val anyOk: Boolean get() = results.any { it.ok }
        val errors: List<TargetResult> get() = results.filter { !it.ok }
    }

    data class RunOutcome(
        val ok: Boolean,
        val reason: String? = null,
        val error: String? = null,
        val results: List<MonthResult> = emptyList(),
    ) {
        val anyRealUpload: Boolean get() = results.any { !it.skipped && it.anyOk }
        val anyFailure: Boolean get() = results.any { !it.skipped && it.errors.isNotEmpty() }
    }

    private val isRunning = AtomicBoolean(false)

    private fun todayStr(): String = LocalDate.now().toString()

    private fun monthStr(date: LocalDate = LocalDate.now()): String =
        "%04d-%02d".format(date.year, date.monthValue)

    private suspend fun readString(key: String): String = settings.getString(key) ?: ""

    // ─── Ein Monat (Port von runForMonth) ───────────────────────────

    private suspend fun runForMonth(
        data: Data,
        year: Int,
        month: Int,
        localTarget: Boolean,
        nextcloudTarget: Boolean,
        gdriveTarget: Boolean,
    ): MonthResult {
        val ym = "%04d-%02d".format(year, month)
        val filename = buildArchiveFilename(year, month, data.userData)
        val currentDate = LocalDate.now()
        val newHash = hashMonthContent(
            data.entries, data.userData, year, month,
            data.locale, data.calculationConfig, currentDate,
        )
        val key = hashKey(year, month)
        val prevHash = settings.getString(key)

        if (prevHash == newHash) {
            Log.i(TAG, "Hash unverändert für $ym — kein Export.")
            return MonthResult(ym, skipped = true, filename = filename)
        }

        val monthEntries = filterEntriesForMonth(data.entries, year, month)
        if (monthEntries.isEmpty() && prevHash == null) {
            return MonthResult(ym, skipped = true, filename = filename)
        }

        val bytes = generateMonthlyPdf(data, year, month, currentDate)

        val results = ArrayList<TargetResult>()
        if (localTarget) results.add(writeLocalArchive(filename, bytes))
        if (nextcloudTarget) results.add(uploadNextcloudArchive(filename, bytes))
        if (gdriveTarget) results.add(uploadGDriveArchive(filename, bytes))

        if (results.any { it.ok }) {
            settings.setString(key, newHash)
        }

        return MonthResult(ym, skipped = false, filename = filename, results = results)
    }

    /**
     * Erzeugt das Monats-PDF — gleiche Daten-Vorbereitung wie
     * renderMonthlyReportPdfBlob (Feiertage ergänzen, Krank-Korrektur,
     * Stats über den vollen Monat).
     */
    private suspend fun generateMonthlyPdf(
        data: Data,
        year: Int,
        month: Int,
        currentDate: LocalDate,
    ): ByteArray {
        val holidays = generateHolidayEntries(
            year, month, data.userData, data.locale, data.calculationConfig, currentDate,
        )
        val corrected = applyEffectiveDurations(
            data.entries + holidays, data.userData, data.locale, data.calculationConfig,
        )
        val monthEntries = filterEntriesForMonth(corrected, year, month)
        val periodStart = LocalDate.of(year, month, 1)
        val periodEnd = YearMonth.of(year, month).atEndOfMonth()
        val stats = calculatePeriodStats(
            monthEntries, data.userData, periodStart, periodEnd,
            corrected, data.locale, data.calculationConfig,
        )

        val language = settings.getString(SettingsRepository.Keys.LANGUAGE)
            ?: I18n.resolveSystemLanguage(JavaLocale.getDefault().language)
        val i18n = I18n.load(context, language)

        return ReportPdfGenerator(i18n).generate(
            ReportPdfInput(
                entries = monthEntries,
                userData = data.userData,
                monthDate = YearMonth.of(year, month),
                filterWeek = null,
                stats = stats,
                workCodes = data.workCodes,
                attachments = emptyList(),
                customNote = "",
                locale = data.locale,
                calculationConfig = data.calculationConfig,
                allEntries = corrected,
            ),
        )
    }

    /** Nextcloud-Ziel — Port von uploadNextcloudArchive (pdfArchiveTargets.ts). */
    private suspend fun uploadNextcloudArchive(filename: String, bytes: ByteArray): TargetResult {
        val creds = nextcloud?.getCredentials()
            ?: return TargetResult(false, "nextcloud", error = "Nextcloud nicht konfiguriert")
        return try {
            NextcloudClient.uploadBinaryToPath(
                creds.url, creds.user, creds.appPassword,
                listOf("eStundnzettl", "Archiv"), filename, bytes, "application/pdf",
            )
            TargetResult(true, "nextcloud")
        } catch (e: Exception) {
            Log.w(TAG, "Nextcloud PDF-Archiv fehlgeschlagen", e)
            TargetResult(false, "nextcloud", error = e.message)
        }
    }

    /** Google-Drive-Ziel — Port von uploadGDriveArchive (drive.file-Scope). */
    private suspend fun uploadGDriveArchive(filename: String, bytes: ByteArray): TargetResult {
        val drive = googleDrive
            ?: return TargetResult(false, "gdrive", error = "Google Drive nicht konfiguriert")
        return try {
            val token = drive.authorize(GoogleDriveManager.SCOPE_FILE)
            drive.uploadPdfArchive(token, filename, bytes)
            TargetResult(true, "gdrive")
        } catch (e: GoogleDriveManager.AuthRequiredException) {
            TargetResult(false, "gdrive", error = "Google Drive Anmeldung erforderlich")
        } catch (e: Exception) {
            Log.w(TAG, "GDrive PDF-Archiv fehlgeschlagen", e)
            TargetResult(false, "gdrive", error = e.message)
        }
    }

    // ─── Lokales Ziel (Port von writeLocalArchive) ──────────────────

    private fun writeLocalArchive(filename: String, bytes: ByteArray): TargetResult {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Stufe 1: Dokumente/eStundnzettl/Archiv/ (im Dateimanager sichtbar)
            try {
                writeViaMediaStore(filename, bytes, "Documents/eStundnzettl/Archiv/")
                return TargetResult(true, "local", note = "Dokumente/eStundnzettl/Archiv/")
            } catch (e: Exception) {
                Log.w(TAG, "Stufe 1 (Documents/eStundnzettl/Archiv) fehlgeschlagen", e)
            }

            // Stufe 2: Dokumente/ flach
            try {
                writeViaMediaStore(filename, bytes, "Documents/")
                return TargetResult(true, "local", note = "Dokumente/ (flach, ohne Unterordner)")
            } catch (e: Exception) {
                Log.w(TAG, "Stufe 2 (Documents/ flach) fehlgeschlagen", e)
            }
        }

        // Stufe 3: app-externer privater Storage (immer beschreibbar,
        // per USB/Dateimanager mit App-Zugriff erreichbar)
        return try {
            val dir = File(context.getExternalFilesDir(null), "Archiv").apply { mkdirs() }
            File(dir, filename).writeBytes(bytes)
            TargetResult(true, "local", note = "Android/data/${context.packageName}/files/Archiv/ (app-privat)")
        } catch (e: Exception) {
            Log.w(TAG, "Stufe 3 (External/Archiv) fehlgeschlagen", e)
            TargetResult(false, "local", error = "Alle Lokal-Pfade scheiterten. Letzter Fehler: ${e.message}")
        }
    }

    /**
     * Schreibt via MediaStore und aktualisiert eine vorhandene Datei
     * gleichen Namens statt Duplikate ("… (1).pdf") anzulegen — das
     * Archiv überschreibt denselben Monats-Export mehrmals täglich.
     */
    private fun writeViaMediaStore(filename: String, bytes: ByteArray, relativePath: String) {
        val resolver = context.contentResolver
        val collection = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)

        val existingId = resolver.query(
            collection,
            arrayOf(MediaStore.MediaColumns._ID),
            "${MediaStore.MediaColumns.DISPLAY_NAME}=? AND ${MediaStore.MediaColumns.RELATIVE_PATH}=?",
            arrayOf(filename, relativePath),
            null,
        )?.use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else null }

        val uri = if (existingId != null) {
            ContentUris.withAppendedId(collection, existingId)
        } else {
            resolver.insert(
                collection,
                ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                },
            ) ?: throw IOException("MediaStore-Insert lieferte keine URI")
        }

        resolver.openOutputStream(uri, "wt")?.use { it.write(bytes) }
            ?: throw IOException("MediaStore-OutputStream nicht verfügbar")
    }

    // ─── Kompletter Lauf (Port von performRun) ──────────────────────

    suspend fun performRun(data: Data, source: String, force: Boolean = false): RunOutcome {
        if (!isRunning.compareAndSet(false, true)) {
            Log.i(TAG, "performRun ($source) — bereits laufend, skip.")
            return RunOutcome(ok = false, reason = "already-running")
        }
        try {
            val enabled = settings.getBoolean(KEY_ENABLED)
            if (!enabled) {
                Log.i(TAG, "performRun ($source) — nicht aktiv, skip.")
                return RunOutcome(ok = false, reason = "disabled")
            }
            val localTarget = settings.getBoolean(KEY_LOCAL)
            val nextcloudTarget = settings.getBoolean(KEY_NEXTCLOUD)
            val gdriveTarget = settings.getBoolean(KEY_GDRIVE)
            if (!localTarget && !nextcloudTarget && !gdriveTarget) {
                return RunOutcome(ok = false, reason = "disabled")
            }

            if (!force && readString(KEY_LAST_RUN) == todayStr()) {
                Log.i(TAG, "performRun ($source) — heute bereits gelaufen, skip.")
                return RunOutcome(ok = false, reason = "already-today")
            }

            if (data.userData == null) {
                return RunOutcome(ok = false, reason = "no-data")
            }

            val now = LocalDate.now()
            val currentYM = monthStr(now)
            val lastYM = readString(KEY_LAST_MONTH)
            val results = ArrayList<MonthResult>()

            // Monats-Übergang: Vormonat finalisieren
            if (lastYM.isNotEmpty() && lastYM != currentYM) {
                val parts = lastYM.split("-").mapNotNull { it.toIntOrNull() }
                if (parts.size == 2 && parts[0] > 0 && parts[1] in 1..12) {
                    Log.i(TAG, "Monats-Übergang erkannt: finalisiere $lastYM")
                    results.add(
                        runForMonth(data, parts[0], parts[1], localTarget, nextcloudTarget, gdriveTarget),
                    )
                }
            }

            // Aktueller Monat
            results.add(
                runForMonth(data, now.year, now.monthValue, localTarget, nextcloudTarget, gdriveTarget),
            )

            // Status-Update
            settings.setString(KEY_LAST_RUN, todayStr())
            settings.setString(KEY_LAST_MONTH, currentYM)

            val outcome = RunOutcome(ok = true, results = results)
            if (outcome.anyFailure) {
                val current = readString(KEY_FAIL_COUNT).toIntOrNull() ?: 0
                val msg = results.flatMap { r -> r.errors.map { "${it.target}: ${it.error}" } }
                    .joinToString(" · ")
                settings.setString(KEY_FAIL_COUNT, (current + 1).toString())
                settings.setString(KEY_LAST_ERROR, msg)
            } else if (outcome.anyRealUpload) {
                settings.setString(KEY_FAIL_COUNT, "0")
                settings.setString(KEY_LAST_ERROR, "")
            }

            return outcome
        } catch (e: Exception) {
            Log.e(TAG, "performRun fehlgeschlagen", e)
            val msg = e.message ?: e.toString()
            try {
                settings.setString(KEY_LAST_ERROR, msg)
            } catch (_: Exception) {
            }
            return RunOutcome(ok = false, error = msg)
        } finally {
            isRunning.set(false)
        }
    }
}
