package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.locale.holidays.toDateString
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import java.time.temporal.WeekFields
import kotlin.math.max
import kotlin.math.min

/**
 * Zeitberechnungs-Logik der App.
 * Port von src/utils/timeCalculations.ts — Funktionsnamen, Semantik und
 * Rundungsverhalten sind bewusst 1:1 übernommen.
 */

/** Spezial-Tätigkeitscodes (WORK_CODE aus hooks/constants.ts). */
object WorkCodes {
    const val DRIVE = 19    // Fahrzeit
    const val ARRIVAL = 190 // An/Abreise (Bonus-Code)
    const val OFFICE = 70   // Büro
    const val DEFAULT = 1   // Fallback Default
}

data class OvertimeSplit(
    val mehrarbeit: Int = 0,
    val ueberstunden: Int = 0,
)

data class DayBalanceMeta(
    val dayIndex: Int,
    val isEvenDay: Boolean,
    val showBalance: Boolean,
    val balance: Int,
    val totalMinutes: Int,
)

data class PeriodStatsResult(
    val work: Int = 0,
    val drive: Int = 0,
    val holiday: Int = 0,
    val vacation: Int = 0,
    val sick: Int = 0,
    val timeComp: Int = 0,
    val totalIst: Int = 0,
    val totalTarget: Int = 0,
    val totalSaldo: Int = 0,
    val normalstunden: Int = 0,
    val overtimeSplit: OvertimeSplit = OvertimeSplit(),
)

fun parseTime(timeStr: String): Int {
    val parts = timeStr.split(":")
    val h = parts[0].toInt()
    val m = parts[1].toInt()
    return h * 60 + m
}

/**
 * Wenn endMinutes <= startMinutes geht die Schicht über Mitternacht
 * (Nachtschicht). Die Gesamtdauer wird dem Beginn-Tag zugerechnet.
 */
fun calculateRawDuration(startTime: String, endTime: String): Int {
    val s = parseTime(startTime)
    val e = parseTime(endTime)
    if (e == s) return 0
    return if (e > s) e - s else (e + 24 * 60) - s
}

fun isOvernightShift(startTime: String, endTime: String): Boolean {
    val s = parseTime(startTime)
    val e = parseTime(endTime)
    return e < s
}

/**
 * Eindeutige Minuten-Range relativ zum Beginn-Tag. Bei Nachtschicht wird
 * das Ende um 24h verschoben, damit Overlap-Checks funktionieren.
 */
fun toAbsoluteRange(startTime: String, endTime: String): Pair<Int, Int> {
    val s = parseTime(startTime)
    var e = parseTime(endTime)
    if (e <= s) e += 24 * 60
    return s to e
}

/** YYYY-MM-DD eines Folgetags. */
private fun addDayToDateString(dateStr: String, days: Long): String =
    LocalDate.parse(dateStr).plusDays(days).toDateString()

/**
 * Liefert das Mapping `{date: minutes}`, wie ein Eintrag bei der
 * Aggregation auf Kalendertage verteilt werden soll.
 *
 * - Ohne Split (oder kein over-Mitternacht): voller Beitrag am Beginn-Tag.
 * - Mit Split UND Nachtschicht: netDuration wird proportional zur
 *   Roh-Dauer auf Beginn-Tag und Folgetag verteilt. Der erste Tag wird
 *   abgerundet, der Rest geht an den Folgetag — so bleibt die Summe exakt
 *   gleich der ursprünglichen netDuration.
 */
fun getEntryDayContributions(
    date: String,
    start: String?,
    end: String?,
    netDuration: Int,
    splitEnabled: Boolean,
): Map<String, Int> {
    val dur = netDuration
    if (!splitEnabled || start.isNullOrEmpty() || end.isNullOrEmpty() || !isOvernightShift(start, end)) {
        return mapOf(date to dur)
    }
    val minutesUntilMidnight = 24 * 60 - parseTime(start)
    val (s, e) = toAbsoluteRange(start, end)
    val rawTotal = e - s
    if (rawTotal <= 0) return mapOf(date to dur)
    // Math.floor der TS-Vorlage: positive Ganzzahl-Division rundet ab
    val firstShare = (dur * minutesUntilMidnight) / rawTotal
    val secondShare = dur - firstShare
    return mapOf(
        date to firstShare,
        addDayToDateString(date, 1) to secondShare,
    )
}

