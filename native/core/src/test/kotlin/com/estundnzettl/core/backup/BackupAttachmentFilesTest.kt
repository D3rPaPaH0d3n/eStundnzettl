package com.estundnzettl.core.backup

import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class BackupAttachmentFilesTest {

    private val entry = Entry(EntryId.of(1L), EntryType.SICK, "2026-10-14", null, null, 0, null, null, 480)
    private val attachment = Attachment(
        "att-1", EntryId.of(1L), "Krankmeldung", "km.jpg", "image/jpeg",
        "attachments/att-1.jpg", 3, "2026-10-14T08:00:00.000Z",
    )

    private fun compose(files: Map<String, String>) = composeBackupPayload(
        sections = BackupSections(entries = listOf(entry), attachments = listOf(attachment), attachmentFiles = files),
        note = "test",
        lastModified = "2026-10-22T10:00:00.000Z",
        timezone = "Europe/Vienna",
    )

    @Test
    fun `Dokument-Inhalte ueberstehen Backup und Analyse`() {
        val analysis = analyzeBackupData(compose(mapOf("att-1" to "AQID")))
        assertEquals(mapOf("att-1" to "AQID"), analysis.attachmentFiles)
        assertEquals(BackupIntegrity.VERIFIED, analysis.integrity)
    }

    @Test
    fun `Backups ohne Dokument-Inhalte bleiben unveraendert`() {
        assertFalse(compose(emptyMap()).containsKey("attachmentFiles"))
    }

    @Test
    fun `Inhalte ohne passendes Dokument werden verworfen`() {
        val analysis = analyzeBackupData(compose(mapOf("att-1" to "AQID", "fremd" to "BAUG")))
        assertEquals(setOf("att-1"), analysis.attachmentFiles.keys)
    }
}
