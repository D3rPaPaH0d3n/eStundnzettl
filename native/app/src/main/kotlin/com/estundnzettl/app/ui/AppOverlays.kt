package com.estundnzettl.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n

/** Einheitlicher Vollbild-Dialog für lange Inhalte und mehrstufige Aufgaben. */
@Composable
fun AppFullScreenDialog(
    title: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
        ),
    ) {
        val dialogView = LocalView.current
        SideEffect {
            val window = (dialogView.parent as? DialogWindowProvider)?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, dialogView).apply {
                isAppearanceLightStatusBars = !colors.isDark
                isAppearanceLightNavigationBars = !colors.isDark
            }
        }
        Surface(
            color = colors.background,
            contentColor = colors.textPrimary,
            modifier = modifier.fillMaxSize(),
        ) {
            Column(modifier = Modifier.fillMaxSize().safeDrawingPadding()) {
                OverlayHeader(title = title, subtitle = subtitle, onDismiss = onDismiss)
                HorizontalDivider(color = colors.borderSubtle)
                Box(modifier = Modifier.fillMaxWidth().weight(1f), content = content)
            }
        }
    }
}

/** Einheitlicher kurzer Entscheidungsdialog; destruktive Aktionen sind klar rot markiert. */
@Composable
fun AppConfirmDialog(
    title: String,
    message: String,
    confirmLabel: String,
    dismissLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    destructive: Boolean = false,
) {
    val colors = LocalAppColors.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = { Text(message, color = colors.textSecondary, lineHeight = 20.sp) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    confirmLabel,
                    color = if (destructive) colors.danger else colors.accent,
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(dismissLabel, color = colors.textMuted)
            }
        },
        containerColor = colors.surface,
    )
}

/** Einheitliches Material-Sheet für kurze, kontextbezogene Auswahlen. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppSelectionSheet(
    title: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    icon: ImageVector? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.background,
    ) {
        Column(modifier = modifier.fillMaxWidth()) {
            OverlayHeader(title = title, subtitle = subtitle, onDismiss = onDismiss, icon = icon)
            HorizontalDivider(color = colors.borderSubtle)
            content()
        }
    }
}

@Composable
private fun OverlayHeader(
    title: String,
    subtitle: String?,
    onDismiss: () -> Unit,
    icon: ImageVector? = null,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Surface(
                color = colors.accent.copy(alpha = if (colors.isDark) 0.24f else 0.12f),
                shape = CircleShape,
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = colors.accent,
                    modifier = Modifier.padding(9.dp).size(20.dp),
                )
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            if (!subtitle.isNullOrBlank()) {
                Text(subtitle, color = colors.textMuted, fontSize = 13.sp, lineHeight = 18.sp)
            }
        }
        IconButton(onClick = onDismiss) {
            Icon(
                Icons.Filled.Close,
                contentDescription = t.t("common.close"),
                tint = colors.textSecondary,
            )
        }
    }
}