fun getEntryDayContributions(entry: Entry, splitEnabled: Boolean): Map<String, Int> =
    getEntryDayContributions(entry.date, entry.start, entry.end, entry.netDuration, splitEnabled)

/** Wochentag aus YYYY-MM-DD, JS-Konvention: 0=So..6=Sa. */
fun getDayOfWeek(dateStr: String): Int =
    LocalDate.parse(dateStr).dayOfWeek.value % 7

/**
 * Berechnet die Tages-Sollzeit für ein Datum in Minuten.
 *
 * Wenn `customWorkDays` gesetzt ist (7-Element-Liste), wird der Wert für
 * den Wochentag genommen. Sonst fällt auf `locale.defaultWorkDays` zurück
 * (Österreich-Fallback wenn keine Locale übergeben).
 *
 * An Halbtagen wird das Ergebnis halbiert (kaufmännisch gerundet). Die
 * Halbtags-Liste kommt aus `config.halfDayMode` oder `locale.halfDays`.
 */
fun getTargetMinutesForDate(
    dateStr: String,
    customWorkDays: List<Int>? = null,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): Int {
    val loc = locale ?: getLocale(null)
    val effective = resolveEffectiveRules(loc, config)
    val isHalfDay = effective.halfDays.any { suffix -> dateStr.endsWith("-$suffix") }

    val day = getDayOfWeek(dateStr)
    val dailyTarget = if (customWorkDays != null && customWorkDays.size == 7) {
        customWorkDays[day]
    } else {
        loc.defaultWorkDays.getOrElse(day) { 0 }
    }

    if (isHalfDay && dailyTarget > 0) {
        // Math.round der TS-Vorlage
        return Math.round(dailyTarget / 2.0).toInt()
    }

    return dailyTarget
}

/** ISO-Wochennummer. */
fun getWeekNumber(date: LocalDate): Int =
    date.get(WeekFields.ISO.weekOfWeekBasedYear())

/**
 * Teilt einen positiven Wochensaldo in Mehrarbeit und Überstunden auf.
 *
 * - Mehrarbeit: zwischen Vertragssoll (z.B. 38,5h) und Wochenlimit (z.B. 40h)
 * - Überstunden: über dem Wochenlimit
 *
 * Das Verhalten hängt vom `overtimeMode` der effektiven Regeln ab:
 *   - SPLIT: klassischer MA/ÜS-Split auf der Wochen-Grenze
 *   - UEBERSTUNDEN_ONLY: alles positiv → Überstunden, Mehrarbeit = 0
 *   - NONE: kein Split, Mehrarbeit und Überstunden beide 0
 */
fun calculateOvertimeSplit(
    balanceMinutes: Int,
    targetMinutes: Int,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): OvertimeSplit {
    if (balanceMinutes <= 0) return OvertimeSplit(0, 0)

    val loc = locale ?: getLocale(null)
    val effective = resolveEffectiveRules(loc, config)

    // Kein Split: Aufrufer zeigt nur Saldo, wir liefern 0/0 zurück
    if (effective.overtimeMode == com.estundnzettl.core.model.OvertimeMode.NONE) {
        return OvertimeSplit(0, 0)
    }

    // Alles gilt als Überstunden (neutraler Split-Ersatz)
    val weeklyLimit = effective.weeklyLimitMinutes
    if (effective.overtimeMode == com.estundnzettl.core.model.OvertimeMode.UEBERSTUNDEN_ONLY || weeklyLimit == null) {
        return OvertimeSplit(0, balanceMinutes)
    }

    val mehrarbeitBuffer = max(0, weeklyLimit - targetMinutes)

    val mehrarbeit = min(balanceMinutes, mehrarbeitBuffer)
    val ueberstunden = max(0, balanceMinutes - mehrarbeit)

    return OvertimeSplit(mehrarbeit, ueberstunden)
}

