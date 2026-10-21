package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import java.time.YearMonth
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Urlaubsbilanz des Kalenderjahres, Stand Ende [month]:
 *
 *   Verbleibend = Anspruch + Übertrag − genommen (1.1. bis Monatsende)
 *
 * Später im Jahr bereits eingetragener Urlaub zählt als geplant und noch
 * nicht als genommen. Gezählt wird in halben Tagen (siehe [vacationHalfDays]).
 */
data class VacationBalance(
    val month: YearMonth,
    val allowanceDays: Int,
    val carryoverDays: Int,
    /** Vom 1.1. bis Ende [month] genommener Urlaub in halben Tagen. */
    val usedHalfDays: Int,
    /** Nach [month] im selben Jahr eingetragener Urlaub in halben Tagen. */
    val plannedHalfDays: Int,
) {
    val remainingHalfDays: Int get() = (allowanceDays + carryoverDays) * 2 - usedHalfDays
}

/**
 * Urlaubsbilanz für [month]; `null` ohne Urlaubsanspruch.
 * [allEntries] sind die unkorrigierten Einträge aller Monate.
 */
fun calculateVacationBalance(
    allEntries: List<Entry>,
    userData: UserData?,
    month: YearMonth,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): VacationBalance? {
    val allowance = config?.vacationAllowanceDays ?: return null
    if (allowance <= 0) return null

    val yearPrefix = "${month.year}-"
    val monthEnd = month.atEndOfMonth().toString()
    val holidays = getHolidayData(month.year, locale, config)
    var used = 0
    var planned = 0
    allEntries
        .filter { it.type == EntryType.VACATION && it.date.startsWith(yearPrefix) }
        .groupBy { it.date }
        .forEach { (date, dayEntries) ->
            val halfDays = vacationHalfDays(
                date, dayEntries.sumOf { it.netDuration }, userData, locale, date in holidays,
            )
            if (date <= monthEnd) used += halfDays else planned += halfDays
        }
    return VacationBalance(month, allowance, config.vacationCarryoverDays, used, planned)
}

/**
 * Verbrauchte Urlaubstage eines Datums in halben Tagen (0–2): Urlaub über
 * das volle Tagessoll des Wochentags ist ein Tag, bis zur Hälfte ein halber
 * (auch an Halbtagen wie dem 24.12.). Feiertage und Tage ohne Soll kosten
 * keinen Urlaub. Im einfachen Modus gibt es kein Soll — jeder Urlaubstag
 * zählt ganz.
 */
private fun vacationHalfDays(
    date: String,
    netMinutes: Int,
    userData: UserData?,
    locale: AppLocale?,
    isHoliday: Boolean,
): Int {
    if (userData?.simpleMode == true) return 2
    if (isHoliday || netMinutes <= 0) return 0
    val dayTarget = getWeekdayTargetMinutes(date, userData?.workDays, locale)
    if (dayTarget <= 0) return 0
    return (netMinutes * 2.0 / dayTarget).roundToInt().coerceIn(1, 2)
}

/** Halbe Tage → "24", "23,5" bzw. "23.5" (en), "-1,5". */
fun formatHalfDays(halfDays: Int, language: String? = null): String {
    val sign = if (halfDays < 0) "-" else ""
    val absHalf = abs(halfDays)
    val fraction = if (absHalf % 2 == 1) (if (language == "en") ".5" else ",5") else ""
    return "$sign${absHalf / 2}$fraction"
}
