package com.estundnzettl.core.calc

import com.estundnzettl.core.config.decodeUserData
import com.estundnzettl.core.config.toJson
import com.estundnzettl.core.model.REPORT_LOGO_MAX_CHARS
import com.estundnzettl.core.model.ReportBranding
import com.estundnzettl.core.model.UserData
import kotlinx.serialization.json.Json
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class ReportBrandingTest {

    private val logo = "data:image/png;base64,iVBORw0KGgo="
    private val user = UserData(name = "Test", workDays = listOf(0, 480, 480, 480, 480, 480, 0))

    // ─── Wann greift der Briefkopf? ──────────────────────────

    @Test
    fun `ohne Briefkopf bleibt alles beim Alten`() {
        assertNull(user.reportBranding)
        assertNull(getEffectiveReportBranding(user))
        assertNull(getEffectiveReportBranding(null))
    }

    @Test
    fun `ausgeschalteter Briefkopf wirkt nicht, auch mit Inhalt`() {
        val branding = ReportBranding(enabled = false, logo = logo, footer = "Musterfirma GmbH")
        assertNull(getEffectiveReportBranding(user.copy(reportBranding = branding)))
    }

    @Test
    fun `eingeschaltet ohne Logo und Fusszeile wirkt nicht`() {
        val branding = ReportBranding(enabled = true, logo = null, footer = "  \n \n")
        assertNull(getEffectiveReportBranding(user.copy(reportBranding = branding)))
    }

    @Test
    fun `Logo allein oder Fusszeile allein reichen`() {
        val onlyLogo = getEffectiveReportBranding(user.copy(reportBranding = ReportBranding(true, logo, "")))
        assertEquals(EffectiveReportBranding(logo, emptyList()), onlyLogo)

        val onlyFooter = getEffectiveReportBranding(user.copy(reportBranding = ReportBranding(true, null, "Musterfirma")))
        assertEquals(EffectiveReportBranding(null, listOf("Musterfirma")), onlyFooter)
    }

    @Test
    fun `Fusszeile wird getrimmt, Leerzeilen fliegen raus, max 3 Zeilen`() {
        val footer = "  Musterfirma GmbH \n\n Hauptstraße 1 · 1010 Wien\nFN 123456a\nZeile vier\n"
        assertEquals(
            listOf("Musterfirma GmbH", "Hauptstraße 1 · 1010 Wien", "FN 123456a"),
            normalizeReportFooter(footer),
        )
    }

    // ─── Profil-JSON (Settings + Backup) ─────────────────────

    @Test
    fun `Briefkopf-JSON-Roundtrip ist verlustfrei`() {
        val withBranding = user.copy(
            reportBranding = ReportBranding(true, logo, "Musterfirma GmbH\nUID ATU12345678"),
        )
        assertEquals(withBranding, decodeUserData(withBranding.toJson()))
    }

    @Test
    fun `Profil ohne Briefkopf schreibt kein Briefkopf-Feld`() {
        assertFalse(user.toJson().containsKey("reportBranding"))
        assertNull(decodeUserData(Json.parseToJsonElement("""{"name":"Alt"}"""))!!.reportBranding)
    }

    @Test
    fun `fremde oder zu grosse Logos werden beim Laden verworfen`() {
        fun decodeLogo(value: String) = decodeUserData(
            Json.parseToJsonElement("""{"name":"x","reportBranding":{"enabled":true,"logo":"$value","footer":"F"}}"""),
        )!!.reportBranding!!.logo

        assertNull(decodeLogo("https://example.com/logo.png"))
        assertNull(decodeLogo("data:image/png;base64," + "A".repeat(REPORT_LOGO_MAX_CHARS)))
        assertEquals(logo, decodeLogo(logo))
    }

    // ─── PDF-Archiv ──────────────────────────────────────────

    @Test
    fun `Archiv-Hash aendert sich nur bei wirksamem Briefkopf`() {
        fun hash(userData: UserData) = hashMonthContent(
            emptyList(), userData, 2026, 9, null, null, LocalDate.of(2026, 10, 1),
        )
        val base = hash(user)
        assertEquals(base, hash(user.copy(reportBranding = ReportBranding(enabled = false, logo = logo))))
        assertEquals(base, hash(user.copy(reportBranding = ReportBranding(enabled = true))))
        assertNotEquals(base, hash(user.copy(reportBranding = ReportBranding(true, logo, ""))))
        assertNotEquals(
            hash(user.copy(reportBranding = ReportBranding(true, null, "A"))),
            hash(user.copy(reportBranding = ReportBranding(true, null, "B"))),
        )
    }
}
