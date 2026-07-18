package com.estundnzettl.core.calc

import com.estundnzettl.core.model.UserData
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class MonthlyTargetTest {
    @Test fun `invalid persisted targets are rejected`() {
        listOf(null, 0, -1, MAX_MONTHLY_TARGET_MINUTES + 1).forEach {
            assertNull(normalizeMonthlyTargetMinutes(it))
        }
    }

    @Test fun `target is active only in simple mode`() {
        assertNull(getValidMonthlyTargetMinutes(UserData(simpleMode = false, monthlyTargetMinutes = 1800)))
        assertEquals(1800, getValidMonthlyTargetMinutes(UserData(simpleMode = true, monthlyTargetMinutes = 1800)))
    }

    @Test fun `open reached and exceeded progress is derived`() {
        val user = UserData(simpleMode = true, monthlyTargetMinutes = 1800)
        assertEquals(450, calculateMonthlyTargetProgress(1350, user)?.remainingMinutes)
        assertEquals(0, calculateMonthlyTargetProgress(1800, user)?.remainingMinutes)
        assertEquals(135, calculateMonthlyTargetProgress(1935, user)?.exceededMinutes)
        assertEquals(100f, calculateMonthlyTargetProgress(1935, user)?.progressPercent)
    }

    @Test fun `input parses and formats HH MM`() {
        assertEquals(1815, parseMonthlyTargetInput("30:15"))
        assertEquals("30:15", formatMonthlyTargetInput(1815))
        assertNull(parseMonthlyTargetInput("30:75"))
        assertNull(parseMonthlyTargetInput("0:00"))
        assertNull(parseMonthlyTargetInput("744:01"))
    }
}
