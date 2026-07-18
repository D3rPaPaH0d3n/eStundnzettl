package com.estundnzettl.core.calc

import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

/**
 * Port der handleSaveEntry-Semantik aus useEntryActions.ts als UI-freie Tests.
 */
class EntrySaveTest {

    private val noWorkDays = UserData(workDays = null)
    private val codes = listOf(WorkCode(1, "01 - Arbeit"), WorkCode(19, "19 - Fahrzeit"))

    private fun form(
        entryType: String = "work",
        start: String = "08:00",
        end: String = "17:00",
        pause: Int = 30,
        date: String = "2024-01-02",
        project: String = "Projekt X",
        code: Int = 1,
        manual: Boolean = false,
        editing: Entry? = null,
    ) = EntryFormInput(entryType, date, start, end, pause, project, code, manual, editing)

    @Test
    fun `speichert Work-Eintrag mit Pause-Abzug und lastCode`() {
        val result = prepareEntryToSave(form(), emptyList(), noWorkDays, codes, newEntryId = 42)
        val success = assertIs<SaveEntryResult.Success>(result)
        assertEquals(EntryId.of(42L), success.entry.id)
        assertEquals(EntryType.WORK, success.entry.type)
        assertEquals(8 * 60 + 30, success.entry.netDuration)
        assertEquals(30, success.entry.pause)
        assertEquals("Projekt X", success.entry.project)
        assertEquals(1, success.entry.code)
        assertEquals(1, success.lastCodeToSave)
    }

    @Test
    fun `Start gleich Ende wird abgelehnt`() {
        val result = prepareEntryToSave(
            form(start = "08:00", end = "08:00"), emptyList(), noWorkDays, codes, 1,
        )
        assertIs<SaveEntryResult.StartEqualsEnd>(result)
    }

    @Test
    fun `Ueberlappung mit bestehendem Eintrag wird abgelehnt`() {
        val existing = Entry(
            EntryId.of(1L), EntryType.WORK, "2024-01-02",
            start = "07:00", end = "12:00", netDuration = 300,
        )
        val result = prepareEntryToSave(
            form(start = "11:00", end = "15:00"), listOf(existing), noWorkDays, codes, 2,
        )
        assertIs<SaveEntryResult.Overlap>(result)
    }

    @Test
    fun `beim Editieren zaehlt der eigene Eintrag nicht als Ueberlappung`() {
        val existing = Entry(
            EntryId.of(1L), EntryType.WORK, "2024-01-02",
            start = "07:00", end = "12:00", netDuration = 300,
        )
        val result = prepareEntryToSave(
            form(start = "07:00", end = "13:00", editing = existing),
            listOf(existing), noWorkDays, codes, 2,
        )
        val success = assertIs<SaveEntryResult.Success>(result)
        assertEquals(EntryId.of(1L), success.entry.id) // ID bleibt erhalten
    }

    @Test
    fun `Drive wird als work mit Code 19 ohne Pause gespeichert, kein lastCode`() {
        val result = prepareEntryToSave(
            form(entryType = "drive", start = "08:00", end = "10:00", pause = 45, code = 19),
            emptyList(), noWorkDays, codes, 5,
        )
        val success = assertIs<SaveEntryResult.Success>(result)
        assertEquals(EntryType.WORK, success.entry.type)
        assertEquals(19, success.entry.code)
        assertEquals(0, success.entry.pause)
        assertEquals(120, success.entry.netDuration) // Pause ignoriert
        assertNull(success.lastCodeToSave)
    }

    @Test
    fun `Urlaub im Auto-Modus nutzt Tagessoll und deutsches Label`() {
        val result = prepareEntryToSave(
            form(entryType = "vacation", date = "2024-01-01"), // Montag → 510
            emptyList(), noWorkDays, codes, 7,
        )
        val success = assertIs<SaveEntryResult.Success>(result)
        assertEquals(EntryType.VACATION, success.entry.type)
        assertEquals(510, success.entry.netDuration)
        assertEquals("Urlaub", success.entry.project)
        assertNull(success.entry.start)
        assertNull(success.entry.code)
    }

    @Test
    fun `Krank im Manual-Modus persistiert Start und Ende`() {
        val result = prepareEntryToSave(
            form(entryType = "sick", start = "08:00", end = "12:00", manual = true),
            emptyList(), noWorkDays, codes, 8,
        )
        val success = assertIs<SaveEntryResult.Success>(result)
        assertEquals(EntryType.SICK, success.entry.type)
        assertEquals(240, success.entry.netDuration)
        assertEquals("08:00", success.entry.start)
        assertEquals("12:00", success.entry.end)
        assertEquals("Krank", success.entry.project)
    }

    @Test
    fun `simpleMode erzwingt Manual-Modus fuer Sondertypen`() {
        val simpleUser = UserData(workDays = null, simpleMode = true)
        val result = prepareEntryToSave(
            form(entryType = "sick", start = "08:00", end = "12:00", manual = false),
            emptyList(), simpleUser, codes, 9,
        )
        val success = assertIs<SaveEntryResult.Success>(result)
        assertEquals(240, success.entry.netDuration) // aus Start/Ende, nicht Soll
    }

    @Test
    fun `gemischter Krank-Tag kappt netDuration auf Rest-Soll`() {
        val existingWork = Entry(
            EntryId.of(1L), EntryType.WORK, "2024-01-02",
            start = "06:00", end = "11:00", pause = 0,
            code = WorkCodes.OFFICE, netDuration = 300,
        )
        val result = prepareEntryToSave(
            form(entryType = "sick", date = "2024-01-02", start = "", end = ""),
            listOf(existingWork), noWorkDays, codes, 10,
        )
        val success = assertIs<SaveEntryResult.Success>(result)
        assertEquals(210, success.entry.netDuration) // 510 - 300
    }

    // ─── getDefaultTimesForDate ──────────────────────────────

    @Test
    fun `Default-Zeiten schliessen an letzten Eintrag des Tages an`() {
        val entries = listOf(
            Entry(EntryId.of(1L), EntryType.WORK, "2024-01-02", "06:00", "10:00", netDuration = 240),
            Entry(EntryId.of(2L), EntryType.WORK, "2024-01-02", "10:00", "14:30", netDuration = 270),
        )
        assertEquals("14:30" to "14:30", getDefaultTimesForDate(entries, "2024-01-02"))
        assertEquals("06:00" to "16:30", getDefaultTimesForDate(entries, "2024-01-03"))
    }
}
