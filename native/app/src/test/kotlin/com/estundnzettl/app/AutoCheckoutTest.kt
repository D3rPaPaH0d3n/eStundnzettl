package com.estundnzettl.app

import java.time.Instant
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

    @Test
    fun `paused auto checkout counts the open pause until the captured end`() {
        val pauseStart = Instant.parse("2026-07-16T10:00:00Z")
        val capturedEnd = Instant.parse("2026-07-16T21:59:00Z")
        assertEquals(11 * 60 + 59, timerPauseMinutes(0L, pauseStart, capturedEnd))
    }

    @Test
    fun `finished pause is kept when no pause is still open`() {
        assertEquals(30, timerPauseMinutes(30L * 60L * 1000L, null, Instant.parse("2026-07-16T21:59:00Z")))
    }
}
