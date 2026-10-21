package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.locale.holidays.toDateString
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.OvertimeAccountConfig
import com.estundnzettl.core.model.OvertimeAccountPayout
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Zeitausgleichskonto (ZA-Konto): Der Monatssaldo wird ab dem Startmonat
 * von Monat zu Monat übertragen, Zeitausgleich-Einträge und Auszahlungen
 * bauen ihn ab.
 *
 *   Stand = Übertrag + Saldo (IST − SOLL) − genommener Zeitausgleich − Auszahlung
 *
 * Arbeitstage ohne Eintrag ([findMissingWorkDays]) zählen im Konto nicht:
 * Ein vergessener Tag darf nicht still wie Zeitausgleich wirken.
 *
 * ZA-Einträge zählen wie bisher als IST (sie füllen das Tagessoll), damit
 * bleibt der Monatssaldo identisch mit Dashboard und Bericht. Abgebaut wird
 * das Konto über den separat ausgewiesenen ZA-Verbrauch.
 */
data class OvertimeAccountMonth(
    val month: YearMonth,
    /** Kontostand zu Monatsbeginn (Übertrag Vormonat bzw. Anfangsstand). */
    val openingMinutes: Int,
    /** Saldo des ausgewerteten Zeitraums (IST − SOLL), ohne Tage ohne Eintrag. */
    val balanceMinutes: Int,
    /** Im ausgewerteten Zeitraum genommener Zeitausgleich. */
    val timeCompMinutes: Int,
    /** In diesem Monat ausbezahlte Stunden. */
    val payoutMinutes: Int,
    /** Kontostand am Ende des ausgewerteten Zeitraums. */
    val closingMinutes: Int,
    /**
     * Letzter eingerechneter Tag. Liegt er vor dem Monatsende, läuft der
     * Monat noch (Stand heute); vor dem Monatsbeginn = noch nichts erfasst.
     */
    val evaluatedThrough: LocalDate,
) {
    val isComplete: Boolean get() = !evaluatedThrough.isBefore(month.atEndOfMonth())

    /** Kontostand ohne die Auszahlung dieses Monats — so viel ist auszahlbar. */
    val payableMinutes: Int get() = closingMinutes + payoutMinutes
}

/** "YYYY-MM" → YearMonth, sonst null. */
fun parseYearMonthOrNull(value: String?): YearMonth? =
    value?.let { runCatching { YearMonth.parse(it) }.getOrNull() }

/** Startmonat des Kontos, wenn es aktiv ist (nicht im einfachen Modus ohne Soll). */
fun getOvertimeAccountStart(userData: UserData?, config: CalculationConfig?): YearMonth? {
    val account = config?.overtimeAccount ?: return null
    if (!account.enabled || userData?.simpleMode == true) return null
    return parseYearMonthOrNull(account.startMonth)
}

/**
 * Übernimmt das ZA-Konto aus [previous], wenn Regeln auf Defaults
 * zurückgesetzt werden: Startmonat und Anfangsstand sind ein persönlicher
 * Kontostand, keine Locale-Regel, und dürfen dabei nicht verloren gehen.
 */
fun CalculationConfig.keepingOvertimeAccountOf(previous: CalculationConfig?): CalculationConfig =
    previous?.overtimeAccount?.let { copy(overtimeAccount = it) } ?: this

/**
 * Letzter Tag, der in [month] auf das Konto gebucht wird. Abgeschlossene
 * Monate zählen voll, der laufende Monat bis heute: Heute zählt erst, wenn
 * schon etwas erfasst ist oder kein Soll ansteht — sonst stünde das Konto
 * morgens um das Tagessoll im Minus. Folgen bis Monatsende nur Tage ohne
 * Soll (z.B. Wochenende), gilt der Monat als abgeschlossen.
 */
private fun overtimeAccountCutoff(
    month: YearMonth,
    today: LocalDate,
    monthEntries: List<Entry>,
    userData: UserData?,
    locale: AppLocale?,
    config: CalculationConfig?,
): LocalDate {
    val monthStart = month.atDay(1)
    val monthEnd = month.atEndOfMonth()
    if (today.isAfter(monthEnd)) return monthEnd
    if (today.isBefore(monthStart)) return monthStart.minusDays(1)

    fun targetOf(date: LocalDate) =
        getTargetMinutesForDate(date.toDateString(), userData?.workDays, locale, config)

    val todayStr = today.toDateString()
    val todayDone = monthEntries.any { it.date == todayStr } || targetOf(today) <= 0
    val cutoff = if (todayDone) today else today.minusDays(1)

    var day = cutoff.plusDays(1)
    while (!day.isAfter(monthEnd)) {
        if (targetOf(day) > 0) return cutoff
        day = day.plusDays(1)
    }
    return monthEnd
}

/**
 * Saldo und ZA-Verbrauch eines Monats bis [cutoff] — gleiche Aufbereitung
 * wie Dashboard und Bericht (Auto-Feiertage, Krank-/Feiertagskorrektur),
 * nur das Soll von Tagen ohne Eintrag wird wieder gutgeschrieben.
 */
