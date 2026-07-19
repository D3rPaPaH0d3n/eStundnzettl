package com.estundnzettl.app.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ColorTest {

    @Test
    fun `material you maps the complete light structural palette`() {
        val scheme = lightColorScheme(
            primary = Color(0xFF123456),
            secondary = Color(0xFF234567),
            tertiary = Color(0xFF345678),
            error = Color(0xFF9A1122),
        )

        val colors = materialYouAppColors(scheme, darkTheme = false)

        assertEquals(scheme.background, colors.background)
        assertEquals(scheme.surfaceContainerLow, colors.surface)
        assertEquals(scheme.surfaceContainerHigh, colors.surfaceVariant)
        assertEquals(scheme.outlineVariant, colors.border)
        assertEquals(scheme.onSurface, colors.textPrimary)
        assertEquals(scheme.onSurfaceVariant, colors.textSecondary)
        assertEquals(scheme.primaryContainer, colors.headerBackground)
        assertEquals(scheme.onPrimaryContainer, colors.headerContent)
        assertEquals(scheme.primary, colors.accent)
        assertEquals(scheme.primary, colors.primaryAction)
        assertEquals(scheme.onPrimary, colors.onPrimaryAction)
        assertEquals(scheme.error, colors.danger)
        assertEquals(scheme.secondary, colors.info)
        assertEquals(scheme.tertiary, colors.special)
        assertEquals(scheme.secondaryContainer, colors.dayStrip)
        assertEquals(scheme.onSecondaryContainer, colors.dayStripContent)
        assertEquals(LightAppColors.positive, colors.positive)
        assertEquals(LightAppColors.negative, colors.negative)
        assertFalse(LightAppColors.isMaterialYou)
        assertFalse(colors.isDark)
        assertTrue(colors.isMaterialYou)
    }

    @Test
    fun `material you keeps dark semantic status colors legible`() {
        val scheme = darkColorScheme(primary = Color(0xFFABCDEF))

        val colors = materialYouAppColors(scheme, darkTheme = true)

        assertEquals(scheme.primary, colors.accentStrong)
        assertEquals(DarkAppColors.positive, colors.positive)
        assertEquals(DarkAppColors.negative, colors.negative)
        assertFalse(DarkAppColors.isMaterialYou)
        assertTrue(colors.isDark)
        assertTrue(colors.isMaterialYou)
    }
}
