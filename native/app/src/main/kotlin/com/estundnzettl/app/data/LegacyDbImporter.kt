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

/**
 * Einmalige Datenübernahme aus der SQLite-DB der Capacitor-App.
 *
 * @capacitor-community/sqlite legt die Datenbank als
 * `databases/<name>SQLite.db` im App-Datenverzeichnis ab. Da die native
 * App dieselbe applicationId behält, liegt die Alt-DB nach dem Update im
 * eigenen Datenverzeichnis und kann zeilenweise kopiert werden — das
 * Schema ist identisch (siehe Entities.kt).
 */
class LegacyDbImporter(
    private val context: Context,
    private val db: AppDatabase,
) {

    companion object {
        private const val TAG = "LegacyDbImporter"

        /** Marker-Setting: Import wurde durchgeführt (Wert = ISO-Timestamp). */
        const val MIGRATION_MARKER_KEY = "native_migration_done"

        /** Kandidaten-Dateinamen des Capacitor-SQLite-Plugins. */
        private val LEGACY_DB_CANDIDATES = listOf(
            "estundnzettlSQLite.db",
            "estundnzettl.db",
        )
    }

    fun findLegacyDbFile(): File? {
        // Plugin-Standard: <data>/databases/<name>SQLite.db
        val databasesDir = context.getDatabasePath("probe").parentFile ?: return null
        return LEGACY_DB_CANDIDATES
            .map { File(databasesDir, it) }
            .firstOrNull { it.exists() && it.length() > 0 }
    }

    /**
     * Importiert die Alt-Daten, wenn (a) eine Legacy-DB existiert und
     * (b) der Import noch nie gelaufen ist. Liefert true bei erfolgtem
     * Import. Die Alt-DB bleibt unangetastet (Rollback-Sicherheit — sie
     * wird erst in einer späteren Version aufgeräumt).
     */
    suspend fun importIfNeeded(): Boolean {
        val marker = db.settingsDao().getValue(MIGRATION_MARKER_KEY)
        if (marker != null) return false
        val legacyFile = findLegacyDbFile() ?: return false

        val legacy = SQLiteDatabase.openDatabase(
            legacyFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY
        )
        try {
            val entries = legacy.readTable("entries") { c ->
                EntryRow(
                    id = c.getLong(c.getColumnIndexOrThrow("id")),
                    type = c.getStringOr("type") ?: "work",
                    date = c.getStringOr("date") ?: "",
                    start = c.getStringOr("start"),
                    end = c.getStringOr("end"),
                    pause = c.getIntOr("pause") ?: 0,
                    project = c.getStringOr("project"),
                    code = c.getIntOr("code"),
                    netDuration = c.getIntOr("netDuration") ?: 0,
                )
            }
            val settings = legacy.readTable("settings") { c ->
                SettingRow(
                    key = c.getStringOr("key") ?: "",
                    value = c.getStringOr("value") ?: "",
                )
            }.filter { it.key.isNotEmpty() }
            val workCodes = legacy.readTable("work_codes") { c ->
                WorkCodeRow(
                    id = c.getLong(c.getColumnIndexOrThrow("id")),
                    label = c.getStringOr("label") ?: "",
                )
            }
            val attachments = legacy.readTable("attachments") { c ->
                AttachmentRow(
                    id = c.getStringOr("id") ?: "",
                    entryId = c.getLongOr("entryId") ?: 0,
                    label = c.getStringOr("label") ?: "",
                    fileName = c.getStringOr("fileName") ?: "",
                    mimeType = c.getStringOr("mimeType") ?: "",
                    storagePath = c.getStringOr("storagePath") ?: "",
                    fileSize = c.getLongOr("fileSize") ?: 0,
                    createdAt = c.getStringOr("createdAt") ?: "",
                )
            }.filter { it.id.isNotEmpty() }
            val labels = legacy.readTable("attachment_labels") { c ->
                AttachmentLabelRow(
                    label = c.getStringOr("label") ?: "",
                    position = c.getIntOr("position") ?: 0,
                )
            }.filter { it.label.isNotEmpty() }
            val backupMetadata = legacy.readTable("backup_metadata") { c ->
                BackupMetadataRow(
                    id = c.getLongOr("id") ?: 0,
                    type = c.getStringOr("type"),
                    timestamp = c.getStringOr("timestamp"),
                    sizeBytes = c.getLongOr("size_bytes"),
                    location = c.getStringOr("location"),
                )
            }

            db.withTransaction {
                db.entryDao().insertAll(entries)
                db.settingsDao().putAll(settings)
                db.workCodeDao().insertAll(workCodes)
                db.attachmentDao().insertAll(attachments)
                db.attachmentLabelDao().insertAll(labels)
                backupMetadata.forEach { db.backupMetadataDao().insert(it.copy(id = 0)) }
                db.settingsDao().put(
                    SettingRow(MIGRATION_MARKER_KEY, "\"${java.time.Instant.now()}\"")
                )
            }

            Log.i(TAG, "Legacy-Import: ${entries.size} entries, ${settings.size} settings, " +
                "${workCodes.size} codes, ${attachments.size} attachments übernommen")
            return true
        } finally {
            legacy.close()
        }
    }

    /** Liest eine Tabelle vollständig; fehlende Tabellen ergeben eine leere Liste. */
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
    val idx = getColumnIndex(column)
    return if (idx >= 0 && !isNull(idx)) getString(idx) else null
}

private fun Cursor.getIntOr(column: String): Int? {
    val idx = getColumnIndex(column)
    return if (idx >= 0 && !isNull(idx)) getInt(idx) else null
}

private fun Cursor.getLongOr(column: String): Long? {
    val idx = getColumnIndex(column)
    return if (idx >= 0 && !isNull(idx)) getLong(idx) else null
}
