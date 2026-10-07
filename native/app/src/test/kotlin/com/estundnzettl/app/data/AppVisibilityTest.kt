package com.estundnzettl.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppVisibilityTest {

    @Test
    fun `tracks foreground state and counts every transition`() {
        val visibility = AppVisibility()
        assertFalse(visibility.isForeground)

        visibility.onStart()
        assertTrue(visibility.isForeground)
        assertEquals(1, visibility.foregroundEntries.value)
        assertEquals(0, visibility.backgroundEntries)

        visibility.onStop()
        assertFalse(visibility.isForeground)
        assertEquals(1, visibility.backgroundEntries)

        // Recreated activity on return: a new onStart is a new foreground entry.
        visibility.onStart()
        assertTrue(visibility.isForeground)
        assertEquals(2, visibility.foregroundEntries.value)
    }
}
