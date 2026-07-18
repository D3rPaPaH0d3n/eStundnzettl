package com.estundnzettl.app.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.Upload
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.OnboardingUiState
import com.estundnzettl.app.ui.settings.OptionSheet
import com.estundnzettl.app.ui.settings.displayToMmdd
import com.estundnzettl.app.ui.settings.formatHoursLocalized
import com.estundnzettl.app.ui.settings.holidayImportOptions
import com.estundnzettl.app.ui.settings.mmddToDisplay
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.locale.holidays.getIslamicHolidays
import com.estundnzettl.core.locale.holidays.getOrthodoxHolidays
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.HalfDayConfig
import com.estundnzettl.core.model.HalfDayMode
import com.estundnzettl.core.model.HolidayOnWorkDayMode
import com.estundnzettl.core.model.HolidaySetConfig
import com.estundnzettl.core.model.HolidaySetMode
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.SickOnWorkDayMode
import java.time.LocalDate

/**
 * Onboarding-Schritt "Eigener Plan" — voller Port von CalculationStep.tsx:
 * drei Simple-Karten (Vertragsstunden readonly, Überstunden-Regel mit
 * Split-Schwelle und Live-Preview, Krank-Regel mit Preview) plus
 * "Erweitert"-Akkordeon mit Feiertagen (Import + eigene), Halbtagen,
 * Feiertag+Arbeit und Urlaubstagen.
 */
