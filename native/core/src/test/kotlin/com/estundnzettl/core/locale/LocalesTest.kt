package com.estundnzettl.core.locale

import com.estundnzettl.core.locale.holidays.getEasterSunday
import com.estundnzettl.core.locale.holidays.getOrthodoxEasterSunday
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Spot-Checks für Locale-Registry und Feiertagsberechnungen — Werte
 * entsprechen den bekannten Kalenderdaten der TS-Implementierung.
 */
class LocalesTest {

    @Test
    fun `Registry enthaelt 1 Neutral + 1 AT + 16 DE + 26 CH Locales`() {
        assertEquals(44, LOCALES.size)
        assertTrue(isLocaleId("at"))
        assertTrue(isLocaleId("de-by"))
        assertTrue(isLocaleId("ch-zh"))
        assertFalse(isLocaleId("fr"))
        assertFalse(isLocaleId(null))
    }

    @Test
    fun `getLocale faellt auf AT zurueck`() {
        assertEquals("at", getLocale(null).id)
        assertEquals("at", getLocale("unbekannt").id)
        assertEquals("de-by", getLocale("de-by").id)
    }

    @Test
    fun `Gauss-Osterformel liefert bekannte Ostersonntage`() {
        assertEquals(LocalDate.of(2024, 3, 31), getEasterSunday(2024))
        assertEquals(LocalDate.of(2025, 4, 20), getEasterSunday(2025))
        assertEquals(LocalDate.of(2026, 4, 5), getEasterSunday(2026))
    }

    @Test
    fun `AT-Feiertage 2024 enthalten feste und bewegliche Feiertage`() {
        val holidays = austriaLocale.getHolidays(2024)
        assertEquals(13, holidays.size)
        assertEquals("Neujahr", holidays["2024-01-01"])
        assertEquals("Ostermontag", holidays["2024-04-01"])
        assertEquals("Christi Himmelfahrt", holidays["2024-05-09"])
        assertEquals("Pfingstmontag", holidays["2024-05-20"])
        assertEquals("Fronleichnam", holidays["2024-05-30"])
        assertEquals("Nationalfeiertag", holidays["2024-10-26"])
        assertEquals("Stefanitag", holidays["2024-12-26"])
    }

    @Test
    fun `DE-Bayern hat regionale Feiertage, DE-Berlin nicht`() {
        val bayern = getLocale("de-by").getHolidays(2024)
        val berlin = getLocale("de-be").getHolidays(2024)

        assertEquals("Heilige Drei Könige", bayern["2024-01-06"])
        assertEquals("Fronleichnam", bayern["2024-05-30"])
        assertEquals("Allerheiligen", bayern["2024-11-01"])
        assertFalse(berlin.containsKey("2024-01-06"))
        assertEquals("Internationaler Frauentag", berlin["2024-03-08"])
        // Bundesweit in beiden
        assertEquals("Tag der Deutschen Einheit", bayern["2024-10-03"])
        assertEquals("Tag der Deutschen Einheit", berlin["2024-10-03"])
    }

    @Test
    fun `Buss- und Bettag 2024 ist Mittwoch 20_11 (nur Sachsen)`() {
        val sachsen = getLocale("de-sn").getHolidays(2024)
        assertEquals("Buß- und Bettag", sachsen["2024-11-20"])
    }

    @Test
    fun `CH-Zuerich vs CH-Luzern kantonale Unterschiede`() {
        val zh = getLocale("ch-zh").getHolidays(2024)
        val lu = getLocale("ch-lu").getHolidays(2024)

        assertEquals("Bundesfeiertag", zh["2024-08-01"])
        assertEquals("Tag der Arbeit", zh["2024-05-01"])
        assertFalse(lu.containsKey("2024-05-01"))
        assertEquals("Fronleichnam", lu["2024-05-30"])
        assertFalse(zh.containsKey("2024-05-30"))
        assertEquals("Josefstag", lu["2024-03-19"])
    }

    @Test
    fun `Neutral-Locale hat keine Feiertage und keine Halbtage`() {
        assertEquals(emptyMap(), neutralLocale.getHolidays(2024))
        assertEquals(emptyList(), neutralLocale.halfDays)
    }

    @Test
    fun `Orthodoxes Ostern 2024 ist der 5_ Mai`() {
        assertEquals(LocalDate.of(2024, 5, 5), getOrthodoxEasterSunday(2024))
    }
}
