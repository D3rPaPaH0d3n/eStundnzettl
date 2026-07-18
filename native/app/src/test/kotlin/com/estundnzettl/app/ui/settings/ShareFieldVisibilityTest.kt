package com.estundnzettl.app.ui.settings

import org.junit.Assert.assertEquals
import org.junit.Test

class ShareFieldVisibilityTest {
    @Test
    fun `no app keeps delivery details hidden`() {
        assertEquals(
            ShareFieldVisibility(showEmail = false, showMessage = false),
            shareFieldVisibility(hasPreferredTarget = false, isEmailTarget = false),
        )
    }

    @Test
    fun `email app shows recipient subject and message fields`() {
        assertEquals(
            ShareFieldVisibility(showEmail = true, showMessage = true),
            shareFieldVisibility(hasPreferredTarget = true, isEmailTarget = true),
        )
    }

    @Test
    fun `messaging app only shows the shared message`() {
        assertEquals(
            ShareFieldVisibility(showEmail = false, showMessage = true),
            shareFieldVisibility(hasPreferredTarget = true, isEmailTarget = false),
        )
    }
}
