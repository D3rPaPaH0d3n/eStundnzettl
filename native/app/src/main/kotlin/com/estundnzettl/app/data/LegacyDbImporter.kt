package com.estundnzettl.app.data

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import androidx.room.withTransaction
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.app.data.db.AttachmentLabelRow
import com.estundnzettl.app.data.db.AttachmentRow
import com.estundnzettl.app.data.db.BackupMetadataRow
import com.estundnzettl.app.data.db.EntryRow
import com.estundnzettl.app.data.db.SettingRow
import com.estundnzettl.app.data.db.WorkCodeRow
import java.io.File
import java.time.Instant
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

enum class LegacyDbImportStatus { NOT_FOUND, ALREADY_DONE, IMPORTED }

data class LegacyMigrationCounts(
    val entries: Int = 0,
    val settings: Int = 0,
    val workCodes: Int = 0,
    val attachments: Int = 0,
    val attachmentLabels: Int = 0,
    val backupMetadata: Int = 0,
)

data class LegacyDbImportResult(
    val status: LegacyDbImportStatus,
    val sourceFile: String? = null,
    val counts: LegacyMigrationCounts = LegacyMigrationCounts(),
)

/**
 * One-time, rollback-safe import from the Capacitor SQLite database.
 *
 * The legacy database is opened read-only and never renamed or deleted. The
 * complete copy, its verification and the completion marker share one Room
 * transaction, so a failed import can be retried on the next start.
 */
