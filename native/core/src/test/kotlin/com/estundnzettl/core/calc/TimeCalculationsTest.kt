package com.estundnzettl.core.calc

import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Port der Vitest-Suite src/utils/__tests__/timeCalculations.test.ts —
 * identische Eingaben und Erwartungswerte, um die funktionale Identität
 * der Kotlin-Implementierung zu belegen.
 */
class TimeCalculationsTest {

    private var idCounter = 0L

    private fun entry(
        date: String,
        type: EntryType = EntryType.WORK,
        code: Int? = null,
        netDuration: Int = 0,
        start: String? = null,
        end: String? = null,
        id: String? = null,
    ) = Entry(
        id = if (id != null) EntryId.of(id) else EntryId.of(++idCounter),
        type = type,
        date = date,
        start = start,
        end = end,
        code = code,
        netDuration = netDuration,
    )

    private val noWorkDays: UserData = UserData(workDays = null)

    // ─── parseTime ───────────────────────────────────────────

    @Test
    fun `parseTime konvertiert HHMM korrekt in Minuten`() {
        assertEquals(0, parseTime("00:00"))
        assertEquals(90, parseTime("01:30"))
        assertEquals(525, parseTime("08:45"))
        assertEquals(23 * 60 + 59, parseTime("23:59"))
    }

    // ─── calculateRawDuration ────────────────────────────────

    @Test
    fun `berechnet normale Dauer`() {
        assertEquals(9 * 60, calculateRawDuration("08:00", "17:00"))
        assertEquals(12 * 60, calculateRawDuration("00:00", "12:00"))
    }

    @Test
    fun `liefert 0 wenn Start- und Endzeit gleich sind`() {
        assertEquals(0, calculateRawDuration("08:00", "08:00"))
    }

    @Test
    fun `erkennt Nachtschicht und rechnet ueber Mitternacht`() {
        assertEquals(8 * 60, calculateRawDuration("22:00", "06:00"))
        assertEquals(60, calculateRawDuration("23:00", "00:00"))
        assertEquals(8 * 60 + 30, calculateRawDuration("18:00", "02:30"))
    }

    // ─── isOvernightShift ────────────────────────────────────

    @Test
    fun `isOvernightShift ist false fuer normale Schichten`() {
        assertEquals(false, isOvernightShift("08:00", "17:00"))
        assertEquals(false, isOvernightShift("00:00", "23:59"))
        assertEquals(false, isOvernightShift("12:00", "12:00"))
    }

    @Test
    fun `isOvernightShift ist true wenn Ende vor Start liegt`() {
        assertEquals(true, isOvernightShift("22:00", "06:00"))
        assertEquals(true, isOvernightShift("23:30", "00:30"))
    }

    // ─── toAbsoluteRange ─────────────────────────────────────

    @Test
    fun `toAbsoluteRange liefert unveraenderte Range bei normaler Schicht`() {
        assertEquals(8 * 60 to 17 * 60, toAbsoluteRange("08:00", "17:00"))
    }

    @Test
    fun `toAbsoluteRange verschiebt Ende um 24h bei Nachtschicht`() {
        assertEquals(22 * 60 to 30 * 60, toAbsoluteRange("22:00", "06:00"))
        assertEquals(8 * 60 to 32 * 60, toAbsoluteRange("08:00", "08:00"))
    }

    // ─── getEntryDayContributions ────────────────────────────

    @Test
    fun `schreibt ohne Split alles dem Beginn-Tag zu`() {
        val contrib = getEntryDayContributions("2026-01-04", "22:00", "06:00", 450, false)
        assertEquals(mapOf("2026-01-04" to 450), contrib)
    }

    @Test
    fun `schreibt ohne Nachtschicht alles dem Beginn-Tag zu, auch mit splitEnabled`() {
        val contrib = getEntryDayContributions("2026-01-04", "08:00", "17:00", 510, true)
        assertEquals(mapOf("2026-01-04" to 510), contrib)
    }

    @Test
    fun `splittet Nachtschicht proportional auf Beginn- und Folgetag`() {
        // 22-24 = 120min von 480min Roh = 25% → 112min, Folgetag bekommt 338min
        val contrib = getEntryDayContributions("2026-01-04", "22:00", "06:00", 450, true)
        assertEquals(mapOf("2026-01-04" to 112, "2026-01-05" to 338), contrib)
        assertEquals(450, contrib.getValue("2026-01-04") + contrib.getValue("2026-01-05"))
    }

