package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.locale.holidays.toDateString
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.HolidaySetMode
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.min

/**
 * Zentrale, UI-freie Ableitungen aus entries + userData für den aktuellen
 * Anzeige-Monat — Port von useAppData.ts und getHolidayData (utils.tsx).
 */

/**
 * Feiertage eines Jahres unter Berücksichtigung der CalculationConfig:
 * - holidaySet.mode == CUSTOM: ausschließlich customHolidays (MM-DD-Keys
 *   werden auf das Jahr expandiert, YYYY-MM-DD nur bei passendem Jahr).
 * - LOCALE_DEFAULT: Locale-Liste minus disabledHolidayKeys (MM-DD).
 */
fun getHolidayData(
    year: Int,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): Map<String, String> {
    val loc = locale ?: getLocale(null)
    val effective = resolveEffectiveRules(loc, config)

    // Custom-Modus: komplett eigene Liste, Locale wird ignoriert
    val custom = effective.customHolidays
    if (effective.holidaySetMode == HolidaySetMode.CUSTOM && custom != null) {
        val out = LinkedHashMap<String, String>()
        for ((key, name) in custom) {
            if (key.isEmpty()) continue
            if (key.length == 5 && key[2] == '-') {
                out["$year-$key"] = name
            } else if (key.length == 10 && key.startsWith("$year-")) {
                out[key] = name
            }
        }
        return out
    }

    // locale_default + optional disabledHolidayKeys ausfiltern
    val raw = loc.getHolidays(year)
    if (effective.disabledHolidayKeys.isEmpty()) return raw
    val disabled = effective.disabledHolidayKeys.toSet()
    return raw.filterKeys { date -> date.substring(5) !in disabled }
}

/**
 * Ergebnis von [deriveAppData] — entspricht dem Return von useAppData.
 * groupedByWeek: Paare (KW-Nummer, Einträge absteigend nach Datum),
 * Wochen absteigend sortiert.
 */
data class AppData(
    val entriesWithHolidays: List<Entry>,
    val groupedByWeek: List<Pair<Int, List<Entry>>>,
    val stats: PeriodStatsResult,
    val overtime: Int,
    val progressPercent: Double,
    val todayTarget: Int,
    val lastWorkEntry: Entry?,
    val uniqueProjects: List<String>,
)

/** Synthetische ID eines Auto-Feiertag-Eintrags (wie `auto-holiday-<date>`). */
fun autoHolidayId(dateStr: String): EntryId = EntryId.of("auto-holiday-$dateStr")

/**
 * Einträge des Monats + synthetische public_holiday-Einträge (nur bis
 * heute, nur an Tagen mit Soll > 0), danach Krank-/Feiertagskorrektur
 * via [applyEffectiveDurations] — Single Source of Truth für Stats,
 * Dashboard und PDF.
 */
fun buildEntriesWithHolidays(
    entries: List<Entry>,
    userData: UserData?,
    viewYear: Int,
    viewMonth1Based: Int,
    today: LocalDate,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): List<Entry> {
    val holidayMap = getHolidayData(viewYear, locale, config)
    val todayStr = today.toDateString()
    val realEntries = entries.filter { entry ->
        val date = LocalDate.parse(entry.date)
        date.year == viewYear && date.monthValue == viewMonth1Based
    }

    val holidayEntries = ArrayList<Entry>()
    val daysInMonth = YearMonth.of(viewYear, viewMonth1Based).lengthOfMonth()

    for (day in 1..daysInMonth) {
        val dateStr = "%04d-%02d-%02d".format(viewYear, viewMonth1Based, day)
        val name = holidayMap[dateStr] ?: continue
        if (dateStr > todayStr) continue

        val targetMin = getTargetMinutesForDate(dateStr, userData?.workDays, locale, config)
        if (targetMin <= 0) continue

        holidayEntries.add(
            Entry(
                id = autoHolidayId(dateStr),
                type = EntryType.PUBLIC_HOLIDAY,
                date = dateStr,
                project = name.ifEmpty { "Gesetzlicher Feiertag" },
                pause = 0,
                netDuration = targetMin,
            )
        )
    }

    val merged = (realEntries + holidayEntries).sortedWith(compareByDescending { it.date })
    return applyEffectiveDurations(merged, userData, locale, config)
}

