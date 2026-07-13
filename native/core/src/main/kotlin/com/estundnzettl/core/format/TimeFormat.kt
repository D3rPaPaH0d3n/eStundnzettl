package com.estundnzettl.core.format

import kotlin.math.abs
import kotlin.math.max

/** "8h 30m" — Port von formatTime aus src/utils.tsx. */
fun formatTime(minutes: Int): String {
    val absMin = max(0, minutes)
    val h = absMin / 60
    val m = absMin % 60
    return "${h}h ${m.toString().padStart(2, '0')}m"
}

/** "+1h 05m" / "-0h 30m" / "0h 00m" — Port von formatSignedTime. */
fun formatSignedTime(minutes: Int): String {
    val sign = if (minutes > 0) "+" else if (minutes < 0) "-" else ""
    val absMin = abs(minutes)
    val h = absMin / 60
    val m = absMin % 60
    return "$sign${h}h ${m.toString().padStart(2, '0')}m"
}
