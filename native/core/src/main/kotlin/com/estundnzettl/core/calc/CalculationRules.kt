package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.locale.LocaleCountry
import com.estundnzettl.core.model.AutoPauseRule
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.HalfDayConfig
import com.estundnzettl.core.model.HalfDayMode
import com.estundnzettl.core.model.HolidayOnWorkDayMode
import com.estundnzettl.core.model.HolidaySetConfig
import com.estundnzettl.core.model.HolidaySetMode
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.PdfDisplayConfig
import com.estundnzettl.core.model.SickOnWorkDayMode

/**
 * Defaults und Resolver für die per-User Rechenkonfiguration.
 * Port von src/utils/calculationConfig.ts.
 */

/** Default-Anzeige-Toggles fuer das PDF: alles AN. */
val DEFAULT_PDF_DISPLAY = PdfDisplayConfig()

/**
 * Liefert eine vollstaendige [PdfDisplayConfig]: die des Users oder den
 * Alles-AN-Default, wenn keine Config (oder kein pdfDisplay) gesetzt ist.
 */
fun getEffectivePdfDisplay(config: CalculationConfig?): PdfDisplayConfig =
    config?.pdfDisplay ?: DEFAULT_PDF_DISPLAY

/**
 * Erzeugt eine neue [CalculationConfig] aus den Locale-Defaults und den
 * aktuellen Arbeitstagen. Das Ergebnis bildet das Locale-Verhalten 1:1 nach,
 * damit die Migration bestehender User keine Zahlen ändert.
 */
fun getDefaultCalculationConfig(locale: AppLocale, workDays: List<Int>?): CalculationConfig {
    val safeDays = if (workDays != null && workDays.size == 7) workDays else locale.defaultWorkDays
    val weekly = safeDays.sum()

    return CalculationConfig(
        weeklyTargetMinutes = weekly,
        overtimeMode = if (locale.enableOvertimeSplit) OvertimeMode.SPLIT else OvertimeMode.NONE,
        overtimeThresholdMinutes = locale.weeklyLimitMinutes,
        sickOnWorkDayMode = if (locale.enableSickAdjustment) {
            SickOnWorkDayMode.CAP_TO_TARGET
        } else {
            SickOnWorkDayMode.ADDITIVE
        },
        holidaySet = HolidaySetConfig(mode = HolidaySetMode.LOCALE_DEFAULT),
        halfDayMode = HalfDayConfig(mode = HalfDayMode.LOCALE_DEFAULT),
        holidayOnWorkDayMode = HolidayOnWorkDayMode.ADDITIVE,
        autoPauseRules = emptyList(),
        vacationAllowanceDays = getDefaultVacationDays(locale.country),
        vacationCarryoverDays = 0,
    )
}

/** Gesetzlicher Mindest-Urlaub pro Land. */
private fun getDefaultVacationDays(country: LocaleCountry): Int = when (country) {
    LocaleCountry.AT -> 25  // 5 Wochen, AUrlG
    LocaleCountry.DE -> 20  // BUrlG §3 (5-Tage-Woche)
    LocaleCountry.CH -> 20  // ArG (ab 20 Jahren)
    else -> 25              // konservativer Fallback
}

/**
 * "Eigener Plan"-Startzustand: leere Regeln, keine Feiertage, keine
 * Halbtage, keine Überstunden-Unterscheidung.
 */
fun getBlankCalculationConfig(workDays: List<Int>?): CalculationConfig {
    val safeDays = if (workDays != null && workDays.size == 7) workDays else List(7) { 0 }
    val weekly = safeDays.sum()

    return CalculationConfig(
        weeklyTargetMinutes = weekly,
        overtimeMode = OvertimeMode.NONE,
        overtimeThresholdMinutes = null,
        sickOnWorkDayMode = SickOnWorkDayMode.ADDITIVE,
        holidaySet = HolidaySetConfig(mode = HolidaySetMode.CUSTOM, customHolidays = emptyMap()),
        halfDayMode = HalfDayConfig(mode = HalfDayMode.NONE),
        holidayOnWorkDayMode = HolidayOnWorkDayMode.ADDITIVE,
        autoPauseRules = emptyList(),
        vacationAllowanceDays = 25,
        vacationCarryoverDays = 0,
    )
}

/**
 * Ergebnis-Objekt von [resolveEffectiveRules]. Enthält alles, was die
 * Rechenfunktionen brauchen, damit sie nicht bei jedem Aufruf selbst
 * entscheiden müssen, ob Config oder Locale Vorrang hat.
 */
