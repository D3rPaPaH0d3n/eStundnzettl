package com.estundnzettl.app.ui.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.core.locale.GERMANY_LOCALE_IDS
import com.estundnzettl.core.locale.SWITZERLAND_LOCALE_IDS
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.locale.holidays.getIslamicHolidays
import com.estundnzettl.core.locale.holidays.getOrthodoxHolidays
import com.estundnzettl.core.model.AutoPauseRule
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.HalfDayConfig
import com.estundnzettl.core.model.HalfDayMode
import com.estundnzettl.core.model.HolidayOnWorkDayMode
import com.estundnzettl.core.model.HolidaySetConfig
import com.estundnzettl.core.model.HolidaySetMode
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.SickOnWorkDayMode
import java.time.LocalDate
import kotlin.math.roundToInt

/**
 * Berechnungsregeln — Port von CalculationSettings.tsx (unwrapped-Variante):
 * Zusammenfassung mit "Regeln bearbeiten", darunter Überstunden-/Krank-Regel,
 * Feiertage & Halbtage (Import + eigene Liste), Auto-Pausen, Urlaub und der
 * "Alle Einträge neu berechnen"-Button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalculationSection(
    config: CalculationConfig,
    language: String,
    onPatch: ((CalculationConfig) -> CalculationConfig) -> Unit,
    onRecalculate: () -> Unit,
    onMessage: (String) -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    var editOpen by rememberSaveable { mutableStateOf(false) }
    var holidayOpen by rememberSaveable { mutableStateOf(false) }
    var advancedOpen by rememberSaveable { mutableStateOf(false) }
    var activeDrawer by remember { mutableStateOf<String?>(null) }

    val overtimeLabel = t.t("settings.calc.overtimeOptions.${config.overtimeMode.wireName}")
    val sickLabel = t.t("settings.calc.sickOptions.${config.sickOnWorkDayMode.wireName}")
    val holidayWorkLabel = t.t("settings.calc.holidayOnWorkOptions.${config.holidayOnWorkDayMode.wireName}")

    // ─── Auswahl-Sheets ──────────────────────────────────────

    when (activeDrawer) {
        "overtime" -> OptionSheet(
            title = t.t("settings.calc.overtimeRule"),
            options = OvertimeMode.entries.map { it.wireName to t.t("settings.calc.overtimeOptions.${it.wireName}") },
            selected = config.overtimeMode.wireName,
            onSelect = { id ->
                val mode = OvertimeMode.fromWireOrNull(id)!!
                onPatch {
                    it.copy(
                        overtimeMode = mode,
                        overtimeThresholdMinutes = when (mode) {
                            OvertimeMode.SPLIT -> it.overtimeThresholdMinutes ?: 2400
                            OvertimeMode.NONE -> null
                            else -> it.overtimeThresholdMinutes
                        },
                    )
                }
                activeDrawer = null
            },
            onDismiss = { activeDrawer = null },
        )

        "sick" -> OptionSheet(
            title = t.t("settings.calc.sickOnWorkDay"),
            options = listOf(
                SickOnWorkDayMode.CAP_TO_TARGET, SickOnWorkDayMode.ADDITIVE, SickOnWorkDayMode.IGNORE,
            ).map { it.wireName to t.t("settings.calc.sickOptions.${it.wireName}") },
            selected = config.sickOnWorkDayMode.wireName,
            onSelect = { id ->
                onPatch { it.copy(sickOnWorkDayMode = SickOnWorkDayMode.fromWireOrNull(id)!!) }
                activeDrawer = null
            },
            onDismiss = { activeDrawer = null },
        )

        "holidayWork" -> OptionSheet(
            title = t.t("settings.calc.drawerHolidayWork"),
            options = listOf(
                HolidayOnWorkDayMode.ADDITIVE, HolidayOnWorkDayMode.COUNTS_AS_OVERTIME, HolidayOnWorkDayMode.CAP_TO_TARGET,
            ).map { it.wireName to t.t("settings.calc.holidayOnWorkOptions.${it.wireName}") },
            selected = config.holidayOnWorkDayMode.wireName,
            onSelect = { id ->
                onPatch { it.copy(holidayOnWorkDayMode = HolidayOnWorkDayMode.fromWireOrNull(id)!!) }
                activeDrawer = null
            },
            onDismiss = { activeDrawer = null },
        )

        "import" -> OptionSheet(
            title = t.t("settings.calc.drawerImportHolidays"),
            options = holidayImportOptions(t),
            selected = "",
            onSelect = { key ->
                val year = LocalDate.now().year
                val base = when (key) {
                    "_orthodox" -> getOrthodoxHolidays(year)
                    "_islamic" -> getIslamicHolidays(year)
                    else -> getLocale(key).getHolidays(year)
                }
                val next = (config.holidaySet.customHolidays ?: emptyMap()).toMutableMap()
                for ((date, name) in base) next[date.substring(5)] = name
                onPatch {
                    it.copy(holidaySet = HolidaySetConfig(HolidaySetMode.CUSTOM, emptyList(), next))
                }
                onMessage(t.t("settings.calc.toast.holidaysImported", "count" to base.size))
                activeDrawer = null
            },
            onDismiss = { activeDrawer = null },
        )
    }

    // ─── Inhalt ──────────────────────────────────────────────

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Zusammenfassung (readonly)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(colors.surfaceVariant.copy(alpha = 0.5f))
                .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Column {
                SettingsFieldLabel(t.t("settings.calc.contractedHours"))
                Text(
                    t.t("settings.calc.hoursPerWeek", "hours" to formatHoursLocalized(config.weeklyTargetMinutes, language)),
                    color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 17.sp,
                )
            }
            Text(
                t.t("settings.calc.overtimeRule") + ": " + overtimeLabel,
                color = colors.textSecondary, fontSize = 14.sp,
            )
            Text(
                t.t("settings.calc.sickOnWorkDay") + ": " + sickLabel,
                color = colors.textSecondary, fontSize = 14.sp,
            )
        }

        ActionButton(
            label = if (editOpen) t.t("settings.calc.showLess") else t.t("settings.calc.editRules"),
            tint = colors.accent,
        ) { editOpen = !editOpen }

        AnimatedVisibility(visible = editOpen) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(colors.surfaceVariant.copy(alpha = 0.34f))
                        .border(1.dp, colors.borderSubtle, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    SelectRow(t.t("settings.calc.overtimeRule"), overtimeLabel) { activeDrawer = "overtime" }

                    if (config.overtimeMode == OvertimeMode.SPLIT) {
                        NumberInputRow(
                            label = t.t("settings.calc.overtimeThresholdLabel"),
                            unit = t.t("settings.calc.hoursPerWeekUnit"),
                            value = ((config.overtimeThresholdMinutes ?: 2400) / 60.0).toString().removeSuffix(".0"),
                            onCommit = { text ->
                                val parsed = text.replace(",", ".").toDoubleOrNull()
                                if (parsed != null && parsed > 0) {
                                    onPatch { it.copy(overtimeThresholdMinutes = (parsed * 60).roundToInt()) }
                                }
                            },
                        )
                    }

                    SelectRow(t.t("settings.calc.sickOnWorkDay"), sickLabel) { activeDrawer = "sick" }
                }

                // Feiertage & Halbtage
                ActionButton(label = "📅 " + t.t("settings.calc.holidaysHalfDays"), tint = colors.textSecondary, outlined = true) {
                    holidayOpen = !holidayOpen
                }
                AnimatedVisibility(visible = holidayOpen) {
                    HolidaysEditor(config, t, colors.accent, onPatch, onMessage) { activeDrawer = it }
                }

                // Erweitert (Auto-Pausen + Urlaub)
                ActionButton(label = "⚙️ " + t.t("settings.calc.advanced"), tint = colors.textSecondary, outlined = true) {
                    advancedOpen = !advancedOpen
                }
                AnimatedVisibility(visible = advancedOpen) {
                    AdvancedEditor(config, t, language, onPatch, onMessage)
                }

                ActionButton(label = t.t("settings.calc.recalcAll"), tint = colors.textPrimary, filled = true) {
                    onRecalculate()
                }
            }
        }
    }
}

// ─── Feiertage & Halbtage ────────────────────────────────────

@Composable
private fun HolidaysEditor(
    config: CalculationConfig,
    t: I18n,
    accent: Color,
    onPatch: ((CalculationConfig) -> CalculationConfig) -> Unit,
    onMessage: (String) -> Unit,
    openDrawer: (String) -> Unit,
) {
    val colors = LocalAppColors.current
    var holidayDate by remember { mutableStateOf("") }
    var holidayName by remember { mutableStateOf("") }
    var halfDayInput by remember { mutableStateOf("") }

    val customHolidays = config.holidaySet.customHolidays ?: emptyMap()
    val sorted = customHolidays.entries.sortedBy { it.key }

    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.padding(start = 8.dp),
    ) {
        ActionButton(label = "⬆️ " + t.t("settings.calc.importHolidays"), tint = accent) { openDrawer("import") }

        if (sorted.isEmpty()) {
            Text(
                t.t("settings.calc.noHolidaysActive"),
                color = colors.textMuted, fontSize = 12.sp, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Column(
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier
                    .heightIn(max = 220.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                sorted.forEach { (key, name) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(colors.surfaceVariant.copy(alpha = 0.5f))
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(name, color = colors.textSecondary, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1)
                            Text(mmddToDisplay(key), color = colors.textMuted, fontSize = 12.sp)
                        }
                        Icon(
                            Icons.Filled.Close, contentDescription = t.t("settings.calc.removeHolidayAria", "name" to name),
                            tint = colors.textFaint,
                            modifier = Modifier
                                .size(18.dp)
                                .clickable {
                                    onPatch {
                                        it.copy(holidaySet = it.holidaySet.copy(customHolidays = customHolidays - key))
                                    }
                                },
                        )
                    }
                }
            }
        }

        // Eigenen Feiertag hinzufügen
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = holidayDate, onValueChange = { holidayDate = it },
                label = { Text(t.t("settings.calc.dateLabel")) },
                placeholder = { Text(t.t("settings.calc.dateFormatPlaceholder")) },
                singleLine = true, modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = holidayName, onValueChange = { holidayName = it },
                label = { Text(t.t("settings.calc.nameLabel")) },
                placeholder = { Text(t.t("settings.calc.customHolidayPlaceholder")) },
                singleLine = true, modifier = Modifier.fillMaxWidth(),
            )
            ActionButton(label = "+ " + t.t("settings.calc.add"), tint = accent, filled = true) {
                val mmdd = displayToMmdd(holidayDate)
                val name = holidayName.trim()
                if (mmdd == null || name.isEmpty()) {
                    onMessage(t.t("settings.calc.toast.formatDateName"))
                } else {
                    onPatch {
                        it.copy(
                            holidaySet = HolidaySetConfig(
                                HolidaySetMode.CUSTOM, emptyList(),
                                (it.holidaySet.customHolidays ?: emptyMap()) + (mmdd to name),
                            )
                        )
                    }
                    holidayDate = ""; holidayName = ""
                }
            }
        }

        // Halbtage
        SettingsFieldLabel(t.t("settings.calc.halfDays"))
        if (config.halfDayMode.customHalfDays.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                config.halfDayMode.customHalfDays.forEach { mmdd ->
                    Text(
                        mmddToDisplay(mmdd) + " ✕",
                        color = accent, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(accent.copy(alpha = 0.12f))
                            .clickable {
                                val filtered = config.halfDayMode.customHalfDays - mmdd
                                onPatch {
                                    it.copy(
                                        halfDayMode = HalfDayConfig(
                                            mode = if (filtered.isEmpty()) HalfDayMode.NONE else HalfDayMode.CUSTOM,
                                            customHalfDays = filtered,
                                        )
                                    )
                                }
                            }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = halfDayInput, onValueChange = { halfDayInput = it },
                placeholder = { Text(t.t("settings.calc.dateFormatPlaceholder")) },
                singleLine = true, modifier = Modifier.weight(1f),
            )
            Icon(
                Icons.Filled.Add, contentDescription = t.t("settings.calc.addHalfDayAria"),
                tint = Color.White,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(accent)
                    .clickable {
                        val mmdd = displayToMmdd(halfDayInput)
                        if (mmdd == null) {
                            onMessage(t.t("settings.calc.toast.formatDate"))
                        } else if (mmdd !in config.halfDayMode.customHalfDays) {
                            onPatch {
                                it.copy(
                                    halfDayMode = HalfDayConfig(
                                        HalfDayMode.CUSTOM,
                                        it.halfDayMode.customHalfDays + mmdd,
                                    )
                                )
                            }
                            halfDayInput = ""
                        }
                    }
                    .padding(10.dp),
            )
        }

        SelectRow(
            t.t("settings.calc.holidayWork"),
            t.t("settings.calc.holidayOnWorkOptions.${config.holidayOnWorkDayMode.wireName}"),
        ) { openDrawer("holidayWork") }
    }
}

// ─── Erweitert: Auto-Pausen + Urlaub ─────────────────────────

@Composable
private fun AdvancedEditor(
    config: CalculationConfig,
    t: I18n,
    language: String,
    onPatch: ((CalculationConfig) -> CalculationConfig) -> Unit,
    onMessage: (String) -> Unit,
) {
    val colors = LocalAppColors.current
    var fromHours by remember { mutableStateOf("6") }
    var pauseMinutes by remember { mutableStateOf("30") }
    var allowanceInput by remember(config.vacationAllowanceDays) {
        mutableStateOf(config.vacationAllowanceDays.toString())
    }
    var carryoverInput by remember(config.vacationCarryoverDays) {
        mutableStateOf(config.vacationCarryoverDays.toString())
    }

    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.padding(start = 8.dp),
    ) {
        SettingsFieldLabel(t.t("settings.calc.autoPauses"))
        Text(t.t("settings.calc.autoPauseInfo"), color = colors.textMuted, fontSize = 12.sp)

        if (config.autoPauseRules.isEmpty()) {
            Text(t.t("settings.calc.noAutoPauseRule"), color = colors.textMuted, fontSize = 12.sp)
        } else {
            config.autoPauseRules.forEachIndexed { idx, rule ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(colors.surfaceVariant.copy(alpha = 0.5f))
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        t.t(
                            "settings.calc.autoPauseRule",
                            "fromHours" to formatHoursLocalized(rule.fromMinutes, language),
                            "pauseMinutes" to rule.pauseMinutes,
                        ),
                        color = colors.textSecondary, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                    )
                    Icon(
                        Icons.Filled.Close, contentDescription = t.t("settings.calc.removeRuleAria"),
                        tint = colors.textFaint,
                        modifier = Modifier
                            .size(18.dp)
                            .clickable {
                                onPatch { c ->
                                    c.copy(autoPauseRules = c.autoPauseRules.filterIndexed { i, _ -> i != idx })
                                }
                            },
                    )
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(t.t("settings.calc.fromLabel"), color = colors.textMuted, fontSize = 12.sp)
            OutlinedTextField(
                value = fromHours, onValueChange = { fromHours = it }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.weight(1f),
            )
            Text(t.t("settings.calc.hoursToArrow"), color = colors.textMuted, fontSize = 12.sp)
            OutlinedTextField(
                value = pauseMinutes, onValueChange = { pauseMinutes = it }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
            Text(t.t("settings.calc.minUnit"), color = colors.textMuted, fontSize = 12.sp)
            Icon(
                Icons.Filled.Add, contentDescription = t.t("settings.calc.addPauseRuleAria"),
                tint = Color.White,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.accentStrong)
                    .clickable {
                        val hours = fromHours.replace(",", ".").toDoubleOrNull()
                        val minutes = pauseMinutes.toIntOrNull()
                        if (hours == null || hours <= 0 || minutes == null || minutes <= 0) {
                            onMessage(t.t("settings.calc.toast.invalidValues"))
                        } else {
                            val rule = AutoPauseRule((hours * 60).roundToInt(), minutes)
                            onPatch { c ->
                                c.copy(autoPauseRules = (c.autoPauseRules + rule).sortedBy { it.fromMinutes })
                            }
                            fromHours = "6"; pauseMinutes = "30"
                        }
                    }
                    .padding(10.dp),
            )
        }

        SettingsFieldLabel(t.t("settings.calc.vacation"))
        NumberInputRow(
            label = t.t("settings.calc.yearlyAllowance"),
            unit = t.t("settings.calc.days"),
            value = allowanceInput,
            onValueChange = { allowanceInput = it },
            onCommit = { text ->
                val parsed = text.toIntOrNull()?.coerceIn(0, 365) ?: 0
                allowanceInput = parsed.toString()
                onPatch { it.copy(vacationAllowanceDays = parsed) }
            },
        )
        NumberInputRow(
            label = t.t("settings.calc.remainingCarryover"),
            unit = t.t("settings.calc.days"),
            value = carryoverInput,
            onValueChange = { carryoverInput = it },
            onCommit = { text ->
                val parsed = text.toIntOrNull()?.coerceIn(-365, 365) ?: 0
                carryoverInput = parsed.toString()
                onPatch { it.copy(vacationCarryoverDays = parsed) }
            },
        )
        Text(t.t("settings.calc.carryoverHint"), color = colors.textMuted, fontSize = 12.sp)
    }
}

// ─── Bausteine ───────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OptionSheet(
    title: String,
    options: List<Pair<String, String>>,
    selected: String,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .padding(bottom = 24.dp)
                .heightIn(max = 480.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text(
                title, fontWeight = FontWeight.Bold, fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
            options.forEach { (id, label) ->
                Text(
                    label,
                    color = if (id == selected) colors.accent else colors.textPrimary,
                    fontWeight = if (id == selected) FontWeight.Bold else FontWeight.Normal,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(id) }
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                )
            }
        }
    }
}

@Composable
private fun NumberInputRow(
    label: String,
    unit: String,
    value: String,
    onValueChange: (String) -> Unit = {},
    onCommit: (String) -> Unit,
) {
    val colors = LocalAppColors.current
    var text by remember(value) { mutableStateOf(value) }
    var hadFocus by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SettingsFieldLabel(label)
        OutlinedTextField(
            value = text,
            onValueChange = { text = it; onValueChange(it) },
            singleLine = true,
            suffix = {
                Text(unit, color = colors.textSecondary, fontWeight = FontWeight.Bold)
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Decimal,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(onDone = {
                hadFocus = false
                onCommit(text)
                focusManager.clearFocus()
            }),
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { state ->
                    if (hadFocus && !state.isFocused) onCommit(text)
                    hadFocus = state.isFocused
                },
        )
    }
}

@Composable
fun ActionButton(
    label: String,
    tint: Color,
    filled: Boolean = false,
    outlined: Boolean = false,
    small: Boolean = false,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Text(
        text = label,
        color = if (!enabled) colors.textFaint else if (filled) Color.White else tint,
        fontWeight = FontWeight.Bold,
        fontSize = if (small) 11.sp else 14.sp,
        maxLines = 1,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(
                when {
                    filled -> if (tint == colors.textPrimary) colors.headerBackground else tint
                    outlined -> Color.Transparent
                    else -> tint.copy(alpha = if (enabled) 0.1f else 0.04f)
                }
            )
            .border(
                1.dp,
                if (!enabled) colors.borderSubtle
                else if (outlined) colors.border else tint.copy(alpha = if (filled) 0f else 0.4f),
                RoundedCornerShape(12.dp),
            )
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = if (small) 9.dp else 12.dp),
    )
}

/** Import-Optionen: AT, alle DE-Bundesländer, alle CH-Kantone, orthodox, islamisch. */
fun holidayImportOptions(t: I18n): List<Pair<String, String>> = buildList {
    add("at" to t.t("settings.calc.importOptions.austria"))
    GERMANY_LOCALE_IDS.forEach { id ->
        add(id to t.t("settings.calc.importOptions.germanyState", "state" to getLocale(id).region))
    }
    SWITZERLAND_LOCALE_IDS.forEach { id ->
        add(id to t.t("settings.calc.importOptions.swissKanton", "kanton" to getLocale(id).region))
    }
    add("_orthodox" to t.t("settings.calc.importOptions.orthodox"))
    add("_islamic" to t.t("settings.calc.importOptions.islamic"))
}
