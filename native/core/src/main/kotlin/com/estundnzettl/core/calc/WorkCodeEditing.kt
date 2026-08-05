package com.estundnzettl.core.calc

import com.estundnzettl.core.model.WorkCode

enum class WorkCodeDraftError {
    INVALID_NUMBER,
    RESERVED_NUMBER,
    DUPLICATE_NUMBER,
    EMPTY_NAME,
}

data class WorkCodeDraftResult(
    val code: WorkCode? = null,
    val error: WorkCodeDraftError? = null,
) {
    val isSuccess: Boolean get() = code != null && error == null
}

fun isReservedWorkCode(id: Int): Boolean =
    id == WorkCodes.DRIVE || id == WorkCodes.ARRIVAL

/** User-facing number. ARRIVAL keeps its established business code 19. */
fun workCodeNumber(id: Int): String = when {
    id == WorkCodes.ARRIVAL -> WorkCodes.DRIVE.toString()
    id in 1..9 -> id.toString().padStart(2, '0')
    else -> id.toString()
}

/**
 * Returns only the descriptive part of a legacy/canonical label. A numeric
 * prefix is removed only when it represents this code's user-facing number.
 */
fun workCodeName(code: WorkCode): String {
    val trimmed = code.label.trim()
    val match = WORK_CODE_PREFIX.matchEntire(trimmed) ?: return trimmed
    val prefix = match.groupValues[1].trimStart('0').ifEmpty { "0" }
    val expected = workCodeNumber(code.id).trimStart('0').ifEmpty { "0" }
    return if (prefix == expected) match.groupValues[2].trim() else trimmed
}

fun canonicalWorkCodeLabel(id: Int, name: String): String {
    val cleanName = workCodeName(WorkCode(id, name)).trim()
    return "${workCodeNumber(id)} - $cleanName"
}

fun validateWorkCodeDraft(
    number: String,
    name: String,
    existingCodes: List<WorkCode>,
    editingId: Int? = null,
): WorkCodeDraftResult {
    val id = number.trim().toIntOrNull()
        ?: return WorkCodeDraftResult(error = WorkCodeDraftError.INVALID_NUMBER)
    if (id <= 0) return WorkCodeDraftResult(error = WorkCodeDraftError.INVALID_NUMBER)
    if (editingId == null && isReservedWorkCode(id)) {
        return WorkCodeDraftResult(error = WorkCodeDraftError.RESERVED_NUMBER)
    }
    if (existingCodes.any { it.id == id && it.id != editingId }) {
        return WorkCodeDraftResult(error = WorkCodeDraftError.DUPLICATE_NUMBER)
    }
    val cleanName = workCodeName(WorkCode(id, name)).trim()
    if (cleanName.isEmpty()) return WorkCodeDraftResult(error = WorkCodeDraftError.EMPTY_NAME)
    return WorkCodeDraftResult(code = WorkCode(id, canonicalWorkCodeLabel(id, cleanName)))
}

/** Smallest available positive ID, explicitly skipping app-reserved codes. */
fun nextAvailableWorkCodeId(existingCodes: List<WorkCode>): Int {
    val used = existingCodes.mapTo(hashSetOf()) { it.id }
    var candidate = 1
    while (candidate in used || isReservedWorkCode(candidate)) candidate++
    return candidate
}

fun selectableWorkCodes(codes: List<WorkCode>, query: String = ""): List<WorkCode> {
    val needle = query.trim()
    return codes.asSequence()
        .filterNot { isReservedWorkCode(it.id) }
        .filter {
            needle.isEmpty() || workCodeNumber(it.id).contains(needle, ignoreCase = true) ||
                workCodeName(it).contains(needle, ignoreCase = true)
        }
        .sortedBy { it.id }
        .toList()
}

fun shouldShowWorkCodeSearch(codes: List<WorkCode>): Boolean =
    codes.count { !isReservedWorkCode(it.id) } > 12

private val WORK_CODE_PREFIX = Regex("""^\s*(\d+)\s*[-–—:]\s*(.+?)\s*$""")
