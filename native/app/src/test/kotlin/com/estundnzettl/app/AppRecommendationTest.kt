package com.estundnzettl.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppRecommendationTest {
    @Test
    fun `recommendation contains the Play Store link and no donation link`() {
        val text = buildAppRecommendationText("Kostenlos und offline:")

        assertEquals("Kostenlos und offline:\n\n$APP_PLAY_STORE_URL", text)
        assertTrue(text.contains("play.google.com/store/apps/details"))
        assertFalse(text.contains("revolut", ignoreCase = true))
    }
}
