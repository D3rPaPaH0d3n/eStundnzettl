package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import java.time.YearMonth
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class VacationBalanceTest {

    /** Mo–Do 8h, Fr 6h — Freitag hat ein kürzeres Tagessoll. */
    private val workDays = listOf(0, 480, 480, 480, 480, 360, 0)
    private val user = UserData(workDays = workDays)
    private val sep = YearMonth.of(2026, 9)
    private val oct = YearMonth.of(2026, 10)

    private fun config(allowance: Int = 25, carryover: Int = 0): CalculationConfig =
        getDefaultCalculationConfig(austriaLocale, workDays)
            .copy(vacationAllowanceDays = allowance, vacationCarryoverDays = carryover)

    private var nextId = 1L

    private fun vacation(date: String, net: Int = 480) = Entry(
        id = EntryId.of(nextId++), type = EntryType.VACATION, date = date, netDuration = net,
    )

    private fun balance(
        entries: List<Entry>,
        month: YearMonth,
        cfg: CalculationConfig? = config(),
        userData: UserData = user,
    ) = calculateVacationBalance(entries, userData, month, austriaLocale, cfg)

    @Test
    fun `Urlaub aus Vormonaten wird in den Folgemonat mitgenommen`() {
        // Support-Fall: 25 Tage, je ein Urlaubstag im September und Oktober
        val entries = listOf(vacation("2026-09-15"), vacation("2026-10-14"))

        val september = balance(entries, sep)!!
        assertEquals(2, september.usedHalfDays)
        assertEquals(48, september.remainingHalfDays)
        assertEquals(2, september.plannedHalfDays)

        val october = balance(entries, oct)!!
        assertEquals(4, october.usedHalfDays)
        assertEquals(46, october.remainingHalfDays)
        assertEquals(0, october.plannedHalfDays)
    }

    @Test
    fun `Uebertrag zaehlt zum Anspruch`() {
        val result = balance(listOf(vacation("2026-03-02")), oct, config(allowance = 25, carryover = 3))!!
        assertEquals(54, result.remainingHalfDays)
        assertEquals(-2, balance(emptyList(), oct, config(allowance = 25, carryover = -26))!!.remainingHalfDays)
    }

    @Test
    fun `Urlaub des Vorjahres zaehlt nicht`() {
        val result = balance(listOf(vacation("2025-12-29"), vacation("2027-01-04")), oct)!!
        assertEquals(0, result.usedHalfDays)
        assertEquals(0, result.plannedHalfDays)
    }

    @Test
    fun `halber Urlaubstag zaehlt halb, auch bei kuerzerem Freitag`() {
        val entries = listOf(
            vacation("2026-10-13", 240), // Di, halbes Soll
            vacation("2026-10-16", 360), // Fr, volles (kürzeres) Soll
            vacation("2026-10-23", 180), // Fr, halbes Soll
        )
        assertEquals(4, balance(entries, oct)!!.usedHalfDays)
    }

    @Test
    fun `mehrere Urlaubseintraege am selben Tag ergeben hoechstens einen Tag`() {
        val entries = listOf(vacation("2026-10-13", 240), vacation("2026-10-13", 300))
        assertEquals(2, balance(entries, oct)!!.usedHalfDays)
    }

    @Test
    fun `Feiertage und Tage ohne Soll kosten keinen Urlaub`() {
        val entries = listOf(
            vacation("2026-10-26"), // Nationalfeiertag
            vacation("2026-10-24", 0), // Samstag
        )
        assertEquals(0, balance(entries, oct)!!.usedHalfDays)
    }

    @Test
    fun `Urlaub am 24-12 ist ein halber Tag`() {
        // Halbtag: Soll und automatische Urlaubsdauer sind halbiert
        val halfDayTarget = getTargetMinutesForDate("2026-12-24", workDays, austriaLocale, config())
        val result = balance(listOf(vacation("2026-12-24", halfDayTarget)), YearMonth.of(2026, 12))!!
        assertEquals(1, result.usedHalfDays)
    }

    @Test
    fun `einfacher Modus zaehlt jeden Urlaubstag ganz`() {
        val simple = user.copy(simpleMode = true)
        val result = balance(listOf(vacation("2026-10-13", 120)), oct, userData = simple)!!
        assertEquals(2, result.usedHalfDays)
    }

    @Test
    fun `ohne Urlaubsanspruch gibt es keine Bilanz`() {
        assertNull(balance(emptyList(), oct, config(allowance = 0)))
        assertNull(balance(emptyList(), oct, null))
    }

    @Test
    fun `Dashboard-Daten tragen die Bilanz des Anzeige-Monats`() {
        val entries = listOf(vacation("2026-09-15"), vacation("2026-10-14"))
        val appData = deriveAppData(entries, user, 2026, 9, entries, LocalDate.of(2026, 10, 19), austriaLocale, config())
        assertEquals(balance(entries, sep), appData.vacationBalance)
    }

    @Test
    fun `Archiv-Hash reagiert auf Urlaub aus Vormonaten`() {
        val monthEntries = listOf(vacation("2026-10-14"))
        fun hash(entries: List<Entry>) = hashMonthContent(
            monthEntries, user, 2026, 10, austriaLocale, config(), LocalDate.of(2026, 11, 2),
            vacationBalance = balance(entries, oct),
        )
        assertNotEquals(hash(monthEntries), hash(monthEntries + vacation("2026-09-15")))
        assertEquals(hash(monthEntries), hash(monthEntries + vacation("2026-11-16")))
    }

    @Test
    fun `halbe Tage werden lokalisiert formatiert`() {
        assertEquals("24", formatHalfDays(48))
        assertEquals("23,5", formatHalfDays(47))
        assertEquals("23.5", formatHalfDays(47, "en"))
        assertEquals("0,5", formatHalfDays(1))
        assertEquals("-1,5", formatHalfDays(-3))
        assertEquals("0", formatHalfDays(0))
    }
}
