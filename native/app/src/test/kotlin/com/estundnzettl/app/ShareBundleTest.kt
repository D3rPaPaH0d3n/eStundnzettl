package com.estundnzettl.app

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
