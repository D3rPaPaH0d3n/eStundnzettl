package com.estundnzettl.core.locale

import com.estundnzettl.core.locale.holidays.GERMAN_STATE_NAMES
import com.estundnzettl.core.locale.holidays.SWISS_KANTON_NAMES
import com.estundnzettl.core.locale.holidays.getAustrianHolidays
import com.estundnzettl.core.locale.holidays.getGermanHolidaysByState
import com.estundnzettl.core.locale.holidays.getSwissHolidaysByKanton

/**
 * Zentraler Zugriffspunkt für alle verfügbaren Locales.
 * Port von src/locales/index.ts + austria.ts/germany.ts/switzerland.ts/neutral.ts.
 */

/**
 * Default-Locale für bestehende User und Tests, die noch keine explizite
 * Locale gesetzt haben. Bewusst "at", damit bestehende User ihr gewohntes
 * Verhalten behalten.
 */
const val DEFAULT_LOCALE_ID = "at"

val neutralLocale = AppLocale(
    id = "neutral",
    country = LocaleCountry.NEUTRAL,
    name = "Neutral",
    description = "Keine automatischen Feiertage oder Spezialregeln — für alle Berufe und Länder.",
    getHolidays = { emptyMap() },
    halfDays = emptyList(),
    enableOvertimeSplit = false,
    weeklyLimitMinutes = null,
    enableSickAdjustment = false,
    // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — Mo-Fr 8h
    defaultWorkDays = listOf(0, 480, 480, 480, 480, 480, 0),
)

val austriaLocale = AppLocale(
    id = "at",
    country = LocaleCountry.AT,
    name = "Österreich",
    description = "Mit österreichischen Feiertagen, Halbtagen (24./31.12.) und Mehrarbeit/Überstunden nach AZG.",
    getHolidays = ::getAustrianHolidays,
    halfDays = listOf("12-24", "12-31"),
    enableOvertimeSplit = true,
    weeklyLimitMinutes = 40 * 60, // 2400
    enableSickAdjustment = true,
    // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — 38,5h klassisch
    defaultWorkDays = listOf(0, 510, 510, 510, 510, 270, 0),
)

/** Erzeugt eine Locale für ein deutsches Bundesland. */
fun createGermanyLocale(state: String): AppLocale {
    val stateName = GERMAN_STATE_NAMES.getValue(state)
    return AppLocale(
        id = "de-$state",
        country = LocaleCountry.DE,
        region = stateName,
        name = "Deutschland ($stateName)",
        description = "Mit bundesweiten und regionalen Feiertagen für $stateName, Halbtagen (24./31.12.) und Mehrarbeit/Überstunden ab 40h/Woche.",
        getHolidays = { year -> getGermanHolidaysByState(year, state) },
        halfDays = listOf("12-24", "12-31"),
        enableOvertimeSplit = true,
        weeklyLimitMinutes = 40 * 60, // 2400
        enableSickAdjustment = true,
        // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — 40h klassisch (Mo-Fr 8h)
        defaultWorkDays = listOf(0, 480, 480, 480, 480, 480, 0),
    )
}

/** Erzeugt eine Locale für einen Schweizer Kanton. */
fun createSwitzerlandLocale(kanton: String): AppLocale {
    val kantonName = SWISS_KANTON_NAMES.getValue(kanton)
    return AppLocale(
        id = "ch-$kanton",
        country = LocaleCountry.CH,
        region = kantonName,
        name = "Schweiz ($kantonName)",
        description = "Kantonale Feiertage für $kantonName, Halbtage (24./31.12.) und Überstunden ab 45h/Woche (ArG).",
        getHolidays = { year -> getSwissHolidaysByKanton(year, kanton) },
        halfDays = listOf("12-24", "12-31"),
        enableOvertimeSplit = true,
        weeklyLimitMinutes = 45 * 60, // 2700 (ArG, konservativ)
        enableSickAdjustment = true,
        // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — 42.5h (CH-Durchschnitt)
        defaultWorkDays = listOf(0, 510, 510, 510, 510, 270, 0),
    )
}

/** Alle 16 deutschen Bundesland-Codes in sinnvoller UI-Reihenfolge. */
val GERMAN_STATE_IDS: List<String> = listOf(
    "bw", "by", "be", "bb", "hb", "hh", "he", "mv",
    "ni", "nw", "rp", "sl", "sn", "st", "sh", "th",
)

/** Alle 26 Kantons-Codes in alphabetischer UI-Reihenfolge. */
val SWISS_KANTON_IDS: List<String> = listOf(
    "ag", "ai", "ar", "be", "bl", "bs", "fr", "ge", "gl", "gr",
    "ju", "lu", "ne", "nw", "ow", "sg", "sh", "so", "sz", "tg",
    "ti", "ur", "vd", "vs", "zh", "zg",
)

/** Alle verfügbaren Locales als Registry. */
val LOCALES: Map<String, AppLocale> = buildMap {
    put("neutral", neutralLocale)
    put("at", austriaLocale)
    GERMAN_STATE_IDS.forEach { put("de-$it", createGermanyLocale(it)) }
    SWISS_KANTON_IDS.forEach { put("ch-$it", createSwitzerlandLocale(it)) }
}

/** Prüft ob ein beliebiger Wert eine gültige LocaleId ist. */
fun isLocaleId(value: String?): Boolean = value != null && LOCALES.containsKey(value)

/**
 * Holt eine Locale per ID. Wenn `id` null oder nicht gefunden, wird
 * [DEFAULT_LOCALE_ID] (Österreich) zurückgegeben.
 */
fun getLocale(id: String?): AppLocale {
    if (id == null) return LOCALES.getValue(DEFAULT_LOCALE_ID)
    return LOCALES[id] ?: LOCALES.getValue(DEFAULT_LOCALE_ID)
}

/** Alle Deutschland-Locale-IDs (für UI-Bundesland-Dropdown). */
val GERMANY_LOCALE_IDS: List<String> = GERMAN_STATE_IDS.map { "de-$it" }

/** Alle Schweiz-Locale-IDs (für UI-Kantons-Dropdown). */
val SWITZERLAND_LOCALE_IDS: List<String> = SWISS_KANTON_IDS.map { "ch-$it" }

/** Alle Top-Level-Locales für den Onboarding-Picker. */
val TOP_LEVEL_LOCALES: List<String> = listOf("neutral", "at", "de", "ch")
