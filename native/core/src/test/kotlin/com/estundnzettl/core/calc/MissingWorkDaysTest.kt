package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.OvertimeAccountConfig
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import java.time.YearMonth
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class MissingWorkDaysTest {

    /** Mo–Do 8:30, Fr 4:30 — wie im Support-Screenshot. */
    private val workDays = listOf(0, 510, 510, 510, 510, 270, 0)
    private val user = UserData(workDays = workDays)
    private val oct = YearMonth.of(2026, 10)
    private val today = LocalDate.of(2026, 10, 21) // Mittwoch

    private fun config(account: Boolean = true): CalculationConfig =
        getDefaultCalculationConfig(austriaLocale, workDays).copy(
            overtimeAccount = if (account) OvertimeAccountConfig(true, "2026-10", 0) else null,
        )

    private var nextId = 1L

    private fun work(date: String, net: Int) = Entry(
        id = EntryId.of(nextId++), type = EntryType.WORK, date = date,
        start = "07:00", end = "16:00", pause = 30, code = WorkCodes.OFFICE, netDuration = net,
    )

    private fun timeComp(date: String, net: Int) = Entry(
        id = EntryId.of(nextId++), type = EntryType.TIME_COMP, date = date, netDuration = net,
    )

    /** Jeder Arbeitstag vom 1.10. bis [through] mit genau dem Tagessoll, außer [skip]. */
    private fun exactDays(through: Int, skip: Set<Int> = emptySet()): List<Entry> =
        (1..through).map { oct.atDay(it) }
            .filter { it.dayOfMonth !in skip }
            .mapNotNull { day ->
                val target = workDays[day.dayOfWeek.value % 7]
                if (target > 0) work(day.toString(), target) else null
            }

    private fun appData(entries: List<Entry>, cfg: CalculationConfig = config()) =
        deriveAppData(entries, user, 2026, 10, entries, today, austriaLocale, cfg)

    @Test
    fun `vergessener Arbeitstag wird mit seinem Soll erkannt`() {
        val entries = exactDays(through = 20, skip = setOf(14))
        val missing = appData(entries).missingWorkDays
        assertEquals(listOf(MissingWorkDay(LocalDate.of(2026, 10, 14), 510)), missing)
    }

    @Test
    fun `Wochenende, heute und kommende Tage sind nie vergessen`() {
        // Bis gestern lückenlos, heute und danach noch nichts
        val missing = appData(exactDays(through = 20)).missingWorkDays
        assertTrue(missing.isEmpty(), "unerwartet: $missing")
    }

    @Test
    fun `Feiertage gelten nicht als vergessen`() {
        val nov = YearMonth.of(2026, 11)
        // 2.11. bis 4.11. erfasst, 1.11. (Allerheiligen, So) und 26.10. sind Feiertage
        val entries = exactDays(through = 31, skip = setOf(26))
        val result = deriveAppData(entries, user, 2026, 10, entries, nov.atDay(5), austriaLocale, config())
        assertTrue(result.missingWorkDays.none { it.date == LocalDate.of(2026, 10, 26) })
    }

    @Test
    fun `vor dem ersten Eintrag ueberhaupt wird nichts markiert`() {
        // Erst ab Mo 12.10. genutzt
        val entries = exactDays(through = 20).filter { it.date >= "2026-10-12" }
        assertTrue(appData(entries).missingWorkDays.isEmpty())
    }

    @Test
    fun `einfacher Modus kennt keine vergessenen Tage`() {
        val entries = exactDays(through = 20, skip = setOf(14))
        val simple = user.copy(simpleMode = true)
        val result = deriveAppData(entries, simple, 2026, 10, entries, today, austriaLocale, config())
        assertTrue(result.missingWorkDays.isEmpty())
    }

    @Test
    fun `vergessener Tag zaehlt im Monatssaldo, aber nicht im ZA-Konto`() {
        val complete = appData(exactDays(through = 20))
        val gap = appData(exactDays(through = 20, skip = setOf(14)))

        assertEquals(complete.stats.totalSaldo - 510, gap.stats.totalSaldo)
        assertEquals(0, complete.overtimeAccount!!.closingMinutes)
        assertEquals(0, gap.overtimeAccount!!.closingMinutes)
    }

    @Test
    fun `nur echter Zeitausgleich baut das Konto ab`() {
        val entries = exactDays(through = 20, skip = setOf(14)) + timeComp("2026-10-14", 510)
        val result = appData(entries)
        assertTrue(result.missingWorkDays.isEmpty())
        assertEquals(510, result.overtimeAccount!!.timeCompMinutes)
        assertEquals(-510, result.overtimeAccount!!.closingMinutes)
    }

    @Test
    fun `Unterstunden an erfassten Tagen bleiben im Konto`() {
        val entries = exactDays(through = 20).map { if (it.date == "2026-10-14") work(it.date, 360) else it }
        assertEquals(-150, appData(entries).overtimeAccount!!.closingMinutes)
    }
}
