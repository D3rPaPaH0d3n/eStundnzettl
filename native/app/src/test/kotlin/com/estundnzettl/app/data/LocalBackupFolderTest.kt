package com.estundnzettl.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LocalBackupFolderTest {

    @Test
    fun `a folder that is already named eStundnzettl is used directly`() {
        assertNull(preferredBackupDirectoryName("eStundnzettl"))
        assertNull(preferredBackupDirectoryName("ESTUNDNZETTL"))
    }

    @Test
    fun `any other folder gets an eStundnzettl child`() {
        assertEquals("eStundnzettl", preferredBackupDirectoryName("Downloads"))
        assertEquals("eStundnzettl", preferredBackupDirectoryName(null))
    }

    @Test
    fun `canonical backup file wins over dated copies`() {
        assertEquals(
            "estundnzettl_backup.json",
            chooseBackupFileName(
                listOf(
                    "estundnzettl_backup_2026-01-01.json",
                    "estundnzettl_backup.json",
                    "notes.txt",
                ),
            ),
        )
    }

    @Test
    fun `newest dated copy is used when the canonical file is missing`() {
        assertEquals(
            "estundnzettl_backup_2026-10-05.json",
            chooseBackupFileName(
                listOf(
                    "estundnzettl_backup_2026-09-01.json",
                    "estundnzettl_backup_2026-10-05.json",
                ),
            ),
        )
    }

    @Test
    fun `unrelated files are not a backup`() {
        assertNull(chooseBackupFileName(listOf("readme.txt", "photo.jpg")))
    }
}
