package com.estundnzettl.core.config

import com.estundnzettl.core.calc.getDefaultCalculationConfig
import com.estundnzettl.core.locale.austriaLocale
import com.estundnzettl.core.model.AutoPauseRule
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.PdfDisplayConfig
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * Port der coerceCalculationConfig-Tests aus calculationConfig.test.ts
 * plus Roundtrip-Absicherung des JSON-Encodings.
 */
class CalculationConfigJsonTest {

    private val fallback = getDefaultCalculationConfig(austriaLocale, listOf(0, 510, 510, 510, 510, 270, 0))

    private fun parse(json: String) = Json.parseToJsonElement(json)

    @Test
    fun `akzeptiert eine gueltige Config unveraendert`() {
        val valid = getDefaultCalculationConfig(austriaLocale, listOf(0, 480, 480, 480, 480, 480, 0))
        val coerced = coerceCalculationConfig(valid.toJson(), fallback)
        assertEquals(2400, coerced.weeklyTargetMinutes)
        assertEquals(OvertimeMode.SPLIT, coerced.overtimeMode)
        assertEquals(valid, coerced)
    }

    @Test
    fun `gibt fallback zurueck wenn value kein Objekt ist`() {
        assertEquals(fallback, coerceCalculationConfig(null, fallback))
        assertEquals(fallback, coerceCalculationConfig(JsonPrimitive("not-an-object"), fallback))
    }

    @Test
    fun `repariert unvollstaendige Configs mit Fallback-Feldern`() {
        val coerced = coerceCalculationConfig(parse("""{"overtimeMode":"split"}"""), fallback)
        assertEquals(OvertimeMode.SPLIT, coerced.overtimeMode)
        assertEquals(fallback.sickOnWorkDayMode, coerced.sickOnWorkDayMode)
        assertEquals(fallback.vacationAllowanceDays, coerced.vacationAllowanceDays)
    }

    @Test
    fun `filtert ungueltige autoPauseRules`() {
        val coerced = coerceCalculationConfig(parse(
            """{"autoPauseRules":[
                {"fromMinutes":360,"pauseMinutes":30},
                {"foo":"bar"},
                {"fromMinutes":"nope","pauseMinutes":15},
                {"fromMinutes":540,"pauseMinutes":45}
            ]}"""
        ), fallback)
        assertEquals(2, coerced.autoPauseRules.size)
        assertEquals(AutoPauseRule(360, 30), coerced.autoPauseRules[0])
        assertEquals(AutoPauseRule(540, 45), coerced.autoPauseRules[1])
    }

    @Test
    fun `overtimeThresholdMinutes null bleibt null`() {
        val coerced = coerceCalculationConfig(parse("""{"overtimeThresholdMinutes":null}"""), fallback)
        assertNull(coerced.overtimeThresholdMinutes)
    }

    @Test
    fun `pdfDisplay wird mit Alles-AN-Defaults ergaenzt`() {
        val coerced = coerceCalculationConfig(parse("""{"pdfDisplay":{"showBalance":false}}"""), fallback)
        assertEquals(false, coerced.pdfDisplay?.showBalance)
        assertEquals(true, coerced.pdfDisplay?.showSummary)
        assertEquals(true, coerced.pdfDisplay?.showCustomNote)
    }

    @Test
    fun `pdfDisplay ohne boolesche Felder faellt auf fallback zurueck`() {
        val coerced = coerceCalculationConfig(parse("""{"pdfDisplay":{"showBalance":"yes"}}"""), fallback)
        assertEquals(fallback.pdfDisplay, coerced.pdfDisplay)
    }

    @Test
    fun `Config-JSON-Roundtrip ist verlustfrei`() {
        val config = fallback.copy(
            autoPauseRules = listOf(AutoPauseRule(360, 30)),
            pdfDisplay = PdfDisplayConfig(showBalance = false, showWorkCodeColumn = false),
            vacationCarryoverDays = 3,
        )
        val roundtripped = coerceCalculationConfig(config.toJson(), fallback)
        assertEquals(config, roundtripped)
    }

    @Test
    fun `Referenz-Fixture-Config wird korrekt dekodiert`() {
        val fixture = Json.parseToJsonElement(
            javaClass.getResourceAsStream("/fixtures/backup-v7-reference.json")!!
                .bufferedReader().readText()
        )
        val configJson = (fixture as kotlinx.serialization.json.JsonObject)["calculationConfig"]
        val coerced = coerceCalculationConfig(configJson, fallback)
        assertEquals(2310, coerced.weeklyTargetMinutes)
        assertEquals(OvertimeMode.SPLIT, coerced.overtimeMode)
        assertEquals(2400, coerced.overtimeThresholdMinutes)
        assertEquals(listOf("12-08"), coerced.holidaySet.disabledHolidayKeys)
        assertEquals(listOf(AutoPauseRule(360, 30)), coerced.autoPauseRules)
        assertEquals(3, coerced.vacationCarryoverDays)
        assertEquals(false, coerced.pdfDisplay?.showBalance)
        assertEquals(false, coerced.pdfDisplay?.showWorkCodeColumn)
        assertEquals(true, coerced.pdfDisplay?.showSummary)
    }

    @Test
    fun `UserData der Referenz-Fixture wird korrekt dekodiert`() {
        val fixture = Json.parseToJsonElement(
            javaClass.getResourceAsStream("/fixtures/backup-v7-reference.json")!!
                .bufferedReader().readText()
        )
        val user = decodeUserData((fixture as kotlinx.serialization.json.JsonObject)["user"])!!
        assertEquals("Märkus \"Test\" Kainer", user.name)
        assertEquals("Monteur / Aufzugsbau", user.position)
        assertNull(user.photo)
        assertEquals(listOf(0, 510, 510, 510, 510, 270, 0), user.workDays)
        assertEquals(false, user.simpleMode)
        assertEquals(true, user.expertMode)
        assertEquals("38.5-classic", user.workModelId)
    }
}
