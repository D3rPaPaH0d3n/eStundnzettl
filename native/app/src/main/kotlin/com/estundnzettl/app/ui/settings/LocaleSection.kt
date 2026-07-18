package com.estundnzettl.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.core.locale.GERMANY_LOCALE_IDS
import com.estundnzettl.core.locale.SWITZERLAND_LOCALE_IDS
import com.estundnzettl.core.locale.getLocale

/**
 * Locale-Auswahl für die Stundenberechnung — Port von LocaleSettings.tsx
 * (mode="stundenberechnung"): Ländergruppen Neutral/AT/DE/CH, für DE/CH
 * ein Regions-Sheet. Ein Wechsel setzt die Berechnungsregeln nach
 * Bestätigung auf die Locale-Defaults zurück.
 */
@Composable
fun LocaleSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val currentLocale = state.locale

    var pendingLocaleId by remember { mutableStateOf<String?>(null) }
    var regionSheet by remember { mutableStateOf<String?>(null) } // "de" | "ch"

    // Bestätigung: Regeln auf neue Locale zurücksetzen
    pendingLocaleId?.let { targetId ->
        AlertDialog(
            onDismissRequest = { pendingLocaleId = null },
            title = { Text(t.t("settings.locale.confirmTitle")) },
            text = { Text(t.t("settings.locale.confirmMessage", "name" to getLocale(targetId).name)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.setLocaleId(targetId, resetConfig = true)
                    pendingLocaleId = null
                }) { Text(t.t("common.confirm"), color = colors.accent) }
            },
            dismissButton = {
                TextButton(onClick = { pendingLocaleId = null }) { Text(t.t("common.cancel")) }
            },
        )
    }

    regionSheet?.let { country ->
        val ids = if (country == "de") GERMANY_LOCALE_IDS else SWITZERLAND_LOCALE_IDS
        OptionSheet(
            title = if (country == "de") t.t("settings.locale.stateDrawerTitle") else t.t("settings.locale.kantonDrawerTitle"),
            options = ids.map { id -> id to (getLocale(id).region ?: id) },
            selected = currentLocale.id,
            onSelect = { id ->
                regionSheet = null
                if (id != currentLocale.id) pendingLocaleId = id
            },
            onDismiss = { regionSheet = null },
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LocaleGroupButton(t.t("settings.locale.group.neutral"), currentLocale.id == "neutral", Modifier.weight(1f)) {
                if (currentLocale.id != "neutral") pendingLocaleId = "neutral"
            }
            LocaleGroupButton(t.t("settings.locale.group.austria"), currentLocale.id == "at", Modifier.weight(1f)) {
                if (currentLocale.id != "at") pendingLocaleId = "at"
            }
            LocaleGroupButton(t.t("settings.locale.group.germany"), currentLocale.id.startsWith("de-"), Modifier.weight(1f)) {
                regionSheet = "de"
            }
            LocaleGroupButton(t.t("settings.locale.group.switzerland"), currentLocale.id.startsWith("ch-"), Modifier.weight(1f)) {
                regionSheet = "ch"
            }
        }

        if (currentLocale.id.startsWith("de-") || currentLocale.id.startsWith("ch-")) {
            SelectRow(
                label = if (currentLocale.id.startsWith("de-")) t.t("settings.locale.stateLabel") else t.t("settings.locale.kantonLabel"),
                value = currentLocale.region ?: currentLocale.name,
            ) { regionSheet = if (currentLocale.id.startsWith("de-")) "de" else "ch" }
        }

        Text(
            currentLocale.name + " — " + currentLocale.description,
            color = colors.textMuted,
            fontSize = 12.sp,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(colors.surfaceVariant.copy(alpha = 0.5f))
                .padding(8.dp),
        )
    }
}

@Composable
private fun LocaleGroupButton(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Text(
        text = label,
        color = if (selected) colors.accent else colors.textSecondary,
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        textAlign = TextAlign.Center,
        maxLines = 1,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) colors.accent.copy(alpha = 0.1f) else colors.surfaceVariant)
            .border(
                1.dp,
                if (selected) colors.accent else colors.border,
                RoundedCornerShape(10.dp),
            )
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 4.dp),
    )
}
