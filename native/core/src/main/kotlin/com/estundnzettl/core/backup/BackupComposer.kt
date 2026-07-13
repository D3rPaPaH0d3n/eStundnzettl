package com.estundnzettl.core.backup

import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.WorkCode
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Zentraler Backup-Payload-Builder — Port von composeBackupPayload aus
 * src/utils/storageBackup.ts. Alle Backup-Wege bauen ihren Payload über
 * diese Funktion, damit kein Pfad stillschweigend Sektionen vergisst.
 */

data class BackupSections(
    /** Roh-JSON des Settings-Keys "user" (kein lossy Re-Encoding). */
    val user: JsonElement? = null,
    val entries: List<Entry> = emptyList(),
    val workCodes: List<WorkCode> = emptyList(),
    val attachments: List<Attachment> = emptyList(),
    val attachmentLabels: List<String> = emptyList(),
    /** Roh-JSON des Settings-Keys "calculationConfig". */
    val calculationConfig: JsonElement? = null,
    val locale: String? = null,
    val theme: String? = null,
)

fun EntryId.toJson(): JsonPrimitive = when (this) {
    is EntryId.Numeric -> JsonPrimitive(value)
    is EntryId.Text -> JsonPrimitive(value)
}

/** Entry → JSON, Feldbelegung identisch zu rowToEntry der TS-App. */
fun Entry.toBackupJson(): JsonObject = buildJsonObject {
    put("id", id.toJson())
    put("type", type.wireName)
    put("date", date)
    put("start", start?.let { JsonPrimitive(it) } ?: JsonNull)
    put("end", end?.let { JsonPrimitive(it) } ?: JsonNull)
    put("pause", pause)
    put("project", project?.let { JsonPrimitive(it) } ?: JsonNull)
    put("code", code?.let { JsonPrimitive(it) } ?: JsonNull)
    put("netDuration", netDuration)
}

fun Attachment.toBackupJson(): JsonObject = buildJsonObject {
    put("id", id)
    put("entryId", entryId.toJson())
    put("label", label)
    put("fileName", fileName)
    put("mimeType", mimeType)
    put("storagePath", storagePath)
    put("fileSize", fileSize)
    put("createdAt", createdAt)
}

fun WorkCode.toBackupJson(): JsonObject = buildJsonObject {
    put("id", id)
    put("label", label)
}

/**
 * Baut aus den Daten-Sektionen einen vollständigen, checksummten
 * Backup-Payload (v7). `lastModified` (ISO-String) und `timezone` werden
 * vom Caller übergeben, damit das Core-Modul frei von Uhrzeit-Zugriffen
 * bleibt.
 */
fun composeBackupPayload(
    sections: BackupSections,
    note: String,
    lastModified: String,
    timezone: String,
): JsonObject {
    val payload = buildJsonObject {
        put("user", sections.user ?: JsonNull)
        put("entries", buildJsonArray { sections.entries.forEach { add(it.toBackupJson()) } })
        put("workCodes", buildJsonArray { sections.workCodes.forEach { add(it.toBackupJson()) } })
        put("attachments", buildJsonArray { sections.attachments.forEach { add(it.toBackupJson()) } })
        put("attachmentLabels", buildJsonArray { sections.attachmentLabels.forEach { add(JsonPrimitive(it)) } })
        put("calculationConfig", sections.calculationConfig ?: JsonNull)
        put("locale", sections.locale?.let { JsonPrimitive(it) } ?: JsonNull)
        put("theme", sections.theme?.let { JsonPrimitive(it) } ?: JsonNull)
        put("lastModified", lastModified)
        put("timezone", timezone)
        put("note", note)
        put("version", BACKUP_PAYLOAD_VERSION)
    }
    return attachBackupChecksum(payload)
}
