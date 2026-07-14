package com.estundnzettl.app.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * Zentrale Room-Datenbank. Name und Tabellen entsprechen der SQLite-DB
 * der Capacitor-App ("estundnzettl", siehe src/db/schema.ts), damit der
 * spätere Datenimport 1:1 zeilenweise übernehmen kann.
 */
@Database(
    entities = [
        EntryRow::class,
        SettingRow::class,
        WorkCodeRow::class,
        AttachmentRow::class,
        AttachmentLabelRow::class,
        BackupMetadataRow::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun entryDao(): EntryDao
    abstract fun settingsDao(): SettingsDao
    abstract fun workCodeDao(): WorkCodeDao
    abstract fun attachmentDao(): AttachmentDao
    abstract fun attachmentLabelDao(): AttachmentLabelDao
    abstract fun backupMetadataDao(): BackupMetadataDao

    /**
     * Erzwingt einen WAL-Checkpoint (TRUNCATE), damit alle Daten in der
     * Hauptdatei landen. Ohne das lebt der komplette Datenbestand im
     * -wal-File und kann bei einem harten Prozess-Kill (z. B. App-Update)
     * verloren gehen, wenn SQLite den WAL beim nächsten Öffnen verwirft.
     */
    suspend fun checkpoint() {
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            runCatching {
                openHelper.writableDatabase
                    .query("PRAGMA wal_checkpoint(TRUNCATE)")
                    .use { it.moveToFirst() }
            }
        }
    }

    companion object {
        const val DB_NAME = "estundnzettl"

        @Volatile
        private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DB_NAME,
                ).build().also { instance = it }
            }
    }
}
