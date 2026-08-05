package com.estundnzettl.core.calc

import com.estundnzettl.core.model.WorkCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class WorkCodeEditingTest {
    @Test
    fun `next ID fills the first gap and ignores high internal codes`() {
        val codes = (1..25).map { WorkCode(it, "Code $it") } +
            WorkCode(70, "70 - Büro") + WorkCode(190, "19 - An-Abreise")

        assertEquals(26, nextAvailableWorkCodeId(codes))
    }

    @Test
    fun `next ID skips reserved codes`() {
        val codes = (1..18).map { WorkCode(it, "Code $it") }

        assertEquals(20, nextAvailableWorkCodeId(codes))
    }

    @Test
    fun `draft validates number name duplicates and reserved IDs`() {
        val existing = listOf(WorkCode(7, "07 - Service"))

        assertEquals(WorkCodeDraftError.INVALID_NUMBER, validateWorkCodeDraft("x", "Neu", existing).error)
        assertEquals(WorkCodeDraftError.INVALID_NUMBER, validateWorkCodeDraft("0", "Neu", existing).error)
        assertEquals(WorkCodeDraftError.EMPTY_NAME, validateWorkCodeDraft("8", " ", existing).error)
        assertEquals(WorkCodeDraftError.DUPLICATE_NUMBER, validateWorkCodeDraft("7", "Neu", existing).error)
        assertEquals(WorkCodeDraftError.RESERVED_NUMBER, validateWorkCodeDraft("19", "Neu", existing).error)
        assertEquals(WorkCodeDraftError.RESERVED_NUMBER, validateWorkCodeDraft("190", "Neu", existing).error)
    }

    @Test
    fun `valid draft is stored in canonical compatible format`() {
        val result = validateWorkCodeDraft("7", "Service", emptyList())

        assertTrue(result.isSuccess)
        assertEquals(WorkCode(7, "07 - Service"), result.code)
    }

    @Test
    fun `legacy prefix is not duplicated and name can be edited without changing ID`() {
        val existing = listOf(WorkCode(7, "07 - Service"))
        val result = validateWorkCodeDraft("7", "07 - Wartung", existing, editingId = 7)

        assertEquals(WorkCode(7, "07 - Wartung"), result.code)
        assertEquals("Wartung", workCodeName(result.code!!))
    }

    @Test
    fun `arrival keeps established user-facing number`() {
        val arrival = WorkCode(WorkCodes.ARRIVAL, "19 - An/Abreise")

        assertEquals("19", workCodeNumber(arrival.id))
        assertEquals("An/Abreise", workCodeName(arrival))
        assertEquals("19 - An/Abreise", canonicalWorkCodeLabel(arrival.id, "An/Abreise"))
        assertFalse(isReservedWorkCode(70))
    }

    @Test
    fun `selection is sorted searchable and excludes reserved codes`() {
        val codes = listOf(
            WorkCode(70, "70 - Büro"),
            WorkCode(WorkCodes.ARRIVAL, "19 - An/Abreise"),
            WorkCode(7, "07 - Service"),
            WorkCode(WorkCodes.DRIVE, "19 - Fahrzeit"),
        )

        assertEquals(listOf(7, 70), selectableWorkCodes(codes).map { it.id })
        assertEquals(listOf(70), selectableWorkCodes(codes, "büRO").map { it.id })
        assertEquals(listOf(7), selectableWorkCodes(codes, "07").map { it.id })
    }

    @Test
    fun `search appears only above twelve selectable codes`() {
        assertFalse(shouldShowWorkCodeSearch((1..12).map { WorkCode(it, "Code") }))
        assertTrue(shouldShowWorkCodeSearch((1..13).map { WorkCode(it, "Code") }))
    }
}