/** ISO-KW eines YYYY-MM-DD-Strings. */
private fun weekOf(dateStr: String): Int = getWeekNumber(LocalDate.parse(dateStr))

/**
 * Gruppierung nach ISO-Kalenderwoche. Für Übergangswochen an
 * Monatsgrenzen werden fehlende Tage aus `correctedAllEntries` ergänzt,
 * damit Wochen-Stats aus der vollen Woche berechnet werden können.
 */
fun groupEntriesByWeek(
    entriesWithHolidays: List<Entry>,
    correctedAllEntries: List<Entry>?,
): List<Pair<Int, List<Entry>>> {
    val map = LinkedHashMap<Int, MutableList<Entry>>()

    for (entry in entriesWithHolidays) {
        map.getOrPut(weekOf(entry.date)) { mutableListOf() }.add(entry)
    }

    if (!correctedAllEntries.isNullOrEmpty()) {
        val weekNumbersInMonth = map.keys.toSet()
        val monthEntryIds = entriesWithHolidays.map { it.id }.toHashSet()

        for (entry in correctedAllEntries) {
            if (entry.id in monthEntryIds) continue
            val week = weekOf(entry.date)
            if (week !in weekNumbersInMonth) continue
            map.getOrPut(week) { mutableListOf() }.add(entry)
        }
    }

    return map.entries
        .map { (week, list) -> week to list.sortedWith(compareByDescending<Entry> { it.date }) }
        .sortedByDescending { it.first }
}

/**
 * Komplette Monats-Ableitung — Port von useAppData. `allEntries` sind
 * optional alle Einträge über alle Monate (für Boundary-Wochen).
 */
fun deriveAppData(
    entries: List<Entry>,
    userData: UserData?,
    viewYear: Int,
    viewMonth1Based: Int,
    allEntries: List<Entry>? = null,
    today: LocalDate = LocalDate.now(),
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): AppData {
    val todayTarget = getTargetMinutesForDate(today.toDateString(), userData?.workDays, locale, config)

    val entriesWithHolidays = buildEntriesWithHolidays(
        entries, userData, viewYear, viewMonth1Based, today, locale, config,
    )

    val correctedAllEntries = allEntries?.let {
        applyEffectiveDurations(it, userData, locale, config)
    }

    val groupedByWeek = groupEntriesByWeek(entriesWithHolidays, correctedAllEntries)

    val periodStart = LocalDate.of(viewYear, viewMonth1Based, 1)
    val periodEnd = periodStart.withDayOfMonth(periodStart.lengthOfMonth())

    val stats = calculatePeriodStats(
        entriesWithHolidays, userData, periodStart, periodEnd,
        correctedAllEntries, locale, config,
    )
    val overtime = stats.totalSaldo
    val progressPercent = min(
        100.0,
        stats.totalIst.toDouble() / (if (stats.totalTarget != 0) stats.totalTarget else 1) * 100.0,
    )

    // Letzter Work-Eintrag: String-Vergleich über "date|id" wie in der TS-App
    var lastWorkEntry: Entry? = null
    for (entry in entries) {
        if (entry.type != EntryType.WORK) continue
        val latest = lastWorkEntry
        if (latest == null || "${entry.date}|${entry.id}" > "${latest.date}|${latest.id}") {
            lastWorkEntry = entry
        }
    }

    val uniqueProjects = entries
        .filter { it.type == EntryType.WORK && !it.project.isNullOrBlank() }
        .map { it.project!!.trim() }
        .distinct()
        .sorted()

    return AppData(
        entriesWithHolidays = entriesWithHolidays,
        groupedByWeek = groupedByWeek,
        stats = stats,
        overtime = overtime,
        progressPercent = progressPercent,
        todayTarget = todayTarget,
        lastWorkEntry = lastWorkEntry,
        uniqueProjects = uniqueProjects,
    )
}
