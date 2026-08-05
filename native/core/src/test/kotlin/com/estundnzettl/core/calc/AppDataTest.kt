package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.HolidaySetConfig
import com.estundnzettl.core.model.HolidaySetMode
import com.estundnzettl.core.model.UserData
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AppDataTest {

    private val noWorkDays = UserData(workDays = null)

    private fun work(date: String, net: Int, id: Long, project: String? = null) = Entry(
        id = EntryId.of(id), type = EntryType.WORK, date = date,
        start = "08:00", end = "17:00", pause = 30, project = project,
        code = WorkCodes.OFFICE, netDuration = net,
    )

    // ─── getHolidayData ──────────────────────────────────────

    @Test
    fun `locale_default liefert Locale-Feiertage`() {
        val holidays = getHolidayData(2024, austriaLocale, null)
        assertEquals(13, holidays.size)
        assertEquals("Neujahr", holidays["2024-01-01"])
    }

    @Test
    fun `disabledHolidayKeys filtern Locale-Feiertage aus`() {
        val config = getDefaultCalculationConfig(austriaLocale, null).copy(
            holidaySet = HolidaySetConfig(
                mode = HolidaySetMode.LOCALE_DEFAULT,
                disabledHolidayKeys = listOf("12-08", "01-06"),
            )
        )
        val holidays = getHolidayData(2024, austriaLocale, config)
        assertEquals(11, holidays.size)
        assertFalse(holidays.containsKey("2024-12-08"))
        assertFalse(holidays.containsKey("2024-01-06"))
    }

    @Test
    fun `custom-Modus expandiert MM-DD-Keys auf das Jahr`() {
        val config = getBlankCalculationConfig(null).copy(
            holidaySet = HolidaySetConfig(
                mode = HolidaySetMode.CUSTOM,
                customHolidays = mapOf(
                    "01-01" to "Neujahr",
                    "2024-06-15" to "Firmenfeier",
                    "2023-06-15" to "Altes Jahr",
                ),
            )
        )
        val holidays = getHolidayData(2024, austriaLocale, config)
        assertEquals(mapOf("2024-01-01" to "Neujahr", "2024-06-15" to "Firmenfeier"), holidays)
    }

    // ─── buildEntriesWithHolidays ────────────────────────────

    @Test
    fun `synthetisiert vergangene Feiertage mit Soll ueber 0`() {
        // Mai 2024 (AT): 01.05. Staatsfeiertag (Mi), 09.05. Himmelfahrt (Do),
        // 20.05. Pfingstmontag (Mo), 30.05. Fronleichnam (Do)
        val result = buildEntriesWithHolidays(
            entries = emptyList(), userData = noWorkDays,
            viewYear = 2024, viewMonth1Based = 5,
            today = LocalDate.of(2024, 5, 31), locale = austriaLocale,
        )
        assertEquals(4, result.size)
        assertTrue(result.all { it.type == EntryType.PUBLIC_HOLIDAY })
        val may1 = result.first { it.date == "2024-05-01" }
        assertEquals(EntryId.of("auto-holiday-2024-05-01"), may1.id)
        assertEquals("Staatsfeiertag", may1.project)
        assertEquals(510, may1.netDuration) // Mittwoch-Soll
    }

    @Test
    fun `zukuenftige Feiertage werden nicht synthetisiert`() {
        val result = buildEntriesWithHolidays(
            entries = emptyList(), userData = noWorkDays,
            viewYear = 2024, viewMonth1Based = 5,
            today = LocalDate.of(2024, 5, 15), locale = austriaLocale,
        )
        // Nur 01.05. und 09.05. liegen in der Vergangenheit
        assertEquals(listOf("2024-05-09", "2024-05-01"), result.map { it.date })
    }

    @Test
    fun `Feiertage am Wochenende (Soll 0) werden uebersprungen`() {
        // 26.10.2024 Nationalfeiertag ist ein Samstag → Soll 0
        val result = buildEntriesWithHolidays(
            entries = emptyList(), userData = noWorkDays,
            viewYear = 2024, viewMonth1Based = 10,
            today = LocalDate.of(2024, 10, 31), locale = austriaLocale,
        )
        assertTrue(result.none { it.date == "2024-10-26" })
    }

    @Test
    fun `Krank-Korrektur wird auf gemischte Tage angewandt`() {
        val entries = listOf(
            work("2024-01-02", 300, 1),
            Entry(EntryId.of(2L), EntryType.SICK, "2024-01-02", netDuration = 510),
        )
        val result = buildEntriesWithHolidays(
            entries, noWorkDays, 2024, 1, LocalDate.of(2024, 1, 2), austriaLocale,
        )
        val sick = result.first { it.type == EntryType.SICK }
        assertEquals(210, sick.netDuration) // 510 Soll - 300 gearbeitet
    }

    // ─── groupEntriesByWeek ──────────────────────────────────

    @Test
    fun `gruppiert nach ISO-KW absteigend, Eintraege absteigend nach Datum`() {
        val entries = listOf(
            work("2024-01-02", 510, 1), // KW 1
            work("2024-01-03", 510, 2), // KW 1
            work("2024-01-08", 510, 3), // KW 2
        )
        val grouped = groupEntriesByWeek(entries, null)
        assertEquals(listOf(2, 1), grouped.map { it.first })
        assertEquals(listOf("2024-01-08"), grouped[0].second.map { it.date })
        assertEquals(listOf("2024-01-03", "2024-01-02"), grouped[1].second.map { it.date })
    }

    @Test
    fun `ergaenzt Boundary-Wochen mit Nachbarmonats-Eintraegen`() {
        // KW 5/2024: Mo 29.01. – So 04.02. — Januar-Ansicht enthält 29.-31.01.
        val januaryView = listOf(work("2024-01-29", 510, 1), work("2024-01-30", 510, 2))
        val allEntries = januaryView + listOf(work("2024-02-01", 510, 3), work("2024-02-15", 510, 4))

        val grouped = groupEntriesByWeek(januaryView, allEntries)
        val week5 = grouped.first { it.first == 5 }
        // 01.02. gehört zu KW5 und wird ergänzt; 15.02. (KW7) nicht
        assertEquals(listOf("2024-02-01", "2024-01-30", "2024-01-29"), week5.second.map { it.date })
        assertNull(grouped.firstOrNull { it.first == 7 })
    }

    // ─── deriveAppData ───────────────────────────────────────

    @Test
    fun `deriveAppData liefert Stats, Progress und Projekte`() {
        val entries = listOf(
            work("2024-01-02", 510, 1, project = "Baustelle B"),
            work("2024-01-03", 510, 2, project = "Baustelle A"),
            work("2024-01-03", 60, 3, project = " Baustelle A "),
        )
        val data = deriveAppData(
            entries, noWorkDays, 2024, 1,
            today = LocalDate.of(2024, 1, 3), locale = austriaLocale,
        )
        assertEquals(entries.sumOf { it.netDuration } + data.entriesWithHolidays
            .filter { it.type == EntryType.PUBLIC_HOLIDAY }.sumOf { it.netDuration },
            data.stats.totalIst)
        assertEquals(listOf("Baustelle A", "Baustelle B"), data.uniqueProjects)
        // Letzter Work-Eintrag: höchster "date|id"-Schlüssel
        assertEquals(EntryId.of(3L), data.lastWorkEntry?.id)
        assertEquals(510, data.todayTarget) // Mittwoch
        assertTrue(data.progressPercent in 0.0..100.0)
    }

    @Test
    fun `getLocale-Fallback macht deriveAppData ohne Locale nutzbar`() {
        val data = deriveAppData(
            emptyList(), noWorkDays, 2024, 1,
            today = LocalDate.of(2024, 1, 15), locale = getLocale(null),
        )
        // Jänner 2024 AT: 01.01. (Mo) + 06.01. (Sa→übersprungen) → 1 Feiertag bis 15.01.
        assertEquals(1, data.entriesWithHolidays.size)
        assertEquals("2024-01-01", data.entriesWithHolidays[0].date)
    }

    @Test
    fun `project metadata uses all entries while stats stay in viewed month`() {
        val january = listOf(work("2024-01-02", 510, 1, project = "Altprojekt"))
        val february = listOf(work("2024-02-02", 510, 2, project = "Neu"))
        val data = deriveAppData(
            entries = february,
            userData = noWorkDays,
            viewYear = 2024,
            viewMonth1Based = 2,
            allEntries = january + february,
            today = LocalDate.of(2024, 2, 2),
            locale = austriaLocale,
        )

        assertEquals(listOf("Neu", "Altprojekt"), data.uniqueProjects)
        assertEquals(510, data.entriesWithHolidays.filter { it.type == EntryType.WORK }.sumOf { it.netDuration })
    }
}
