package com.estundnzettl.app

import org.junit.Assert.assertEquals
import org.junit.Test

class WhatsNewTest {

    @Test
    fun `fresh install is marked without showing changelog`() {
        assertEquals(
            WhatsNewDecision.MARK_CURRENT,
            decideWhatsNew(null, 300, hasExistingProfile = false, hasCurrentChangelog = true),
        )
    }

    @Test
    fun `existing installation without marker sees current changelog`() {
        assertEquals(
            WhatsNewDecision.SHOW,
            decideWhatsNew(null, 300, hasExistingProfile = true, hasCurrentChangelog = true),
        )
    }

    @Test
    fun `newer version is shown once`() {
        assertEquals(
            WhatsNewDecision.SHOW,
            decideWhatsNew(300, 301, hasExistingProfile = true, hasCurrentChangelog = true),
        )
    }

    @Test
    fun `same version is not shown again`() {
        assertEquals(
            WhatsNewDecision.NONE,
            decideWhatsNew(301, 301, hasExistingProfile = true, hasCurrentChangelog = true),
        )
    }

    @Test
    fun `downgrade does not show changelog`() {
        assertEquals(
            WhatsNewDecision.NONE,
            decideWhatsNew(302, 301, hasExistingProfile = true, hasCurrentChangelog = true),
        )
    }

    @Test
    fun `missing changelog entry is silently marked current`() {
        assertEquals(
            WhatsNewDecision.MARK_CURRENT,
            decideWhatsNew(300, 301, hasExistingProfile = true, hasCurrentChangelog = false),
        )
    }
}
