package com.estundnzettl.core.locale.holidays

import java.time.LocalDate

/**
 * Schweizer Feiertage nach Kanton. Die Schweiz hat nur einen Bundesfeiertag
 * (1. August); alle anderen Feiertage werden kantonal geregelt.
 * Port von src/locales/holidays/switzerland.ts.
 */

/** Kantons-Kürzel (ISO 3166-2:CH ohne "CH-" Prefix, kleingeschrieben). */
val SWISS_KANTON_NAMES: Map<String, String> = linkedMapOf(
    "ag" to "Aargau",
    "ai" to "Appenzell Innerrhoden",
    "ar" to "Appenzell Ausserrhoden",
    "be" to "Bern",
    "bl" to "Basel-Landschaft",
    "bs" to "Basel-Stadt",
    "fr" to "Freiburg",
    "ge" to "Genf",
    "gl" to "Glarus",
    "gr" to "Graubünden",
    "ju" to "Jura",
    "lu" to "Luzern",
    "ne" to "Neuenburg",
    "nw" to "Nidwalden",
    "ow" to "Obwalden",
    "sg" to "St. Gallen",
    "sh" to "Schaffhausen",
    "so" to "Solothurn",
    "sz" to "Schwyz",
    "tg" to "Thurgau",
    "ti" to "Tessin",
    "ur" to "Uri",
    "vd" to "Waadt",
    "vs" to "Wallis",
    "zh" to "Zürich",
    "zg" to "Zug",
)

// -- Kantonsgruppen für regionale Feiertage --

/** Berchtoldstag (2. Jänner) */
private val BERCHTOLDSTAG = setOf(
    "ag", "be", "fr", "gl", "gr", "ju", "lu", "ne", "ow", "sh", "so", "tg", "vd", "zh", "zg",
)

/** Karfreitag */
private val KARFREITAG = setOf(
    "ag", "ar", "be", "bl", "bs", "fr", "ge", "gl", "gr", "ju", "lu", "ne", "nw", "ow",
    "sg", "sh", "so", "sz", "tg", "ur", "vd", "zh", "zg",
)

/** Ostermontag */
private val OSTERMONTAG = setOf(
    "ag", "ai", "ar", "be", "bl", "bs", "fr", "ge", "gl", "gr", "ju", "lu", "ne", "nw", "ow",
    "sg", "sh", "so", "sz", "tg", "ti", "ur", "vd", "vs", "zh", "zg",
)

/** Pfingstmontag */
private val PFINGSTMONTAG = setOf(
    "ag", "ai", "ar", "be", "bl", "bs", "fr", "ge", "gl", "gr", "ju", "lu", "ne", "nw", "ow",
    "sg", "sh", "so", "sz", "tg", "ti", "ur", "vd", "zh", "zg",
)

/** Fronleichnam (katholische Kantone) */
private val FRONLEICHNAM = setOf(
    "ag", "ai", "fr", "gr", "ju", "lu", "nw", "ow", "so", "sz", "ti", "ur", "vs", "zg",
)

/** Mariä Himmelfahrt (15. August) */
private val MARIAE_HIMMELFAHRT = setOf(
    "ai", "fr", "gr", "ju", "lu", "nw", "ow", "so", "sz", "ti", "ur", "vs", "zg",
)

/** Allerheiligen (1. November) */
private val ALLERHEILIGEN = setOf(
    "ai", "fr", "gl", "gr", "ju", "lu", "nw", "ow", "sg", "so", "sz", "ti", "ur", "vs", "zg",
)

/** Mariä Empfängnis (8. Dezember) */
private val MARIAE_EMPFAENGNIS = setOf(
    "ai", "fr", "gr", "lu", "nw", "ow", "so", "sz", "ti", "ur", "vs", "zg",
)

/** Stephanstag (26. Dezember) */
private val STEPHANSTAG = setOf(
    "ag", "ai", "ar", "be", "bl", "bs", "fr", "ge", "gl", "gr", "lu", "ne", "nw", "ow",
    "sg", "sh", "so", "sz", "tg", "ti", "ur", "vd", "zh", "zg",
)