class LegacyDbImporter(
    private val context: Context,
    private val db: AppDatabase,
) {

    companion object {
        private const val TAG = "LegacyDbImporter"
        const val MIGRATION_MARKER_KEY = "native_migration_done"
        const val MIGRATION_REPORT_KEY = "native_migration_report"

        private val LEGACY_DB_CANDIDATES = listOf(
            "estundnzettlSQLite.db",
            "estundnzettl.db",
        )
        private val DATE_PATTERN = Regex("\\d{4}-\\d{2}-\\d{2}")
        private val ENTRY_TYPES = setOf("work", "vacation", "sick", "public_holiday", "time_comp")
    }

    fun findLegacyDbFile(): File? {
        val databasesDir = context.getDatabasePath("probe").parentFile ?: return null
        return LEGACY_DB_CANDIDATES
            .map { File(databasesDir, it) }
            .firstOrNull { it.exists() && it.length() > 0 }
    }

    suspend fun importIfNeeded(): LegacyDbImportResult {
        if (db.settingsDao().getValue(MIGRATION_MARKER_KEY) != null) {
            return LegacyDbImportResult(LegacyDbImportStatus.ALREADY_DONE)
        }
        val legacyFile = findLegacyDbFile()
            ?: return LegacyDbImportResult(LegacyDbImportStatus.NOT_FOUND)

        ensureDestinationIsEmpty()

        val legacy = SQLiteDatabase.openDatabase(
            legacyFile.absolutePath,
            null,
            SQLiteDatabase.OPEN_READONLY,
        )
        try {
            val entries = legacy.readTable("entries") { cursor ->
                EntryRow(
                    id = cursor.getLong(cursor.getColumnIndexOrThrow("id")),
                    type = cursor.getStringOr("type") ?: "work",
                    date = cursor.getStringOr("date") ?: "",
                    start = cursor.getStringOr("start"),
                    end = cursor.getStringOr("end"),
                    pause = cursor.getIntOr("pause") ?: 0,
                    project = cursor.getStringOr("project"),
                    code = cursor.getIntOr("code"),
                    netDuration = cursor.getIntOr("netDuration") ?: 0,
                )
            }
            val settings = legacy.readTable("settings") { cursor ->
                SettingRow(
                    key = cursor.getStringOr("key") ?: "",
                    value = cursor.getStringOr("value") ?: "",
                )
            }.filter { it.key.isNotEmpty() }
            val workCodes = legacy.readTable("work_codes") { cursor ->
                WorkCodeRow(
                    id = cursor.getLong(cursor.getColumnIndexOrThrow("id")),
                    label = cursor.getStringOr("label") ?: "",
                )
            }
            val attachments = legacy.readTable("attachments") { cursor ->
                AttachmentRow(
                    id = cursor.getStringOr("id") ?: "",
                    entryId = cursor.getLongOr("entryId") ?: 0,
                    label = cursor.getStringOr("label") ?: "",
                    fileName = cursor.getStringOr("fileName") ?: "",
                    mimeType = cursor.getStringOr("mimeType") ?: "",
                    storagePath = cursor.getStringOr("storagePath") ?: "",
                    fileSize = cursor.getLongOr("fileSize") ?: 0,
                    createdAt = cursor.getStringOr("createdAt") ?: "",
                )
            }
            val labels = legacy.readTable("attachment_labels") { cursor ->
                AttachmentLabelRow(
                    label = cursor.getStringOr("label") ?: "",
                    position = cursor.getIntOr("position") ?: 0,
                )
            }
            val backupMetadata = legacy.readTable("backup_metadata") { cursor ->
                BackupMetadataRow(
                    id = cursor.getLongOr("id") ?: 0,
                    type = cursor.getStringOr("type"),
                    timestamp = cursor.getStringOr("timestamp"),
                    sizeBytes = cursor.getLongOr("size_bytes"),
                    location = cursor.getStringOr("location"),
                )
            }

            validateSource(entries, settings, workCodes, attachments, labels)
            val counts = LegacyMigrationCounts(
                entries = entries.size,
                settings = settings.size,
                workCodes = workCodes.size,
                attachments = attachments.size,
                attachmentLabels = labels.size,
                backupMetadata = backupMetadata.size,
            )
            val completedAt = Instant.now().toString()

            db.withTransaction {
                db.entryDao().insertAll(entries)
                db.settingsDao().putAll(settings)
                db.workCodeDao().insertAll(workCodes)
                db.attachmentDao().insertAll(attachments)
                db.attachmentLabelDao().insertAll(labels)
                backupMetadata.forEach { db.backupMetadataDao().insert(it.copy(id = 0)) }

                check(db.entryDao().getAll().toSet() == entries.toSet()) {
                    "Entry verification after legacy import failed"
                }
                check(db.workCodeDao().getAll().toSet() == workCodes.toSet()) {
                    "Work-code verification after legacy import failed"
                }
                check(db.attachmentDao().getAll().toSet() == attachments.toSet()) {
                    "Attachment verification after legacy import failed"
                }
                check(db.attachmentLabelDao().getAll().toSet() == labels.toSet()) {
                    "Attachment-label verification after legacy import failed"
                }
                check(db.backupMetadataDao().getAll().size == backupMetadata.size) {
                    "Backup metadata verification after legacy import failed"
                }
                val writtenSettings = db.settingsDao().getAll().associate { it.key to it.value }
                check(settings.all { writtenSettings[it.key] == it.value }) {
                    "Settings verification after legacy import failed"
                }

                val report = buildJsonObject {
                    put("source", legacyFile.name)
                    put("completedAt", completedAt)
                    put("entries", counts.entries)
                    put("settings", counts.settings)
                    put("workCodes", counts.workCodes)
                    put("attachments", counts.attachments)
                    put("attachmentLabels", counts.attachmentLabels)
                    put("backupMetadata", counts.backupMetadata)
                }
                db.settingsDao().putAll(
                    listOf(
                        SettingRow(MIGRATION_MARKER_KEY, JsonPrimitive(completedAt).toString()),
                        SettingRow(MIGRATION_REPORT_KEY, report.toString()),
                    )
                )
            }

            Log.i(TAG, "Verified Capacitor import: $counts")
            return LegacyDbImportResult(
                status = LegacyDbImportStatus.IMPORTED,
                sourceFile = legacyFile.absolutePath,
                counts = counts,
            )
        } finally {
            legacy.close()
        }
    }

    private suspend fun ensureDestinationIsEmpty() {
        val populated = buildList {
            if (db.entryDao().getAll().isNotEmpty()) add("entries")
            if (db.settingsDao().getAll().isNotEmpty()) add("settings")
            if (db.workCodeDao().getAll().isNotEmpty()) add("work_codes")
            if (db.attachmentDao().getAll().isNotEmpty()) add("attachments")
            if (db.attachmentLabelDao().getAll().isNotEmpty()) add("attachment_labels")
            if (db.backupMetadataDao().getAll().isNotEmpty()) add("backup_metadata")
        }
        check(populated.isEmpty()) {
            "Legacy import refused because the native destination is not empty: ${populated.joinToString()}"
        }
    }

    private fun validateSource(
        entries: List<EntryRow>,
        settings: List<SettingRow>,
        workCodes: List<WorkCodeRow>,
        attachments: List<AttachmentRow>,
        labels: List<AttachmentLabelRow>,
    ) {
        check(entries.map { it.id }.distinct().size == entries.size) { "Duplicate entry IDs in legacy database" }
        check(entries.all { it.id > 0 && it.type in ENTRY_TYPES && DATE_PATTERN.matches(it.date) }) {
            "Invalid entry in legacy database"
        }
        check(settings.map { it.key }.distinct().size == settings.size) { "Duplicate setting keys in legacy database" }
        check(workCodes.map { it.id }.distinct().size == workCodes.size) { "Duplicate work-code IDs in legacy database" }
        check(attachments.map { it.id }.distinct().size == attachments.size && attachments.all { it.id.isNotBlank() }) {
            "Invalid attachment IDs in legacy database"
        }
        check(labels.map { it.label }.distinct().size == labels.size && labels.all { it.label.isNotBlank() }) {
            "Invalid attachment labels in legacy database"
        }
    }

    private fun <T> SQLiteDatabase.readTable(table: String, mapper: (Cursor) -> T): List<T> {
        if (!hasTable(table)) return emptyList()
        return rawQuery("SELECT * FROM $table", null).use { cursor ->
            buildList {
                while (cursor.moveToNext()) add(mapper(cursor))
            }
        }
    }

    private fun SQLiteDatabase.hasTable(table: String): Boolean =
        rawQuery(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
            arrayOf(table),
        ).use { it.moveToFirst() }
}

private fun Cursor.getStringOr(column: String): String? {
    val index = getColumnIndex(column)
    return if (index >= 0 && !isNull(index)) getString(index) else null
}

private fun Cursor.getIntOr(column: String): Int? {
    val index = getColumnIndex(column)
    return if (index >= 0 && !isNull(index)) getInt(index) else null
}

private fun Cursor.getLongOr(column: String): Long? {
    val index = getColumnIndex(column)
    return if (index >= 0 && !isNull(index)) getLong(index) else null
}
