package com.estundnzettl.app

import android.content.Context
import androidx.room.Room
import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.estundnzettl.app.data.ImportSnapshot
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.app.data.replaceFullSnapshot
import com.estundnzettl.app.data.toRow
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DataRestoreIntegrityTest {
    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private var database: AppDatabase? = null

    @get:Rule
    val migrationHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory(),
    )

    @After
    fun closeDatabase() {
        database?.close()
    }

    @Test
    fun versionOneSchemaCanBeCreatedFromExport() {
        val db = migrationHelper.createDatabase("schema-baseline.db", 1)
        val tables = db.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).use { cursor ->
            buildSet { while (cursor.moveToNext()) add(cursor.getString(0)) }
        }
        db.close()

        assertTrue("entries" in tables)
        assertTrue("settings" in tables)
        assertTrue("work_codes" in tables)
        assertTrue("attachments" in tables)
        assertTrue("attachment_labels" in tables)
        assertTrue("backup_metadata" in tables)
    }

    @Test
    fun fullSnapshotReplacesEntriesAtomically() = runBlocking {
        val db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build()
        database = db
        db.entryDao().upsert(entry(id = 1, project = "Alt").toRow())

        db.replaceFullSnapshot(
            ImportSnapshot(entries = listOf(entry(id = 2, project = "Neu")))
        )

        val entries = db.entryDao().getAll()
        assertEquals(1, entries.size)
        assertEquals(2L, entries.single().id)
        assertEquals("Neu", entries.single().project)
    }

    private fun entry(id: Long, project: String) = Entry(
        id = EntryId.of(id),
        type = EntryType.WORK,
        date = "2026-07-17",
        start = "08:00",
        end = "16:00",
        pause = 30,
        project = project,
        code = 1,
        netDuration = 450,
    )
}