/**
 * Berechnet die effektive Krankzeit für einen gemischten Tag
 * (Arbeit + Krank am selben Tag).
 *
 * Der Modus kommt aus `config.sickOnWorkDayMode`, fällt auf den
 * Locale-Default zurück:
 *   - CAP_TO_TARGET (AT/DE-Default): füllt nur bis zum Tagessoll auf
 *   - ADDITIVE (Neutral-Default): Krank bleibt 1:1
 *   - IGNORE: Krank wird komplett verworfen, wenn schon gearbeitet wurde
 */
fun adjustSickDuration(
    sickNetDuration: Int,
    workMinutesOnDay: Int,
    dayTarget: Int,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): Int {
    val loc = locale ?: getLocale(null)
    val effective = resolveEffectiveRules(loc, config)

    if (effective.sickMode == com.estundnzettl.core.model.SickOnWorkDayMode.ADDITIVE) return sickNetDuration

    if (effective.sickMode == com.estundnzettl.core.model.SickOnWorkDayMode.IGNORE) {
        return if (workMinutesOnDay > 0) 0 else sickNetDuration
    }

    // cap_to_target
    if (dayTarget <= 0) return 0
    if (workMinutesOnDay >= dayTarget) return 0
    return min(sickNetDuration, max(0, dayTarget - workMinutesOnDay))
}

/**
 * Netto-Dauer eines Eintrags aus den Formular-Feldern.
 * `entryType` bleibt bewusst ein String, weil das Formular zusätzlich den
 * Pseudo-Typ "drive" kennt (wie in der TS-Vorlage).
 */
fun calculateEntryNetDuration(
    entryType: String,
    startTime: String,
    endTime: String,
    pauseDuration: Int = 0,
    formDate: String,
    userData: UserData?,
    code: Int?,
    specialManualMode: Boolean = false,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): Int {
    val isDrive = entryType == "drive" || code == WorkCodes.DRIVE
    val isSpecial = entryType == "vacation" || entryType == "sick" || entryType == "time_comp"

    if (entryType == "work" || isDrive) {
        val rawDuration = calculateRawDuration(startTime, endTime)
        var usedPause = if (isDrive) 0 else pauseDuration

        // Auto-Pause greift nur bei echter Arbeit (kein Drive) und nur wenn
        // der User keine manuelle Pause eingetragen hat. So überschreibt die
        // Automatik nie eine bewusst gesetzte Zahl.
        if (!isDrive && usedPause == 0 && config != null) {
            val autoPause = calculateAutoPause(rawDuration, config.autoPauseRules)
            if (autoPause > 0) usedPause = autoPause
        }

        return max(0, rawDuration - usedPause)
    }

    // Krank/Urlaub/ZA im Manual-Modus: Stunden werden direkt aus Start/Ende
    // berechnet, genau wie bei einem normalen Eintrag (ohne Pause-Abzug).
    if (isSpecial && specialManualMode && startTime.isNotEmpty() && endTime.isNotEmpty()) {
        return calculateRawDuration(startTime, endTime)
    }

    return max(0, getTargetMinutesForDate(formDate, userData?.workDays, locale, config))
}

/**
 * SINGLE SOURCE OF TRUTH für Krank- und Feiertags-Korrektur bei gemischten
 * Tagen (Arbeit + Sonderzeit am selben Tag).
 *
 * Gibt eine Kopie der Entry-Liste zurück, in der SICK und (je nach Config)
 * PUBLIC_HOLIDAY Einträge korrigierte `netDuration`-Werte haben. Alle
 * Downstream-Funktionen verwenden diese korrigierten Entries.
 */
