package com.estundnzettl.core.calc

import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WORK_MODELS
import com.estundnzettl.core.model.WorkCode
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.OvertimeAccountConfig
import com.estundnzettl.core.model.OvertimeAccountPayout
import java.time.YearMonth
import java.time.LocalDate
import kotlin.random.Random

/**
 * Zusammenhängende Demo: zwei volle Vormonate und der laufende Monat.
 * Sonderzeiten sind feste Beispiele, nur Arbeitsprojekte und Mehrzeiten variieren.
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

/** Gemeinsame Regeln für beide Demo-Einstiege, einschließlich PDF-Bilanzen. */
fun generateDemoCalculationConfig(today: LocalDate = LocalDate.now()): CalculationConfig =
    getDefaultCalculationConfig(getLocale("at"), DEMO_USER.workDays).copy(
        vacationAllowanceDays = 25,
        vacationCarryoverDays = 3,
        overtimeAccount = OvertimeAccountConfig(
            enabled = true,
            startMonth = YearMonth.from(today).minusMonths(2).toString(),
            openingBalanceMinutes = 16 * 60,
            payouts = listOf(OvertimeAccountPayout(YearMonth.from(today).minusMonths(1).toString(), 2 * 60)),
        ),
    )

private fun demoTime(minutes: Int): String =
    "${(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}"

/**
 * Garantierte Beispiele je abgeschlossenem Monat, ohne Wochenend-/Feiertagsurlaub
 * oder Lücken am Monatsanfang. Auch zu Jahresbeginn bleibt der Kontoübertrag korrekt.
 */
fun generateDemoEntries(
    today: LocalDate = LocalDate.now(),
    random: Random = Random(42),
): List<Entry> {
    val entries = ArrayList<Entry>()
    var id = 1_700_000_000_000L
    val locale = getLocale("at")
    val config = generateDemoCalculationConfig(today)
    val projects = listOf("Montage Gemeindezentrum", "Wartung Bürogebäude", "Büro / Werkstatt")
    val currentMonth = YearMonth.from(today)

    for (monthsAgo in 2 downTo 0) {
        val month = currentMonth.minusMonths(monthsAgo.toLong())
        val holidays = getHolidayData(month.year, locale, config)
        val workDates = (1..month.lengthOfMonth()).map { month.atDay(it) }.filter {
            !it.isAfter(today) && it.toString() !in holidays &&
                getTargetMinutesForDate(it.toString(), DEMO_USER.workDays, locale, config) > 0
        }
        workDates.forEachIndexed { index, date ->
            val dateStr = date.toString()
            val target = getTargetMinutesForDate(dateStr, DEMO_USER.workDays, locale, config)
            fun absence(type: EntryType, title: String, minutes: Int = target) {
                entries += Entry(EntryId.of(id++), type, dateStr, project = title, netDuration = minutes)
            }
            fun work(start: Int, minutes: Int, project: String, code: Int = 1, overnight: Boolean = false) {
                val pause = if (minutes > 360) 30 else 0
                val from = demoTime(start)
                val to = demoTime(start + minutes + pause)
                entries += Entry(
                    id = EntryId.of(id++), type = EntryType.WORK, date = dateStr,
                    start = from, end = to, pause = pause, project = project, code = code,
                    netDuration = calculateEntryNetDuration(
                        "work", from, to, pause, dateStr, DEMO_USER, code,
                        locale = locale, config = config,
                    ),
                    overnight = overnight,
                )
            }
            when (index) {
                1 -> absence(EntryType.TIME_COMP, "Zeitausgleich – freier Tag")
                2 -> absence(EntryType.VACATION, "Urlaub")
                4 -> absence(EntryType.SICK, "Krankenstand")
                5 -> {
                    val vacationMinutes = target / 2
                    work(7 * 60, target - vacationMinutes, "Büro / Werkstatt", WorkCodes.OFFICE)
                    absence(EntryType.VACATION, "Urlaub – halber Tag", vacationMinutes)
                }
                else -> {
                    val project = projects[random.nextInt(projects.size)]
                    // Anreise endet genau vor Arbeitsbeginn, keine überlappenden Zeiten.
                    if (index % 4 == 0) work(6 * 60, 60, project, WorkCodes.ARRIVAL)
                    work(7 * 60, target + listOf(30, 45, 60)[random.nextInt(3)], project,
                        code = if (index % 3 == 0) 5 else 1, overnight = index == 0)
                }
            }
        }
    }
    return entries
}
