package com.estundnzettl.core.backup

import com.estundnzettl.core.locale.isLocaleId
import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.WorkCode
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * Backup-Analyse — Port von analyzeBackupData aus src/utils/storageBackup.ts.
 *
 * Die Normalisierung ist bewusst tolerant (Legacy-Formate mit `data.entries`,
 * `items`, `codes`, `files`, ... werden akzeptiert), die eigentliche
 * Validierung pro Entry prüft nur id/date/type — identisch zur TS-App.
 */

data class BackupAnalysis(
    val valid: Boolean,
    val entryCount: Int = 0,
    val hasSettings: Boolean = false,
    val hasWorkCodes: Boolean = false,
    val hasAttachments: Boolean = false,
    val hasCalculationConfig: Boolean = false,
    val entries: List<Entry> = emptyList(),
    /** Roh-JSON des User-Profils (wird unverändert in Settings geschrieben). */
    val settings: JsonElement? = null,
    val workCodes: List<WorkCode> = emptyList(),
    val attachments: List<Attachment> = emptyList(),
    val attachmentLabels: List<String> = emptyList(),
    /** Roh-JSON der CalculationConfig (Koerzierung passiert beim Anwenden). */
    val calculationConfig: JsonObject? = null,
    /** Validierte LocaleId aus dem Backup, sonst null. */
    val locale: String? = null,
    /** Validiertes Theme aus dem Backup, sonst null. */
    val theme: String? = null,
    val timestamp: String? = null,
    val integrity: BackupIntegrity = BackupIntegrity.UNVERIFIED,
)

/** JS-Truthiness für JsonElemente (`v.user || v.settings || ...`). */
private fun isTruthy(value: JsonElement?): Boolean = when (value) {
    null, is JsonNull -> false
    is JsonPrimitive -> when {
        value.isString -> value.content.isNotEmpty()
        value.content == "false" -> false
        value.content == "0" || value.content == "-0" -> false
        else -> true
    }
    else -> true // Objekte und Arrays sind in JS immer truthy
}

private fun JsonObject.firstTruthy(vararg keys: String): JsonElement? =
    keys.firstNotNullOfOrNull { key -> this[key]?.takeIf { isTruthy(it) } }