fun applyEffectiveDurations(
    entries: List<Entry>,
    userData: UserData?,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): List<Entry> {
    val loc = locale ?: getLocale(null)
    val effective = resolveEffectiveRules(loc, config)

    // Bei sickMode ADDITIVE UND holidayOnWorkDayMode nicht CAP_TO_TARGET: nichts zu tun
    if (
        effective.sickMode == com.estundnzettl.core.model.SickOnWorkDayMode.ADDITIVE &&
        effective.holidayOnWorkDayMode != com.estundnzettl.core.model.HolidayOnWorkDayMode.CAP_TO_TARGET
    ) {
        return entries
    }

    // Arbeitszeit pro Tag summieren (exkl. Fahrzeit)
    val dayWorkMap = HashMap<String, Int>()
    for (e in entries) {
        if (e.type == EntryType.WORK && e.code != WorkCodes.DRIVE) {
            dayWorkMap[e.date] = (dayWorkMap[e.date] ?: 0) + e.netDuration
        }
    }

    return entries.map { e ->
        when {
            e.type == EntryType.SICK -> {
                val dayWork = dayWorkMap[e.date] ?: 0
                if (dayWork <= 0) return@map e
                val target = getTargetMinutesForDate(e.date, userData?.workDays, loc, config)
                val adjusted = adjustSickDuration(e.netDuration, dayWork, target, loc, config)
                if (adjusted == e.netDuration) e else e.copy(netDuration = adjusted)
            }

            e.type == EntryType.PUBLIC_HOLIDAY &&
                effective.holidayOnWorkDayMode == com.estundnzettl.core.model.HolidayOnWorkDayMode.CAP_TO_TARGET -> {
                val dayWork = dayWorkMap[e.date] ?: 0
                if (dayWork <= 0) return@map e
                val target = getTargetMinutesForDate(e.date, userData?.workDays, loc, config)
                if (target <= 0) return@map e.copy(netDuration = 0)
                if (dayWork >= target) return@map e.copy(netDuration = 0)
                val capped = min(e.netDuration, max(0, target - dayWork))
                if (capped == e.netDuration) e else e.copy(netDuration = capped)
            }

            else -> e
        }
    }
}

fun calculateDisplayedDayMinutes(entries: List<Entry>): Int =
    entries.sumOf { entry ->
        if (entry.type == EntryType.WORK && entry.code == WorkCodes.DRIVE) 0 else entry.netDuration
    }

fun buildDayBalanceMetaMap(
    entries: List<Entry>,
    userData: UserData?,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): Map<EntryId, DayBalanceMeta> {
    val map = HashMap<EntryId, DayBalanceMeta>()
    val dayTotals = HashMap<String, Int>()
    var currentDateStr = ""
    var dayIndex = 0

    // Wenn Saldo-/Überstunden-Berechnung aktiv ist, werden Nachtschichten
    // bei der Tages-Aggregation auf Beginn- und Folgetag aufgeteilt — der
    // Eintrag selbst bleibt sichtbar am Beginn-Tag (siehe entry.date).
    val loc = locale ?: getLocale(null)
    val effective = resolveEffectiveRules(loc, config)
    val splitOvernight = effective.overtimeMode != com.estundnzettl.core.model.OvertimeMode.NONE

    for (entry in entries) {
        if (entry.type == EntryType.WORK && entry.code == WorkCodes.DRIVE) continue
        val contributions = getEntryDayContributions(entry, splitOvernight)
        for ((date, minutes) in contributions) {
            dayTotals[date] = (dayTotals[date] ?: 0) + minutes
        }
    }

    entries.forEachIndexed { idx, entry ->
        if (entry.date != currentDateStr) {
            dayIndex++
            currentDateStr = entry.date
        }

        val target = getTargetMinutesForDate(entry.date, userData?.workDays, locale, config)
        val nextEntry = entries.getOrNull(idx + 1)
        val isLastOfDay = nextEntry == null || nextEntry.date != entry.date

        map[entry.id] = DayBalanceMeta(
            dayIndex = dayIndex,
            isEvenDay = dayIndex % 2 == 0,
            showBalance = isLastOfDay && target > 0,
            balance = (dayTotals[entry.date] ?: 0) - target,
            totalMinutes = dayTotals[entry.date] ?: 0,
        )
    }

    return map
}

