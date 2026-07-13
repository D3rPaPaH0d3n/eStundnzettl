package com.estundnzettl.core.locale.holidays

import java.time.LocalDate

/**
 * Berechnet den Ostersonntag nach der Gaußschen Osterformel.
 * Port von src/locales/holidays/_easter.ts.
 */
fun getEasterSunday(year: Int): LocalDate {
    val a = year % 19
    val b = year / 100
    val c = year % 100
    val d = b / 4
    val e = b % 4
    val f = (b + 8) / 25
    val g = (b - f + 1) / 3
    val h = (19 * a + b - d - g + 15) % 30
    val i = c / 4
    val k = c % 4
    val l = (32 + 2 * e + 2 * i - h - k) % 7
    val m = (a + 11 * h + 22 * l) / 451
    val month = (h + l - 7 * m + 114) / 31
    val day = ((h + l - 7 * m + 114) % 31) + 1
    return LocalDate.of(year, month, day)
}

/**
 * Formatiert ein Datum relativ zu einem Basis-Datum (in Tagen)
 * als YYYY-MM-DD-String.
 */
fun addDaysStr(base: LocalDate, days: Int): String =
    base.plusDays(days.toLong()).toDateString()

/** YYYY-MM-DD, identisch zum Format der TS-App. */
fun LocalDate.toDateString(): String =
    "%04d-%02d-%02d".format(year, monthValue, dayOfMonth)
