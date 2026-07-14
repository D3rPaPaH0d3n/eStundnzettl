package com.estundnzettl.core.calc

import com.estundnzettl.core.backup.toJson
import com.estundnzettl.core.config.toJson
import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import java.time.LocalDate

/**
 * Kernlogik des automatischen Monats-PDF-Archivs — Port von
 * src/utils/pdfArchive.ts + src/utils/holidayEntries.ts.
 *
 * Der Content-Hash ist NUR innerhalb der nativen App stabil (die
 * JSON-Serialisierung weicht von JSON.stringify der TS-App ab). Nach
 * der Legacy-Migration führt das einmalig zu einem Re-Upload des
 * aktuellen Monats — unkritisch, da dieselbe Datei überschrieben wird.
 */

private fun pad2(n: Int): String = n.toString().padStart(2, '0')

/**
 * Synthetische public_holiday-Einträge für alle gesetzlichen Feiertage
 * eines Monats, die auf einen Arbeitstag fallen — nur bis [currentDate]
 * (Port von generateHolidayEntries).
 */
fun generateHolidayEntries(
    year: Int,
    month: Int,
    userData: UserData?,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
    currentDate: LocalDate = LocalDate.now(),
): List<Entry> {
    val holidayMap = getHolidayData(year, locale, config)
    val daysInMonth = LocalDate.of(year, month, 1).lengthOfMonth()
    val todayStr = "%04d-%02d-%02d".format(currentDate.year, currentDate.monthValue, currentDate.dayOfMonth)
    val holidays = ArrayList<Entry>()

    for (day in 1..daysInMonth) {
        val dateStr = "$year-${pad2(month)}-${pad2(day)}"
        val name = holidayMap[dateStr]
        if (name == null || dateStr > todayStr) continue

        val targetMin = getTargetMinutesForDate(dateStr, userData?.workDays, locale, config)
        if (targetMin <= 0) continue

        holidays.add(
            Entry(
                id = EntryId.of("auto-holiday-$dateStr"),
                type = EntryType.PUBLIC_HOLIDAY,
                date = dateStr,
                project = name.ifEmpty { "Gesetzlicher Feiertag" },
                pause = 0,
                netDuration = targetMin,
            ),
        )
    }

    return holidays
}

/** Alle Entries des Kalendermonats, sortiert nach Datum + Startzeit. */
fun filterEntriesForMonth(entries: List<Entry>, year: Int, month: Int): List<Entry> {
    val prefix = "$year-${pad2(month)}"
    return entries
        .filter { it.date.startsWith(prefix) }
        .sortedWith(compareBy({ it.date }, { it.start ?: "" }))
}

/**
 * Deterministischer djb2-Hash über alle Inhalte, die sich im PDF
 * niederschlagen (Port von hashMonthContent). Feldreihenfolge wie das
 * TS-Objektliteral; der konkrete JSON-Text ist implementierungs-
 * spezifisch, aber innerhalb der App stabil.
 */
fun hashMonthContent(
    entries: List<Entry>,
    userData: UserData?,
    year: Int,
    month: Int,
    locale: AppLocale? = null,
    config: CalculationConfig? = null,
    currentDate: LocalDate = LocalDate.now(),
): String {
    val holidayEntries = generateHolidayEntries(year, month, userData, locale, config, currentDate)
    val relevant = buildJsonObject {
        put("ym", "$year-${pad2(month)}")
        put("name", userData?.name ?: "")
        userData?.workDays?.let { days ->
            putJsonArray("workDays") { days.forEach { add(it) } }
        } ?: put("workDays", JsonNull)
        put("workModel", JsonNull)
        put("calculationConfig", config?.toJson() ?: JsonNull)
        putJsonArray("holidays") {
            holidayEntries.forEach { e ->
                add(
                    buildJsonObject {
                        put("id", e.id.toJson())
                        put("d", e.date)
                        put("pr", e.project?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("n", e.netDuration)
                    },
                )
            }
        }
        putJsonArray("entries") {
            filterEntriesForMonth(entries, year, month).forEach { e ->
                add(
                    buildJsonObject {
                        put("id", e.id.toJson())
                        put("t", e.type.wireName)
                        put("d", e.date)
                        put("s", e.start?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("e", e.end?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("p", e.pause)
                        put("pr", e.project?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("c", e.code?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("n", e.netDuration)
                    },
                )
            }
        }
    }

    val str = Json.encodeToString(kotlinx.serialization.json.JsonObject.serializer(), relevant)
    var hash = 5381
    for (ch in str) {
        hash = (hash shl 5) + hash + ch.code
    }
    return hash.toString()
}

/** "Stundenzettel_YYYY-MM_Name.pdf" (slug-safe) — Port von buildArchiveFilename. */
fun buildArchiveFilename(year: Int, month: Int, userData: UserData?): String {
    val rawName = (userData?.name ?: "Stundenzettel").trim().ifEmpty { "Stundenzettel" }
    val clean = rawName
        .replace(Regex("\\s+"), "_")
        .replace(Regex("[^a-zA-Z0-9_-]"), "")
        .ifEmpty { "Stundenzettel" }
    return "Stundenzettel_$year-${pad2(month)}_$clean.pdf"
}
