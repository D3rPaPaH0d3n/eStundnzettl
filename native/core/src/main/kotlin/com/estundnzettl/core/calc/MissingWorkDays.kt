package com.estundnzettl.core.calc

import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.locale.holidays.toDateString
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.UserData
import java.time.LocalDate

/**
 * Vergangener Arbeitstag ohne Eintrag ("Kein Eintrag"). Das Dashboard zeigt
 * ihn mit seinem Minus, damit Vergessenes auffällt. Das ZA-Konto bucht ihn
 * bewusst nicht ab: Abgebaut wird es nur durch echte Zeitausgleich-Einträge.
 */
data class MissingWorkDay(
    val date: LocalDate,
    /** Tagessoll, das im Saldo fehlt. */
    val targetMinutes: Int,
)

/**
 * Tage mit Soll von [from] bis [through], die [isMissingWorkDay] als
 * "Kein Eintrag" einstuft. [entries] müssen die Auto-Feiertage bereits
 * enthalten ([buildEntriesWithHolidays]) — sonst gälten Feiertage als vergessen.
 */
fun findMissingWorkDays(
    entries: List<Entry>,
    from: LocalDate,
    through: LocalDate,
    userData: UserData?,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
): List<MissingWorkDay> {
    // Ohne Soll (einfacher Modus) gibt es nichts zu vergessen
    if (userData?.simpleMode == true || through.isBefore(from)) return emptyList()
    val byDate = entries.groupBy { it.date }
    val missing = ArrayList<MissingWorkDay>()
    var day = from
    while (!day.isAfter(through)) {
        val dateStr = day.toDateString()
        val target = getTargetMinutesForDate(dateStr, userData?.workDays, locale, config)
        if (target > 0 && isMissingWorkDay(byDate[dateStr].orEmpty())) {
            missing += MissingWorkDay(day, target)
        }
        day = day.plusDays(1)
    }
    return missing
}

/**
 * Gilt ein Arbeitstag (Soll > 0, kein Feiertag) mit diesen Einträgen als
 * "Kein Eintrag"? Dieselbe Regel entscheidet, was das Dashboard als
 * vergessen markiert UND was das ZA-Konto nicht abbucht.
 */
internal fun isMissingWorkDay(dayEntries: List<Entry>): Boolean {
    // Vorläufig: jeder Eintrag zählt als erfasst. Offen sind Grenzfälle wie
    // ein Tag nur mit Fahrzeit oder Einträge mit 0 Minuten.
    return dayEntries.isEmpty()
}
