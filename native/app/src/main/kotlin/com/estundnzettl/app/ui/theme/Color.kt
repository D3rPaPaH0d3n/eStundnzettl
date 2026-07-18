package com.estundnzettl.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Farbwelt der bestehenden App — Tailwind-Paletten (zinc/emerald plus
 * Akzentfarben), damit die native App dieselbe Optik trägt.
 */
object Palette {
    // zinc
    val Zinc50 = Color(0xFFFAFAFA)
    val Zinc100 = Color(0xFFF4F4F5)
    val Zinc200 = Color(0xFFE4E4E7)
    val Zinc300 = Color(0xFFD4D4D8)
    val Zinc400 = Color(0xFFA1A1AA)
    val Zinc500 = Color(0xFF71717A)
    val Zinc600 = Color(0xFF52525B)
    val Zinc700 = Color(0xFF3F3F46)
    val Zinc800 = Color(0xFF27272A)
    val Zinc900 = Color(0xFF18181B)
    val Zinc950 = Color(0xFF09090B)

    // emerald
    val Emerald50 = Color(0xFFECFDF5)
    val Emerald100 = Color(0xFFD1FAE5)
    val Emerald400 = Color(0xFF34D399)
    val Emerald500 = Color(0xFF10B981)
    val Emerald600 = Color(0xFF059669)
    val Emerald700 = Color(0xFF047857)
    val Emerald900 = Color(0xFF064E3B)

    // Akzente (Dashboard/Formular)
    val Orange500 = Color(0xFFF97316)
    val Orange600 = Color(0xFFEA580C)
    val Red400 = Color(0xFFF87171)
    val Red500 = Color(0xFFEF4444)
    val Red600 = Color(0xFFDC2626)
    val Blue400 = Color(0xFF60A5FA)
    val Blue500 = Color(0xFF3B82F6)
    val Blue600 = Color(0xFF2563EB)
    val Purple400 = Color(0xFFC084FC)
    val Purple500 = Color(0xFFA855F7)
    val Purple700 = Color(0xFF7E22CE)
    val Amber400 = Color(0xFFFBBF24)
    val Amber600 = Color(0xFFD97706)
    val Yellow500 = Color(0xFFEAB308)

    // Tint-Flächen (…-50/…-900/20-Äquivalente)
    val Red50 = Color(0xFFFEF2F2)
    val Red100 = Color(0xFFFEE2E2)
    val Red300 = Color(0xFFFCA5A5)
    val Blue50 = Color(0xFFEFF6FF)
    val Blue100 = Color(0xFFDBEAFE)
    val Blue300 = Color(0xFF93C5FD)
    val Purple50 = Color(0xFFFAF5FF)
    val Purple100 = Color(0xFFF3E8FF)
    val Amber50 = Color(0xFFFFFBEB)
    val Amber100 = Color(0xFFFEF3C7)
    val Amber900 = Color(0xFF78350F)
    val Orange50 = Color(0xFFFFF7ED)
    val Orange100 = Color(0xFFFFEDD5)
    val Green50 = Color(0xFFF0FDF4)
    val Green100 = Color(0xFFDCFCE7)
    val Green500 = Color(0xFF22C55E)
    val Green600 = Color(0xFF16A34A)
}

/** Semantische App-Farben, aufgelöst je nach Hell-/Dunkel-Modus. */
data class AppColors(
    val background: Color,
    val surface: Color,        // Karten (white / zinc-800)
    val surfaceVariant: Color, // zinc-100 / zinc-700
    val border: Color,         // zinc-200 / zinc-700
    val borderSubtle: Color,   // zinc-100 / zinc-700
    val textPrimary: Color,    // zinc-900 / white
    val textSecondary: Color,  // zinc-700 / zinc-300
    val textMuted: Color,      // zinc-500 / zinc-400
    val textFaint: Color,      // zinc-400 / zinc-500
    val headerBackground: Color,
    val headerControl: Color,
    val accent: Color,         // emerald-600 / emerald-400
    val accentStrong: Color,   // emerald-600
    val positive: Color,       // emerald
    val negative: Color,       // orange (Saldo) / red (Woche)
    val danger: Color,
    val info: Color,           // blue
    val special: Color,        // purple (Zeitausgleich)
    val dayStrip: Color,       // zinc-800 / zinc-900
    val isDark: Boolean,
)

val LightAppColors = AppColors(
    background = Palette.Zinc50,
    surface = Color.White,
    surfaceVariant = Palette.Zinc100,
    border = Palette.Zinc200,
    borderSubtle = Palette.Zinc100,
    textPrimary = Palette.Zinc900,
    textSecondary = Palette.Zinc700,
    textMuted = Palette.Zinc500,
    textFaint = Palette.Zinc400,
    headerBackground = Palette.Zinc900,
    headerControl = Palette.Zinc800,
    accent = Palette.Emerald600,
    accentStrong = Palette.Emerald600,
    positive = Palette.Emerald600,
    negative = Palette.Orange600,
    danger = Palette.Red600,
    info = Palette.Blue600,
    special = Palette.Purple700,
    dayStrip = Palette.Zinc800,
    isDark = false,
)

val DarkAppColors = AppColors(
    background = Palette.Zinc950,
    surface = Palette.Zinc800,
    surfaceVariant = Palette.Zinc700,
    border = Palette.Zinc700,
    borderSubtle = Palette.Zinc700,
    textPrimary = Color.White,
    textSecondary = Palette.Zinc300,
    textMuted = Palette.Zinc400,
    textFaint = Palette.Zinc500,
    headerBackground = Palette.Zinc900,
    headerControl = Palette.Zinc800,
    accent = Palette.Emerald400,
    accentStrong = Palette.Emerald600,
    positive = Palette.Emerald400,
    negative = Palette.Orange500,
    danger = Palette.Red400,
    info = Palette.Blue400,
    special = Palette.Purple400,
    dayStrip = Palette.Zinc900,
    isDark = true,
)
