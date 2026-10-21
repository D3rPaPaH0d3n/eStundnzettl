package com.estundnzettl.core.calc

import com.estundnzettl.core.backup.analyzeBackupData
import com.estundnzettl.core.backup.toBackupJson
import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.OvertimeAccountConfig
import com.estundnzettl.core.model.UserData
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

/** Eintragsart "Frei": 0 Stunden, kein Zeitausgleich, nur nicht vergessen. */
class DayOffTest {

    /** Mo–Do 8:30, Fr 4:30. */
    private val workDays = listOf(0, 510, 510, 510, 510, 270, 0)
    private val user = UserData(workDays = workDays)
    private val config = getDefaultCalculationConfig(austriaLocale, workDays)
        .copy(overtimeAccount = OvertimeAccountConfig(true, "2026-10", 0))

    private var nextId = 1L

    private fun work(date: String, net: Int) = Entry(
        id = EntryId.of(nextId++), type = EntryType.WORK, date = date,
        start = "07:00", end = "17:00", pause = 30, code = WorkCodes.OFFICE, netDuration = net,
    )

    private fun dayOff(date: String) = Entry(
        id = EntryId.of(nextId++), type = EntryType.DAY_OFF, date = date, project = "Frei",
    )

    @Test
    fun `Formular speichert Frei mit 0 Minuten und ohne Zeiten`() {
        val result = prepareEntryToSave(
            EntryFormInput(
                entryType = "day_off", formDate = "2026-10-16", startTime = "06:00", endTime = "16:30",
                pauseDuration = 30, project = "", code = WorkCodes.OFFICE,
            ),
            entries = emptyList(), userData = user, workCodes = emptyList(), newEntryId = 7,
            locale = austriaLocale, config = config,
        )
        val entry = assertIs<SaveEntryResult.Success>(result).entry
        assertEquals(EntryType.DAY_OFF, entry.type)
        assertEquals(0, entry.netDuration)
        assertEquals("Frei", entry.project)
        assertEquals(null, entry.start)
        assertEquals(null, entry.code)
        assertEquals(0, entry.pause)
    }

    @Test
    fun `Neuberechnung setzt Frei nie aufs Tagessoll`() {
        assertEquals(0, computeExpectedNetDuration(dayOff("2026-10-16"), user, austriaLocale, config))
    }

    @Test
    fun `Frei zaehlt 0 Stunden, ist aber kein vergessener Tag`() {
        // KW 42 mit nur 36h: ohne Eintrag wäre der Freitag "vergessen"
        val entries = (12..15).map { work("2026-10-%02d".format(it), 540) } + dayOff("2026-10-16")
        val data = deriveAppData(entries, user, 2026, 10, entries, LocalDate.of(2026, 10, 19), austriaLocale, config)

        assertTrue(data.missingWorkDays.none { it.date == LocalDate.of(2026, 10, 16) })
        assertEquals(0, data.overtimeAccount!!.timeCompMinutes)
        val week = calculatePeriodStats(
            data.entriesWithHolidays, user, LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 18),
            null, austriaLocale, config,
        )
        assertEquals(2160, week.totalIst)
        assertEquals(2160 - 2310, week.totalSaldo)
    }

    @Test
    fun `Frei uebersteht das Backup`() {
        val payload = buildJsonObject {
            putJsonArray("entries") { add(dayOff("2026-10-16").toBackupJson()) }
        }
        val restored = analyzeBackupData(payload).entries.single()
        assertEquals(EntryType.DAY_OFF, restored.type)
        assertEquals(0, restored.netDuration)
    }
}
