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