@Composable
internal fun CalculationBuilderStep(viewModel: MainViewModel, ob: OnboardingUiState, language: String) {
    val colors = LocalAppColors.current
    val t = com.estundnzettl.app.ui.theme.LocalI18n.current
    val config = ob.calcConfig ?: return

    fun patch(transform: (CalculationConfig) -> CalculationConfig) {
        viewModel.onboardingUpdate { st ->
            st.copy(calcConfig = st.calcConfig?.let(transform))
        }
    }

    var drawer by remember { mutableStateOf<String?>(null) }
    var advancedOpen by remember { mutableStateOf(false) }
    var holidayDateInput by remember { mutableStateOf("") }
    var holidayNameInput by remember { mutableStateOf("") }
    var halfDayInput by remember { mutableStateOf("") }

    val weeklyMinutes = ob.workDays.sum()
    val customHolidays = config.holidaySet.customHolidays ?: emptyMap()
    val sortedHolidays = customHolidays.entries.sortedBy { it.key }

    val overtimeLabel = t.t("settings.calc.overtimeOptions.${config.overtimeMode.wireName}")
    val sickLabel = t.t("settings.calc.sickOptions.${config.sickOnWorkDayMode.wireName}")
    val holidayWorkLabel = t.t("settings.calc.holidayOnWorkOptions.${config.holidayOnWorkDayMode.wireName}")

    // Live-Preview: Beispiel Mo 10h Arbeit bei 8h Tagessoll
    val overtimePreview = run {
        val workMinutes = 600
        val dayTarget = 480
        val weekTarget = if (weeklyMinutes > 0) weeklyMinutes else 2310
        val mehrarbeitBuffer = maxOf(0, (config.overtimeThresholdMinutes ?: 2400) - weekTarget)
        val balance = maxOf(0, workMinutes - dayTarget)
        when (config.overtimeMode) {
            OvertimeMode.NONE -> t.t(
                "onboarding.calc.preview.overtimeNone",
                "weekTarget" to formatHoursLocalized(weekTarget, language),
                "balance" to formatHoursLocalized(balance, language),
            )
            OvertimeMode.UEBERSTUNDEN_ONLY -> t.t(
                "onboarding.calc.preview.overtimeAll",
                "balance" to formatHoursLocalized(balance, language),
            )
            else -> {
                val ma = minOf(balance, mehrarbeitBuffer)
                val ue = maxOf(0, balance - ma)
                t.t(
                    "onboarding.calc.preview.overtimeSplit",
                    "ma" to formatHoursLocalized(ma, language),
                    "ue" to formatHoursLocalized(ue, language),
                )
            }
        }
    }
    val sickPreview = when (config.sickOnWorkDayMode) {
        SickOnWorkDayMode.CAP_TO_TARGET -> t.t("onboarding.calc.preview.sickCap")
        SickOnWorkDayMode.ADDITIVE -> t.t("onboarding.calc.preview.sickAdditive")
        SickOnWorkDayMode.IGNORE -> t.t("onboarding.calc.preview.sickIgnore")
    }

    // ─── Auswahl-Sheets ──────────────────────────────────────

    when (drawer) {
        "overtime" -> OptionSheet(
            title = t.t("settings.calc.overtimeRule"),
            options = OvertimeMode.entries.map { it.wireName to t.t("settings.calc.overtimeOptions.${it.wireName}") },
            selected = config.overtimeMode.wireName,
            onSelect = { id ->
                val mode = OvertimeMode.fromWireOrNull(id)!!
                patch {
                    it.copy(
                        overtimeMode = mode,
                        overtimeThresholdMinutes = when (mode) {
                            OvertimeMode.SPLIT -> it.overtimeThresholdMinutes ?: 2400
                            OvertimeMode.NONE -> null
                            else -> it.overtimeThresholdMinutes
                        },
                    )
                }
                drawer = null
            },
            onDismiss = { drawer = null },
        )

        "sick" -> OptionSheet(
            title = t.t("settings.calc.sickOnWorkDay"),
            options = listOf(
                SickOnWorkDayMode.CAP_TO_TARGET, SickOnWorkDayMode.ADDITIVE, SickOnWorkDayMode.IGNORE,
            ).map { it.wireName to t.t("settings.calc.sickOptions.${it.wireName}") },
            selected = config.sickOnWorkDayMode.wireName,
            onSelect = { id ->
                patch { it.copy(sickOnWorkDayMode = SickOnWorkDayMode.fromWireOrNull(id)!!) }
                drawer = null
            },
            onDismiss = { drawer = null },
        )

        "holidayWork" -> OptionSheet(
            title = t.t("settings.calc.drawerHolidayWork"),
            options = listOf(
                HolidayOnWorkDayMode.ADDITIVE,
                HolidayOnWorkDayMode.COUNTS_AS_OVERTIME,
                HolidayOnWorkDayMode.CAP_TO_TARGET,
            ).map { it.wireName to t.t("settings.calc.holidayOnWorkOptions.${it.wireName}") },
            selected = config.holidayOnWorkDayMode.wireName,
            onSelect = { id ->
                patch { it.copy(holidayOnWorkDayMode = HolidayOnWorkDayMode.fromWireOrNull(id)!!) }
                drawer = null
            },
            onDismiss = { drawer = null },
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
                val next = customHolidays.toMutableMap()
                for ((date, name) in base) next[date.substring(5)] = name
                patch {
                    it.copy(holidaySet = HolidaySetConfig(HolidaySetMode.CUSTOM, emptyList(), next))
                }
                drawer = null
            },
            onDismiss = { drawer = null },
        )
    }

    // ─── Inhalt ──────────────────────────────────────────────

    StepHeader(
        Icons.Outlined.Tune, "emerald",
        t.t("onboarding.calc.title"), t.t("onboarding.calc.subtitle"),
    )

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        HintBox(Icons.Outlined.Info, "emerald", t.t("onboarding.calc.infoHint"))

        // Karte 1: Vertragsstunden (readonly, aus Schritt 3)
        CalcCard {
            CalcCardLabel(t.t("settings.calc.contractedHours"))
            Text(
                t.t("settings.calc.hoursPerWeek", "hours" to formatHoursLocalized(weeklyMinutes, language)),
                color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 19.sp,
            )
            Text(
                t.t("onboarding.calc.contractedHoursAuto"),
                color = colors.textMuted, fontSize = 12.sp, lineHeight = 16.sp,
            )
        }

        // Karte 2: Überstunden-Regel (+ Schwelle bei Split) + Preview
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            CalcSelectCard(t.t("settings.calc.overtimeRule"), overtimeLabel) { drawer = "overtime" }

            if (config.overtimeMode == OvertimeMode.SPLIT) {
                var thresholdText by remember(config.overtimeThresholdMinutes) {
                    mutableStateOf(
                        (((config.overtimeThresholdMinutes ?: 2400) / 60.0))
                            .let { if (it % 1.0 == 0.0) it.toInt().toString() else it.toString() },
                    )
                }
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (colors.isDark) Palette.Emerald500.copy(alpha = 0.08f) else Palette.Emerald50.copy(alpha = 0.5f),
                        )
                        .border(
                            1.dp,
                            if (colors.isDark) Palette.Emerald700 else Palette.Emerald100,
                            RoundedCornerShape(12.dp),
                        )
                        .padding(12.dp),
                ) {
                    Text(
                        t.t("settings.calc.overtimeThresholdLabel"),
                        color = colors.textSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        OutlinedTextField(
                            value = thresholdText,
                            onValueChange = { value ->
                                thresholdText = value
                                val parsed = value.replace(",", ".").toDoubleOrNull()
                                if (parsed != null && parsed > 0) {
                                    patch { it.copy(overtimeThresholdMinutes = Math.round(parsed * 60).toInt()) }
                                }
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            t.t("settings.calc.hoursPerWeekUnit"),
                            color = colors.textSecondary, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }

            CalcPreviewText(overtimePreview)
        }

        // Karte 3: Krank-Regel + Preview
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            CalcSelectCard(t.t("settings.calc.sickOnWorkDay"), sickLabel) { drawer = "sick" }
            CalcPreviewText(sickPreview)
        }

        // Erweitert-Toggle (gestrichelte Umrandung wie das Original)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .drawBehind {
                    drawRoundRect(
                        color = if (colors.isDark) Palette.Zinc600 else Palette.Zinc300,
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(12.dp.toPx()),
                        style = Stroke(
                            width = 1.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f)),
                        ),
                    )
                }
                .clickable { advancedOpen = !advancedOpen }
                .padding(vertical = 12.dp),
        ) {
            Box(modifier = Modifier.weight(1f)) {}
            Text(
                if (advancedOpen) t.t("onboarding.calc.advancedClose") else t.t("onboarding.calc.advancedOpen"),
                color = colors.textSecondary, fontSize = 13.sp, fontWeight = FontWeight.Bold,
            )
            Icon(
                Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = colors.textSecondary,
                modifier = Modifier
                    .size(16.dp)
                    .rotate(if (advancedOpen) 180f else 0f),
            )
            Box(modifier = Modifier.weight(1f)) {}
        }

        AnimatedVisibility(
            visible = advancedOpen,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut(),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Karte 4: Feiertage
                CalcCard(spacing = 12.dp) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Outlined.CalendarMonth, contentDescription = null,
                            tint = colors.accent, modifier = Modifier.size(18.dp),
                        )
                        Text(
                            t.t("onboarding.calc.holidaysTitle"),
                            color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp,
                        )
                    }

                    EmeraldActionButton("⬆ " + t.t("settings.calc.importHolidays")) { drawer = "import" }

                    if (sortedHolidays.isEmpty()) {
                        Text(
                            t.t("onboarding.calc.noHolidays"),
                            color = colors.textMuted, fontSize = 12.sp, fontStyle = FontStyle.Italic,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            sortedHolidays.forEach { (key, name) ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(colors.surfaceVariant.copy(alpha = 0.5f))
                                        .padding(8.dp),
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            name, color = colors.textSecondary,
                                            fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1,
                                        )
                                        Text(mmddToDisplay(key), color = colors.textMuted, fontSize = 11.sp)
                                    }
                                    Icon(
                                        Icons.Filled.Close,
                                        contentDescription = t.t("settings.calc.removeHolidayAria", "name" to name),
                                        tint = colors.textFaint,
                                        modifier = Modifier
                                            .size(20.dp)
                                            .clip(CircleShape)
                                            .clickable {
                                                val next = customHolidays.toMutableMap().apply { remove(key) }
                                                patch {
                                                    it.copy(holidaySet = it.holidaySet.copy(customHolidays = next))
                                                }
                                            },
                                    )
                                }
                            }
                        }
                    }

                    // Eigener Feiertag
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(top = 4.dp),
                    ) {
                        CalcCardLabel(t.t("onboarding.calc.customHolidayTitle"))
                        WizardField(
                            label = t.t("settings.calc.dateLabel"),
                            value = holidayDateInput,
                            placeholder = t.t("settings.calc.dateFormatPlaceholder"),
                            onChange = { holidayDateInput = it },
                        )
                        WizardField(
                            label = t.t("settings.calc.nameLabel"),
                            value = holidayNameInput,
                            placeholder = t.t("settings.calc.customHolidayPlaceholder"),
                            onChange = { holidayNameInput = it },
                        )
                        EmeraldActionButton("+ " + t.t("settings.calc.add"), filled = true) {
                            val mmdd = displayToMmdd(holidayDateInput)
                            val name = holidayNameInput.trim()
                            if (mmdd != null && name.isNotEmpty()) {
                                val next = customHolidays.toMutableMap().apply { put(mmdd, name) }
                                patch {
                                    it.copy(holidaySet = HolidaySetConfig(HolidaySetMode.CUSTOM, emptyList(), next))
                                }
                                holidayDateInput = ""
                                holidayNameInput = ""
                            }
                        }
                    }
                }

                // Karte 5: Halbtage
                CalcCard(spacing = 12.dp) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Outlined.CalendarMonth, contentDescription = null,
                            tint = colors.accent, modifier = Modifier.size(18.dp),
                        )
                        Text(
                            t.t("onboarding.calc.halfDaysTitle"),
                            color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp,
                        )
                    }

                    if (config.halfDayMode.customHalfDays.isEmpty()) {
                        Text(
                            t.t("onboarding.calc.noHalfDays"),
                            color = colors.textMuted, fontSize = 12.sp, fontStyle = FontStyle.Italic,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    } else {
                        androidx.compose.foundation.layout.FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            config.halfDayMode.customHalfDays.forEach { mmdd ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(50))
                                        .background(
                                            if (colors.isDark) Palette.Emerald500.copy(alpha = 0.2f) else Palette.Emerald100,
                                        )
                                        .clickable {
                                            val filtered = config.halfDayMode.customHalfDays - mmdd
                                            patch {
                                                it.copy(
                                                    halfDayMode = HalfDayConfig(
                                                        mode = if (filtered.isEmpty()) HalfDayMode.NONE else HalfDayMode.CUSTOM,
                                                        customHalfDays = filtered,
                                                    ),
                                                )
                                            }
                                        }
                                        .padding(horizontal = 12.dp, vertical = 4.dp),
                                ) {
                                    Text(
                                        mmddToDisplay(mmdd),
                                        color = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
                                        fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                    )
                                    Icon(
                                        Icons.Filled.Close, contentDescription = null,
                                        tint = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
                                        modifier = Modifier.size(12.dp),
                                    )
                                }
                            }
                        }
                    }

                    EmeraldActionButton(t.t("onboarding.calc.classicHalfDays")) {
                        val next = (config.halfDayMode.customHalfDays + listOf("12-24", "12-31"))
                            .distinct()
                            .sorted()
                        patch { it.copy(halfDayMode = HalfDayConfig(HalfDayMode.CUSTOM, next)) }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(modifier = Modifier.weight(1f)) {
                            WizardField(
                                label = "",
                                value = halfDayInput,
                                placeholder = t.t("settings.calc.dateFormatPlaceholder"),
                                onChange = { halfDayInput = it },
                            )
                        }
                        Icon(
                            Icons.Filled.Add,
                            contentDescription = t.t("settings.calc.addHalfDayAria"),
                            tint = Color.White,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Palette.Emerald500)
                                .clickable {
                                    val mmdd = displayToMmdd(halfDayInput)
                                    if (mmdd != null && mmdd !in config.halfDayMode.customHalfDays) {
                                        patch {
                                            it.copy(
                                                halfDayMode = HalfDayConfig(
                                                    HalfDayMode.CUSTOM,
                                                    it.halfDayMode.customHalfDays + mmdd,
                                                ),
                                            )
                                        }
                                        halfDayInput = ""
                                    }
                                }
                                .padding(8.dp),
                        )
                    }
                }

                // Karte 6: Feiertag + Arbeit
                CalcSelectCard(t.t("settings.calc.holidayWork"), holidayWorkLabel) { drawer = "holidayWork" }

                // Karte 7: Urlaubstage
                CalcCard(spacing = 12.dp) {
                    CalcCardLabel(t.t("onboarding.calc.vacationTitle"))
                    NumberFieldWithUnit(
                        label = t.t("settings.calc.yearlyAllowance"),
                        value = config.vacationAllowanceDays,
                        unit = t.t("settings.calc.days"),
                        allowNegative = false,
                    ) { parsed -> patch { it.copy(vacationAllowanceDays = parsed) } }
                    NumberFieldWithUnit(
                        label = t.t("settings.calc.remainingCarryover"),
                        value = config.vacationCarryoverDays,
                        unit = t.t("settings.calc.days"),
                        allowNegative = true,
                    ) { parsed -> patch { it.copy(vacationCarryoverDays = parsed) } }
                    Text(
                        t.t("settings.calc.carryoverHint"),
                        color = colors.textMuted, fontSize = 11.sp,
                        fontStyle = FontStyle.Italic, lineHeight = 15.sp,
                    )
                }
            }
        }
    }
}

