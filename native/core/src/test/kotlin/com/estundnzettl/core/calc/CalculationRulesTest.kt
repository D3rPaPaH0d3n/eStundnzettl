package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.locale.neutralLocale
import com.estundnzettl.core.model.AutoPauseRule
import com.estundnzettl.core.model.HalfDayConfig
import com.estundnzettl.core.model.HalfDayMode
import com.estundnzettl.core.model.HolidaySetMode
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.PdfDisplayConfig
import com.estundnzettl.core.model.SickOnWorkDayMode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * Port der Kernaussagen aus src/utils/__tests__/calculationConfig.test.ts.
 */
class CalculationRulesTest {

    // ─── getDefaultCalculationConfig ─────────────────────────

    @Test
    fun `AT-Default bildet Locale-Verhalten 1zu1 ab`() {
        val config = getDefaultCalculationConfig(austriaLocale, listOf(0, 510, 510, 510, 510, 270, 0))
        assertEquals(2310, config.weeklyTargetMinutes)
        assertEquals(OvertimeMode.SPLIT, config.overtimeMode)
        assertEquals(2400, config.overtimeThresholdMinutes)
        assertEquals(SickOnWorkDayMode.CAP_TO_TARGET, config.sickOnWorkDayMode)
        assertEquals(HolidaySetMode.LOCALE_DEFAULT, config.holidaySet.mode)
        assertEquals(25, config.vacationAllowanceDays)
        assertEquals(0, config.vacationCarryoverDays)
    }

    @Test
    fun `Default faellt auf Locale-Arbeitstage zurueck wenn workDays fehlen`() {
        val config = getDefaultCalculationConfig(austriaLocale, null)
        assertEquals(2310, config.weeklyTargetMinutes) // AT-Default 38,5h
    }

    @Test
    fun `Neutral-Default hat keinen Split und additive Krankregel`() {
        val config = getDefaultCalculationConfig(neutralLocale, null)
        assertEquals(OvertimeMode.NONE, config.overtimeMode)
        assertEquals(SickOnWorkDayMode.ADDITIVE, config.sickOnWorkDayMode)
        assertNull(config.overtimeThresholdMinutes)
    }

    // ─── getBlankCalculationConfig ───────────────────────────

    @Test
    fun `Blank-Config ist leerer Baukasten-Startzustand`() {
        val config = getBlankCalculationConfig(null)
        assertEquals(0, config.weeklyTargetMinutes)
        assertEquals(OvertimeMode.NONE, config.overtimeMode)
        assertEquals(HolidaySetMode.CUSTOM, config.holidaySet.mode)
        assertEquals(emptyMap(), config.holidaySet.customHolidays)
        assertEquals(HalfDayMode.NONE, config.halfDayMode.mode)
    }

    // ─── resolveEffectiveRules ───────────────────────────────

    @Test
    fun `ohne Config kommen die Locale-Defaults`() {
        val rules = resolveEffectiveRules(austriaLocale, null)
        assertEquals(listOf("12-24", "12-31"), rules.halfDays)
        assertEquals(OvertimeMode.SPLIT, rules.overtimeMode)
        assertEquals(2400, rules.weeklyLimitMinutes)
        assertEquals(SickOnWorkDayMode.CAP_TO_TARGET, rules.sickMode)
        assertNull(rules.customHolidays)
    }

    @Test
    fun `Neutral-Locale ohne Config hat keinen Split`() {
        val rules = resolveEffectiveRules(neutralLocale, null)
        assertEquals(OvertimeMode.NONE, rules.overtimeMode)
        assertEquals(false, rules.overtimeSplitEnabled)
        assertEquals(SickOnWorkDayMode.ADDITIVE, rules.sickMode)
    }

    @Test
    fun `halfDayMode NONE entfernt Halbtage trotz Locale`() {
        val config = getDefaultCalculationConfig(austriaLocale, null)
            .copy(halfDayMode = HalfDayConfig(mode = HalfDayMode.NONE))
        val rules = resolveEffectiveRules(austriaLocale, config)
        assertEquals(emptyList(), rules.halfDays)
    }

    @Test
    fun `halfDayMode CUSTOM ersetzt Locale-Halbtage`() {
        val config = getDefaultCalculationConfig(austriaLocale, null)
            .copy(halfDayMode = HalfDayConfig(mode = HalfDayMode.CUSTOM, customHalfDays = listOf("06-15")))
        val rules = resolveEffectiveRules(austriaLocale, config)
        assertEquals(listOf("06-15"), rules.halfDays)
    }

    @Test
    fun `overtimeThreshold uebersteuert Locale-Limit bei SPLIT`() {
        val config = getDefaultCalculationConfig(austriaLocale, null)
            .copy(overtimeMode = OvertimeMode.SPLIT, overtimeThresholdMinutes = 2500)
        val rules = resolveEffectiveRules(austriaLocale, config)
        assertEquals(2500, rules.weeklyLimitMinutes)
    }

    // ─── getEffectivePdfDisplay ──────────────────────────────

    @Test
    fun `ohne Config sind alle PDF-Toggles AN`() {
        val display = getEffectivePdfDisplay(null)
        assertEquals(PdfDisplayConfig(), display)
        assertEquals(true, display.showSummary)
        assertEquals(true, display.showCustomNote)
    }

    @Test
    fun `pdfDisplay der Config wird durchgereicht`() {
        val config = getDefaultCalculationConfig(austriaLocale, null)
            .copy(pdfDisplay = PdfDisplayConfig(showBalance = false))
        val display = getEffectivePdfDisplay(config)
        assertEquals(false, display.showBalance)
        assertEquals(true, display.showSummary)
    }

    // ─── calculateAutoPause ──────────────────────────────────

    @Test
    fun `leere Regeln - keine Auto-Pause`() {
        assertEquals(0, calculateAutoPause(600, emptyList()))
    }

    @Test
    fun `groesste greifende Regel gewinnt`() {
        val rules = listOf(AutoPauseRule(360, 30), AutoPauseRule(540, 45))
        assertEquals(0, calculateAutoPause(300, rules))   // unter 6h: nichts
        assertEquals(30, calculateAutoPause(400, rules))  // über 6h: 30min
        assertEquals(45, calculateAutoPause(600, rules))  // über 9h: 45min
    }

    @Test
    fun `Schwelle ist exklusiv (genau fromMinutes greift nicht)`() {
        val rules = listOf(AutoPauseRule(360, 30))
        assertEquals(0, calculateAutoPause(360, rules))
        assertEquals(30, calculateAutoPause(361, rules))
    }
}
