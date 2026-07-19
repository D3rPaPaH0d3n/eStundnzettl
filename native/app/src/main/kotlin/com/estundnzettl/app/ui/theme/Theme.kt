package com.estundnzettl.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.estundnzettl.app.i18n.I18n

val LocalAppColors = staticCompositionLocalOf { LightAppColors }
val LocalI18n = staticCompositionLocalOf<I18n> {
    error("I18n not provided — wrap content in EStundnzettlTheme")
}

/**
 * App-Theme: Die feste Farbwelt der Web-App oder, wenn aktiviert, die
 * vollständige dynamische Material-You-Palette des Android-Systems.
 * Theme-Setting "system" | "dark" | "light" wie in der bestehenden App.
 */
@Composable
fun EStundnzettlTheme(
    themeSetting: String = "system",
    materialYou: Boolean = false,
    i18n: I18n,
    /**
     * true, wenn der aktuelle Screen oben den App-Header zeigt. Dessen
     * tatsächliche Farbe bestimmt den Statusbar-Icon-Kontrast. Onboarding
     * und Recovery-Screens verwenden stattdessen die Hintergrundfarbe.
     */
    darkTopBar: Boolean = true,
    content: @Composable () -> Unit,
) {
    val darkTheme = when (themeSetting) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }
    val dynamicColors = materialYou &&
        android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S
    val context = LocalContext.current
    val colorScheme = when {
        dynamicColors && darkTheme -> dynamicDarkColorScheme(context)
        dynamicColors -> dynamicLightColorScheme(context)
        darkTheme -> darkColorScheme(
            primary = Palette.Emerald400,
            onPrimary = Palette.Zinc900,
            secondary = Palette.Zinc400,
            background = DarkAppColors.background,
            surface = DarkAppColors.surface,
            onBackground = DarkAppColors.textPrimary,
            onSurface = DarkAppColors.textPrimary,
            surfaceVariant = DarkAppColors.surfaceVariant,
            outline = DarkAppColors.border,
            error = DarkAppColors.danger,
        )
        else -> lightColorScheme(
            primary = Palette.Emerald600,
            onPrimary = androidx.compose.ui.graphics.Color.White,
            secondary = Palette.Zinc500,
            background = LightAppColors.background,
            surface = LightAppColors.surface,
            onBackground = LightAppColors.textPrimary,
            onSurface = LightAppColors.textPrimary,
            surfaceVariant = LightAppColors.surfaceVariant,
            outline = LightAppColors.border,
            error = LightAppColors.danger,
        )
    }
    val appColors = when {
        dynamicColors -> materialYouAppColors(colorScheme, darkTheme)
        darkTheme -> DarkAppColors
        else -> LightAppColors
    }

    // System-Leisten (Port des SystemBarsPlugin-Verhaltens): Der
    // Header und die dynamische Palette können hell oder dunkel sein.
    // Die Icon-Helligkeit wird deshalb aus der tatsächlichen Farbe statt
    // nur aus dem Theme-Namen abgeleitet.
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? android.app.Activity)?.window ?: return@SideEffect
            val controller = WindowCompat.getInsetsController(window, view)
            val statusBarBackground = if (darkTopBar) {
                appColors.headerBackground
            } else {
                appColors.background
            }
            controller.isAppearanceLightStatusBars = statusBarBackground.luminance() > 0.5f
            controller.isAppearanceLightNavigationBars = appColors.background.luminance() > 0.5f
        }
    }

    // Keep one stable composition structure for every setting. Switching
    // Material You must not dispose scroll/expanded state below the theme.
    CompositionLocalProvider(
        LocalAppColors provides appColors,
        LocalI18n provides i18n,
    ) {
        MaterialTheme(colorScheme = colorScheme, content = content)
    }
}
