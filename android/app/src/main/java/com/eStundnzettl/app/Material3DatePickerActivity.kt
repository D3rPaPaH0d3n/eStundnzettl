package com.estundnzettl.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.ui.platform.LocalContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

class Material3DatePickerActivity : ComponentActivity() {

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val initialDate = parseDate(intent.getStringExtra(EXTRA_INITIAL_DATE)) ?: LocalDate.now()
        val initialDateMillis = initialDate.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Datum auswählen"
        val confirmText = intent.getStringExtra(EXTRA_CONFIRM_TEXT) ?: "OK"
        val dismissText = intent.getStringExtra(EXTRA_DISMISS_TEXT) ?: "Abbrechen"

        setContent {
            EstundnzettlMaterialTheme {
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

                                val result = Intent()
                                    .putExtra(EXTRA_RESULT_DATE, selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
                                    .putExtra(EXTRA_RESULT_YEAR, selectedDate.year)
                                    .putExtra(EXTRA_RESULT_MONTH, selectedDate.monthValue)
                                    .putExtra(EXTRA_RESULT_DAY, selectedDate.dayOfMonth)
                                setResult(Activity.RESULT_OK, result)
                                finish()
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
                        title = { Text(title) },
                    )
                }
            }
        }
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
        const val EXTRA_TITLE = "title"
        const val EXTRA_CONFIRM_TEXT = "confirmText"
        const val EXTRA_DISMISS_TEXT = "dismissText"
        const val EXTRA_RESULT_DATE = "date"
        const val EXTRA_RESULT_YEAR = "year"
        const val EXTRA_RESULT_MONTH = "month"
        const val EXTRA_RESULT_DAY = "day"
    }
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
