package com.estundnzettl.app.ui

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Backup
import androidx.compose.material.icons.outlined.Calculate
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Palette as OutlinedPaletteIcon
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.Work
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import kotlinx.coroutines.launch

/**
 * Einmaliger Hinweis-Dialog — Port von FirstOpenHint.tsx: modales
 * Popup mit Info-Icon, Titel/Body und "Verstanden"-Button. Erscheint,
 * bis der Nutzer ihn wegklickt (persistiert unter [storageKey]).
 */
@Composable
fun FirstOpenHint(
    viewModel: MainViewModel,
    storageKey: String,
    title: String,
    body: String,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val scope = rememberCoroutineScope()
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(storageKey) {
        visible = viewModel.settings.getString(storageKey) != "1"
    }
    if (!visible) return

    fun dismiss() {
        visible = false
        scope.launch { viewModel.settings.setString(storageKey, "1") }
    }

    Dialog(onDismissRequest = ::dismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(colors.surface),
        ) {
            // Kopfzeile: Emerald-Pille links, X rechts
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 8.dp, top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 40.dp, height = 6.dp)
                        .clip(CircleShape)
                        .background(Palette.Emerald500),
                )
                IconButton(onClick = ::dismiss) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = t.t("common.close"),
                        tint = colors.textFaint,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }

            Row(
                modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(colors.info.copy(alpha = if (colors.isDark) 0.3f else 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.Info,
                        contentDescription = null,
                        tint = if (colors.isDark) Palette.Blue400 else colors.info,
                        modifier = Modifier.size(22.dp),
                    )
                }
                Column {
                    Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(
                        body,
                        color = colors.textSecondary,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            // Fußzeile mit "Verstanden" (blau gefüllt wie das Original)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surfaceVariant.copy(alpha = if (colors.isDark) 0.3f else 0.6f))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                Button(
                    onClick = ::dismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Blue600),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                ) {
                    Text(t.t("hints.gotIt"), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}

/** Farbtöne der Tour-Icon-Boxen (Port der colorClasses aus den Tour-Popups). */
internal fun tourToneColors(tone: String, isDark: Boolean): Pair<Color, Color> = when (tone) {
    "blue" -> if (isDark) {
        Palette.Blue500.copy(alpha = 0.25f) to Palette.Blue400
    } else {
        Palette.Blue100 to Palette.Blue600
    }
    "amber" -> if (isDark) {
        Palette.Amber600.copy(alpha = 0.3f) to Palette.Amber400
    } else {
        Palette.Amber600.copy(alpha = 0.12f) to Palette.Amber600
    }
    "violet" -> if (isDark) {
        Color(0xFF7C3AED).copy(alpha = 0.3f) to Color(0xFFA78BFA)
    } else {
        Color(0xFFEDE9FE) to Color(0xFF7C3AED)
    }
    "zinc" -> if (isDark) {
        Palette.Zinc700 to Palette.Zinc300
    } else {
        Palette.Zinc100 to Palette.Zinc600
    }
    else -> if (isDark) {
        Palette.Emerald500.copy(alpha = 0.25f) to Palette.Emerald400
    } else {
        Palette.Emerald100 to Palette.Emerald600
    }
}

// Die Einstellungen-Tour lebt jetzt in TourOverlay.kt (SettingsTourOverlay)
// — mit Spotlight auf den Sektionen wie SettingsTourPopup.tsx.

/**
 * Einmaliges Willkommens-Popup nach der Migration von der Capacitor-App:
 * kurzer Gedankengang, warum die App neu gebaut wurde. Erscheint nur,
 * wenn die Datenübernahme gelaufen ist.
 */
@Composable
fun NativeWelcomeDialog(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    Dialog(onDismissRequest = { viewModel.dismissNativeWelcome() }) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(colors.surface)
                .padding(24.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        if (colors.isDark) Palette.Emerald500.copy(alpha = 0.25f) else Palette.Emerald100,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    androidx.compose.material.icons.Icons.Outlined.AutoAwesome,
                    contentDescription = null,
                    tint = if (colors.isDark) Palette.Emerald400 else Palette.Emerald600,
                    modifier = Modifier.size(28.dp),
                )
            }
            Text(
                t.t("nativeWelcome.title"),
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                lineHeight = 24.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.padding(top = 16.dp),
            )
            Text(
                t.t("nativeWelcome.body"),
                color = colors.textSecondary,
                fontSize = 14.sp,
                lineHeight = 21.sp,
                modifier = Modifier.padding(top = 12.dp),
            )
            Text(
                t.t("nativeWelcome.signature"),
                color = colors.textMuted,
                fontSize = 13.sp,
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                modifier = Modifier
                    .padding(top = 12.dp)
                    .align(Alignment.End),
            )
            Text(
                t.t("nativeWelcome.cta"),
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier
                    .padding(top = 20.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Palette.Emerald600)
                    .clickable { viewModel.dismissNativeWelcome() }
                    .padding(vertical = 12.dp),
            )
        }
    }
}

/**
 * Dezenter Update-Hinweis für Sideload-Installationen — Port von
 * UpdateAvailableBanner.tsx (Emerald-Karte mit Download/Später).
 */
@Composable
fun UpdateAvailableBanner(
    release: com.estundnzettl.app.data.UpdateCheck.Release,
    onOpen: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (colors.isDark) Palette.Emerald500.copy(alpha = 0.12f) else Palette.Emerald50,
            )
            .border(
                1.dp,
                if (colors.isDark) Palette.Emerald700 else Palette.Emerald100,
                RoundedCornerShape(12.dp),
            )
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(
                    if (colors.isDark) Palette.Emerald500.copy(alpha = 0.3f) else Palette.Emerald100,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                androidx.compose.material.icons.Icons.Outlined.AutoAwesome,
                contentDescription = null,
                tint = if (colors.isDark) Palette.Emerald400 else Palette.Emerald600,
                modifier = Modifier.size(16.dp),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                t.t("updates.available.title"),
                color = if (colors.isDark) Palette.Emerald100 else Palette.Emerald900,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
            Text(
                t.t("updates.available.body", "version" to release.tag),
                color = (if (colors.isDark) Palette.Emerald100 else Palette.Emerald900).copy(alpha = 0.85f),
                fontSize = 12.sp,
                lineHeight = 16.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 8.dp),
            ) {
                Text(
                    "⬇ " + t.t("updates.available.download"),
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Palette.Emerald600)
                        .clickable(onClick = onOpen)
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                )
                Text(
                    t.t("updates.available.dismiss"),
                    color = (if (colors.isDark) Palette.Emerald100 else Palette.Emerald900).copy(alpha = 0.8f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(onClick = onDismiss)
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                )
            }
        }
        IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
            Icon(
                Icons.Filled.Close,
                contentDescription = t.t("updates.available.dismiss"),
                tint = (if (colors.isDark) Palette.Emerald100 else Palette.Emerald900).copy(alpha = 0.6f),
                modifier = Modifier.size(14.dp),
            )
        }
    }
}
