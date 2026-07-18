package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.AttachmentLabelRow
import com.estundnzettl.app.data.db.AttachmentRow
import com.estundnzettl.app.data.db.EntryRow
import com.estundnzettl.app.data.db.SettingRow
import com.estundnzettl.app.data.db.WorkCodeRow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull

data class LegacyLocalStorageData(
    val entries: List<EntryRow> = emptyList(),
    val settings: List<SettingRow> = emptyList(),
    val workCodes: List<WorkCodeRow> = emptyList(),
    val attachments: List<AttachmentRow> = emptyList(),
    val labels: List<AttachmentLabelRow> = emptyList(),
    val legacyNextcloudSecret: String? = null,
) {
    val importedItemCount: Int
        get() = entries.size + settings.size + workCodes.size + attachments.size + labels.size
}

/** Pure mapping layer kept separate from WebView access for deterministic tests. */
object LegacyLocalStorageMapper {
    private val json = Json { ignoreUnknownKeys = true }

    fun map(
        values: Map<String, String>,
        existingSettingKeys: Set<String>,
        needsEntries: Boolean,
        needsWorkCodes: Boolean,
        needsAttachments: Boolean,
        needsLabels: Boolean,
    ): LegacyLocalStorageData {
        val settings = linkedMapOf<String, SettingRow>()

        fun putSetting(dbKey: String, value: JsonElement?) {
            if (dbKey !in existingSettingKeys && value != null) {
                settings[dbKey] = SettingRow(dbKey, value.toString())
            }
        }
        fun putString(localKey: String, dbKey: String) {
            values[localKey]?.takeIf { it.isNotEmpty() }?.let { putSetting(dbKey, JsonPrimitive(it)) }
        }
        fun putBoolean(localKey: String, dbKey: String) {
            values[localKey]?.toBooleanStrictOrNull()?.let { putSetting(dbKey, JsonPrimitive(it)) }
        }
        fun putStringNumber(localKey: String, dbKey: String) {
            values[localKey]?.toIntOrNull()?.let { putSetting(dbKey, JsonPrimitive(it.toString())) }
        }
        fun putObject(localKey: String, dbKey: String) {
            val raw = values[localKey] ?: return
            val element = parseOrNull(raw)
            if (element is JsonObject) putSetting(dbKey, element)
        }

        putObject("estundnzettl_user", "user")
        putString("estundnzettl_theme", "theme")
        putBoolean("estundnzettl_material_you_enabled", "material_you_enabled")
        putString("estundnzettl_locale", "locale")
        putString("estundnzettl_language", "language")
        putObject("estundnzettl_calculation_config", "calculationConfig")
        putBoolean("estundnzettl_cloud_sync_enabled", "cloud_sync_enabled")
        putBoolean("estundnzettl_local_backup_enabled", "local_backup_enabled")
        putBoolean("estundnzettl_nextcloud_enabled", "nextcloud_enabled")
        putString("estundnzettl_nextcloud_url", "nextcloud_url")
        putString("estundnzettl_nextcloud_user", "nextcloud_user")
        putString("estundnzettl_backup_target", "backup_target")
        putString("estundnzettl_last_backup_date", "last_backup")
        values["estundnzettl_last_code"]?.toIntOrNull()
            ?.let { putSetting("last_code", JsonPrimitive(it)) }
        putStringNumber("estundnzettl_backup_fail_count", "backup_fail_count")
        putString("estundnzettl_backup_last_error", "backup_last_error")
        putString("estundnzettl_backup_backoff_until", "backup_backoff_until")
        putStringNumber("estundnzettl_nextcloud_backup_fail_count", "nextcloud_backup_fail_count")
        putString("estundnzettl_nextcloud_backup_last_error", "nextcloud_backup_last_error")
        putString("estundnzettl_nextcloud_backoff_until", "nextcloud_backoff_until")
        putBoolean("estundnzettl_pdf_archive_enabled", "pdf_archive_enabled")
        putBoolean("estundnzettl_pdf_archive_local", "pdf_archive_local")
        putBoolean("estundnzettl_pdf_archive_nextcloud", "pdf_archive_nextcloud")
        putBoolean("estundnzettl_pdf_archive_gdrive", "pdf_archive_gdrive")
        putString("estundnzettl_pdf_archive_last_run", "pdf_archive_last_run")
        putString("estundnzettl_pdf_archive_last_month", "pdf_archive_last_month")
        putStringNumber("estundnzettl_pdf_archive_fail_count", "pdf_archive_fail_count")
        putString("estundnzettl_pdf_archive_last_error", "pdf_archive_last_error")

        values["estundnzettl_live_timer"]?.let { raw ->
            val timer = parseOrNull(raw)
            if (timer is JsonObject) putSetting("live_timer", timer)
        }
        values.filterKeys { it.startsWith("estundnzettl_pdf_archive_last_hash_") }
            .forEach { (key, value) ->
                if (value.isNotEmpty()) putSetting(key, JsonPrimitive(value))
            }

        authEmail(values["google_auth_state"])
            ?.let { putSetting(GoogleDriveManager.KEY_ACCOUNT_EMAIL, JsonPrimitive(it)) }
        authEmail(values["google_auth_state_pdf"])
            ?.let { putSetting(GoogleDriveManager.KEY_PDF_ACCOUNT_EMAIL, JsonPrimitive(it)) }

        val entries = if (needsEntries) parseEntries(values["estundnzettl_entries"]) else emptyList()
        val workCodes = if (needsWorkCodes) parseWorkCodes(values["estundnzettl_work_codes"]) else emptyList()
        val attachments = if (needsAttachments) parseAttachments(values["estundnzettl_attachments"]) else emptyList()
        val labels = if (needsLabels) parseLabels(values["estundnzettl_attachment_labels"]) else emptyList()

        return LegacyLocalStorageData(
            entries = entries,
            settings = settings.values.toList(),
            workCodes = workCodes,
            attachments = attachments,
            labels = labels,
            legacyNextcloudSecret = values["estundnzettl_nextcloud_pass"]?.takeIf { it.isNotEmpty() },
        )
    }

