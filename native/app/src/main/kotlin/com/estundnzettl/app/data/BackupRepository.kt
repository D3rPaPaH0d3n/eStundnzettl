package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.core.backup.BackupAnalysis
import com.estundnzettl.core.backup.BackupSections
import com.estundnzettl.core.backup.analyzeBackupData
import com.estundnzettl.core.backup.composeBackupPayload
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Backup-Erstellung und -Wiederherstellung — Port der Kernlogik aus
 * src/utils/storageBackup.ts (collectBackupSections, composeBackupPayload,
 * analyzeBackupData, applyBackup). Die Cloud-Ziele (Google Drive,
 * Nextcloud) folgen in Phase 5; Datei-Inhalte sind bereits vollständig
 * kompatibel und checksum-verifizierbar.
 */
class BackupRepository(
    private val db: AppDatabase,
    private val settings: SettingsRepository,
) {

    companion object {
        /** Single Source of Truth für den Dateinamen (BACKUP_CONFIG). */
        const val FILENAME = "estundnzettl_backup.json"
        const val MIME_TYPE = "application/json"
    }

    /**
     * Liest alle Backup-Sektionen aus der DB (Source of Truth). Kritische
     * Sektionen werfen bei Lesefehlern; die optionalen Einzel-Settings
     * (calculationConfig/locale/theme) sind fail-soft — wie in der TS-App.
     */
    suspend fun collectSections(): BackupSections {
        val user = settings.getRaw(SettingsRepository.Keys.USER)
        val entries = EntriesRepository(db).getAll()
        val workCodes = WorkCodesRepository(db).getAll()
        val attachmentsRepo = AttachmentsRepository(db)
        val attachments = attachmentsRepo.getAll()
        val attachmentLabels = attachmentsRepo.getLabelSuggestions()
        val calculationConfig = runCatching {
            settings.getRaw(SettingsRepository.Keys.CALCULATION_CONFIG)
        }.getOrNull()
        val locale = runCatching { settings.getLocaleId() }.getOrNull()
        val theme = runCatching {
            settings.getString(SettingsRepository.Keys.THEME)
        }.getOrNull()?.takeIf { it in setOf("system", "dark", "light") }

        return BackupSections(
            user = user,
            entries = entries,
            workCodes = workCodes,
            attachments = attachments,
            attachmentLabels = attachmentLabels,
            calculationConfig = calculationConfig,
            locale = locale,
            theme = theme,
        )
    }

    /** Vollständiger, checksummter v7-Payload des aktuellen App-Zustands. */
    suspend fun createBackupPayload(
        note: String = "eStundnzettl Manueller Backup",
        now: Instant = Instant.now(),
        zone: ZoneId = ZoneId.systemDefault(),
    ): JsonObject = composeBackupPayload(
        sections = collectSections(),
        note = note,
        lastModified = ISO_MILLIS.format(now),
        timezone = zone.id,
    )

    /** Datei-Inhalt wie die TS-App: JSON.stringify(payload, null, 2). */
    fun toFileContent(payload: JsonObject): String = PRETTY_JSON.encodeToString(
        JsonObject.serializer(), payload
    )

    /** Analysiert Backup-JSON, ohne zu speichern. */
    fun analyze(jsonText: String, now: Instant = Instant.now()): BackupAnalysis {
        val element = runCatching { Json.parseToJsonElement(jsonText) }.getOrNull()
            ?: return BackupAnalysis(valid = false)
        return analyzeBackupData(element, ISO_MILLIS.format(now))
    }

    /**
     * Wendet ein analysiertes Backup atomar an (eine Transaktion — entweder
     * kommt das ganze Backup an oder gar nichts). mode="ALL" übernimmt auch
     * Profil, CalculationConfig, Locale und Theme; sonst nur die Daten.
     */
    suspend fun apply(analysis: BackupAnalysis, mode: String = "ALL"): Boolean {
        if (!analysis.valid) return false

        return runCatching {
            db.replaceFullSnapshot(
                ImportSnapshot(
                    entries = analysis.entries,
                    userData = if (mode == "ALL" && analysis.hasSettings) analysis.settings else null,
                    workCodes = if (analysis.hasWorkCodes) analysis.workCodes else null,
                    attachments = if (analysis.hasAttachments) analysis.attachments else null,
                    attachmentLabels = analysis.attachmentLabels.takeIf { it.isNotEmpty() },
                    calculationConfig = if (mode == "ALL") analysis.calculationConfig else null,
                    locale = if (mode == "ALL") analysis.locale else null,
                    theme = if (mode == "ALL") analysis.theme else null,
                )
            )
            true
        }.getOrDefault(false)
    }

}

/** ISO-8601 mit Millisekunden + Z — Format von Date.toISOString(). */
private val ISO_MILLIS: DateTimeFormatter = DateTimeFormatter
    .ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    .withZone(ZoneId.of("UTC"))

private val PRETTY_JSON = Json {
    prettyPrint = true
    prettyPrintIndent = "  "
}
