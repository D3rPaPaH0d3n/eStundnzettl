package com.estundnzettl.core.config

import com.estundnzettl.core.model.AutoPauseRule
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.HalfDayConfig
import com.estundnzettl.core.model.HalfDayMode
import com.estundnzettl.core.model.HolidayOnWorkDayMode
import com.estundnzettl.core.model.HolidaySetConfig
import com.estundnzettl.core.model.HolidaySetMode
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.PdfDisplayConfig
import com.estundnzettl.core.model.SickOnWorkDayMode
import com.estundnzettl.core.model.UserData
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * JSON-Koerzierung und -Encoding für CalculationConfig und UserData —
 * Port von coerceCalculationConfig aus src/utils/calculationConfig.ts.
 * Die Feld-Präsenz beim Encoding entspricht JSON.stringify der TS-App
 * (optionale Felder wie customHolidays/pdfDisplay fehlen statt null).
 */

private fun stringOrNull(v: JsonElement?): String? =
    (v as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun numberOrNull(v: JsonElement?): Double? {
    val p = v as? JsonPrimitive ?: return null
    if (p.isString || p is JsonNull) return null
    return p.content.toDoubleOrNull()
}

private fun intOrNull(v: JsonElement?): Int? = numberOrNull(v)?.toInt()

private fun booleanOrNull(v: JsonElement?): Boolean? {
    val p = v as? JsonPrimitive ?: return null
    return when (p.content) {
        "true" -> if (!p.isString) true else null
        "false" -> if (!p.isString) false else null
        else -> null
    }
}

private fun isValidAutoPauseRule(v: JsonElement): AutoPauseRule? {
    val obj = v as? JsonObject ?: return null
    val from = numberOrNull(obj["fromMinutes"]) ?: return null
    val pause = numberOrNull(obj["pauseMinutes"]) ?: return null
    if (from < 0 || pause < 0) return null
    return AutoPauseRule(fromMinutes = from.toInt(), pauseMinutes = pause.toInt())
}

private fun coerceHolidaySet(v: JsonElement?, fallback: HolidaySetConfig): HolidaySetConfig {
    val obj = v as? JsonObject ?: return fallback
    val mode = HolidaySetMode.fromWireOrNull(stringOrNull(obj["mode"])) ?: fallback.mode
    val disabled = (obj["disabledHolidayKeys"] as? JsonArray)
        ?.mapNotNull { stringOrNull(it) }
        ?: emptyList()
    val custom = (obj["customHolidays"] as? JsonObject)
        ?.mapNotNull { (k, value) -> stringOrNull(value)?.let { k to it } }
        ?.toMap()
    return HolidaySetConfig(mode = mode, disabledHolidayKeys = disabled, customHolidays = custom)
}

private fun coerceHalfDayMode(v: JsonElement?, fallback: HalfDayConfig): HalfDayConfig {
    val obj = v as? JsonObject ?: return fallback
    val mode = HalfDayMode.fromWireOrNull(stringOrNull(obj["mode"])) ?: fallback.mode
    val custom = (obj["customHalfDays"] as? JsonArray)
        ?.mapNotNull { stringOrNull(it) }
        ?: emptyList()
    return HalfDayConfig(mode = mode, customHalfDays = custom)
}

private val PDF_DISPLAY_KEYS = listOf(
    "showSummary", "showTargetTime", "showBalance", "showOvertimeSplit",
    "showVacationBalance", "showAttachmentsList", "showWorkCodeColumn", "showCustomNote",
)

private fun coercePdfDisplay(v: JsonElement?, fallback: PdfDisplayConfig?): PdfDisplayConfig? {
    val obj = v as? JsonObject ?: return fallback
    val explicit = PDF_DISPLAY_KEYS.mapNotNull { key ->
        booleanOrNull(obj[key])?.let { key to it }
    }.toMap()
    if (explicit.isEmpty()) return fallback
    // Fehlende Felder werden mit dem Alles-AN-Default ergänzt (wie
    // { ...DEFAULT_PDF_DISPLAY, ...out } in der TS-Vorlage).
    return PdfDisplayConfig(
        showSummary = explicit["showSummary"] ?: true,
        showTargetTime = explicit["showTargetTime"] ?: true,
        showBalance = explicit["showBalance"] ?: true,
        showOvertimeSplit = explicit["showOvertimeSplit"] ?: true,
        showVacationBalance = explicit["showVacationBalance"] ?: true,
        showAttachmentsList = explicit["showAttachmentsList"] ?: true,
        showWorkCodeColumn = explicit["showWorkCodeColumn"] ?: true,
        showCustomNote = explicit["showCustomNote"] ?: true,
    )
}

/**
 * Validiert (rudimentär), ob ein unbekannter JSON-Wert eine
 * CalculationConfig sein könnte — für SQLite- und Backup-Restores.
 * Fehlende/kaputte Felder werden aus dem Fallback ergänzt.
 */
fun coerceCalculationConfig(value: JsonElement?, fallback: CalculationConfig): CalculationConfig {
    val v = value as? JsonObject ?: return fallback

    val threshold = when {
        numberOrNull(v["overtimeThresholdMinutes"]) != null ->
            numberOrNull(v["overtimeThresholdMinutes"])!!.toInt()
        v["overtimeThresholdMinutes"] is JsonNull -> null
        else -> fallback.overtimeThresholdMinutes
    }

    return CalculationConfig(
        weeklyTargetMinutes = intOrNull(v["weeklyTargetMinutes"]) ?: fallback.weeklyTargetMinutes,
        overtimeMode = OvertimeMode.fromWireOrNull(stringOrNull(v["overtimeMode"])) ?: fallback.overtimeMode,
        overtimeThresholdMinutes = threshold,
        sickOnWorkDayMode = SickOnWorkDayMode.fromWireOrNull(stringOrNull(v["sickOnWorkDayMode"]))
            ?: fallback.sickOnWorkDayMode,
        holidaySet = coerceHolidaySet(v["holidaySet"], fallback.holidaySet),
        halfDayMode = coerceHalfDayMode(v["halfDayMode"], fallback.halfDayMode),
        holidayOnWorkDayMode = HolidayOnWorkDayMode.fromWireOrNull(stringOrNull(v["holidayOnWorkDayMode"]))
            ?: fallback.holidayOnWorkDayMode,
        autoPauseRules = (v["autoPauseRules"] as? JsonArray)
            ?.mapNotNull { isValidAutoPauseRule(it) }
            ?: fallback.autoPauseRules,
        vacationAllowanceDays = intOrNull(v["vacationAllowanceDays"]) ?: fallback.vacationAllowanceDays,
        vacationCarryoverDays = intOrNull(v["vacationCarryoverDays"]) ?: fallback.vacationCarryoverDays,
        pdfDisplay = coercePdfDisplay(v["pdfDisplay"], fallback.pdfDisplay),
        configVersion = 1,
    )
}

/** CalculationConfig → JSON mit identischer Feld-Präsenz wie die TS-App. */
fun CalculationConfig.toJson(): JsonObject = buildJsonObject {
    put("weeklyTargetMinutes", weeklyTargetMinutes)
    put("overtimeMode", overtimeMode.wireName)
    put("overtimeThresholdMinutes", overtimeThresholdMinutes?.let { JsonPrimitive(it) } ?: JsonNull)
    put("sickOnWorkDayMode", sickOnWorkDayMode.wireName)
    put("holidaySet", buildJsonObject {
        put("mode", holidaySet.mode.wireName)
        put("disabledHolidayKeys", buildJsonArray {
            holidaySet.disabledHolidayKeys.forEach { add(JsonPrimitive(it)) }
        })
        holidaySet.customHolidays?.let { custom ->
            put("customHolidays", buildJsonObject {
                custom.forEach { (k, v) -> put(k, v) }
            })
        }
    })
    put("halfDayMode", buildJsonObject {
        put("mode", halfDayMode.mode.wireName)
        put("customHalfDays", buildJsonArray {
            halfDayMode.customHalfDays.forEach { add(JsonPrimitive(it)) }
        })
    })
    put("holidayOnWorkDayMode", holidayOnWorkDayMode.wireName)
    put("autoPauseRules", buildJsonArray {
        autoPauseRules.forEach { rule ->
            add(buildJsonObject {
                put("fromMinutes", rule.fromMinutes)
                put("pauseMinutes", rule.pauseMinutes)
            })
        }
    })
    put("vacationAllowanceDays", vacationAllowanceDays)
    put("vacationCarryoverDays", vacationCarryoverDays)
    pdfDisplay?.let { display ->
        put("pdfDisplay", buildJsonObject {
            put("showSummary", display.showSummary)
            put("showTargetTime", display.showTargetTime)
            put("showBalance", display.showBalance)
            put("showOvertimeSplit", display.showOvertimeSplit)
            put("showVacationBalance", display.showVacationBalance)
            put("showAttachmentsList", display.showAttachmentsList)
            put("showWorkCodeColumn", display.showWorkCodeColumn)
            put("showCustomNote", display.showCustomNote)
        })
    }
    put("configVersion", configVersion)
}

// ─── UserData ────────────────────────────────────────────────

/** Tolerantes Dekodieren des Settings-Keys "user". */
fun decodeUserData(value: JsonElement?): UserData? {
    val obj = value as? JsonObject ?: return null
    return UserData(
        name = stringOrNull(obj["name"]) ?: "",
        position = stringOrNull(obj["position"]) ?: "",
        photo = stringOrNull(obj["photo"]),
        workDays = (obj["workDays"] as? JsonArray)
            ?.mapNotNull { numberOrNull(it)?.toInt() }
            ?.takeIf { it.size == 7 },
        company = stringOrNull(obj["company"]),
        simpleMode = booleanOrNull(obj["simpleMode"]) ?: false,
        expertMode = booleanOrNull(obj["expertMode"]) ?: false,
        workModelId = stringOrNull(obj["workModelId"]),
    )
}

/** UserData → JSON (optionale Felder fehlen statt null, wie in der TS-App). */
fun UserData.toJson(): JsonObject = buildJsonObject {
    put("name", name)
    put("position", position)
    put("photo", photo?.let { JsonPrimitive(it) } ?: JsonNull)
    put("workDays", buildJsonArray { (workDays ?: List(7) { 0 }).forEach { add(JsonPrimitive(it)) } })
    company?.let { put("company", it) }
    put("simpleMode", simpleMode)
    put("expertMode", expertMode)
    workModelId?.let { put("workModelId", it) }
}
