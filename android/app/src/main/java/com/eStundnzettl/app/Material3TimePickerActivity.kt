package com.estundnzettl.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TimePickerDialog
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

class Material3TimePickerActivity : ComponentActivity() {

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val initialHour = intent.getIntExtra(EXTRA_INITIAL_HOUR, 6).coerceIn(0, 23)
        val initialMinute = intent.getIntExtra(EXTRA_INITIAL_MINUTE, 0).coerceIn(0, 59)
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Uhrzeit auswählen"
        val confirmText = intent.getStringExtra(EXTRA_CONFIRM_TEXT) ?: "OK"
        val dismissText = intent.getStringExtra(EXTRA_DISMISS_TEXT) ?: "Abbrechen"
        val is24Hour = intent.getBooleanExtra(EXTRA_IS_24_HOUR, true)

        setContent {
            EstundnzettlMaterialTheme {
                val state = rememberTimePickerState(
                    initialHour = initialHour,
                    initialMinute = initialMinute,
                    is24Hour = is24Hour,
                )

                TimePickerDialog(
                    onDismissRequest = { cancelPicker() },
                    title = { Text(title) },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                val result = Intent()
                                    .putExtra(EXTRA_RESULT_HOUR, state.hour)
                                    .putExtra(EXTRA_RESULT_MINUTE, state.minute)
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
                    TimePicker(
                        state = state,
                        modifier = Modifier.padding(horizontal = 24.dp),
                    )
                }
            }
        }
    }

    private fun cancelPicker() {
        setResult(Activity.RESULT_CANCELED)
        finish()
    }

    companion object {
        const val EXTRA_INITIAL_HOUR = "initialHour"
        const val EXTRA_INITIAL_MINUTE = "initialMinute"
        const val EXTRA_TITLE = "title"
        const val EXTRA_CONFIRM_TEXT = "confirmText"
        const val EXTRA_DISMISS_TEXT = "dismissText"
        const val EXTRA_IS_24_HOUR = "is24Hour"
        const val EXTRA_RESULT_HOUR = "hour"
        const val EXTRA_RESULT_MINUTE = "minute"
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
