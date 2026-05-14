package com.estundnzettl.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

class Material3DatePickerActivity : ComponentActivity() {

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val initialDate = parseDate(intent.getStringExtra(EXTRA_INITIAL_DATE)) ?: LocalDate.now()
        val initialDateMillis = initialDate.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Datum auswählen"
        val confirmText = intent.getStringExtra(EXTRA_CONFIRM_TEXT) ?: "OK"
        val dismissText = intent.getStringExtra(EXTRA_DISMISS_TEXT) ?: "Abbrechen"
        val mode = intent.getStringExtra(EXTRA_MODE) ?: MODE_DATE
        val accent = intent.getStringExtra(EXTRA_ACCENT) ?: ACCENT_GREEN

        setContent {
            EstundnzettlMaterialTheme(accent = accent) {
                if (mode == MODE_MONTH) {
                    MonthPickerDialog(
                        initialDate = initialDate,
                        title = title,
                        confirmText = confirmText,
                        dismissText = dismissText,
                        onDismiss = { cancelPicker() },
                        onConfirm = { selectedDate -> finishWithDate(selectedDate) },
                    )
                } else {
                    val state = rememberDatePickerState(initialSelectedDateMillis = initialDateMillis)

                    DatePickerDialog(
                        onDismissRequest = { cancelPicker() },
                        confirmButton = {
                            TextButton(
                                onClick = {
                                    val selectedDate = state.selectedDateMillis?.let { millis ->
                                        Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate()
                                    }

                                    if (selectedDate == null) {
                                        cancelPicker()
                                        return@TextButton
                                    }

                                    finishWithDate(selectedDate)
                                },
                            ) {
                                Text(confirmText)
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { cancelPicker() }) {
                                Text(dismissText)
                            }
                        },
                    ) {
                        DatePicker(
                            state = state,
                            title = {
                                Text(
                                    text = title,
                                    modifier = Modifier.padding(start = 24.dp, top = 12.dp),
                                )
                            },
                        )
                    }
                }
            }
        }
    }

    private fun finishWithDate(selectedDate: LocalDate) {
        val result = Intent()
            .putExtra(EXTRA_RESULT_DATE, selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
            .putExtra(EXTRA_RESULT_YEAR, selectedDate.year)
            .putExtra(EXTRA_RESULT_MONTH, selectedDate.monthValue)
            .putExtra(EXTRA_RESULT_DAY, selectedDate.dayOfMonth)
        setResult(Activity.RESULT_OK, result)
        finish()
    }

    private fun cancelPicker() {
        setResult(Activity.RESULT_CANCELED)
        finish()
    }

    private fun parseDate(value: String?): LocalDate? = try {
        if (value.isNullOrBlank()) null else LocalDate.parse(value, DateTimeFormatter.ISO_LOCAL_DATE)
    } catch (_: Exception) {
        null
    }

    companion object {
        const val EXTRA_INITIAL_DATE = "initialDate"
        const val EXTRA_MODE = "mode"
        const val EXTRA_TITLE = "title"
        const val EXTRA_CONFIRM_TEXT = "confirmText"
        const val EXTRA_DISMISS_TEXT = "dismissText"
        const val EXTRA_ACCENT = "accent"
        const val EXTRA_RESULT_DATE = "date"
        const val EXTRA_RESULT_YEAR = "year"
        const val EXTRA_RESULT_MONTH = "month"
        const val EXTRA_RESULT_DAY = "day"
        const val MODE_DATE = "date"
        const val MODE_MONTH = "month"
        const val ACCENT_GREEN = "green"
        const val ACCENT_ORANGE = "orange"
    }
}

@Composable
private fun MonthPickerDialog(
    initialDate: LocalDate,
    title: String,
    confirmText: String,
    dismissText: String,
    onDismiss: () -> Unit,
    onConfirm: (LocalDate) -> Unit,
) {
    var selectedYear by remember { mutableIntStateOf(initialDate.year) }
    var selectedMonth by remember { mutableIntStateOf(initialDate.monthValue) }
    val locale = Locale.getDefault()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(
                modifier = Modifier.widthIn(min = 280.dp, max = 360.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    TextButton(onClick = { selectedYear -= 1 }) { Text("‹") }
                    Text(
                        text = selectedYear.toString(),
                        modifier = Modifier.padding(top = 10.dp),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    TextButton(onClick = { selectedYear += 1 }) { Text("›") }
                }

                (1..12).chunked(3).forEach { rowMonths ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        rowMonths.forEach { month ->
                            val isSelected = selectedMonth == month
                            TextButton(
                                onClick = { selectedMonth = month },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.textButtonColors(
                                    containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                                    contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface,
                                ),
                            ) {
                                Text(
                                    text = java.time.Month.of(month)
                                        .getDisplayName(TextStyle.SHORT, locale),
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(LocalDate.of(selectedYear, selectedMonth, 1)) }) {
                Text(confirmText)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(dismissText)
            }
        },
    )
}

@Composable
private fun EstundnzettlMaterialTheme(accent: String, content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val colorScheme = estundnzettlColorScheme(dark = dark, accent = accent)

    MaterialTheme(
        colorScheme = colorScheme,
        content = content,
    )
}

private fun estundnzettlColorScheme(dark: Boolean, accent: String) = when (accent) {
    Material3DatePickerActivity.ACCENT_ORANGE -> if (dark) {
        darkColorScheme(
            primary = Color(0xFFFB923C),
            onPrimary = Color(0xFF431407),
            primaryContainer = Color(0xFF7C2D12),
            onPrimaryContainer = Color(0xFFFFEDD5),
            surface = Color(0xFF18181B),
            onSurface = Color(0xFFFAFAFA),
            surfaceVariant = Color(0xFF3F3F46),
            onSurfaceVariant = Color(0xFFE4E4E7),
            outline = Color(0xFF71717A),
        )
    } else {
        lightColorScheme(
            primary = Color(0xFFF97316),
            onPrimary = Color.White,
            primaryContainer = Color(0xFFFFEDD5),
            onPrimaryContainer = Color(0xFF7C2D12),
            surface = Color.White,
            onSurface = Color(0xFF18181B),
            surfaceVariant = Color(0xFFF4F4F5),
            onSurfaceVariant = Color(0xFF52525B),
            outline = Color(0xFFD4D4D8),
        )
    }
    else -> if (dark) {
        darkColorScheme(
            primary = Color(0xFF34D399),
            onPrimary = Color(0xFF022C22),
            primaryContainer = Color(0xFF065F46),
            onPrimaryContainer = Color(0xFFD1FAE5),
            surface = Color(0xFF18181B),
            onSurface = Color(0xFFFAFAFA),
            surfaceVariant = Color(0xFF3F3F46),
            onSurfaceVariant = Color(0xFFE4E4E7),
            outline = Color(0xFF71717A),
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF10B981),
            onPrimary = Color.White,
            primaryContainer = Color(0xFFD1FAE5),
            onPrimaryContainer = Color(0xFF065F46),
            surface = Color.White,
            onSurface = Color(0xFF18181B),
            surfaceVariant = Color(0xFFF4F4F5),
            onSurfaceVariant = Color(0xFF52525B),
            outline = Color(0xFFD4D4D8),
        )
    }
}