fun calculatePeriodStats(
    entries: List<Entry>,
    userData: UserData?,
    periodStart: LocalDate,
    periodEnd: LocalDate,
    allEntries: List<Entry>? = null,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): PeriodStatsResult {
    val loc = locale ?: getLocale(null)
    val effective = resolveEffectiveRules(loc, config)
    // allEntries wird vom Caller optional mitgegeben, wir nutzen den
    // Parameter aktuell nicht — kann für zukünftige Cross-Period-Logik
    // verwendet werden ohne die Signatur zu brechen.
    @Suppress("UNUSED_EXPRESSION")
    allEntries

    var work = 0
    var drive = 0
    var holiday = 0
    var vacation = 0
    var sick = 0
    var timeComp = 0
    var mehrarbeit = 0
    var ueberstunden = 0

    val startStr = periodStart.toDateString()
    val endStr = periodEnd.toDateString()

    // ─── Entry-Aggregation (Entries haben bereits korrigierte netDuration
    //     via applyEffectiveDurations — keine Krank-Sonderlogik nötig) ────
    val dayActualMap = HashMap<String, Int>()
    // Nachtschichten werden bei der Wochen-Aggregation auf Beginn- und
    // Folgetag aufgeteilt, sobald die App MA/ÜS überhaupt berechnet
    // (overtimeMode != NONE) — sonst landet alles am Beginn-Tag.
    val splitOvernight = effective.overtimeMode != com.estundnzettl.core.model.OvertimeMode.NONE

    for (e in entries) {
        // TODO(nightshift edge case, wie in der TS-Vorlage): Eine Nachtschicht
        // mit date < startStr fällt komplett raus, obwohl ihr Folgetags-Anteil
        // in die Periode fallen würde.
        if (e.date < startStr || e.date > endStr) continue
        val dur = e.netDuration
        when (e.type) {
            EntryType.WORK -> if (e.code == WorkCodes.DRIVE) drive += dur else work += dur
            EntryType.VACATION -> vacation += dur
            EntryType.SICK -> sick += dur
            EntryType.PUBLIC_HOLIDAY -> holiday += dur
            EntryType.TIME_COMP -> timeComp += dur
        }

        // dayActualMap für Wochen-Berechnung (exkl. Fahrzeit)
        if (!(e.type == EntryType.WORK && e.code == WorkCodes.DRIVE)) {
            val contributions = getEntryDayContributions(e, splitOvernight)
            for ((date, minutes) in contributions) {
                dayActualMap[date] = (dayActualMap[date] ?: 0) + minutes
            }
        }
    }

    // ─── Tagesschleife: Target ────────────────────
    var totalTarget = 0
    var loopDate = periodStart
    while (!loopDate.isAfter(periodEnd)) {
        totalTarget += getTargetMinutesForDate(loopDate.toDateString(), userData?.workDays, loc, config)
        loopDate = loopDate.plusDays(1)
    }

    val totalIst = work + vacation + sick + holiday + timeComp
    val totalSaldo = totalIst - totalTarget

    // ───── Mehrarbeit / Überstunden per ISO-Woche ─────────────────
    //
    // Rechtliche Grundlage (Österreich, AZG / Deutschland analog):
    //   - Mehrarbeit = Stunden zwischen Vertragssoll (z.B. 38,5h) und 40h/Woche
    //   - Überstunden = Stunden über 40h/Woche
    //   - Berechnung erfolgt pro voller ISO-Woche (Mo–So)
    //
    // Wenn der effektive overtimeMode NONE ist, wird dieser Block
    // übersprungen — der Saldo wird dann nur als totalSaldo angezeigt.
    if (effective.overtimeMode == com.estundnzettl.core.model.OvertimeMode.NONE) {
        return PeriodStatsResult(
            work = work, drive = drive, holiday = holiday, vacation = vacation,
            sick = sick, timeComp = timeComp, totalIst = totalIst,
            totalTarget = totalTarget, totalSaldo = totalSaldo,
            normalstunden = max(0, totalIst),
            overtimeSplit = OvertimeSplit(0, 0),
        )
    }

    val seenWeeks = HashSet<String>()
    var weekCursor = periodStart

    while (!weekCursor.isAfter(periodEnd)) {
        val monday = getISOWeekMonday(weekCursor)
        val mondayKey = monday.toDateString()

        if (seenWeeks.add(mondayKey)) {
            // Prüfen ob alle 7 Tage der Woche im Zeitraum liegen
            val sundayOfWeek = monday.plusDays(6)
            val mondayStr = monday.toDateString()
            val sundayStr = sundayOfWeek.toDateString()
            val isFullWeek = mondayStr >= startStr && sundayStr <= endStr

            if (isFullWeek) {
                // ── VOLLE WOCHE: MA/ÜS auf 40h-Basis ──
                var weekTarget = 0
                var weekActual = 0
                for (i in 0 until 7) {
                    val dayStr = monday.plusDays(i.toLong()).toDateString()
                    weekTarget += getTargetMinutesForDate(dayStr, userData?.workDays, loc, config)
                    weekActual += dayActualMap[dayStr] ?: 0
                }
                val split = calculateOvertimeSplit(weekActual - weekTarget, weekTarget, loc, config)
                mehrarbeit += split.mehrarbeit
                ueberstunden += split.ueberstunden
            } else {
                // ── GEBROCHENE WOCHE ──
                // IST gegen volles Wochen-Soll prüfen:
                //   < Wochen-Soll → nur tägliche ÜS (Ist > Soll pro Tag), keine MA
                //   ≥ Wochen-Soll → MA/ÜS-Split auf Wochen-Basis
                var partialActual = 0
                var fullWeekTarget = 0
                for (i in 0 until 7) {
                    val dayStr = monday.plusDays(i.toLong()).toDateString()
                    fullWeekTarget += getTargetMinutesForDate(dayStr, userData?.workDays, loc, config)
                    if (dayStr in startStr..endStr) {
                        partialActual += dayActualMap[dayStr] ?: 0
                    }
                }

                if (partialActual > fullWeekTarget) {
                    // Über Wochen-Soll: MA/ÜS-Split
                    val split = calculateOvertimeSplit(partialActual - fullWeekTarget, fullWeekTarget, loc, config)
                    mehrarbeit += split.mehrarbeit
                    ueberstunden += split.ueberstunden
                } else {
                    // Unter Wochen-Soll: nur tägliche ÜS
                    for (i in 0 until 7) {
                        val dayStr = monday.plusDays(i.toLong()).toDateString()
                        if (dayStr < startStr || dayStr > endStr) continue
                        val dayTarget = getTargetMinutesForDate(dayStr, userData?.workDays, loc, config)
                        val dayActual = dayActualMap[dayStr] ?: 0
                        if (dayActual > dayTarget) {
                            ueberstunden += (dayActual - dayTarget)
                        }
                    }
                }
            }
        }

        weekCursor = weekCursor.plusDays(1)
    }

    // ── Defizit-Wochen verrechnen ──────────────────────────────────
    // Wochen mit negativem Saldo tragen 0 zu MA/ÜS bei, aber ihr Defizit
    // muss von den gesammelten ÜS (dann MA) abgezogen werden, damit
    // MA + ÜS = max(0, Saldo) gilt.
    val maxOvertime = max(0, totalSaldo)
    val totalOvertimeSum = mehrarbeit + ueberstunden
    if (totalOvertimeSum > maxOvertime) {
        val excess = totalOvertimeSum - maxOvertime
        // Zuerst ÜS reduzieren, dann MA
        val uesReduction = min(excess, ueberstunden)
        ueberstunden -= uesReduction
        mehrarbeit -= (excess - uesReduction)
    }

    // Normalstunden = IST minus Überstunden-Anteile, damit
    // Normal + MA + ÜS = IST immer aufgeht.
    val normalstunden = max(0, totalIst - mehrarbeit - ueberstunden)

    return PeriodStatsResult(
        work = work, drive = drive, holiday = holiday, vacation = vacation,
        sick = sick, timeComp = timeComp, totalIst = totalIst,
        totalTarget = totalTarget, totalSaldo = totalSaldo,
        normalstunden = normalstunden,
        overtimeSplit = OvertimeSplit(mehrarbeit, ueberstunden),
    )
}

