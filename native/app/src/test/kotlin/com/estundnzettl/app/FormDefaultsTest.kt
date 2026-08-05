package com.estundnzettl.app

import com.estundnzettl.core.calc.WorkCodes
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class FormDefaultsTest {
    @Test
    fun `date changes only resolve automatic ordinary work codes`() {
        assertTrue(shouldResolveAutomaticWorkCode(FormUiState(code = 7, codeIsAutomatic = true)))
        assertFalse(
            shouldResolveAutomaticWorkCode(
                FormUiState(entryType = "drive", code = WorkCodes.DRIVE, codeIsAutomatic = true),
            )
        )
        assertFalse(
            shouldResolveAutomaticWorkCode(
                FormUiState(entryType = "work", code = WorkCodes.ARRIVAL, codeIsAutomatic = true),
            )
        )
        assertFalse(shouldResolveAutomaticWorkCode(FormUiState(code = 7, codeIsAutomatic = false)))
    }
}
