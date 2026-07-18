package com.estundnzettl.app.data.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room-Entities — Tabellen- und Spaltennamen entsprechen 1:1 dem SQLite-
 * Schema der Capacitor-App (src/db/schema.ts), damit ein Datenimport aus
 * der bestehenden DB zeilenweise und ohne Umbenennungen möglich ist.
 */

/**
 * Entries-Tabelle (Welle 1). IDs werden wie in der TS-App von der
 * Anwendung generiert (siehe EntryIdGenerator) — kein AUTOINCREMENT.
 */
@Entity(
    tableName = "entries",
    indices = [Index(value = ["date"], name = "idx_entries_date")],
)
data class EntryRow(
    @PrimaryKey val id: Long,
    val type: String = "work",
    val date: String,
    val start: String? = null,
    @ColumnInfo(name = "end") val end: String? = null,
    val pause: Int = 0,
    val project: String? = null,
    val code: Int? = null,
    val netDuration: Int = 0,
)

/**
 * Settings-Tabelle (Welle 2) — Key-Value-Store. Values sind JSON-Strings
 * (auch für primitive Werte), identisch zur TS-App.
 */
@Entity(tableName = "settings")
data class SettingRow(
    @PrimaryKey val key: String,
    val value: String,
)

/** WorkCodes-Tabelle (Welle 2) — Tätigkeitscodes im { id, label } Format. */
@Entity(tableName = "work_codes")
data class WorkCodeRow(
    @PrimaryKey val id: Long,
    val label: String,
)

/**
 * Attachments-Tabelle (Welle 3) — nur Metadaten; die Dateien liegen im
 * App-Dateisystem. entryId verweist logisch auf entries.id (bewusst kein
 * FOREIGN KEY Constraint, wie in der TS-App).
 */
@Entity(
    tableName = "attachments",
    indices = [Index(value = ["entryId"], name = "idx_attachments_entry")],
)
data class AttachmentRow(
    @PrimaryKey val id: String,
    val entryId: Long,
    val label: String = "",
    val fileName: String = "",
    val mimeType: String = "",
    val storagePath: String = "",
    val fileSize: Long = 0,
    val createdAt: String = "",
)

/**
 * Label-Suggestions-Tabelle (Welle 3) — die letzten 20 verwendeten
 * Attachment-Labels als MRU-Liste. position: 0 = neueste, aufsteigend.
 */
@Entity(tableName = "attachment_labels")
data class AttachmentLabelRow(
    @PrimaryKey val label: String,
    val position: Int = 0,
)

/** Backup-Metadaten-Tabelle (Welle 4). */
@Entity(tableName = "backup_metadata")
data class BackupMetadataRow(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: String? = null,
    val timestamp: String? = null,
    @ColumnInfo(name = "size_bytes") val sizeBytes: Long? = null,
    val location: String? = null,
)