/**
 * Soll-Wert-Neuberechnung für einen einzelnen Entry (DB-freier Kern von
 * `recalculateAllEntries` aus der TS-Vorlage). Liefert null für unbekannte
 * Konstellationen (Entry wird übersprungen).
 */
fun computeExpectedNetDuration(
    entry: Entry,
    userData: UserData?,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): Int? {
    val start = entry.start
    val end = entry.end

    if ((entry.type == EntryType.WORK || entry.code == WorkCodes.DRIVE) && !start.isNullOrEmpty() && !end.isNullOrEmpty()) {
        return calculateEntryNetDuration(
            entryType = entry.type.wireName,
            startTime = start,
            endTime = end,
            pauseDuration = entry.pause,
            formDate = entry.date,
            userData = userData,
            code = entry.code,
            locale = locale,
            config = config,
        )
    }

    val isManualSpecial = entry.type == EntryType.VACATION ||
        entry.type == EntryType.SICK || entry.type == EntryType.TIME_COMP
    if (isManualSpecial && !start.isNullOrEmpty() && !end.isNullOrEmpty()) {
        // Special entries with manual start/end
        return calculateEntryNetDuration(
            entryType = entry.type.wireName,
            startTime = start,
            endTime = end,
            pauseDuration = 0,
            formDate = entry.date,
            userData = userData,
            code = entry.code,
            specialManualMode = true,
            locale = locale,
            config = config,
        )
    }

    if (isManualSpecial || entry.type == EntryType.PUBLIC_HOLIDAY) {
        // Special entries without start/end → target minutes
        return getTargetMinutesForDate(entry.date, userData?.workDays, locale, config)
    }

    return null // unknown type, skip
}

