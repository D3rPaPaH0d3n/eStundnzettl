package com.estundnzettl.app.pdf

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AttachmentRasterizerTest {
    @Test
    fun `a4 content box rasters at the small attachment resolution`() {
        // 559 x 784 pt Anhang-Fläche bei 110 dpi
        assertEquals(854 to 1197, rasterSizeForBox(559f, 784f))
    }

    @Test
    fun `large photo is fitted inside the box keeping its aspect ratio`() {
        assertEquals(800 to 600, fitInside(4000, 3000, 800, 1200))
        assertEquals(750 to 1000, fitInside(3000, 4000, 2000, 1000))
    }

    @Test
    fun `small images are never upscaled`() {
        assertEquals(400 to 300, fitInside(400, 300, 853, 1197))
    }

    @Test
    fun `sample size halves only while the target is still covered`() {
        assertEquals(4, decodeSampleSize(4000, 3000, 853, 640))
        assertEquals(1, decodeSampleSize(800, 600, 853, 640))
        val sample = decodeSampleSize(4000, 3000, 853, 640)
        assertTrue(4000 / sample >= 853 && 3000 / sample >= 640)
    }
}
