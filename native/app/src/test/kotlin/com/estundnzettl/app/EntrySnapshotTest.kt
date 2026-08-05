package com.estundnzettl.app

import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import kotlin.test.Test
import kotlin.test.assertEquals

class EntrySnapshotTest {
    @Test
    fun `new save is visible immediately before room flow emits`() {
        val old = Entry(EntryId.of(1L), date = "2026-08-04", code = 1)
        val saved = Entry(EntryId.of(2L), date = "2026-08-05", code = 7)

        assertEquals(listOf(saved, old), withUpsertedEntry(listOf(old), saved))
    }

    @Test
    fun `edited save replaces stale snapshot without duplication`() {
        val stale = Entry(EntryId.of(1L), date = "2026-08-04", code = 1)
        val other = Entry(EntryId.of(2L), date = "2026-08-03", code = 1)
        val saved = stale.copy(code = 7)

        assertEquals(listOf(saved, other), withUpsertedEntry(listOf(stale, other), saved))
    }
}
