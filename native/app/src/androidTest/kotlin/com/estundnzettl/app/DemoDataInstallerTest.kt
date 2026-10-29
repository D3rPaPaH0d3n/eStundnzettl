package com.estundnzettl.app

import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.app.data.installDemoData
import kotlinx.coroutines.runBlocking
import org.junit.Test
import java.io.File
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue

@org.junit.runner.RunWith(androidx.test.ext.junit.runners.AndroidJUnit4::class)
class DemoDataInstallerTest {
    @Test
    fun demoDocumentsAreReadableAndReplacedOnReload() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.cacheDir, "demo-test-${System.nanoTime()}").apply { mkdirs() }
        val db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build()
        try {
            val today = LocalDate.of(2026, 10, 29)
            installDemoData(db, directory, today)
            val first = db.attachmentDao().getAll()
            assertEquals(6, first.size)
            val entryIds = db.entryDao().getAll().map { it.id }.toSet()
            first.forEach { attachment ->
                assertTrue(attachment.entryId in entryIds)
                val file = File(directory, attachment.storagePath)
                assertEquals(file.length(), attachment.fileSize)
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { fd ->
                    PdfRenderer(fd).use { renderer -> assertEquals(1, renderer.pageCount) }
                }
            }
            installDemoData(db, directory, today)
            assertEquals(6, db.attachmentDao().getAll().size)
            assertTrue(first.none { File(directory, it.storagePath).exists() })
        } finally {
            db.close()
            directory.deleteRecursively()
        }
    }
}
