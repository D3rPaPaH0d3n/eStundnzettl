package com.estundnzettl.core.locale.holidays

import java.time.LocalDate
import kotlin.math.roundToInt

/**
 * Religiöse Feiertage (Orthodox + Islamisch) — Import-Vorlagen für den
 * "Eigener Plan"-Baukasten. Nicht als Locale gedacht, sondern als
 * Feiertags-Set für die individuelle CalculationConfig.
 * Port von src/locales/holidays/religious.ts.
 */

/**
 * Berechnet den orthodoxen Ostersonntag (julianisch → gregorianisch).
 * Algorithmus nach Meeus (Astronomical Algorithms).
 */
fun getOrthodoxEasterSunday(year: Int): LocalDate {
    val a = year % 4
    val b = year % 7
    val c = year % 19
    val d = (19 * c + 15) % 30
    val e = (2 * a + 4 * b - d + 34) % 7
    val month = (d + e + 114) / 31 // 3 = März, 4 = April
    val day = ((d + e + 114) % 31) + 1

    // Julianisches Datum → Gregorianisch: +13 Tage (gilt 1900–2099)
    return LocalDate.of(year, month, day).plusDays(13)
}

/**
 * Orthodoxe Feiertage für ein Jahr — die wichtigsten festen und
 * beweglichen Feiertage.
 */
fun getOrthodoxHolidays(year: Int): Map<String, String> {
    val easter = getOrthodoxEasterSunday(year)

    return mapOf(
        // Feste Feiertage (Gregorianische Daten)
        "$year-01-07" to "Orthodoxes Weihnachten",
        "$year-01-19" to "Theophanie (Taufe Christi)",
        "$year-04-07" to "Mariä Verkündigung",
        "$year-08-28" to "Mariä Entschlafung",

        // Bewegliche Feiertage (relativ zum orthodoxen Ostern)
        addDaysStr(easter, -2) to "Orthodoxer Karfreitag",
        addDaysStr(easter, 0) to "Orthodoxer Ostersonntag",
        addDaysStr(easter, 1) to "Orthodoxer Ostermontag",
        addDaysStr(easter, 39) to "Orthodoxe Himmelfahrt",
        addDaysStr(easter, 49) to "Orthodoxer Pfingstsonntag",
        addDaysStr(easter, 50) to "Orthodoxer Pfingstmontag",
    )
}

private data class IslamicYearData(
    val ramadanStart: String, // MM-DD
    val eidAlFitr: String,    // MM-DD (Ende Ramadan)
    val eidAlAdha: String,    // MM-DD (Opferfest)
    val islamicNewYear: String, // MM-DD
    val mawlid: String,       // MM-DD (Geburtstag des Propheten)
)

// Vorberechnete Daten für 2024–2035 (astronomische Annäherung)
private val ISLAMIC_DATES: Map<Int, IslamicYearData> = mapOf(
    2024 to IslamicYearData("03-11", "04-10", "06-17", "07-08", "09-16"),
    2025 to IslamicYearData("02-28", "03-30", "06-06", "06-27", "09-05"),
    2026 to IslamicYearData("02-17", "03-20", "05-27", "06-17", "08-25"),
    2027 to IslamicYearData("02-07", "03-09", "05-16", "06-06", "08-14"),
    2028 to IslamicYearData("01-27", "02-26", "05-04", "05-25", "08-03"),
    2029 to IslamicYearData("01-15", "02-14", "04-24", "05-14", "07-24"),
    2030 to IslamicYearData("01-05", "02-04", "04-13", "05-04", "07-13"),
    2031 to IslamicYearData("12-26", "01-24", "04-02", "04-23", "07-02"),
    2032 to IslamicYearData("12-14", "01-14", "03-22", "04-11", "06-20"),
    2033 to IslamicYearData("12-03", "01-02", "03-11", "04-01", "06-10"),
    2034 to IslamicYearData("11-23", "12-23", "03-01", "03-21", "05-30"),
    2035 to IslamicYearData("11-12", "12-12", "02-18", "03-10", "05-19"),
)

/**
 * Approximiert islamische Feiertage außerhalb 2024–2035: verschiebt die
 * Daten von 2030 um ~10.63 Tage pro Jahr (islamisches Mondjahr ≈ 354.37
 * Tage → Differenz ≈ 10.63 Tage/Jahr Gregorianisch).
 */
private fun approximateIslamicDates(year: Int): IslamicYearData {
    val ref = ISLAMIC_DATES.getValue(2030)
    val diff = year - 2030
    val shiftDays = (diff * -10.63).roundToInt()

    fun shift(mmdd: String): String {
        val (mm, dd) = mmdd.split("-").map { it.toInt() }
        val d = LocalDate.of(2030, mm, dd).plusDays(shiftDays.toLong())
        return "%02d-%02d".format(d.monthValue, d.dayOfMonth)
    }

    return IslamicYearData(
        ramadanStart = shift(ref.ramadanStart),
        eidAlFitr = shift(ref.eidAlFitr),
        eidAlAdha = shift(ref.eidAlAdha),
        islamicNewYear = shift(ref.islamicNewYear),
        mawlid = shift(ref.mawlid),
    )
}

/**
 * Islamische Feiertage für ein Jahr — Lookup-Daten (2024–2035) oder
 * Approximation. Tatsächliche Daten können je nach Region und
 * Mondsichtung um ±1–2 Tage abweichen.
 */
fun getIslamicHolidays(year: Int): Map<String, String> {
    val data = ISLAMIC_DATES[year] ?: approximateIslamicDates(year)

    return mapOf(
        "$year-${data.ramadanStart}" to "Ramadan-Beginn",
        "$year-${data.eidAlFitr}" to "Eid al-Fitr (Zuckerfest)",
        "$year-${data.eidAlAdha}" to "Eid al-Adha (Opferfest)",
        "$year-${data.islamicNewYear}" to "Islamisches Neujahr",
        "$year-${data.mawlid}" to "Mawlid (Geburtstag d. Propheten)",
    )
}
