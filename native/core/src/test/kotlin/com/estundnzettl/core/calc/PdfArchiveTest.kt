package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * Port der Erwartungen aus src/utils/__tests__/pdfArchive.test.ts —
 * gleiche Fälle, gleiche Ergebnisse (der Hash-Wert selbst ist
 * implementierungsspezifisch, geprüft werden Determinismus und
 * Änderungs-Sensitivität).
 */
class PdfArchiveTest {

    private fun entry(
        id: Long,
        date: String,
        start: String? = "08:00",
        end: String? = "16:00",
        type: EntryType = EntryType.WORK,
        net: Int = 480,
    ) = Entry(
        id = EntryId.of(id), type = type, date = date,
        start = start, end = end, pause = 0, netDuration = net,
    )

    private val userData = UserData(
        name = "Max Mustermann",
        workDays = listOf(0, 480, 480, 480, 480, 480, 0),
    )

    // ── filterEntriesForMonth ────────────────────────────────────────

    @Test
    fun `filter returns only entries of the month`() {
        val entries = listOf(
            entry(1, "2025-03-05"),
            entry(2, "2025-04-01"),
            entry(3, "2025-03-31"),
        )
        val out = filterEntriesForMonth(entries, 2025, 3)
        assertEquals(listOf("2025-03-05", "2025-03-31"), out.map { it.date })
    }

    @Test
    fun `filter sorts by date then start`() {
        val entries = listOf(
            entry(1, "2025-03-05", start = "14:00"),
            entry(2, "2025-03-05", start = "08:00"),
            entry(3, "2025-03-01", start = "09:00"),
        )
        val out = filterEntriesForMonth(entries, 2025, 3)
        assertEquals(listOf(3L, 2L, 1L), out.map { (it.id as EntryId.Numeric).value })
    }

    @Test
    fun `filter pads single-digit month`() {
        val entries = listOf(entry(1, "2025-01-15"), entry(2, "2025-11-15"))
        assertEquals(1, filterEntriesForMonth(entries, 2025, 1).size)
    }

    @Test
    fun `filter empty input`() {
        assertTrue(filterEntriesForMonth(emptyList(), 2025, 3).isEmpty())
    }

    // ── hashMonthContent ─────────────────────────────────────────────

    private val today = LocalDate.of(2025, 3, 20)

    @Test
    fun `hash is deterministic`() {
        val entries = listOf(entry(1, "2025-03-05"))
        val a = hashMonthContent(entries, userData, 2025, 3, currentDate = today)
        val b = hashMonthContent(entries, userData, 2025, 3, currentDate = today)
        assertEquals(a, b)
    }

    @Test
    fun `hash changes with entries`() {
        val a = hashMonthContent(listOf(entry(1, "2025-03-05")), userData, 2025, 3, currentDate = today)
        val b = hashMonthContent(listOf(entry(1, "2025-03-05", net = 300)), userData, 2025, 3, currentDate = today)
        assertNotEquals(a, b)
    }

    @Test
    fun `hash changes with month`() {
        val entries = listOf(entry(1, "2025-03-05"), entry(2, "2025-04-05"))
        val a = hashMonthContent(entries, userData, 2025, 3, currentDate = today)
        val b = hashMonthContent(entries, userData, 2025, 4, currentDate = today)
        assertNotEquals(a, b)
    }

    @Test
    fun `hash changes with user name`() {
        val entries = listOf(entry(1, "2025-03-05"))
        val a = hashMonthContent(entries, userData, 2025, 3, currentDate = today)
        val b = hashMonthContent(entries, userData.copy(name = "Erika"), 2025, 3, currentDate = today)
        assertNotEquals(a, b)
    }

    @Test
    fun `hash changes with profile monthly target work codes and language`() {
        val entries = listOf(entry(1, "2025-03-05"))
        val base = hashMonthContent(entries, userData, 2025, 3, currentDate = today)
        assertNotEquals(base, hashMonthContent(entries, userData.copy(company = "Neue Firma"), 2025, 3, currentDate = today))
        assertNotEquals(base, hashMonthContent(entries, userData.copy(simpleMode = true, monthlyTargetMinutes = 1800), 2025, 3, currentDate = today))
        assertNotEquals(base, hashMonthContent(entries, userData, 2025, 3, currentDate = today, workCodes = listOf(WorkCode(1, "Montage"))))
        assertNotEquals(base, hashMonthContent(entries, userData, 2025, 3, currentDate = today, language = "en"))
    }

    @Test
    fun `hash handles null userData`() {
        val h = hashMonthContent(listOf(entry(1, "2025-03-05")), null, 2025, 3, currentDate = today)
        assertTrue(h.isNotEmpty())
    }

    @Test
    fun `hash ignores entries outside the month`() {
        val base = listOf(entry(1, "2025-03-05"))
        val withOther = base + entry(2, "2025-06-05")
        val a = hashMonthContent(base, userData, 2025, 3, currentDate = today)
        val b = hashMonthContent(withOther, userData, 2025, 3, currentDate = today)
        assertEquals(a, b)
    }

    @Test
    fun `hash changes when a holiday becomes visible`() {
        // AT: 1. Mai ist Feiertag — currentDate vor/nach dem Feiertag
        val locale = getLocale("at")
        val entries = listOf(entry(1, "2025-05-02"))
        val before = hashMonthContent(entries, userData, 2025, 5, locale, null, LocalDate.of(2025, 4, 30))
        val after = hashMonthContent(entries, userData, 2025, 5, locale, null, LocalDate.of(2025, 5, 2))
        assertNotEquals(before, after)
    }

    // ── generateHolidayEntries ───────────────────────────────────────

    @Test
    fun `holiday entries only up to currentDate and only on workdays`() {
        val locale = getLocale("at")
        // Mai 2025: 01.05. (Do) Staatsfeiertag, 29.05. (Do) Christi Himmelfahrt
        val until = LocalDate.of(2025, 5, 15)
        val out = generateHolidayEntries(2025, 5, userData, locale, null, until)
        assertEquals(listOf("2025-05-01"), out.map { it.date })
        val h = out.first()
        assertEquals(EntryType.PUBLIC_HOLIDAY, h.type)
        assertEquals(EntryId.of("auto-holiday-2025-05-01"), h.id)
        assertEquals(480, h.netDuration) // Donnerstag-Soll
        assertTrue(!h.project.isNullOrEmpty())
    }

    @Test
    fun `no future holidays in current month`() {
        val locale = getLocale("at")
        val out = generateHolidayEntries(2025, 5, userData, locale, null, LocalDate.of(2025, 4, 30))
        assertTrue(out.isEmpty())
    }

    // ── buildArchiveFilename ─────────────────────────────────────────

    @Test
    fun `filename with year month and name`() {
        assertEquals(
            "Stundenzettel_2025-03_Max_Mustermann.pdf",
            buildArchiveFilename(2025, 3, userData),
        )
    }

    @Test
    fun `filename pads single-digit month`() {
        assertEquals(
            "Stundenzettel_2025-01_Max_Mustermann.pdf",
            buildArchiveFilename(2025, 1, userData),
        )
    }

    @Test
    fun `filename falls back for empty name`() {
        assertEquals(
            "Stundenzettel_2025-03_Stundenzettel.pdf",
            buildArchiveFilename(2025, 3, UserData(name = "")),
        )
    }

    @Test
    fun `filename strips special characters`() {
        assertEquals(
            "Stundenzettel_2025-03_Mller_sterreich.pdf",
            buildArchiveFilename(2025, 3, UserData(name = "Müller Österreich")),
        )
    }
}
