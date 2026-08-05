package com.estundnzettl.core.calc

import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.WorkCode
import java.time.LocalDate
import java.util.Locale

private fun Entry.isOrdinaryWork(): Boolean =
    type == EntryType.WORK && code != WorkCodes.DRIVE && code != WorkCodes.ARRIVAL

private val latestEntryComparator = Comparator<Entry> { left, right ->
    compareValuesBy(left, right, { it.date }, { it.start.orEmpty() }, { it.end.orEmpty() })
        .takeIf { it != 0 }
        ?: compareEntryIds(left.id, right.id)
}

private fun compareEntryIds(left: EntryId, right: EntryId): Int = when {
    left is EntryId.Numeric && right is EntryId.Numeric -> left.value.compareTo(right.value)
    left is EntryId.Text && right is EntryId.Text -> left.value.compareTo(right.value)
    left is EntryId.Numeric -> 1
    else -> -1
}

/**
 * Global project history, newest use first. Route/note fields of drive and
 * arrival records are deliberately not treated as project names.
 */
fun recentProjects(entries: List<Entry>): List<String> {
    val seen = HashSet<String>()
    return entries
        .asSequence()
        .filter { it.isOrdinaryWork() && !it.project.isNullOrBlank() }
        .sortedWith(latestEntryComparator.reversed())
        .map { it.project!!.trim() }
        .filter { it.isNotEmpty() }
        .filter { seen.add(it.lowercase(Locale.ROOT)) }
        .toList()
}

/** Latest configured, ordinary work entry on or before [targetDate]. */
fun latestEligibleWorkEntry(
    entries: List<Entry>,
    targetDate: LocalDate,
    configuredCodes: List<WorkCode>,
): Entry? {
    val selectableIds = configuredCodes.asSequence()
        .map { it.id }
        .filter { it > 0 && it != WorkCodes.DRIVE && it != WorkCodes.ARRIVAL }
        .toHashSet()
    if (selectableIds.isEmpty()) return null

    return entries.asSequence()
        .filter { entry ->
            val date = runCatching { LocalDate.parse(entry.date) }.getOrNull()
            val code = entry.code
            entry.isOrdinaryWork() && code != null && code in selectableIds &&
                date != null && !date.isAfter(targetDate)
        }
        .maxWithOrNull(latestEntryComparator)
}

/**
 * Date-aware activity default. Historical entries take precedence over the
 * persisted fallback, but entries after [targetDate] can never influence it.
 */
fun resolveDefaultWorkCode(
    entries: List<Entry>,
    targetDate: LocalDate,
    configuredCodes: List<WorkCode>,
    persistedLastCode: Int?,
): Int {
    val selectable = configuredCodes.filter {
        it.id > 0 && it.id != WorkCodes.DRIVE && it.id != WorkCodes.ARRIVAL
    }
    val selectableIds = selectable.mapTo(HashSet()) { it.id }

    return latestEligibleWorkEntry(entries, targetDate, selectable)?.code
        ?: persistedLastCode?.takeIf { it in selectableIds }
        ?: selectable.firstOrNull()?.id
        ?: WorkCodes.DEFAULT
}
