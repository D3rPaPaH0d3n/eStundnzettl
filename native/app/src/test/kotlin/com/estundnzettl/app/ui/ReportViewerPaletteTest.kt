package com.estundnzettl.app.ui

import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import com.estundnzettl.app.ui.theme.LightAppColors
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.app.ui.theme.materialYouAppColors
import kotlin.test.Test
import kotlin.test.assertEquals

class ReportViewerPaletteTest {

    @Test
    fun `classic viewer keeps its original dark palette`() {
        val palette = reportViewerPalette(LightAppColors)

        assertEquals(Palette.Zinc900, palette.toolbarBackground)
        assertEquals(Palette.Emerald500, palette.primaryAccent)
        assertEquals(Palette.Zinc950, palette.viewerBackground)
        assertEquals(Palette.Zinc100, palette.floatingContent)
    }

    @Test
    fun `material you viewer follows semantic app colors`() {
        val scheme = lightColorScheme(
            primary = Color(0xFF123456),
            tertiary = Color(0xFF654321),
        )
        val appColors = materialYouAppColors(scheme, darkTheme = false)
        val palette = reportViewerPalette(appColors)

        assertEquals(appColors.headerBackground, palette.toolbarBackground)
        assertEquals(appColors.headerContent, palette.toolbarContent)
        assertEquals(appColors.accentStrong, palette.primaryAccent)
        assertEquals(appColors.special, palette.secondaryAccent)
        assertEquals(appColors.background, palette.viewerBackground)
        assertEquals(appColors.surface.copy(alpha = 0.92f), palette.floatingBackground)
        assertEquals(appColors.onPrimaryAction, palette.onPrimary)
    }
}