/** Montag der ISO-Woche eines Datums. */
fun getISOWeekMonday(date: LocalDate): LocalDate {
    val day = date.dayOfWeek.value % 7 // 0 = Sonntag, 1..6 = Mo..Sa
    val diff = if (day == 0) -6 else 1 - day
    return date.plusDays(diff.toLong())
}

data class DateRange(val start: LocalDate, val end: LocalDate)

fun getWeekRangeInMonth(dateInWeek: LocalDate, viewDate: LocalDate? = null): DateRange {
    val day = dateInWeek.dayOfWeek.value % 7
    val jsDay = if (day == 0) 7 else day // `d.getDay() || 7`

    val startOfWeek = dateInWeek.plusDays((1 - jsDay).toLong())
    val endOfWeek = startOfWeek.plusDays(6)

    if (viewDate == null) return DateRange(startOfWeek, endOfWeek)

    val viewMonthStart = viewDate.withDayOfMonth(1)
    val viewMonthEnd = viewDate.withDayOfMonth(viewDate.lengthOfMonth())

    val effectiveStart = if (startOfWeek.isBefore(viewMonthStart)) viewMonthStart else startOfWeek
    val effectiveEnd = if (endOfWeek.isAfter(viewMonthEnd)) viewMonthEnd else endOfWeek

    return DateRange(effectiveStart, effectiveEnd)
}

/**
 * Berechnet Wochen-Stats immer für die VOLLE Woche (Mo-So), unabhängig vom
 * angezeigten Monat. So sind Saldo und MA/ÜS-Split korrekt auf 40h-Basis.
 */
fun calculateWeekStats(
    weekEntries: List<Entry>,
    userData: UserData?,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
    today: LocalDate = LocalDate.now(),
): PeriodStatsResult {
    val dateRef = if (weekEntries.isNotEmpty()) LocalDate.parse(weekEntries[0].date) else today
    // Volle Woche ohne Monats-Clipping (kein viewDate)
    val (start, end) = getWeekRangeInMonth(dateRef)
    return calculatePeriodStats(weekEntries, userData, start, end, null, locale, config)
}