private fun stringOrNull(value: JsonElement?): String? =
    (value as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun intOrNull(value: JsonElement?): Int? {
    val p = value as? JsonPrimitive ?: return null
    if (p.isString) return null
    return p.content.toIntOrNull() ?: p.content.toDoubleOrNull()?.toInt()
}

private fun longOrNull(value: JsonElement?): Long? {
    val p = value as? JsonPrimitive ?: return null
    if (p.isString) return null
    return p.content.toLongOrNull() ?: p.content.toDoubleOrNull()?.toLong()
}

private fun entryIdOrNull(value: JsonElement?): EntryId? {
    val p = value as? JsonPrimitive ?: return null
    if (p is JsonNull) return null
    if (p.isString) return EntryId.of(p.content)
    return longOrNull(p)?.let { EntryId.of(it) }
}

/** isValidEntry der TS-App: id vorhanden, date/type nicht-leere Strings. */
private fun isValidEntryJson(value: JsonElement): Boolean {
    val obj = value as? JsonObject ?: return false
    val id = obj["id"]
    if (id == null || id is JsonNull) return false
    if (stringOrNull(obj["date"]).isNullOrEmpty()) return false
    if (stringOrNull(obj["type"]).isNullOrEmpty()) return false
    return true
}

private fun jsonToEntry(obj: JsonObject): Entry = Entry(
    id = entryIdOrNull(obj["id"]) ?: EntryId.of(stringOrNull(obj["id"]) ?: ""),
    type = EntryType.fromWire(stringOrNull(obj["type"])),
    date = stringOrNull(obj["date"]) ?: "",
    start = stringOrNull(obj["start"]),
    end = stringOrNull(obj["end"]),
    pause = intOrNull(obj["pause"]) ?: 0,
    project = stringOrNull(obj["project"]),
    code = intOrNull(obj["code"]),
    netDuration = intOrNull(obj["netDuration"]) ?: 0,
)

private fun normalizeEntries(data: JsonElement): List<Entry> {
    val raw: List<JsonElement> = when {
        data is JsonArray -> data
        data is JsonObject && data["entries"] is JsonArray -> data["entries"] as JsonArray
        data is JsonObject && (data["data"] as? JsonObject)?.get("entries") is JsonArray ->
            (data["data"] as JsonObject)["entries"] as JsonArray
        data is JsonObject && data["items"] is JsonArray -> data["items"] as JsonArray
        else -> emptyList()
    }
    return raw.filter { isValidEntryJson(it) }.map { jsonToEntry(it as JsonObject) }
}

private fun normalizeSettings(data: JsonElement): JsonElement? {
    val obj = data as? JsonObject ?: return null
    return obj.firstTruthy("user", "settings", "profile", "userData", "employee")
}

private fun normalizeWorkCodes(data: JsonElement): List<WorkCode> {
    val obj = data as? JsonObject ?: return emptyList()
    val raw = obj.firstTruthy("workCodes", "codes", "workcodes") as? JsonArray ?: return emptyList()
    return raw.mapNotNull { element ->
        val c = element as? JsonObject ?: return@mapNotNull null
        val id = intOrNull(c["id"]) ?: return@mapNotNull null
        WorkCode(id = id, label = stringOrNull(c["label"]) ?: "")
    }
}

private fun normalizeAttachments(data: JsonElement): List<Attachment> {
    val obj = data as? JsonObject ?: return emptyList()
    val raw = obj.firstTruthy("attachments", "files") as? JsonArray ?: return emptyList()
    return raw.mapNotNull { element ->
        val a = element as? JsonObject ?: return@mapNotNull null
        val id = stringOrNull(a["id"]) ?: return@mapNotNull null
        val entryId = entryIdOrNull(a["entryId"]) ?: return@mapNotNull null
        Attachment(
            id = id,
            entryId = entryId,
            label = stringOrNull(a["label"]) ?: "",
            fileName = stringOrNull(a["fileName"]) ?: "",
            mimeType = stringOrNull(a["mimeType"]) ?: "",
            storagePath = stringOrNull(a["storagePath"]) ?: "",
            fileSize = longOrNull(a["fileSize"]) ?: 0,
            createdAt = stringOrNull(a["createdAt"]) ?: "",
        )
    }
}

private fun normalizeAttachmentLabels(data: JsonElement): List<String> {
    val obj = data as? JsonObject ?: return emptyList()
    val raw = obj.firstTruthy("attachmentLabels", "labels", "attachment_labels") as? JsonArray
        ?: return emptyList()
    return raw.mapNotNull { stringOrNull(it) }
}

private fun normalizeTimestamp(data: JsonElement, now: String): String {
    val obj = data as? JsonObject ?: return now
    return stringOrNull(obj.firstTruthy("backupDate", "exportedAt", "lastModified", "timestamp")) ?: now
}

private fun normalizeCalculationConfig(data: JsonElement): JsonObject? {
    val obj = data as? JsonObject ?: return null
    return obj["calculationConfig"] as? JsonObject
}

private fun normalizeLocaleId(data: JsonElement): String? {
    val obj = data as? JsonObject ?: return null
    val raw = stringOrNull(obj["locale"])
    return if (isLocaleId(raw)) raw else null
}

private val VALID_THEMES = setOf("system", "dark", "light")

private fun normalizeTheme(data: JsonElement): String? {
    val obj = data as? JsonObject ?: return null
    return stringOrNull(obj["theme"])?.takeIf { it in VALID_THEMES }
}

/**
 * Analysiert Backup-Daten, ohne zu speichern. `now` (ISO-String) dient als
 * Timestamp-Fallback wie `new Date().toISOString()` in der TS-App.
 */
fun analyzeBackupData(data: JsonElement?, now: String = ""): BackupAnalysis {
    if (data == null || data is JsonNull) return BackupAnalysis(valid = false)

    val entries = normalizeEntries(data)
    val settings = normalizeSettings(data)
    val workCodes = normalizeWorkCodes(data)
    val attachments = normalizeAttachments(data)
    val attachmentLabels = normalizeAttachmentLabels(data)
    val calculationConfig = normalizeCalculationConfig(data)
    val locale = normalizeLocaleId(data)
    val theme = normalizeTheme(data)

    val hasUsefulData = entries.isNotEmpty() || settings != null || workCodes.isNotEmpty() ||
        attachments.isNotEmpty() || attachmentLabels.isNotEmpty()
    if (!hasUsefulData) return BackupAnalysis(valid = false)

    // Integrität prüfen (nicht blockierend — Mismatch ist eine Warnung)
    val integrity = runCatching { verifyBackupIntegrity(data) }.getOrDefault(BackupIntegrity.UNVERIFIED)

    return BackupAnalysis(
        valid = true,
        entryCount = entries.size,
        hasSettings = settings != null,
        hasWorkCodes = workCodes.isNotEmpty(),
        hasAttachments = attachments.isNotEmpty(),
        hasCalculationConfig = calculationConfig != null,
        entries = entries,
        settings = settings,
        workCodes = workCodes,
        attachments = attachments,
        attachmentLabels = attachmentLabels,
        calculationConfig = calculationConfig,
        locale = locale,
        theme = theme,
        timestamp = normalizeTimestamp(data, now),
        integrity = integrity,
    )
}