/** Tag der Arbeit (1. Mai) — nicht in allen Kantonen gesetzlich */
private val TAG_DER_ARBEIT = setOf(
    "bl", "bs", "ju", "ne", "sh", "tg", "ti", "zh", "zg",
)

/** Jeûne genevois: Donnerstag nach dem ersten Sonntag im September. */
private fun getJeuneGenevois(year: Int): String {
    // Erster Sonntag im September finden (getDay(): 0 = Sonntag)
    val sept1 = LocalDate.of(year, 9, 1)
    val dayOfWeek = sept1.dayOfWeek.value % 7
    val firstSunday = if (dayOfWeek == 0) 1 else 8 - dayOfWeek
    // Donnerstag danach = +4
    return LocalDate.of(year, 9, 1).plusDays((firstSunday + 4 - 1).toLong()).toDateString()
}

/** Liefert alle Feiertage für ein Jahr und einen Kanton. */
fun getSwissHolidaysByKanton(year: Int, kanton: String): Map<String, String> {
    val easter = getEasterSunday(year)
    val holidays = LinkedHashMap<String, String>()

    // Bundesfeiertag (einziger landesweit)
    holidays["$year-08-01"] = "Bundesfeiertag"

    // Neujahr (alle Kantone)
    holidays["$year-01-01"] = "Neujahr"

    // Auffahrt / Christi Himmelfahrt (alle Kantone)
    holidays[addDaysStr(easter, 39)] = "Auffahrt"

    // Weihnachten (alle Kantone)
    holidays["$year-12-25"] = "Weihnachten"

    if (kanton in BERCHTOLDSTAG) {
        holidays["$year-01-02"] = "Berchtoldstag"
    }
    if (kanton in KARFREITAG) {
        holidays[addDaysStr(easter, -2)] = "Karfreitag"
    }
    if (kanton in OSTERMONTAG) {
        holidays[addDaysStr(easter, 1)] = "Ostermontag"
    }
    if (kanton in TAG_DER_ARBEIT) {
        holidays["$year-05-01"] = "Tag der Arbeit"
    }
    if (kanton in PFINGSTMONTAG) {
        holidays[addDaysStr(easter, 50)] = "Pfingstmontag"
    }
    if (kanton in FRONLEICHNAM) {
        holidays[addDaysStr(easter, 60)] = "Fronleichnam"
    }
    if (kanton in MARIAE_HIMMELFAHRT) {
        holidays["$year-08-15"] = "Mariä Himmelfahrt"
    }
    if (kanton in ALLERHEILIGEN) {
        holidays["$year-11-01"] = "Allerheiligen"
    }
    if (kanton in MARIAE_EMPFAENGNIS) {
        holidays["$year-12-08"] = "Mariä Empfängnis"
    }
    if (kanton in STEPHANSTAG) {
        holidays["$year-12-26"] = "Stephanstag"
    }

    // Genf: Jeûne genevois + Restauration
    if (kanton == "ge") {
        holidays[getJeuneGenevois(year)] = "Jeûne genevois"
        holidays["$year-12-31"] = "Restauration"
    }

    // Näfelser Fahrt (Glarus) — erster Donnerstag im April
    if (kanton == "gl") {
        val apr1 = LocalDate.of(year, 4, 1)
        val dayOfWeek = apr1.dayOfWeek.value % 7 // getDay(): 0 = Sonntag
        val firstThursday = if (dayOfWeek <= 4) 4 - dayOfWeek + 1 else 11 - dayOfWeek + 4 + 1
        holidays["$year-04-" + firstThursday.toString().padStart(2, '0')] = "Näfelser Fahrt"
    }

    // Heilige Drei Könige (6. Jänner) — nur wenige Kantone
    if (kanton in setOf("gr", "lu", "sz", "ti", "ur", "zg")) {
        holidays["$year-01-06"] = "Heilige Drei Könige"
    }

    // Josefstag (19. März) — nur wenige Kantone
    if (kanton in setOf("gr", "lu", "nw", "so", "sz", "ti", "ur", "vs", "zg")) {
        holidays["$year-03-19"] = "Josefstag"
    }

    return holidays
}
