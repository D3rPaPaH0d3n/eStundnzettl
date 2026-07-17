package com.estundnzettl.core.calc

import com.estundnzettl.core.model.UserData

const val MAX_MONTHLY_TARGET_MINUTES: Int = 31 * 24 * 60

fun normalizeMonthlyTargetMinutes(value: Int?): Int? =
    value?.takeIf { it in 1..MAX_MONTHLY_TARGET_MINUTES }

fun parseMonthlyTargetInput(value: String): Int? {
    val match = Regex("^(\\d{1,3}):([0-5]\\d)$").matchEntire(value.trim()) ?: return null
    return normalizeMonthlyTargetMinutes(match.groupValues[1].toInt() * 60 + match.groupValues[2].toInt())
}

fun formatMonthlyTargetInput(minutes: Int?): String {
    val value = normalizeMonthlyTargetMinutes(minutes) ?: return ""
    return "${value / 60}:${(value % 60).toString().padStart(2, '0')}"
}

data class MonthlyTargetProgress(
    val targetMinutes: Int,
    val actualMinutes: Int,
    val differenceMinutes: Int,
    val remainingMinutes: Int,
    val exceededMinutes: Int,
    val progressPercent: Float,
)

fun getValidMonthlyTargetMinutes(userData: UserData?): Int? =
    if (userData?.simpleMode == true) normalizeMonthlyTargetMinutes(userData.monthlyTargetMinutes) else null

fun calculateMonthlyTargetProgress(actualMinutes: Int, userData: UserData?): MonthlyTargetProgress? {
    val target = getValidMonthlyTargetMinutes(userData) ?: return null
    val actual = actualMinutes.coerceAtLeast(0)
    val difference = actual - target
    return MonthlyTargetProgress(
        targetMinutes = target,
        actualMinutes = actual,
        differenceMinutes = difference,
        remainingMinutes = (-difference).coerceAtLeast(0),
        exceededMinutes = difference.coerceAtLeast(0),
        progressPercent = ((actual.toFloat() / target) * 100f).coerceIn(0f, 100f),
    )
}