// ─── Bausteine ───────────────────────────────────────────────

/** Weiße Karte mit 2dp-Rahmen (rounded-xl border-2 des Originals). */
@Composable
private fun CalcCard(
    spacing: androidx.compose.ui.unit.Dp = 4.dp,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    Column(
        verticalArrangement = Arrangement.spacedBy(spacing),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface)
            .border(2.dp, colors.border, RoundedCornerShape(12.dp))
            .padding(16.dp),
        content = content,
    )
}

@Composable
private fun CalcCardLabel(text: String) {
    val colors = LocalAppColors.current
    Text(
        text.uppercase(),
        color = colors.textMuted, fontSize = 11.sp,
        fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp,
    )
}

/** Auswahl-Karte: Label oben, fetter Wert + Chevron. */
@Composable
private fun CalcSelectCard(label: String, value: String, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface)
            .border(2.dp, colors.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        CalcCardLabel(label)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(value, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Icon(
                Icons.Filled.KeyboardArrowDown, contentDescription = null,
                tint = colors.textFaint, modifier = Modifier.size(18.dp),
            )
        }
    }
}

/** Kursive Live-Preview-Zeile unter einer Regel-Karte. */
@Composable
private fun CalcPreviewText(text: String) {
    val colors = LocalAppColors.current
    Text(
        text,
        color = colors.textMuted, fontSize = 12.sp, lineHeight = 16.sp,
        fontStyle = FontStyle.Italic,
        modifier = Modifier.padding(horizontal = 4.dp),
    )
}

