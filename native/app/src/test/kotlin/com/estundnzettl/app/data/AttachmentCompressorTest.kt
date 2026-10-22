package com.estundnzettl.app.data

import org.junit.Assert.assertEquals
import org.junit.Test

class AttachmentCompressorTest {
    @Test
    fun `compressed photo keeps its name with a jpg extension`() {
        assertEquals("IMG_2041.jpg", compressedImageFileName("IMG_2041.png"))
        assertEquals("Krankmeldung.jpg", compressedImageFileName("Krankmeldung"))
        assertEquals("foto.jpg", compressedImageFileName(".webp"))
    }
}
