package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.locale.holidays.toDateString
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import java.time.YearMonth

/**
 * Vergangener Arbeitstag ohne Eintrag ("Kein Eintrag"). Er zählt mit seinem
 * Soll als Minus — im Saldo wie im ZA-Konto, das ihn aber getrennt vom
 * genommenen Zeitausgleich ausweist. Das Dashboard zeigt ihn, damit
 * Vergessenes auffällt und nachgetragen werden kann.
 */
data class MissingWorkDay(
    val date: LocalDate,
    /** Tagessoll, das im Saldo fehlt. */
    val targetMinutes: Int,
)

/**
 * Tage mit Soll von [from] bis [through], die [isMissingWorkDay] als
 * "Kein Eintrag" einstuft. [entries] müssen die Auto-Feiertage bereits
 * enthalten ([buildEntriesWithHolidays]) — sonst gälten Feiertage als vergessen.
 *
 * Ist die Kalenderwoche schon erfüllt, gilt keiner ihrer leeren Tage als
 * vergessen ([isWeekFulfilled]) — wer Mo–Do die Wochenstunden schafft,
 * bleibt freitags daheim. [weekContext] liefert dafür die Einträge der
 * ganzen Woche, an Monatsgrenzen auch aus dem Nachbarmonat
 * ([weekContextEntries]).
 */
fun findMissingWorkDays(
    entries: List<Entry>,
    from: LocalDate,
    through: LocalDate,
    userData: UserData?,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
    weekContext: List<Entry> = entries,
): List<MissingWorkDay> {
    // Ohne Soll (einfacher Modus) gibt es nichts zu vergessen
    if (userData?.simpleMode == true || through.isBefore(from)) return emptyList()
    val byDate = entries.groupBy { it.date }
    val fulfilledByWeek = HashMap<LocalDate, Boolean>()
    val missing = ArrayList<MissingWorkDay>()
    var day = from
    while (!day.isAfter(through)) {
        val dateStr = day.toDateString()
        val target = getTargetMinutesForDate(dateStr, userData?.workDays, locale, config)
        if (target > 0 && isMissingWorkDay(byDate[dateStr].orEmpty())) {
            val fulfilled = fulfilledByWeek.getOrPut(getISOWeekMonday(day)) {
                isWeekFulfilled(getISOWeekMonday(day), weekContext, userData, locale, config)
            }
            if (!fulfilled) missing += MissingWorkDay(day, target)
        }
        day = day.plusDays(1)
    }
    return missing
}

/**
 * Hat die Woche ab [monday] ihr Soll schon erreicht? Ist ohne Fahrzeit,
 * wie bei der Mehrarbeit/Überstunden-Berechnung.
 */
internal fun isWeekFulfilled(
    monday: LocalDate,
    weekContext: List<Entry>,
    userData: UserData?,
    locale: AppLocale?,
    config: CalculationConfig?,
): Boolean {
    val days = (0L..6L).map { monday.plusDays(it).toDateString() }
    val weekTarget = days.sumOf { getTargetMinutesForDate(it, userData?.workDays, locale, config) }
    if (weekTarget <= 0) return false
    val weekActual = weekContext
        .filter { it.date in days && !(it.type == EntryType.WORK && it.code == WorkCodes.DRIVE) }
        .sumOf { it.netDuration }
    return weekActual >= weekTarget
}

/**
 * Einträge inkl. Auto-Feiertage aus Vormonat, [month] und Folgemonat —
 * deckt jede Kalenderwoche ab, die [month] berührt.
 */
internal fun weekContextEntries(
    allEntries: List<Entry>,
    month: YearMonth,
    today: LocalDate,
    userData: UserData?,
    locale: AppLocale?,
    config: CalculationConfig?,
): List<Entry> = listOf(month.minusMonths(1), month, month.plusMonths(1)).flatMap { m ->
    buildEntriesWithHolidays(allEntries, userData, m.year, m.monthValue, today, locale, config)
}

/**
 * Ein Arbeitstag (Soll > 0, kein Feiertag) gilt als "Kein Eintrag", wenn
 * gar nichts erfasst ist. Sobald irgendetwas eingetragen ist, ist es ein
 * normaler Tag mit seinem echten Saldo.
 */
internal fun isMissingWorkDay(dayEntries: List<Entry>): Boolean = dayEntries.isEmpty()

/**
 * Tage ohne Eintrag eines Monats — erst ab dem allerersten Eintrag (davor
 * wurde die App nicht genutzt) und nur bis gestern (heute ist noch offen).
 */
internal fun missingWorkDaysOfMonth(
    entriesWithHolidays: List<Entry>,
    month: YearMonth,
    firstEntryDate: LocalDate?,
    today: LocalDate,
    userData: UserData?,
    locale: AppLocale?,
    config: CalculationConfig?,
    weekContext: List<Entry> = entriesWithHolidays,
): List<MissingWorkDay> {
    firstEntryDate ?: return emptyList()
    return findMissingWorkDays(
        entriesWithHolidays,
        maxOf(month.atDay(1), firstEntryDate),
        minOf(month.atEndOfMonth(), today.minusDays(1)),
        userData, locale, config, weekContext,
    )
}

/**
 * Tage ohne Eintrag im Vormonat und im laufenden Monat — für den Hinweis
 * beim App-Start, unabhängig vom angezeigten Monat. Der Vormonat zählt
 * mit, damit ein vergessener 30. am Monatsanfang nicht untergeht.
 * [allEntries] sind die unkorrigierten Einträge aller Monate.
 */
fun findRecentMissingWorkDays(
    allEntries: List<Entry>,
    userData: UserData?,
    today: LocalDate = LocalDate.now(),
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): List<MissingWorkDay> {
    val firstEntryDate = firstEntryDateOf(allEntries) ?: return emptyList()
    val current = YearMonth.from(today)
    return listOf(current.minusMonths(1), current).flatMap { month ->
        val withHolidays = buildEntriesWithHolidays(
            allEntries, userData, month.year, month.monthValue, today, locale, config,
        )
        val weekContext = weekContextEntries(allEntries, month, today, userData, locale, config)
        missingWorkDaysOfMonth(withHolidays, month, firstEntryDate, today, userData, locale, config, weekContext)
    }
}

/**
 * Was der Hinweis noch zeigt: nur Tage nach [acknowledgedThrough]. Einmal
 * ausgeblendete Tage kommen nicht wieder, erst ein neuer Tag ohne Eintrag.
 */
fun pendingMissingDayHint(
    recent: List<MissingWorkDay>,
    acknowledgedThrough: LocalDate?,
): List<MissingWorkDay> =
    if (acknowledgedThrough == null) recent else recent.filter { it.date.isAfter(acknowledgedThrough) }

internal fun firstEntryDateOf(entries: List<Entry>): LocalDate? =
    entries.minOfOrNull { it.date }?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
