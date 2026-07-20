package com.estundnzettl.app

internal data class ReviewPromptSnapshot(
    val hasProfile: Boolean,
    val entryCount: Int,
    val reportExportedAt: Long?,
    val firstEligibleAt: Long?,
    val lastRequestedAt: Long?,
    val requestCount: Int,
)

/** Conservative eligibility rules for Google Play's native review flow. */
internal object ReviewPromptPolicy {
    const val MIN_ENTRY_COUNT = 5
    const val MAX_REQUEST_COUNT = 2
    const val MIN_ELIGIBLE_AGE_MS = 5L * 24 * 60 * 60 * 1000
    const val REQUEST_COOLDOWN_MS = 180L * 24 * 60 * 60 * 1000

    fun shouldRequest(now: Long, snapshot: ReviewPromptSnapshot): Boolean {
        if (!snapshot.hasProfile) return false
        if (snapshot.entryCount < MIN_ENTRY_COUNT) return false
        if (snapshot.reportExportedAt == null) return false
        if (snapshot.requestCount >= MAX_REQUEST_COUNT) return false

        val firstEligibleAt = snapshot.firstEligibleAt ?: return false
        if (now - firstEligibleAt < MIN_ELIGIBLE_AGE_MS) return false

        val lastRequestedAt = snapshot.lastRequestedAt
        return lastRequestedAt == null || now - lastRequestedAt >= REQUEST_COOLDOWN_MS
    }
}
