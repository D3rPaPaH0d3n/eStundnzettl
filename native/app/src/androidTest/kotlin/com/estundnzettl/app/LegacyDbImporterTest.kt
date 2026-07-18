package com.estundnzettl.app

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.estundnzettl.app.data.LegacyDbImportStatus
import com.estundnzettl.app.data.LegacyDbImporter
import com.estundnzettl.app.data.db.AppDatabase
import java.security.MessageDigest
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LegacyDbImporterTest {
    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private var room: AppDatabase? = null

    @Before
    fun cleanLegacyFile() {
        context.deleteDatabase(LEGACY_NAME)
    }

    @After
    fun cleanUp() {
        room?.close()
        context.deleteDatabase(LEGACY_NAME)
    }

    @Test
    fun importsVerifiesAndLeavesLegacyDatabaseUntouched() = runBlocking {
        createLegacyDatabase(validDate = "2026-07-18")
        val source = context.getDatabasePath(LEGACY_NAME)
        val before = sha256(source.readBytes())
        val db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build().also { room = it }
        val importer = LegacyDbImporter(context, db)

        val first = importer.importIfNeeded()
        assertEquals(LegacyDbImportStatus.IMPORTED, first.status)
        assertEquals(1, first.counts.entries)
        assertEquals("Lift", db.entryDao().getAll().single().project)
        assertEquals("\"Markus\"", db.settingsDao().getValue("test_name"))
        assertNotNull(db.settingsDao().getValue(LegacyDbImporter.MIGRATION_MARKER_KEY))
        assertNotNull(db.settingsDao().getValue(LegacyDbImporter.MIGRATION_REPORT_KEY))
        assertEquals(before, sha256(source.readBytes()))

        assertEquals(LegacyDbImportStatus.ALREADY_DONE, importer.importIfNeeded().status)
    }

    @Test
    fun invalidSourceRollsBackWithoutCompletionMarker() = runBlocking {
        createLegacyDatabase(validDate = "not-a-date")
        val db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build().also { room = it }

        runCatching { LegacyDbImporter(context, db).importIfNeeded() }

        assertEquals(emptyList<Any>(), db.entryDao().getAll())
        assertNull(db.settingsDao().getValue(LegacyDbImporter.MIGRATION_MARKER_KEY))
    }

    private fun createLegacyDatabase(validDate: String) {
        val database = SQLiteDatabase.openOrCreateDatabase(context.getDatabasePath(LEGACY_NAME), null)
        database.execSQL(
            """CREATE TABLE entries (id INTEGER PRIMARY KEY, type TEXT, date TEXT, start TEXT, `end` TEXT, pause INTEGER, project TEXT, code INTEGER, netDuration INTEGER)"""
        )
        database.execSQL(
            "INSERT INTO entries VALUES (42, 'work', ?, '08:00', '16:00', 30, 'Lift', 7, 450)",
            arrayOf(validDate),
        )
        database.execSQL("CREATE TABLE settings (`key` TEXT PRIMARY KEY, value TEXT NOT NULL)")
        database.execSQL("INSERT INTO settings VALUES ('test_name', '\"Markus\"')")
        database.execSQL("CREATE TABLE work_codes (id INTEGER PRIMARY KEY, label TEXT NOT NULL)")
        database.execSQL("INSERT INTO work_codes VALUES (7, 'Montage')")
        database.close()
    }

    private fun sha256(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    private companion object {
        const val LEGACY_NAME = "estundnzettlSQLite.db"
    }
}
