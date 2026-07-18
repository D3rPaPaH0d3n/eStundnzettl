package com.estundnzettl.core.calc

import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WORK_MODELS
import com.estundnzettl.core.model.WorkCode
import java.time.DayOfWeek
import java.time.LocalDate
import kotlin.random.Random

/**
 * Demo-/Testdaten — Port von src/utils/demoData.ts.
 * Erzeugt realistische Beispieleinträge für 3 Monate mit "Thomas Berger".
 */

val DEMO_USER = UserData(
    name = "Thomas Berger",
    position = "Monteur",
    company = "Musterbetrieb",
    workDays = WORK_MODELS[0].days, // 38,5h Standard: Mo–Do 8,5h / Fr 4,5h
    workModelId = "38.5-classic",
    photo = null,
)

val DEMO_WORK_CODES = listOf(
    WorkCode(1, "01 - Arbeit"),
    WorkCode(2, "02 - Büro"),
    WorkCode(3, "03 - Besprechung"),
    WorkCode(4, "04 - Vorbereitung"),
    WorkCode(5, "05 - Wartung"),
    WorkCode(6, "06 - Sonstiges"),
    WorkCode(WorkCodes.DRIVE, "19 - Fahrzeit"),
    WorkCode(WorkCodes.ARRIVAL, "19 - An/Abreise"),
    WorkCode(WorkCodes.OFFICE, "70 - Büro"),
)

private fun <T> pick(random: Random, items: List<T>): T = items[random.nextInt(items.size)]

private fun hhmm(h: Int, m: Int): String =
    "${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}"

/** Einträge der letzten 90 Tage (Wochentage, gelegentlich Krank/Urlaub/Fahrt). */
fun generateDemoEntries(
    today: LocalDate = LocalDate.now(),
    random: Random = Random.Default,
): List<Entry> {
    val entries = ArrayList<Entry>()
    var id = 1_700_000_000_000L

    val projects = listOf("Projekt A", "Projekt B", "Projekt Gemeinde", "Büro / Werkstatt", "Projekt C")
    val workCodes = listOf(1, 3, 4, 5, 6)

    for (dayOffset in 0 until 90) {
        val d = today.minusDays(dayOffset.toLong())
        val dateStr = d.toString()
        val dayOfWeek = d.dayOfWeek

        // Wochenenden überspringen
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) continue

        val isFriday = dayOfWeek == DayOfWeek.FRIDAY

        // ~2 Krankenstände pro Monat
        if (random.nextDouble() < 0.07) {
            val target = if (isFriday) 270 else 510
            entries.add(
                Entry(
                    id = EntryId.of(id++), type = EntryType.SICK, date = dateStr,
                    start = null, end = null, pause = 0,
                    project = "Krank", code = null, netDuration = target,
                ),
            )
            continue
        }

        // ~1 Urlaubstag pro Monat
        if (random.nextDouble() < 0.04) {
            val target = if (isFriday) 270 else 510
            entries.add(
                Entry(
                    id = EntryId.of(id++), type = EntryType.VACATION, date = dateStr,
                    start = null, end = null, pause = 0,
                    project = "Urlaub", code = null, netDuration = target,
                ),
            )
            continue
        }

        val project = pick(random, projects)
        val code = pick(random, workCodes)

        val startH: Int
        val startM: Int
        val endH: Int
        val endM: Int
        val pause: Int
        if (isFriday) {
            startH = pick(random, listOf(6, 7, 7))
            startM = pick(random, listOf(0, 0, 30))
            endH = startH + pick(random, listOf(5, 5, 6))
            endM = pick(random, listOf(0, 15, 30))
            pause = pick(random, listOf(0, 15, 30))
        } else {
            startH = pick(random, listOf(6, 6, 7, 7))
            startM = pick(random, listOf(0, 0, 15, 30))
            endH = startH + pick(random, listOf(9, 9, 10, 10))
            endM = pick(random, listOf(0, 15, 30, 45))
            pause = pick(random, listOf(30, 30, 30, 45))
        }

        val start = hhmm(startH, startM)
        val end = hhmm(minOf(endH, 20), endM)

        entries.add(
            Entry(
                id = EntryId.of(id++), type = EntryType.WORK, date = dateStr,
                start = start, end = end, pause = pause,
                project = project, code = code,
                netDuration = calculateEntryNetDuration(
                    entryType = "work", startTime = start, endTime = end,
                    pauseDuration = pause, formDate = dateStr,
                    userData = DEMO_USER, code = code,
                ),
            ),
        )

        // ~30% der Tage: zusätzlicher Fahrzeit-Eintrag (An/Abreise)
        if (random.nextDouble() < 0.3) {
            val driveStart = hhmm(startH - 1, 0)
            val driveEnd = hhmm(startH, 0)
            entries.add(
                Entry(
                    id = EntryId.of(id++), type = EntryType.WORK, date = dateStr,
                    start = driveStart, end = driveEnd, pause = 0,
                    project = project, code = WorkCodes.ARRIVAL,
                    netDuration = calculateEntryNetDuration(
                        entryType = "work", startTime = driveStart, endTime = driveEnd,
                        pauseDuration = 0, formDate = dateStr,
                        userData = DEMO_USER, code = WorkCodes.ARRIVAL,
                    ),
                ),
            )
        }
    }

    return entries
}
