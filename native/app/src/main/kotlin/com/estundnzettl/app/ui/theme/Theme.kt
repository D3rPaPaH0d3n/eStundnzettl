package com.estundnzettl.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import com.estundnzettl.app.i18n.I18n

val LocalAppColors = staticCompositionLocalOf { LightAppColors }
val LocalI18n = staticCompositionLocalOf<I18n> {
    error("I18n not provided — wrap content in EStundnzettlTheme")
}

/**
 * App-Theme: Tailwind-basierte Farbwelt der Web-App plus ein M3-Scheme
 * für Material-Komponenten (Picker, Sheets). Theme-Setting "system" |
 * "dark" | "light" wie in der bestehenden App.
 */
@Composable
fun EStundnzettlTheme(
    themeSetting: String = "system",
    materialYou: Boolean = false,
    i18n: I18n,
    content: @Composable () -> Unit,
) {
    val darkTheme = when (themeSetting) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }
    val appColors = if (darkTheme) DarkAppColors else LightAppColors

    // System-Leisten (Port des SystemBarsPlugin-Verhaltens): Der
    // App-Header ist in beiden Themes dunkel → Statusbar-Icons immer
    // hell; die Navigationsleiste folgt dem App-Theme.
    val view = androidx.compose.ui.platform.LocalView.current
    if (!view.isInEditMode) {
        androidx.compose.runtime.SideEffect {
            val window = (view.context as? android.app.Activity)?.window ?: return@SideEffect
            val controller = androidx.core.view.WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars = false
            controller.isAppearanceLightNavigationBars = !darkTheme
        }
    }

    // Material You: dynamische System-Farbpalette (Android 12+)
    if (materialYou && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
        val context = androidx.compose.ui.platform.LocalContext.current
        val dynamicScheme = if (darkTheme) {
            androidx.compose.material3.dynamicDarkColorScheme(context)
        } else {
            androidx.compose.material3.dynamicLightColorScheme(context)
        }
        CompositionLocalProvider(
            LocalAppColors provides appColors.copy(
                accent = dynamicScheme.primary,
                accentStrong = dynamicScheme.primary,
            ),
            LocalI18n provides i18n,
        ) {
            MaterialTheme(colorScheme = dynamicScheme, content = content)
        }
        return
    }

    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = Palette.Emerald400,
            onPrimary = Palette.Zinc900,
            secondary = Palette.Zinc400,
            background = appColors.background,
            surface = appColors.surface,
            onBackground = appColors.textPrimary,
            onSurface = appColors.textPrimary,
            surfaceVariant = appColors.surfaceVariant,
            outline = appColors.border,
            error = appColors.danger,
        )
    } else {
        lightColorScheme(
            primary = Palette.Emerald600,
            onPrimary = androidx.compose.ui.graphics.Color.White,
            secondary = Palette.Zinc500,
            background = appColors.background,
            surface = appColors.surface,
            onBackground = appColors.textPrimary,
            onSurface = appColors.textPrimary,
            surfaceVariant = appColors.surfaceVariant,
            outline = appColors.border,
            error = appColors.danger,
        )
    }

    CompositionLocalProvider(
        LocalAppColors provides appColors,
        LocalI18n provides i18n,
    ) {
        MaterialTheme(colorScheme = colorScheme, content = content)
    }
}
