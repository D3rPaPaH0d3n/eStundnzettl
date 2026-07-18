package com.estundnzettl.app

import org.junit.Assert.assertEquals
import org.junit.Test

class ShareTemplateRendererTest {
    @Test
    fun `renders the friendly German placeholders used by the default template`() {
        assertEquals(
            "Stundenzettel für Juli 2026 von Erika Muster",
            ShareTemplateRenderer.render(
                "Stundenzettel für [Zeitraum] von [Name]",
                period = "Juli 2026",
                name = "Erika Muster",
            ),
        )
    }

    @Test
    fun `renders canonical and legacy date placeholders`() {
        assertEquals(
            "Juli 2026 / Juli 2026 / Juli 2026",
            ShareTemplateRenderer.render(
                "{{period}} / [Date] / ‹Zeitraum›",
                period = "Juli 2026",
                name = "Erika Muster",
            ),
        )
    }

    @Test
    fun `stores friendly placeholders in a locale independent form`() {
        assertEquals(
            "PDF {{period}} – {{name}}",
            ShareTemplateRenderer.canonicalize("PDF [Zeitraum] – [Name]"),
        )
        assertEquals(
            "PDF [Period] – [Name]",
            ShareTemplateRenderer.friendly(
                "PDF {{period}} – {{name}}",
                periodLabel = "[Period]",
                nameLabel = "[Name]",
            ),
        )
    }
}