    @Test
    fun `rollt ueber Monatsgrenzen korrekt`() {
        val contrib = getEntryDayContributions("2026-01-31", "22:00", "06:00", 480, true)
        assertEquals(listOf("2026-01-31", "2026-02-01"), contrib.keys.sorted())
        assertEquals(480, contrib.getValue("2026-01-31") + contrib.getValue("2026-02-01"))
    }

    // ─── getDayOfWeek ────────────────────────────────────────

    @Test
    fun `erkennt Wochentag aus YYYY-MM-DD (0=So bis 6=Sa)`() {
        assertEquals(1, getDayOfWeek("2024-01-01")) // Montag
        assertEquals(0, getDayOfWeek("2024-01-07")) // Sonntag
        assertEquals(6, getDayOfWeek("2024-01-06")) // Samstag
    }

    // ─── getTargetMinutesForDate ─────────────────────────────

    @Test
    fun `nutzt Default 510 min Mo-Do und 270 min Fr ohne customWorkDays`() {
        assertEquals(510, getTargetMinutesForDate("2024-01-01")) // Mo
        assertEquals(510, getTargetMinutesForDate("2024-01-02")) // Di
        assertEquals(510, getTargetMinutesForDate("2024-01-03")) // Mi
        assertEquals(510, getTargetMinutesForDate("2024-01-04")) // Do
        assertEquals(270, getTargetMinutesForDate("2024-01-05")) // Fr
        assertEquals(0, getTargetMinutesForDate("2024-01-06"))   // Sa
        assertEquals(0, getTargetMinutesForDate("2024-01-07"))   // So
    }

    @Test
    fun `respektiert customWorkDays (7er-Liste, So bis Sa)`() {
        val custom = listOf(0, 480, 480, 480, 480, 480, 0) // Mo-Fr je 8h
        assertEquals(480, getTargetMinutesForDate("2024-01-05", custom))
        assertEquals(0, getTargetMinutesForDate("2024-01-06", custom))
    }

    @Test
    fun `halbiert an Halbtagen (24_12 und 31_12)`() {
        assertEquals(255, getTargetMinutesForDate("2024-12-24")) // Di → 510/2
        assertEquals(255, getTargetMinutesForDate("2024-12-31")) // Di → 255
    }

    // ─── getWeekNumber ───────────────────────────────────────

    @Test
    fun `liefert ISO-Wochennummer`() {
        assertEquals(1, getWeekNumber(LocalDate.of(2024, 1, 1)))   // Montag = KW 1
        assertEquals(52, getWeekNumber(LocalDate.of(2023, 1, 1)))  // Sonntag → KW 52/2022
        assertEquals(1, getWeekNumber(LocalDate.of(2024, 12, 30))) // Montag = KW 1 von 2025
    }

    // ─── calculateOvertimeSplit ──────────────────────────────

    @Test
    fun `gibt 0-0 bei nicht-positivem Saldo`() {
        assertEquals(OvertimeSplit(0, 0), calculateOvertimeSplit(0, 2400))
        assertEquals(OvertimeSplit(0, 0), calculateOvertimeSplit(-60, 2400))
    }

    @Test
    fun `ordnet Plus-Saldo zunaechst der Mehrarbeit bis zur 40h-Grenze zu`() {
        assertEquals(OvertimeSplit(30, 0), calculateOvertimeSplit(30, 2310))
        assertEquals(OvertimeSplit(90, 30), calculateOvertimeSplit(120, 2310))
    }

    @Test
    fun `legt alles als Ueberstunden an wenn Ziel schon 40h oder mehr ist`() {
        assertEquals(OvertimeSplit(0, 60), calculateOvertimeSplit(60, 2400))
        assertEquals(OvertimeSplit(0, 60), calculateOvertimeSplit(60, 2500))
    }

    // ─── calculateEntryNetDuration ───────────────────────────

    @Test
    fun `zieht Pause bei Arbeitseintraegen ab`() {
        val mins = calculateEntryNetDuration(
            entryType = "work", startTime = "08:00", endTime = "17:00",
            pauseDuration = 30, formDate = "2026-04-04", userData = null, code = WorkCodes.OFFICE,
        )
        assertEquals(8 * 60 + 30, mins)
    }

    @Test
    fun `ignoriert Pause bei Fahrzeit (Code 19)`() {
        val mins = calculateEntryNetDuration(
            entryType = "work", startTime = "08:00", endTime = "10:00",
            pauseDuration = 60, formDate = "2026-04-04", userData = null, code = WorkCodes.DRIVE,
        )
        assertEquals(120, mins)
    }

