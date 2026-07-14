package com.estundnzettl.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n

/**
 * Material3-Uhrzeit-Dialog — Gegenstück zur Material3TimePickerActivity
 * der Capacitor-App (dort via Plugin aufgerufen): TimePicker-Uhr in
 * einem Dialog, Akzent grün (Zeiten) bzw. orange (Pause), identische
 * Akzentfarben wie `withEstundnzettlAccent` im Original.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTimePickerDialog(
    title: String,
    initial: String,
    orangeAccent: Boolean = false,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val dark = colors.isDark

    val parts = initial.split(":")
    val state = rememberTimePickerState(
        initialHour = parts.getOrNull(0)?.toIntOrNull()?.coerceIn(0, 23) ?: 6,
        initialMinute = parts.getOrNull(1)?.toIntOrNull()?.coerceIn(0, 59) ?: 0,
        is24Hour = true,
    )

    val scheme = if (orangeAccent) {
        MaterialTheme.colorScheme.copy(
            primary = if (dark) Color(0xFFFB923C) else Color(0xFFF97316),
            onPrimary = if (dark) Color(0xFF431407) else Color.White,
            primaryContainer = if (dark) Color(0xFF7C2D12) else Color(0xFFFFEDD5),
            onPrimaryContainer = if (dark) Color(0xFFFFEDD5) else Color(0xFF7C2D12),
        )
    } else {
        MaterialTheme.colorScheme.copy(
            primary = if (dark) Color(0xFF34D399) else Color(0xFF10B981),
            onPrimary = if (dark) Color(0xFF022C22) else Color.White,
            primaryContainer = if (dark) Color(0xFF065F46) else Color(0xFFD1FAE5),
            onPrimaryContainer = if (dark) Color(0xFFD1FAE5) else Color(0xFF065F46),
        )
    }

    MaterialTheme(colorScheme = scheme) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text(title) },
            text = {
                TimePicker(
                    state = state,
                    modifier = Modifier.padding(top = 8.dp),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    onConfirm("%02d:%02d".format(state.hour, state.minute))
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = onDismiss) { Text(t.t("common.cancel")) }
            },
        )
    }
}
