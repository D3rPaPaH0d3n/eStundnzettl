package com.estundnzettl.core.calc

import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.WorkCode
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class EntryDefaultsTest {
    private val codes = listOf(WorkCode(1, "Montage"), WorkCode(7, "Service"))

    private fun entry(
        id: Long,
        date: String,
        code: Int? = 1,
        project: String? = null,
        start: String? = "08:00",
        type: EntryType = EntryType.WORK,
    ) = Entry(
        id = EntryId.of(id), type = type, date = date, start = start, end = "16:00",
        project = project, code = code,
    )

    @Test
    fun `projects are global mru trimmed and case insensitive unique`() {
        val result = recentProjects(
            listOf(
                entry(1, "2026-06-01", project = " Altbau "),
                entry(2, "2026-07-01", project = "altbau"),
                entry(3, "2026-07-02", project = "Neubau"),
                entry(4, "2026-07-03", code = WorkCodes.DRIVE, project = "120 km"),
                entry(5, "2026-07-04", code = WorkCodes.ARRIVAL, project = "Hotel"),
                entry(6, "2026-07-05", project = "  "),
                entry(7, "2026-07-06", project = "Urlaub", type = EntryType.VACATION),
            )
        )

        assertEquals(listOf("Neubau", "altbau"), result)
    }

    @Test
    fun `resolver picks latest eligible same day deterministically`() {
        val result = resolveDefaultWorkCode(
            entries = listOf(
                entry(9, "2026-08-05", code = 1, start = "08:00"),
                entry(10, "2026-08-05", code = 7, start = "08:00"),
                entry(11, "2026-08-06", code = 1),
            ),
            targetDate = LocalDate.parse("2026-08-05"),
            configuredCodes = codes,
            persistedLastCode = 1,
        )

        assertEquals(7, result)
    }

    @Test
    fun `resolver crosses weekend and month but never reads future`() {
        val result = resolveDefaultWorkCode(
            entries = listOf(
                entry(1, "2026-07-31", code = 7),
                entry(2, "2026-08-03", code = 1),
            ),
            targetDate = LocalDate.parse("2026-08-02"),
            configuredCodes = codes,
            persistedLastCode = 1,
        )

        assertEquals(7, result)
    }

    @Test
    fun `resolver skips special unknown zero and malformed entries`() {
        val result = resolveDefaultWorkCode(
            entries = listOf(
                entry(1, "2026-08-01", code = 99),
                entry(2, "2026-08-02", code = 0),
                entry(3, "2026-08-03", code = WorkCodes.DRIVE),
                entry(4, "broken", code = 7),
            ),
            targetDate = LocalDate.parse("2026-08-05"),
            configuredCodes = codes,
            persistedLastCode = 7,
        )

        assertEquals(7, result)
    }

    @Test
    fun `resolver validates persisted code and applies final fallbacks`() {
        assertEquals(1, resolveDefaultWorkCode(emptyList(), LocalDate.now(), codes, 99))
        assertEquals(7, resolveDefaultWorkCode(emptyList(), LocalDate.now(), codes, 7))
        assertEquals(WorkCodes.DEFAULT, resolveDefaultWorkCode(emptyList(), LocalDate.now(), emptyList(), 7))
        assertNull(latestEligibleWorkEntry(emptyList(), LocalDate.now(), codes))
    }
}
