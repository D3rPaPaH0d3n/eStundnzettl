package com.estundnzettl.app.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

/**
 * DAOs — Query-Semantik (Sortierung, Konfliktverhalten, gekoppelte
 * Löschungen) entspricht den Repositories der TS-App
 * (src/db/repositories/*.ts).
 */

@Dao
interface EntryDao {

    /** Alle Entries, sortiert nach Datum absteigend (neueste zuerst). */
    @Query("SELECT * FROM entries ORDER BY date DESC, id DESC")
    fun observeAll(): Flow<List<EntryRow>>

    @Query("SELECT * FROM entries ORDER BY date DESC, id DESC")
    suspend fun getAll(): List<EntryRow>

    @Query("SELECT * FROM entries WHERE id = :id")
    suspend fun getById(id: Long): EntryRow?

    /** INSERT OR REPLACE, wie insertEntry in der TS-App. */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: EntryRow)

    /**
     * Entry + zugehörige Attachments atomar löschen
     * (Verhalten von deleteEntryFromDb).
     */
    @Transaction
    suspend fun deleteWithAttachments(id: Long) {
        deleteAttachmentsForEntry(id)
        deleteById(id)
    }

    @Query("DELETE FROM attachments WHERE entryId = :entryId")
    suspend fun deleteAttachmentsForEntry(entryId: Long)

    @Query("DELETE FROM entries WHERE id = :id")
    suspend fun deleteById(id: Long)

    /** Alle Entries + Attachments löschen (deleteAllEntriesFromDb). */
    @Transaction
    suspend fun deleteAllWithAttachments() {
        deleteAllAttachments()
        deleteAll()
    }

    @Query("DELETE FROM attachments")
    suspend fun deleteAllAttachments()

    @Query("DELETE FROM entries")
    suspend fun deleteAll()

    /** Bulk-Insert für Migration/Import — ersetzt alle bestehenden Entries. */
    @Transaction
    suspend fun replaceAll(entries: List<EntryRow>) {
        deleteAll()
        insertAll(entries)
    }

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entries: List<EntryRow>)
}

@Dao
interface SettingsDao {

    @Query("SELECT value FROM settings WHERE `key` = :key")
    suspend fun getValue(key: String): String?

    @Query("SELECT value FROM settings WHERE `key` = :key")
    fun observeValue(key: String): Flow<String?>

    @Query("SELECT * FROM settings")
    suspend fun getAll(): List<SettingRow>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun put(setting: SettingRow)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun putAll(settings: List<SettingRow>)

    @Query("DELETE FROM settings WHERE `key` = :key")
    suspend fun delete(key: String)
}

@Dao
interface WorkCodeDao {

    @Query("SELECT * FROM work_codes ORDER BY id ASC")
    fun observeAll(): Flow<List<WorkCodeRow>>

    @Query("SELECT * FROM work_codes ORDER BY id ASC")
    suspend fun getAll(): List<WorkCodeRow>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(code: WorkCodeRow)

    @Query("DELETE FROM work_codes WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM work_codes")
    suspend fun deleteAll()

    @Transaction
    suspend fun replaceAll(codes: List<WorkCodeRow>) {
        deleteAll()
        insertAll(codes)
    }

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(codes: List<WorkCodeRow>)
}

@Dao
interface AttachmentDao {

    @Query("SELECT * FROM attachments WHERE entryId = :entryId ORDER BY createdAt ASC")
    suspend fun getForEntry(entryId: Long): List<AttachmentRow>

    @Query("SELECT * FROM attachments")
    suspend fun getAll(): List<AttachmentRow>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(attachment: AttachmentRow)

    @Query("DELETE FROM attachments WHERE id = :id")
    suspend fun deleteById(id: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(attachments: List<AttachmentRow>)
}

@Dao
interface AttachmentLabelDao {

    @Query("SELECT * FROM attachment_labels ORDER BY position ASC")
    suspend fun getAll(): List<AttachmentLabelRow>

    /** MRU-Liste komplett ersetzen (max. 20 Einträge, position 0 = neueste). */
    @Transaction
    suspend fun replaceAll(labels: List<AttachmentLabelRow>) {
        deleteAll()
        insertAll(labels)
    }

    @Query("DELETE FROM attachment_labels")
    suspend fun deleteAll()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(labels: List<AttachmentLabelRow>)
}

@Dao
interface BackupMetadataDao {

    @Query("SELECT * FROM backup_metadata ORDER BY id DESC")
    suspend fun getAll(): List<BackupMetadataRow>

    @Insert
    suspend fun insert(row: BackupMetadataRow): Long

    @Query("DELETE FROM backup_metadata")
    suspend fun deleteAll()
}
