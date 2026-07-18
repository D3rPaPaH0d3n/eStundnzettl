package com.estundnzettl.app

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class AutoCheckoutTest {

    @Test
    fun `timer from yesterday reports one missed day`() {
        assertEquals(
            1,
            autoCheckoutDays(
                startDate = LocalDate.of(2026, 7, 16),
                today = LocalDate.of(2026, 7, 17),
            ),
        )
    }

    @Test
    fun `older timer reports all missed days`() {
        assertEquals(
            3,
            autoCheckoutDays(
                startDate = LocalDate.of(2026, 7, 14),
                today = LocalDate.of(2026, 7, 17),
            ),
        )
    }

    @Test
    fun `invalid future date still produces safe singular warning`() {
        assertEquals(
            1,
            autoCheckoutDays(
                startDate = LocalDate.of(2026, 7, 18),
                today = LocalDate.of(2026, 7, 17),
            ),
        )
    }
}