private fun evaluateAccountMonth(
    monthEntries: List<Entry>,
    month: YearMonth,
    cutoff: LocalDate,
    userData: UserData?,
    locale: AppLocale?,
    config: CalculationConfig?,
): Pair<Int, Int> {
    val monthStart = month.atDay(1)
    if (cutoff.isBefore(monthStart)) return 0 to 0
    val cutoffStr = cutoff.toDateString()
    val evaluated = buildEntriesWithHolidays(
        monthEntries, userData, month.year, month.monthValue, cutoff, locale, config,
    ).filter { it.date <= cutoffStr }
    val stats = calculatePeriodStats(evaluated, userData, monthStart, cutoff, null, locale, config)
    val unbooked = findMissingWorkDays(evaluated, monthStart, cutoff, userData, locale, config)
        .sumOf { it.targetMinutes }
    return (stats.totalSaldo + unbooked) to stats.timeComp
}

/**
 * Kontostand für [month]: rechnet vom Startmonat aus Monat für Monat
 * vorwärts. `null`, wenn das Konto aus ist oder [month] vor dem Start liegt.
 * [allEntries] sind die unkorrigierten Einträge aller Monate.
 */
fun calculateOvertimeAccount(
    allEntries: List<Entry>,
    userData: UserData?,
    month: YearMonth,
    today: LocalDate = LocalDate.now(),
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): OvertimeAccountMonth? {
    val start = getOvertimeAccountStart(userData, config) ?: return null
    if (month.isBefore(start)) return null

    val byMonth = allEntries.groupBy { it.date.take(7) }
    val payouts = config?.overtimeAccount?.payouts.orEmpty().associate { it.month to it.minutes }
    var opening = config?.overtimeAccount?.openingBalanceMinutes ?: 0
    var cursor = start
    while (true) {
        val monthEntries = byMonth[cursor.toString()].orEmpty()
        val cutoff = overtimeAccountCutoff(cursor, today, monthEntries, userData, locale, config)
        val (balance, timeComp) = evaluateAccountMonth(monthEntries, cursor, cutoff, userData, locale, config)
        val payout = payouts[cursor.toString()] ?: 0
        val closing = opening + balance - timeComp - payout
        if (cursor == month) {
            return OvertimeAccountMonth(cursor, opening, balance, timeComp, payout, closing, cutoff)
        }
        opening = closing
        cursor = cursor.plusMonths(1)
    }
}

/**
 * Bucht für [month] eine Auszahlung von [minutes]; ersetzt eine vorhandene
 * Buchung dieses Monats, 0 oder weniger entfernt sie.
 */
fun OvertimeAccountConfig.withPayout(month: YearMonth, minutes: Int): OvertimeAccountConfig {
    val key = month.toString()
    val others = payouts.filter { it.month != key }
    val next = if (minutes > 0) others + OvertimeAccountPayout(key, minutes) else others
    return copy(payouts = next.sortedBy { it.month })
}

// ─── Hinweis: Konto aktivieren ──────────────────────────────

/** Vorschlag, das Konto mit dem Saldo von [startMonth] zu starten. */
data class OvertimeAccountSuggestion(
    val startMonth: YearMonth,
    val balanceMinutes: Int,
)

/**
 * Konto aus, aber im Vormonat von [today] wurde erfasst und der Saldo ist
 * nicht ausgeglichen: Dann lohnt sich der Hinweis, den Saldo mit dem Konto
 * in den laufenden Monat zu übertragen. Sonst `null`.
 */
fun suggestOvertimeAccount(
    allEntries: List<Entry>,
    userData: UserData?,
    today: LocalDate = LocalDate.now(),
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): OvertimeAccountSuggestion? {
    if (config == null || userData?.simpleMode == true) return null
    if (config.overtimeAccount?.enabled == true) return null
    val previous = YearMonth.from(today).minusMonths(1)
    val monthEntries = allEntries.filter { it.date.startsWith(previous.toString()) }
    if (monthEntries.isEmpty()) return null
    val (balance, _) = evaluateAccountMonth(
        monthEntries, previous, previous.atEndOfMonth(), userData, locale, config,
    )
    return if (balance != 0) OvertimeAccountSuggestion(previous, balance) else null
}

// ─── Eingabe des Anfangsstands ──────────────────────────────

private const val MAX_OPENING_BALANCE_MINUTES = 10_000 * 60

/**
 * "12:30", "-4:15", "+8" oder Dezimalstunden ("7,5") → Minuten.
 * Ungültige Eingaben liefern null.
 */
fun parseSignedDurationInput(value: String): Int? {
    val text = value.trim().replace('−', '-').replace(" ", "")
    val match = Regex("^([+-]?)(\\d{1,5})(?::([0-5]\\d)|[.,](\\d{1,2}))?$").matchEntire(text) ?: return null
    val (sign, hours, minutes, fraction) = match.destructured
    val absMinutes = when {
        minutes.isNotEmpty() -> hours.toInt() * 60 + minutes.toInt()
        fraction.isNotEmpty() -> ("$hours.$fraction".toDouble() * 60).roundToInt()
        else -> hours.toInt() * 60
    }
    if (absMinutes > MAX_OPENING_BALANCE_MINUTES) return null
    return if (sign == "-") -absMinutes else absMinutes
}

/** Minuten → "-12:30" / "8:00" (Gegenstück zu [parseSignedDurationInput]). */
fun formatSignedDurationInput(minutes: Int): String {
    val sign = if (minutes < 0) "-" else ""
    val absMin = abs(minutes)
    return "$sign${absMin / 60}:${(absMin % 60).toString().padStart(2, '0')}"
}