    private fun parseEntries(raw: String?): List<EntryRow> = parseArray(raw, "entries").map { element ->
        val item = element.asObject("entry")
        val id = item.requiredLong("id")
        val type = item.string("type") ?: "work"
        val date = item.string("date") ?: error("Legacy entry $id has no date")
        check(Regex("\\d{4}-\\d{2}-\\d{2}").matches(date)) { "Legacy entry $id has an invalid date" }
        EntryRow(
            id = id,
            type = type,
            date = date,
            start = item.string("start"),
            end = item.string("end"),
            pause = item.int("pause") ?: 0,
            project = item.string("project"),
            code = item.int("code"),
            netDuration = item.int("netDuration") ?: 0,
        )
    }.also { rows ->
        check(rows.map { it.id }.distinct().size == rows.size) { "Duplicate legacy localStorage entry IDs" }
    }

    private fun parseWorkCodes(raw: String?): List<WorkCodeRow> = parseArray(raw, "work codes").map { element ->
        val item = element.asObject("work code")
        WorkCodeRow(item.requiredLong("id"), item.string("label") ?: "")
    }.also { rows ->
        check(rows.map { it.id }.distinct().size == rows.size) { "Duplicate legacy work-code IDs" }
    }

    private fun parseAttachments(raw: String?): List<AttachmentRow> = parseArray(raw, "attachments").map { element ->
        val item = element.asObject("attachment")
        AttachmentRow(
            id = item.string("id")?.takeIf { it.isNotEmpty() } ?: error("Legacy attachment has no ID"),
            entryId = item.requiredLong("entryId"),
            label = item.string("label") ?: "",
            fileName = item.string("fileName") ?: "",
            mimeType = item.string("mimeType") ?: "",
            storagePath = item.string("storagePath") ?: "",
            fileSize = item.long("fileSize") ?: 0,
            createdAt = item.string("createdAt") ?: "",
        )
    }.also { rows ->
        check(rows.map { it.id }.distinct().size == rows.size) { "Duplicate legacy attachment IDs" }
    }

    private fun parseLabels(raw: String?): List<AttachmentLabelRow> =
        parseArray(raw, "attachment labels").mapIndexedNotNull { index, element ->
            (element as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                ?.let { AttachmentLabelRow(it, index) }
        }.distinctBy { it.label }.take(20)

    private fun parseArray(raw: String?, label: String): JsonArray {
        if (raw.isNullOrEmpty() || raw == "undefined") return JsonArray(emptyList())
        return parseOrNull(raw) as? JsonArray
            ?: error("Legacy localStorage $label are malformed")
    }

    private fun parseOrNull(raw: String): JsonElement? =
        runCatching { json.parseToJsonElement(raw) }.getOrNull()

    private fun authEmail(raw: String?): String? {
        val state = raw?.let(::parseOrNull) as? JsonObject ?: return null
        if (state["nativeConnected"]?.jsonPrimitive?.booleanOrNull == false) return null
        return state.string("accountEmail")
            ?: (state["userInfo"] as? JsonObject)?.string("email")
    }

    private fun JsonElement.asObject(label: String): JsonObject =
        this as? JsonObject ?: error("Legacy $label is not an object")

    private fun JsonObject.string(key: String): String? =
        (get(key) as? JsonPrimitive)?.contentOrNull?.takeUnless { it == "null" }

    private fun JsonObject.int(key: String): Int? =
        (get(key) as? JsonPrimitive)?.let { it.intOrNull ?: it.contentOrNull?.toIntOrNull() }

    private fun JsonObject.long(key: String): Long? =
        (get(key) as? JsonPrimitive)?.let { it.longOrNull ?: it.contentOrNull?.toLongOrNull() }

    private fun JsonObject.requiredLong(key: String): Long =
        long(key) ?: error("Legacy object has no numeric $key")
}
