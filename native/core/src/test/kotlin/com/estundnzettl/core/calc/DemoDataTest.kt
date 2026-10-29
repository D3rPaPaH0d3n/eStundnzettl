package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.model.EntryType
import java.time.LocalDate
import java.time.YearMonth
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class DemoDataTest {
    @Test
    fun `demo covers complete months with consistent balances even across year and leap boundaries`() {
        val locale = getLocale("at")
        for (date in listOf("2026-10-29", "2027-01-01", "2028-03-01", "2026-12-31")) {
            val today = LocalDate.parse(date)
            val month = YearMonth.from(today)
            val entries = generateDemoEntries(today)
            val config = generateDemoCalculationConfig(today)
            assertEquals(entries, generateDemoEntries(today))
            assertEquals(entries.size, entries.map { it.id }.toSet().size)
            assertTrue(entries.all { it.date <= date })
            assertTrue(entries.none { it.date in getHolidayData(LocalDate.parse(it.date).year, locale, config) })
            var opening = 16 * 60
            for (offset in 2 downTo 0) {
                val cursor = month.minusMonths(offset.toLong())
                val account = assertNotNull(calculateOvertimeAccount(entries, DEMO_USER, cursor, today, locale, config))
                assertEquals(opening, account.openingMinutes)
                assertEquals(0, account.missingDayMinutes, "$date / $cursor")
                assertEquals(if (offset == 1) 120 else 0, account.payoutMinutes)
                assertTrue(account.closingMinutes > 0)
                opening = account.closingMinutes
                if (offset > 0) {
                    val samples = entries.filter { it.date.startsWith(cursor.toString()) }
                    assertTrue(samples.any { it.type == EntryType.TIME_COMP })
                    assertTrue(samples.any { it.type == EntryType.SICK })
                    assertTrue(samples.any { it.overnight })
                    val vacation = assertNotNull(calculateVacationBalance(entries, DEMO_USER, cursor, locale, config))
                    assertTrue(vacation.usedHalfDays >= 3)
                    assertEquals(3, vacation.carryoverDays)
                    assertTrue(account.timeCompMinutes > 0)
                }
            }
        }
    }

    @Test
    fun `work and travel times do not overlap and match stored durations`() {
        val entries = generateDemoEntries(LocalDate.of(2026, 10, 29))
        entries.filter { it.type == EntryType.WORK }.groupBy { it.date }.forEach { (_, day) ->
            val sorted = day.sortedBy { it.start }
            sorted.zipWithNext().forEach { (a, b) -> assertTrue(a.end!! <= b.start!!) }
            sorted.forEach { assertEquals(calculateRawDuration(it.start!!, it.end!!) - it.pause, it.netDuration) }
        }
        val display = getEffectivePdfDisplay(generateDemoCalculationConfig())
        assertTrue(display.showVacationBalance && display.showOvertimeAccount && display.embedAttachments)
    }
}
