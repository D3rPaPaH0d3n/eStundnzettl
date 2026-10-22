package com.estundnzettl.app

import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.EntryId
import org.junit.Assert.assertEquals
import org.junit.Test

class ShareBundleTest {
    @Test
    fun `report with pdf originals is shared as pdf`() {
        assertEquals(
            "application/pdf",
            commonShareMimeType(listOf("application/pdf", "application/pdf")),
        )
    }

    @Test
    fun `images only share the image family`() {
        assertEquals("image/*", commonShareMimeType(listOf("image/jpeg", "image/png")))
    }

    @Test
    fun `mixed families fall back to wildcard`() {
        assertEquals("*/*", commonShareMimeType(listOf("application/pdf", "image/jpeg")))
        assertEquals("*/*", commonShareMimeType(emptyList()))
    }

    private fun attachment(id: String, mimeType: String) = Attachment(
        id = id, entryId = EntryId.of(1), label = id, fileName = "$id.bin", mimeType = mimeType,
        storagePath = "attachments/$id", fileSize = 1, createdAt = "2026-10-14T08:00:00Z",
    )

    @Test
    fun `messengers get no originals when the documents are embedded`() {
        val attachments = listOf(attachment("a", "application/pdf"), attachment("b", "image/jpeg"))
        assertEquals(emptyList<Attachment>(), messengerShareAttachments(attachments, embedded = true))
    }

    @Test
    fun `messengers get only pdf originals when nothing is embedded`() {
        val attachments = listOf(attachment("a", "application/pdf"), attachment("b", "image/jpeg"))
        assertEquals(listOf("a"), messengerShareAttachments(attachments, embedded = false).map { it.id })
    }

    @Test
    fun `original gets date and label instead of storage id`() {
        val taken = mutableSetOf<String>()
        assertEquals(
            "2026-10-14_Krankenstand.pdf",
            attachmentShareFileName("Krankenstand", "2026-10-14", "application/pdf", "attachments/att_1_x.pdf", taken),
        )
    }

    @Test
    fun `duplicate names get a counter and unsafe characters are replaced`() {
        val taken = mutableSetOf<String>()
        val first = attachmentShareFileName("Arzt / Befund", "2026-10-14", "image/jpeg", "attachments/a.jpeg", taken)
        val second = attachmentShareFileName("Arzt / Befund", "2026-10-14", "image/jpeg", "attachments/b.jpeg", taken)
        assertEquals("2026-10-14_Arzt_Befund.jpg", first)
        assertEquals("2026-10-14_Arzt_Befund_2.jpg", second)
    }

    @Test
    fun `unknown type keeps the stored extension`() {
        assertEquals(
            "Dokument.heic",
            attachmentShareFileName("  ", null, "application/octet-stream", "attachments/att_1.HEIC", mutableSetOf()),
        )
    }
}
