package com.estundnzettl.app.ui.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.ui.AppCard
import com.estundnzettl.app.ui.theme.LocalAppColors
import java.util.Locale as JavaLocale

/** Farbiges Icon-Badge im Karten-Header (Pendant zu den p-2-rounded-lg-Divs). */
@Composable
fun SectionIconBadge(icon: ImageVector, tint: Color) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(tint.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
    }
}

/** Einklappbare Settings-Karte — Port von CollapsibleCard.tsx. */
@Composable
fun CollapsibleSettingsCard(
    title: String,
    subtitle: String? = null,
    icon: (@Composable () -> Unit)? = null,
    defaultExpanded: Boolean = true,
    content: @Composable Column.() -> Unit,
) {
    val colors = LocalAppColors.current
    var expanded by remember { mutableStateOf(defaultExpanded) }

    AppCard {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f),
            ) {
                icon?.invoke()
                Column {
                    Text(
                        title,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    )
                    if (subtitle != null) {
                        Text(subtitle, color = colors.textMuted, fontSize = 12.sp)
                    }
                }
            }
            Icon(
                Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = colors.textFaint,
                modifier = Modifier.size(18.dp),
            )
        }
        AnimatedVisibility(visible = expanded) {
            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                content = content,
            )
        }
    }
}

/** Toggle-Zeile mit Label — Pendant zu den peer-checked-Switches. */
@Composable
fun SettingsToggleRow(
    title: String,
    subtitle: String? = null,
    checked: Boolean,
    accent: Color,
    icon: (@Composable () -> Unit)? = null,
    onToggle: (Boolean) -> Unit,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f),
        ) {
            icon?.invoke()
            Column {
                Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                if (subtitle != null) {
                    Text(subtitle, color = colors.textMuted, fontSize = 12.sp)
                }
            }
        }
        Switch(
            checked = checked,
            onCheckedChange = onToggle,
            colors = SwitchDefaults.colors(checkedTrackColor = accent),
        )
    }
}

/** Kleine Uppercase-Feldbeschriftung. */
@Composable
fun SettingsFieldLabel(text: String) {
    val colors = LocalAppColors.current
    Text(
        text = text.uppercase(),
        color = colors.textMuted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.5.sp,
    )
}

/** Auswahl-Button, der ein Bottom-Sheet/Dialog öffnet (Label + Wert). */
@Composable
fun SelectRow(label: String, value: String, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        SettingsFieldLabel(label)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(value, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Icon(
                Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = colors.textFaint,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

/** "38,5 h" — Port von formatHours (calculationUi.ts). */
fun formatHoursLocalized(minutes: Int, language: String): String {
    val locale = if (language == "en") JavaLocale.ENGLISH else JavaLocale.GERMAN
    val hours = minutes / 60.0
    val formatted = java.text.NumberFormat.getNumberInstance(locale).apply {
        minimumFractionDigits = 1
        maximumFractionDigits = 2
    }.format(hours)
    return "$formatted h"
}

/** "MM-DD" → "DD.MM." — Port von mmddToDisplay. */
fun mmddToDisplay(mmdd: String): String {
    val parts = mmdd.split("-")
    if (parts.size != 2) return mmdd
    return "${parts[1]}.${parts[0]}."
}

/** "DD.MM." → "MM-DD" oder null — Port von displayToMmdd. */
fun displayToMmdd(input: String): String? {
    val clean = input.trim().removeSuffix(".")
    val parts = clean.split(".")
    if (parts.size != 2) return null
    val dd = parts[0].padStart(2, '0')
    val mm = parts[1].padStart(2, '0')
    if (!dd.all { it.isDigit() } || !mm.all { it.isDigit() } || dd.length != 2 || mm.length != 2) return null
    return "$mm-$dd"
}
