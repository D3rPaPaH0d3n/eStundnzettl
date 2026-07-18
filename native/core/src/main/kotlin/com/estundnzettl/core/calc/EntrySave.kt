package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import kotlin.math.max

/**
 * Speicher-Logik des Eintragsformulars — Port von handleSaveEntry aus
 * src/hooks/actions/useEntryActions.ts. Validierung (Start==Ende,
 * Überlappung), netDuration-Ermittlung, storedType-Ableitung und der
 * gemischte Krank-Tag sind hier zentralisiert und UI-frei testbar.
 */

data class EntryFormInput(
    /** Formular-Typ inkl. Pseudo-Typ "drive". */
    val entryType: String,
    val formDate: String,
    val startTime: String,
    val endTime: String,
    val pauseDuration: Int,
    val project: String,
    val code: Int,
    val specialManualMode: Boolean = false,
    val editingEntry: Entry? = null,
)

sealed class SaveEntryResult {
    /** Validierung ok — `entry` speichern, ggf. `lastCodeToSave` persistieren. */
    data class Success(val entry: Entry, val lastCodeToSave: Int?) : SaveEntryResult()

    /** Start- und Endzeit identisch. */
    object StartEqualsEnd : SaveEntryResult()

    /** Zeitraum überlappt mit bestehendem Eintrag am selben Tag. */
    object Overlap : SaveEntryResult()
}

fun prepareEntryToSave(
    form: EntryFormInput,
    entries: List<Entry>,
    userData: UserData?,
    workCodes: List<WorkCode>,
    newEntryId: Long,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): SaveEntryResult {
    val isDrive = form.entryType == "drive"
    val isSpecial = form.entryType == "vacation" || form.entryType == "sick" ||
        form.entryType == "time_comp"
    val isManualSpecial = isSpecial && (form.specialManualMode || userData?.simpleMode == true)
    val hasTimeInputs = form.entryType == "work" || isDrive || isManualSpecial

    var net: Int

    if (hasTimeInputs) {
        if (parseTime(form.startTime) == parseTime(form.endTime)) {
            return SaveEntryResult.StartEqualsEnd
        }
        val (s, en) = toAbsoluteRange(form.startTime, form.endTime)

        val hasOverlap = entries.any { existing ->
            if (existing.date != form.formDate) return@any false
            if (form.editingEntry != null && existing.id == form.editingEntry.id) return@any false
            val exStart = existing.start ?: return@any false
            val exEnd = existing.end ?: return@any false
            val (exS, exE) = toAbsoluteRange(exStart, exEnd)
            s < exE && exS < en
        }
        if (hasOverlap) return SaveEntryResult.Overlap

        net = calculateEntryNetDuration(
            entryType = form.entryType,
            startTime = form.startTime,
            endTime = form.endTime,
            pauseDuration = form.pauseDuration,
            formDate = form.formDate,
            userData = userData,
            code = form.code,
            specialManualMode = isManualSpecial,
            locale = locale,
            config = config,
        )
    } else {
        net = calculateEntryNetDuration(
            entryType = form.entryType,
            startTime = form.startTime,
            endTime = form.endTime,
            pauseDuration = form.pauseDuration,
            formDate = form.formDate,
            userData = userData,
            code = form.code,
            locale = locale,
            config = config,
        )
    }
    if (net < 0) net = 0

    // Labels bewusst wie in der TS-App (dort ebenfalls nicht lokalisiert).
    val label = when {
        isManualSpecial || !hasTimeInputs -> when (form.entryType) {
            "vacation" -> "Urlaub"
            "sick" -> "Krank"
            else -> "Zeitausgleich"
        }
        else -> {
            val usedCode = if (isDrive) WorkCodes.DRIVE else form.code
            workCodes.firstOrNull { it.id == usedCode }?.label
                ?: if (isDrive) "Fahrzeit" else "Arbeit"
        }
    }

    // Gemischter Krank-Tag: netDuration nur bis Rest-Sollzeit
    if (form.entryType == "sick" && !isManualSpecial) {
        val existingWork = entries
            .filter { ex ->
                ex.date == form.formDate && ex.type == EntryType.WORK &&
                    ex.code != WorkCodes.DRIVE &&
                    (form.editingEntry == null || ex.id != form.editingEntry.id)
            }
            .sumOf { it.netDuration }

        if (existingWork > 0) {
            val dayTarget = getTargetMinutesForDate(form.formDate, userData?.workDays, locale, config)
            net = max(0, dayTarget - existingWork)
        }
    }

    val storedType = if (isDrive) EntryType.WORK else EntryType.fromWire(form.entryType)
    val usedCode = if (isDrive) WorkCodes.DRIVE else form.code
    val usedPause = if (storedType == EntryType.WORK) (if (isDrive) 0 else form.pauseDuration) else 0
    // Im Manual-Modus für Krank/Urlaub/ZA persistieren wir Start/Ende,
    // damit der Edit-Pfad sie wieder erkennen kann.
    val persistTimes = storedType == EntryType.WORK || isManualSpecial

    val entry = Entry(
        id = form.editingEntry?.id ?: EntryId.of(newEntryId),
        type = storedType,
        date = form.formDate,
        start = if (persistTimes) form.startTime else null,
        end = if (persistTimes) form.endTime else null,
        pause = usedPause,
        project = if (storedType == EntryType.WORK) form.project else label,
        code = if (storedType == EntryType.WORK) usedCode else null,
        netDuration = net,
    )

    val lastCodeToSave = if (
        storedType == EntryType.WORK && usedCode != 0 &&
        usedCode != WorkCodes.DRIVE && usedCode != WorkCodes.ARRIVAL
    ) usedCode else null

    return SaveEntryResult.Success(entry, lastCodeToSave)
}

/**
 * Default-Zeiten für ein Datum: Ende des letzten Work-Eintrags des Tages
 * (Start == Ende, nahtloses Anschließen) oder 06:00–16:30.
 * Port von getDefaultTimesForDate.
 */
fun getDefaultTimesForDate(entries: List<Entry>, date: String): Pair<String, String> {
    val lastEnd = entries
        .filter { it.date == date && it.type == EntryType.WORK && !it.end.isNullOrEmpty() }
        .sortedBy { it.end }
        .lastOrNull()?.end

    return if (lastEnd != null) lastEnd to lastEnd else "06:00" to "16:30"
}
