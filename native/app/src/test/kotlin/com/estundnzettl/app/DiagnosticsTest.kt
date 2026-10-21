package com.estundnzettl.app

import com.estundnzettl.app.data.DriveProbe
import com.estundnzettl.app.data.GoogleDriveManager
import com.estundnzettl.app.data.maskAccount
import com.estundnzettl.app.data.sha1Fingerprint
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DiagnosticsTest {

    @Test
    fun `account is shortened to first letter and domain`() {
        assertEquals("m***@example.org", maskAccount("markus@example.org"))
    }

    @Test
    fun `account without domain still hides everything after the first letter`() {
        assertEquals("n***", maskAccount("nextclouduser"))
    }

    @Test
    fun `signing fingerprint uses the colon format of the Cloud Console`() {
        assertEquals(
            "A9:99:3E:36:47:06:81:6A:BA:3E:25:71:78:50:C2:6C:9C:D0:D8:9D",
            sha1Fingerprint("abc".toByteArray()),
        )
    }

    @Test
    fun `blank account stays absent instead of showing an empty row`() {
        assertNull(maskAccount(null))
        assertNull(maskAccount(""))
        assertNull(maskAccount("   "))
    }

    @Test
    fun `duplicate backup files are reported with their count`() {
        val probe = DriveProbe.Loaded(
            listOf(
                file("estundnzettl_backup.json", "2026-09-10T10:00:00.000Z"),
                file("estundnzettl_backup.json", "2024-02-01T10:00:00.000Z"),
                file("kogler_backup.json", "2023-01-01T10:00:00.000Z"),
            )
        )

        assertEquals(mapOf("estundnzettl_backup.json" to 2), probe.duplicates)
    }

    @Test
    fun `a single file per name is not flagged`() {
        val probe = DriveProbe.Loaded(
            listOf(
                file("estundnzettl_backup.json", "2026-09-10T10:00:00.000Z"),
                file("kogler_backup.json", "2023-01-01T10:00:00.000Z"),
            )
        )

        assertTrue(probe.duplicates.isEmpty())
    }

    private fun file(name: String, modified: String) = GoogleDriveManager.AppDataFile(
        id = name + modified,
        name = name,
        sizeBytes = 1024,
        modifiedTime = modified,
    )
}
