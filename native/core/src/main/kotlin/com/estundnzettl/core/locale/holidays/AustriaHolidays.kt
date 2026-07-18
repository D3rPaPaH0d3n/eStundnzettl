package com.estundnzettl.core.locale.holidays

/**
 * 13 bundesweit gültige gesetzliche Feiertage in Österreich.
 * Bewegliche Feiertage werden über den Ostersonntag berechnet.
 * Port von src/locales/holidays/austria.ts.
 */
fun getAustrianHolidays(year: Int): Map<String, String> {
    val easter = getEasterSunday(year)

    return mapOf(
        "$year-01-01" to "Neujahr",
        "$year-01-06" to "Heilige Drei Könige",
        addDaysStr(easter, 1) to "Ostermontag",
        "$year-05-01" to "Staatsfeiertag",
        addDaysStr(easter, 39) to "Christi Himmelfahrt",
        addDaysStr(easter, 50) to "Pfingstmontag",
        addDaysStr(easter, 60) to "Fronleichnam",
        "$year-08-15" to "Mariä Himmelfahrt",
        "$year-10-26" to "Nationalfeiertag",
        "$year-11-01" to "Allerheiligen",
        "$year-12-08" to "Mariä Empfängnis",
        "$year-12-25" to "Christtag",
        "$year-12-26" to "Stefanitag",
    )
}
