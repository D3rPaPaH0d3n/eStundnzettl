package com.estundnzettl.core.calc

import com.estundnzettl.core.model.REPORT_FOOTER_MAX_CHARS
import com.estundnzettl.core.model.REPORT_FOOTER_MAX_LINES
import com.estundnzettl.core.model.UserData

/** Was vom Firmen-Briefkopf tatsächlich ins PDF kommt. */
data class EffectiveReportBranding(
    val logo: String?,
    val footerLines: List<String>,
)

/** Fußzeile normalisiert: getrimmt, ohne Leerzeilen, höchstens 3 Zeilen. */
fun normalizeReportFooter(footer: String): List<String> =
    footer.take(REPORT_FOOTER_MAX_CHARS)
        .lines()
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .take(REPORT_FOOTER_MAX_LINES)

/**
 * Briefkopf nur, wenn eingeschaltet und Logo oder Fußzeile vorhanden —
 * `null` heißt: PDF exakt wie ohne Branding.
 */
fun getEffectiveReportBranding(userData: UserData?): EffectiveReportBranding? {
    val branding = userData?.reportBranding ?: return null
    if (!branding.enabled) return null
    val logo = branding.logo?.takeIf { it.contains("base64,") }
    val footerLines = normalizeReportFooter(branding.footer)
    if (logo == null && footerLines.isEmpty()) return null
    return EffectiveReportBranding(logo, footerLines)
}
