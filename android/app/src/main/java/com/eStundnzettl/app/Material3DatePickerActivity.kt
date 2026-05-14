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
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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

        setContent {
            EstundnzettlMaterialTheme {
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
                                    modifier = Modifier.padding(top = 12.dp),
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
        const val EXTRA_RESULT_DATE = "date"
        const val EXTRA_RESULT_YEAR = "year"
        const val EXTRA_RESULT_MONTH = "month"
        const val EXTRA_RESULT_DAY = "day"
        const val MODE_DATE = "date"
        const val MODE_MONTH = "month"
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
                            ) {
                                Text(
                                    text = java.time.Month.of(month)
                                        .getDisplayName(TextStyle.SHORT, locale),
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
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
private fun EstundnzettlMaterialTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val dark = isSystemInDarkTheme()
    val colorScheme = when {
        android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S && dark -> dynamicDarkColorScheme(context)
        android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S -> dynamicLightColorScheme(context)
        dark -> darkColorScheme()
        else -> lightColorScheme()
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content,
    )
}