    @Test
    fun `interpretiert end kleiner start als Nachtschicht ueber Mitternacht`() {
        val mins = calculateEntryNetDuration(
            entryType = "work", startTime = "10:00", endTime = "09:00",
            pauseDuration = 0, formDate = "2026-04-04", userData = null, code = WorkCodes.OFFICE,
        )
        assertEquals(23 * 60, mins)
    }

    @Test
    fun `liefert 0 bei gleicher Start- und Endzeit`() {
        val mins = calculateEntryNetDuration(
            entryType = "work", startTime = "10:00", endTime = "10:00",
            pauseDuration = 0, formDate = "2026-04-04", userData = null, code = WorkCodes.OFFICE,
        )
        assertEquals(0, mins)
    }

    @Test
    fun `berechnet Nachtschicht 2200-0600 mit 30min Pause korrekt`() {
        val mins = calculateEntryNetDuration(
            entryType = "work", startTime = "22:00", endTime = "06:00",
            pauseDuration = 30, formDate = "2026-04-04", userData = null, code = WorkCodes.OFFICE,
        )
        assertEquals(8 * 60 - 30, mins)
    }

    @Test
    fun `nutzt fuer Nicht-Arbeit das Tagessoll`() {
        val mins = calculateEntryNetDuration(
            entryType = "vacation", startTime = "", endTime = "",
            pauseDuration = 0, formDate = "2024-01-01", userData = null, code = 0,
        )
        assertEquals(510, mins)
    }

    // ─── calculateDisplayedDayMinutes ────────────────────────

    @Test
    fun `summiert netDuration und ignoriert Fahrzeit-Eintraege`() {
        val entries = listOf(
            entry("2024-01-01", EntryType.WORK, WorkCodes.OFFICE, 480),
            entry("2024-01-01", EntryType.WORK, WorkCodes.DRIVE, 60),
            entry("2024-01-01", EntryType.VACATION, 0, 510),
        )
        assertEquals(480 + 510, calculateDisplayedDayMinutes(entries))
    }

    // ─── calculatePeriodStats ────────────────────────────────