data class EffectiveCalculationRules(
    /** Halbtage als MM-DD-Suffixe. */
    val halfDays: List<String>,
    /** Soll MA/ÜS-Split greifen? (false = alles in einen Topf) */
    val overtimeSplitEnabled: Boolean,
    /** NONE = nur Saldo, SPLIT = MA+ÜS, UEBERSTUNDEN_ONLY = alles ÜS */
    val overtimeMode: OvertimeMode,
    /** Wochen-Grenze in Minuten, ab der ÜS statt MA gezählt werden. */
    val weeklyLimitMinutes: Int?,
    /** Krank-Modus (ersetzt das alte `enableSickAdjustment`-Flag). */
    val sickMode: SickOnWorkDayMode,
    /** Feiertags-Modus für Kollision mit Arbeit am selben Tag. */
    val holidayOnWorkDayMode: HolidayOnWorkDayMode,
    /** Auto-Pausen-Regeln (leere Liste = aus). */
    val autoPauseRules: List<AutoPauseRule>,
    /** Map MM-DD → Name oder null wenn Locale-Default genutzt wird. */
    val customHolidays: Map<String, String>?,
    /** MM-DD-Keys, die aus der Locale-Liste entfernt werden sollen. */
    val disabledHolidayKeys: List<String>,
    /** Aktiver Feiertagsset-Modus. */
    val holidaySetMode: HolidaySetMode,
)

/**
 * Vereinheitlicht Locale- und Config-Quellen zu einem einzigen "effective
 * rules"-Objekt. Wenn `config` null ist, werden ausschließlich die
 * Locale-Defaults verwendet.
 */
fun resolveEffectiveRules(locale: AppLocale, config: CalculationConfig?): EffectiveCalculationRules {
    if (config == null) {
        return EffectiveCalculationRules(
            halfDays = locale.halfDays,
            overtimeSplitEnabled = locale.enableOvertimeSplit,
            overtimeMode = if (locale.enableOvertimeSplit) OvertimeMode.SPLIT else OvertimeMode.NONE,
            weeklyLimitMinutes = locale.weeklyLimitMinutes,
            sickMode = if (locale.enableSickAdjustment) {
                SickOnWorkDayMode.CAP_TO_TARGET
            } else {
                SickOnWorkDayMode.ADDITIVE
            },
            holidayOnWorkDayMode = HolidayOnWorkDayMode.ADDITIVE,
            autoPauseRules = emptyList(),
            customHolidays = null,
            disabledHolidayKeys = emptyList(),
            holidaySetMode = HolidaySetMode.LOCALE_DEFAULT,
        )
    }

    // Halbtage: Config bestimmt den Modus
    val halfDays = when (config.halfDayMode.mode) {
        HalfDayMode.NONE -> emptyList()
        HalfDayMode.CUSTOM -> config.halfDayMode.customHalfDays
        HalfDayMode.LOCALE_DEFAULT -> locale.halfDays
    }

    // MA/ÜS: overtimeMode steuert ob überhaupt gesplittet wird
    val overtimeSplitEnabled = config.overtimeMode != OvertimeMode.NONE
    val weeklyLimitMinutes = if (config.overtimeMode == OvertimeMode.SPLIT) {
        config.overtimeThresholdMinutes ?: locale.weeklyLimitMinutes
    } else {
        locale.weeklyLimitMinutes
    }

    // Feiertage: Custom ersetzt komplett, locale_default filtert
    val customHolidays = if (config.holidaySet.mode == HolidaySetMode.CUSTOM) {
        config.holidaySet.customHolidays ?: emptyMap()
    } else {
        null
    }

    return EffectiveCalculationRules(
        halfDays = halfDays,
        overtimeSplitEnabled = overtimeSplitEnabled,
        overtimeMode = config.overtimeMode,
        weeklyLimitMinutes = weeklyLimitMinutes,
        sickMode = config.sickOnWorkDayMode,
        holidayOnWorkDayMode = config.holidayOnWorkDayMode,
        autoPauseRules = config.autoPauseRules,
        customHolidays = customHolidays,
        disabledHolidayKeys = config.holidaySet.disabledHolidayKeys,
        holidaySetMode = config.holidaySet.mode,
    )
}

/**
 * Wendet die Auto-Pausen-Regeln auf eine Roh-Arbeitszeit an und liefert die
 * zusätzliche Pause in Minuten. Die größte greifende Regel gewinnt (z.B.
 * bei [6h→30min, 9h→45min] werden nach 10h die 45min angewandt).
 *
 * Wichtig: Die Funktion gibt den GESAMT-Pausenabzug zurück, NICHT die
 * Differenz zur bisher eingetragenen Pause. Der Caller entscheidet, ob eine
 * bereits manuell gesetzte Pause übersteuert wird.
 */
fun calculateAutoPause(rawWorkMinutes: Int, rules: List<AutoPauseRule>): Int {
    var effective = 0
    for (rule in rules) {
        if (rawWorkMinutes > rule.fromMinutes && rule.pauseMinutes > effective) {
            effective = rule.pauseMinutes
        }
    }
    return effective
}
