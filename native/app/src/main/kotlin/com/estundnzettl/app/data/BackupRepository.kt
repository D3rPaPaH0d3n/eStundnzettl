package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.core.backup.BackupAnalysis
import com.estundnzettl.core.backup.BackupSections
import com.estundnzettl.core.backup.analyzeBackupData
import com.estundnzettl.core.backup.composeBackupPayload
import com.estundnzettl.core.model.Attachment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.io.File
import java.time.Instant
import java.util.Base64
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
    /** App-Dateiordner (Context.filesDir): Dokument-Dateien liegen unter `attachments/`. */
    private val filesDir: File? = null,
) {

    companion object {
        /** Single Source of Truth für den Dateinamen (BACKUP_CONFIG). */
        const val FILENAME = "estundnzettl_backup.json"
        const val MIME_TYPE = "application/json"

        /**
         * Höchstens so viele Dokument-Bytes (vor Base64) pro Backup. Das ganze
         * Backup liegt beim Erstellen mehrfach im Speicher; neuere Dokumente
         * haben Vorrang, ältere behalten nur ihre Eckdaten.
         */
        const val MAX_ATTACHMENT_BYTES = 15L * 1024 * 1024
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
            attachmentFiles = readAttachmentFiles(attachments),
            calculationConfig = calculationConfig,
            locale = locale,
            theme = theme,
        )
    }

    /**
     * Vollständiger, checksummter v7-Payload des aktuellen App-Zustands.
     *
     * [sections] erlaubt dem Aufrufer, bereits gelesene Sektionen
     * weiterzureichen. Das ist kein reiner Performance-Trick: wer die
     * Sektionen vorher prüft (etwa auf leere Einträge), muss exakt den
     * geprüften Stand verschicken und darf nicht zwischendurch neu lesen.
     */
    suspend fun createBackupPayload(
        note: String = "eStundnzettl Manueller Backup",
        now: Instant = Instant.now(),
        zone: ZoneId = ZoneId.systemDefault(),
        sections: BackupSections? = null,
    ): JsonObject = composeBackupPayload(
        sections = sections ?: collectSections(),
        note = note,
        lastModified = ISO_MILLIS.format(now),
        timezone = zone.id,
    )

    /** Datei-Inhalt wie die TS-App: JSON.stringify(payload, null, 2). */
    fun toFileContent(payload: JsonObject): String = PRETTY_JSON.encodeToString(
        JsonObject.serializer(), payload
    )

    /** Dokument-Inhalte als Base64, neueste zuerst bis [MAX_ATTACHMENT_BYTES]. */
    private suspend fun readAttachmentFiles(attachments: List<Attachment>): Map<String, String> =
        withContext(Dispatchers.IO) {
            val result = LinkedHashMap<String, String>()
            var total = 0L
            for (attachment in attachments.sortedByDescending { it.createdAt }) {
                val file = resolveAttachmentFile(attachment.storagePath)?.takeIf { it.isFile } ?: continue
                val size = file.length()
                if (total + size > MAX_ATTACHMENT_BYTES) continue
                val bytes = runCatching { file.readBytes() }.getOrNull() ?: continue
                result[attachment.id] = Base64.getEncoder().encodeToString(bytes)
                total += bytes.size
            }
            result
        }

    /** Schreibt die Dokument-Dateien eines Backups zurück (fehlerhafte werden übersprungen). */
    private suspend fun restoreAttachmentFiles(analysis: BackupAnalysis) = withContext(Dispatchers.IO) {
        val byId = analysis.attachments.associateBy { it.id }
        analysis.attachmentFiles.forEach { (id, base64) ->
            val attachment = byId[id] ?: return@forEach
            val target = resolveAttachmentFile(attachment.storagePath) ?: return@forEach
            runCatching {
                val bytes = Base64.getDecoder().decode(base64)
                target.parentFile?.mkdirs()
                target.writeBytes(bytes)
            }
        }
    }

    /** Pfade aus Backups bleiben im Dokument-Ordner (kein `../`). */
    private fun resolveAttachmentFile(storagePath: String): File? {
        val base = filesDir ?: return null
        if (storagePath.isBlank()) return null
        val root = File(base, "attachments").canonicalFile
        val file = File(base, storagePath).canonicalFile
        return file.takeIf { it.path.startsWith(root.path + File.separator) }
    }

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
                    // Wie workCodes/attachments: eine leere Sektion bedeutet
                    // "im Backup nicht enthalten", nicht "alles löschen".
                    // replaceFullSnapshot lässt null-Felder unangetastet —
                    // eine leere Liste würde dagegen deleteAll() auslösen und
                    // bestehende Einträge gegen ein eintragsloses Backup
                    // eintauschen.
                    entries = analysis.entries.takeIf { it.isNotEmpty() },
                    userData = if (mode == "ALL" && analysis.hasSettings) analysis.settings else null,
                    workCodes = if (analysis.hasWorkCodes) analysis.workCodes else null,
                    attachments = if (analysis.hasAttachments) analysis.attachments else null,
                    attachmentLabels = analysis.attachmentLabels.takeIf { it.isNotEmpty() },
                    calculationConfig = if (mode == "ALL") analysis.calculationConfig else null,
                    locale = if (mode == "ALL") analysis.locale else null,
                    theme = if (mode == "ALL") analysis.theme else null,
                )
            )
            // Nach der Transaktion: ein Schreibfehler bei einer Datei soll die
            // wiederhergestellten Daten nicht verwerfen
            if (analysis.hasAttachments) restoreAttachmentFiles(analysis)
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