/** Emerald-Button (getönt oder gefüllt) für Import/Hinzufügen. */
@Composable
private fun EmeraldActionButton(label: String, filled: Boolean = false, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Text(
        label,
        color = when {
            filled -> Color.White
            colors.isDark -> Palette.Emerald400
            else -> Palette.Emerald700
        },
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(
                when {
                    filled -> Palette.Emerald500
                    colors.isDark -> Palette.Emerald500.copy(alpha = 0.15f)
                    else -> Palette.Emerald50
                },
            )
            .border(
                1.dp,
                if (filled) Color.Transparent else if (colors.isDark) Palette.Emerald700 else Palette.Emerald100,
                RoundedCornerShape(8.dp),
            )
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
    )
}

/** Zahlenfeld mit Einheit rechts (Urlaubstage). */
@Composable
private fun NumberFieldWithUnit(
    label: String,
    value: Int,
    unit: String,
    allowNegative: Boolean,
    onCommit: (Int) -> Unit,
) {
    val colors = LocalAppColors.current
    var text by remember(value) { mutableStateOf(value.toString()) }
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, color = colors.textMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedTextField(
                value = text,
                onValueChange = { input ->
                    text = input
                    val parsed = input.toIntOrNull()
                    if (parsed != null && (allowNegative || parsed >= 0)) onCommit(parsed)
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.width(110.dp),
            )
            Text(unit, color = colors.textSecondary, fontSize = 13.sp)
        }
    }
}
