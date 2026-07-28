package com.estundnzettl.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Kalenderdialog mit eigener Tagesdarstellung, damit Wochenenden sichtbar
 * markiert werden können. Samstage sind blau, Sonntage rot beschriftet.
 */
@Composable
fun WeekendDatePickerDialog(
    initialDate: LocalDate,
    locale: Locale,
    onConfirm: (LocalDate) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var selectedDate by remember(initialDate) { mutableStateOf(initialDate) }
    var displayedMonth by remember(initialDate) {
        mutableStateOf(initialDate.withDayOfMonth(1))
    }

    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val weekDays = remember(locale) {
        (0..6).map { offset ->
            DayOfWeek.of(((firstDayOfWeek.value - 1 + offset) % 7) + 1)
        }
    }
    val firstDayOffset =
        (displayedMonth.dayOfWeek.value - firstDayOfWeek.value + 7) % 7
    val calendarCells = buildList<LocalDate?> {
        repeat(firstDayOffset) { add(null) }
        repeat(displayedMonth.lengthOfMonth()) { day ->
            add(displayedMonth.withDayOfMonth(day + 1))
        }
        while (size % 7 != 0) add(null)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = t.t("entryForm.date"),
                    color = colors.textMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = selectedDate.format(
                        java.time.format.DateTimeFormatter.ofPattern("d. MMMM yyyy", locale),
                    ),
                    color = colors.textPrimary,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = displayedMonth.month
                            .getDisplayName(TextStyle.FULL_STANDALONE, locale)
                            .replaceFirstChar { it.titlecase(locale) } +
                            " ${displayedMonth.year}",
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(
                        onClick = { displayedMonth = displayedMonth.minusMonths(1) },
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                            contentDescription = if (locale.language == "de") {
                                "Vorheriger Monat"
                            } else {
                                "Previous month"
                            },
                            tint = colors.textSecondary,
                        )
                    }
                    IconButton(
                        onClick = { displayedMonth = displayedMonth.plusMonths(1) },
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = if (locale.language == "de") {
                                "Nächster Monat"
                            } else {
                                "Next month"
                            },
                            tint = colors.textSecondary,
                        )
                    }
                }

                Row(modifier = Modifier.fillMaxWidth()) {
                    weekDays.forEach { dayOfWeek ->
                        val weekendColor = when (dayOfWeek) {
                            DayOfWeek.SATURDAY -> colors.info
                            DayOfWeek.SUNDAY -> colors.danger
                            else -> colors.textMuted
                        }
                        Text(
                            text = dayOfWeek.getDisplayName(TextStyle.NARROW, locale),
                            color = weekendColor,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                calendarCells.chunked(7).forEach { week ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        week.forEach { date ->
                            if (date == null) {
                                Spacer(modifier = Modifier.weight(1f).height(44.dp))
                            } else {
                                val isSelected = date == selectedDate
                                val weekendColor = when (date.dayOfWeek) {
                                    DayOfWeek.SATURDAY -> colors.info
                                    DayOfWeek.SUNDAY -> colors.danger
                                    else -> Color.Transparent
                                }
                                val backgroundColor = when {
                                    isSelected -> colors.accentStrong
                                    else -> Color.Transparent
                                }
                                val textColor = when {
                                    isSelected -> colors.onPrimaryAction
                                    weekendColor != Color.Transparent -> weekendColor
                                    else -> colors.textPrimary
                                }

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(44.dp)
                                        .padding(2.dp)
                                        .clip(CircleShape)
                                        .background(backgroundColor)
                                        .semantics {
                                            selected = isSelected
                                            contentDescription = date.format(
                                                java.time.format.DateTimeFormatter
                                                    .ofPattern("EEEE, d. MMMM yyyy", locale),
                                            )
                                        }
                                        .clickable(role = Role.Button) { selectedDate = date },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = date.dayOfMonth.toString(),
                                        color = textColor,
                                        fontWeight = if (isSelected) {
                                            FontWeight.Bold
                                        } else {
                                            FontWeight.Normal
                                        },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(selectedDate) }) {
                Text("OK", color = colors.accent, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(t.t("common.cancel"), color = colors.textMuted)
            }
        },
    )
}
