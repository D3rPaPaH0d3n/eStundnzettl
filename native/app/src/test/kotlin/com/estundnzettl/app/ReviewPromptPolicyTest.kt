package com.estundnzettl.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReviewPromptPolicyTest {
    private val day = 24L * 60 * 60 * 1000
    private val now = 1_000L * day

    private fun eligibleSnapshot(
        entryCount: Int = 5,
        reportExportedAt: Long? = now - day,
        firstEligibleAt: Long? = now - 6 * day,
        lastRequestedAt: Long? = null,
        requestCount: Int = 0,
    ) = ReviewPromptSnapshot(
        hasProfile = true,
        entryCount = entryCount,
        reportExportedAt = reportExportedAt,
        firstEligibleAt = firstEligibleAt,
        lastRequestedAt = lastRequestedAt,
        requestCount = requestCount,
    )

    @Test
    fun `requests after enough use and a PDF export`() {
        assertTrue(ReviewPromptPolicy.shouldRequest(now, eligibleSnapshot()))
    }

    @Test
    fun `does not request without a PDF export or enough entries`() {
        assertFalse(ReviewPromptPolicy.shouldRequest(now, eligibleSnapshot(reportExportedAt = null)))
        assertFalse(ReviewPromptPolicy.shouldRequest(now, eligibleSnapshot(entryCount = 4)))
    }

    @Test
    fun `waits five days after first eligibility`() {
        assertFalse(
            ReviewPromptPolicy.shouldRequest(
                now,
                eligibleSnapshot(firstEligibleAt = now - 4 * day),
            ),
        )
    }

    @Test
    fun `uses a long cooldown and caps lifetime requests`() {
        assertFalse(
            ReviewPromptPolicy.shouldRequest(
                now,
                eligibleSnapshot(lastRequestedAt = now - 179 * day, requestCount = 1),
            ),
        )
        assertTrue(
            ReviewPromptPolicy.shouldRequest(
                now,
                eligibleSnapshot(lastRequestedAt = now - 181 * day, requestCount = 1),
            ),
        )
        assertFalse(ReviewPromptPolicy.shouldRequest(now, eligibleSnapshot(requestCount = 2)))
    }
}
