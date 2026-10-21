package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.EntryRow
import com.estundnzettl.core.model.EntryType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MappersTest {

    @Test
    fun `overnight flag survives the database round trip`() {
        val row = EntryRow(id = 1, type = "work", date = "2026-10-20", netDuration = 630, overnight = true)
        val entry = row.toDomain()
        assertTrue(entry.overnight)
        assertEquals(row, entry.toRow())
    }

    @Test
    fun `rows without the flag stay without it`() {
        assertFalse(EntryRow(id = 2, date = "2026-10-21").toDomain().overnight)
    }

    @Test
    fun `day off keeps its type through the database`() {
        val entry = EntryRow(id = 3, type = "day_off", date = "2026-10-16").toDomain()
        assertEquals(EntryType.DAY_OFF, entry.type)
        assertEquals("day_off", entry.toRow().type)
    }
}
