package com.estundnzettl.core.locale.holidays

import java.time.DayOfWeek
import java.time.LocalDate

/**
 * Deutsche Feiertage: 9 bundesweite plus regionale je Bundesland.
 * Port von src/locales/holidays/germany.ts.
 */

/** ISO 3166-2:DE Bundesland-Codes (ohne "DE-" Prefix, kleingeschrieben). */
val GERMAN_STATE_NAMES: Map<String, String> = linkedMapOf(
    "bw" to "Baden-Württemberg",
    "by" to "Bayern",
    "be" to "Berlin",
    "bb" to "Brandenburg",
    "hb" to "Bremen",
    "hh" to "Hamburg",
    "he" to "Hessen",
    "mv" to "Mecklenburg-Vorpommern",
    "ni" to "Niedersachsen",
    "nw" to "Nordrhein-Westfalen",
    "rp" to "Rheinland-Pfalz",
    "sl" to "Saarland",
    "sn" to "Sachsen",
    "st" to "Sachsen-Anhalt",
    "sh" to "Schleswig-Holstein",
    "th" to "Thüringen",
)

/** 9 bundesweit gültige Feiertage in Deutschland. */
fun getGermanHolidaysBundeswide(year: Int): Map<String, String> {
    val easter = getEasterSunday(year)

    return mapOf(
        "$year-01-01" to "Neujahr",
        addDaysStr(easter, -2) to "Karfreitag",
        addDaysStr(easter, 1) to "Ostermontag",
        "$year-05-01" to "Tag der Arbeit",
        addDaysStr(easter, 39) to "Christi Himmelfahrt",
        addDaysStr(easter, 50) to "Pfingstmontag",
        "$year-10-03" to "Tag der Deutschen Einheit",
        "$year-12-25" to "1. Weihnachtstag",
        "$year-12-26" to "2. Weihnachtstag",
    )
}

// -- Bundesland-Zuordnungen der regionalen Feiertage --
private val HEILIGE_DREI_KOENIGE_STATES = setOf("bw", "by", "st")
private val FRAUENTAG_STATES = setOf("be", "mv")
private val FRONLEICHNAM_STATES = setOf("bw", "by", "he", "nw", "rp", "sl")
private val MARIAE_HIMMELFAHRT_STATES = setOf("by", "sl")
private val WELTKINDERTAG_STATES = setOf("th")
private val REFORMATIONSTAG_STATES =
    setOf("bb", "hb", "hh", "mv", "ni", "sn", "st", "sh", "th")
private val ALLERHEILIGEN_STATES = setOf("bw", "by", "nw", "rp", "sl")
private val BUSS_UND_BETTAG_STATES = setOf("sn")

/** Buß- und Bettag: Mittwoch vor dem 23. November (16.-22. November). */
private fun getBussUndBettag(year: Int): String {
    var d = LocalDate.of(year, 11, 22)
    while (d.dayOfWeek != DayOfWeek.WEDNESDAY) {
        d = d.minusDays(1)
    }
    return d.toDateString()
}

/**
 * Liefert alle deutschen Feiertage für ein Jahr und Bundesland.
 * Bundesweite Feiertage + regionale Feiertage des gewählten Landes.
 */
fun getGermanHolidaysByState(year: Int, state: String): Map<String, String> {
    val easter = getEasterSunday(year)
    val holidays = LinkedHashMap(getGermanHolidaysBundeswide(year))

    if (state in HEILIGE_DREI_KOENIGE_STATES) {
        holidays["$year-01-06"] = "Heilige Drei Könige"
    }
    if (state in FRAUENTAG_STATES) {
        holidays["$year-03-08"] = "Internationaler Frauentag"
    }
    if (state in FRONLEICHNAM_STATES) {
        holidays[addDaysStr(easter, 60)] = "Fronleichnam"
    }
    if (state in MARIAE_HIMMELFAHRT_STATES) {
        holidays["$year-08-15"] = "Mariä Himmelfahrt"
    }
    if (state in WELTKINDERTAG_STATES) {
        holidays["$year-09-20"] = "Weltkindertag"
    }
    if (state in REFORMATIONSTAG_STATES) {
        holidays["$year-10-31"] = "Reformationstag"
    }
    if (state in ALLERHEILIGEN_STATES) {
        holidays["$year-11-01"] = "Allerheiligen"
    }
    if (state in BUSS_UND_BETTAG_STATES) {
        holidays[getBussUndBettag(year)] = "Buß- und Bettag"
    }

    return holidays
}
