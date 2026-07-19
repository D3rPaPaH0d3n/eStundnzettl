package com.estundnzettl.app.ui.settings

import androidx.compose.ui.graphics.Color
import com.estundnzettl.app.ui.theme.LightAppColors
import kotlin.test.Test
import kotlin.test.assertEquals

class SectionIconBadgeTest {

    @Test
    fun `classic badge keeps its category color`() {
        val legacyTint = Color(0xFFAA5500)

        assertEquals(
            legacyTint,
            resolveSectionIconTint(LightAppColors, legacyTint),
        )
    }

    @Test
    fun `material you badge defaults to the dynamic primary color`() {
        val dynamicAccent = Color(0xFF123456)
        val colors = LightAppColors.copy(
            accent = dynamicAccent,
            isMaterialYou = true,
        )

        assertEquals(
            dynamicAccent,
            resolveSectionIconTint(colors, Color.Magenta),
        )
    }

    @Test
    fun `material you badge keeps explicit semantic warning color`() {
        val warningTint = Color(0xFFFF8800)
        val colors = LightAppColors.copy(isMaterialYou = true)

        assertEquals(
            warningTint,
            resolveSectionIconTint(colors, Color.Magenta, warningTint),
        )
    }
}