    @Test
    fun `aggregiert Ist Soll Saldo fuer eine Woche korrekt`() {
        val entries = listOf(
            entry("2024-01-01", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2024-01-02", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2024-01-03", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2024-01-04", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2024-01-05", EntryType.WORK, WorkCodes.OFFICE, 270),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 7)
        )
        assertEquals(510 * 4 + 270, stats.work)
        assertEquals(510 * 4 + 270, stats.totalTarget)
        assertEquals(0, stats.totalSaldo)
        assertEquals(510 * 4 + 270, stats.normalstunden)
    }

    @Test
    fun `traegt Fahrzeit in drive nicht in work`() {
        val entries = listOf(
            entry("2024-01-01", EntryType.WORK, WorkCodes.OFFICE, 480),
            entry("2024-01-01", EntryType.WORK, WorkCodes.DRIVE, 60),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1)
        )
        assertEquals(480, stats.work)
        assertEquals(60, stats.drive)
    }

    @Test
    fun `gebrochene Woche unter Wochen-Soll - nur taegliche UES keine MA`() {
        // KW14: Mo 30.03 + Di 31.03 im März (IST=1230 < 2310)
        val entries = listOf(
            entry("2026-03-30", EntryType.WORK, WorkCodes.OFFICE, 600),
            entry("2026-03-31", EntryType.WORK, WorkCodes.OFFICE, 630),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2026, 3, 30), LocalDate.of(2026, 3, 31)
        )
        assertEquals(0, stats.overtimeSplit.mehrarbeit)
        assertEquals(210, stats.overtimeSplit.ueberstunden)
    }

    @Test
    fun `gebrochene Woche unter Wochen-Soll am Monatsanfang - nur taegliche UES`() {
        // KW14: Mi-Fr im April (IST=1500 < 2310)
        val entries = listOf(
            entry("2026-04-01", EntryType.WORK, WorkCodes.OFFICE, 600),
            entry("2026-04-02", EntryType.WORK, WorkCodes.OFFICE, 600),
            entry("2026-04-03", EntryType.WORK, WorkCodes.OFFICE, 300),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 5)
        )
        assertEquals(0, stats.overtimeSplit.mehrarbeit)
        assertEquals(210, stats.overtimeSplit.ueberstunden)
    }

    @Test
    fun `gebrochene Woche ueber Wochen-Soll - MA-UES-Split greift`() {
        // 5 Tage gebrochene Woche, IST=2440 > Wochen-Soll 2310
        val entries = listOf(
            entry("2025-07-01", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2025-07-02", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2025-07-03", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2025-07-04", EntryType.WORK, WorkCodes.OFFICE, 510),
            entry("2025-07-05", EntryType.WORK, WorkCodes.OFFICE, 400),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2025, 7, 1), LocalDate.of(2025, 7, 5)
        )
        assertEquals(90, stats.overtimeSplit.mehrarbeit)
        assertEquals(40, stats.overtimeSplit.ueberstunden)
    }

    @Test
    fun `gebrochene Woche ohne taeglichen Ueberschuss - keine MA-UES`() {
        val entries = listOf(
            entry("2026-03-30", EntryType.WORK, WorkCodes.OFFICE, 420),
            entry("2026-03-31", EntryType.WORK, WorkCodes.OFFICE, 420),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2026, 3, 30), LocalDate.of(2026, 3, 31)
        )
        assertEquals(0, stats.overtimeSplit.mehrarbeit)
        assertEquals(0, stats.overtimeSplit.ueberstunden)
    }

    @Test
    fun `splittet Plus-Saldo korrekt in Mehrarbeit und Ueberstunden`() {
        // Mo-Do je 9h = 540, Fr 270 → Ist = 2430, Soll 2310, Diff 120 → 90 MA + 30 ÜS
        val entries = listOf(
            entry("2024-01-01", EntryType.WORK, WorkCodes.OFFICE, 540),
            entry("2024-01-02", EntryType.WORK, WorkCodes.OFFICE, 540),
            entry("2024-01-03", EntryType.WORK, WorkCodes.OFFICE, 540),
            entry("2024-01-04", EntryType.WORK, WorkCodes.OFFICE, 540),
            entry("2024-01-05", EntryType.WORK, WorkCodes.OFFICE, 270),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 7)
        )
        assertEquals(90, stats.overtimeSplit.mehrarbeit)
        assertEquals(30, stats.overtimeSplit.ueberstunden)
        assertEquals(2430 - 90 - 30, stats.normalstunden)
    }

    @Test
    fun `normalstunden = IST - MA - UES bei gemischter Woche`() {
        val entries = listOf(
            entry("2024-01-01", EntryType.WORK, WorkCodes.OFFICE, 600), // Mo: >510
            entry("2024-01-02", EntryType.WORK, WorkCodes.OFFICE, 400), // Di: <510
            entry("2024-01-06", EntryType.WORK, WorkCodes.OFFICE, 300), // Sa: soll=0
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 7)
        )
        // IST = 1300, Saldo = -1010 → MA=0, ÜS=0, Normalstunden = 1300
        assertEquals(1300, stats.normalstunden)
    }

    @Test
    fun `Maerz 2026 - 4 volle Wochen plus gebrochene KW14 tageweise`() {
        fun makeWeek(monday: String): List<Entry> {
            val start = LocalDate.parse(monday)
            return (0 until 5).map { i ->
                val date = start.plusDays(i.toLong())
                val dateStr = "%04d-%02d-%02d".format(date.year, date.monthValue, date.dayOfMonth)
                entry(
                    dateStr, EntryType.WORK, WorkCodes.OFFICE,
                    if (i < 4) 600 else 270, id = "$dateStr-work",
                )
            }
        }

        val allEntries =
            makeWeek("2026-03-02") + makeWeek("2026-03-09") + makeWeek("2026-03-16") +
                makeWeek("2026-03-23") + makeWeek("2026-03-30")
        val marchEntries = allEntries.filter { it.date.startsWith("2026-03") }
        val stats = calculatePeriodStats(
            marchEntries, noWorkDays, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 31)
        )
        // 4 volle Wochen × 90min MA = 360min; KW14 gebrochen → 0 MA
        assertEquals(360, stats.overtimeSplit.mehrarbeit)
        // 4 volle Wochen × 270min ÜS + KW14 tägliche ÜS (90+90)
        assertEquals(1080 + 180, stats.overtimeSplit.ueberstunden)
    }

    @Test
    fun `splittet Nachtschicht ueber ISO-Wochengrenze auf beide Wochen`() {
        val entries = listOf(
            // KW8 Mo-Fr volle Arbeit
            entry("2026-02-16", EntryType.WORK, WorkCodes.OFFICE, 510, id = "a"),
            entry("2026-02-17", EntryType.WORK, WorkCodes.OFFICE, 510, id = "b"),
            entry("2026-02-18", EntryType.WORK, WorkCodes.OFFICE, 510, id = "c"),
            entry("2026-02-19", EntryType.WORK, WorkCodes.OFFICE, 510, id = "d"),
            entry("2026-02-20", EntryType.WORK, WorkCodes.OFFICE, 270, id = "e"),
            // Sonntags-Nachtschicht über Wochengrenze (Roh 480min, ohne Pause)
            entry("2026-02-22", EntryType.WORK, WorkCodes.OFFICE, 480, start = "22:00", end = "06:00", id = "night"),
            // KW9 Mo-Fr volle Arbeit
            entry("2026-02-23", EntryType.WORK, WorkCodes.OFFICE, 510, id = "f"),
            entry("2026-02-24", EntryType.WORK, WorkCodes.OFFICE, 510, id = "g"),
            entry("2026-02-25", EntryType.WORK, WorkCodes.OFFICE, 510, id = "h"),
            entry("2026-02-26", EntryType.WORK, WorkCodes.OFFICE, 510, id = "i"),
            entry("2026-02-27", EntryType.WORK, WorkCodes.OFFICE, 270, id = "j"),
        )
        val stats = calculatePeriodStats(
            entries, noWorkDays, LocalDate.of(2026, 2, 16), LocalDate.of(2026, 3, 1)
        )
        // KW8: 2430 Ist → +120 → 90 MA + 30 ÜS; KW9: 2670 Ist → +360 → 90 MA + 270 ÜS
        assertEquals(180, stats.overtimeSplit.mehrarbeit)
        assertEquals(300, stats.overtimeSplit.ueberstunden)
        assertEquals(8 * 510 + 2 * 270 + 480, stats.work)
    }

    // ─── adjustSickDuration ──────────────────────────────────

    @Test
    fun `fuellt Krank nur bis Sollzeit auf`() {
        assertEquals(210, adjustSickDuration(510, 300, 510))
    }

    @Test
    fun `gibt 0 wenn bereits genug gearbeitet`() {
        assertEquals(0, adjustSickDuration(510, 600, 510))
    }

    @Test
    fun `voller Kranktag ohne Arbeit - volle Sollzeit`() {
        assertEquals(510, adjustSickDuration(510, 0, 510))
    }

    @Test
    fun `kein Target - keine Krankzeit`() {
        assertEquals(0, adjustSickDuration(510, 0, 0))
    }

    @Test
    fun `Krankzeit kleiner als Rest - nur Krankzeit`() {
        assertEquals(100, adjustSickDuration(100, 300, 510))
    }

    // ─── applyEffectiveDurations + calculatePeriodStats ──────

    @Test
    fun `Arbeit plus Krank am selben Tag - keine Doppelzaehlung`() {
        val raw = listOf(
            entry("2024-01-01", EntryType.WORK, WorkCodes.OFFICE, 300),
            entry("2024-01-01", EntryType.SICK, null, 510),
        )
        val corrected = applyEffectiveDurations(raw, noWorkDays)
        val stats = calculatePeriodStats(
            corrected, noWorkDays, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1)
        )
        assertEquals(210, stats.sick) // max(0, 510-300)
        assertEquals(300, stats.work)
        assertEquals(510, stats.totalIst)
        assertEquals(0, stats.totalSaldo)
        assertEquals(510, stats.normalstunden)
    }

    @Test
    fun `Arbeit ueber Soll plus Krank - Krankzeit = 0`() {
        val raw = listOf(
            entry("2024-01-01", EntryType.WORK, WorkCodes.OFFICE, 600),
            entry("2024-01-01", EntryType.SICK, null, 510),
        )
        val corrected = applyEffectiveDurations(raw, noWorkDays)
        val stats = calculatePeriodStats(
            corrected, noWorkDays, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1)
        )
        assertEquals(0, stats.sick)
        assertEquals(600, stats.work)
        assertEquals(600, stats.totalIst)
    }

    @Test
    fun `voller Kranktag ohne Arbeit - unveraendert`() {
        val raw = listOf(entry("2024-01-01", EntryType.SICK, null, 510))
        val corrected = applyEffectiveDurations(raw, noWorkDays)
        val stats = calculatePeriodStats(
            corrected, noWorkDays, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1)
        )
        assertEquals(510, stats.sick)
        assertEquals(510, stats.totalIst)
        assertEquals(0, stats.totalSaldo)
    }
}
