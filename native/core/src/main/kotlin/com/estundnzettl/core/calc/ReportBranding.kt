package com.estundnzettl.core.calc

import com.estundnzettl.core.model.REPORT_FOOTER_MAX_CHARS
import com.estundnzettl.core.model.REPORT_FOOTER_MAX_LINES
import com.estundnzettl.core.model.UserData

/** Was vom Firmen-Briefkopf tatsächlich ins PDF kommt. */
data class EffectiveReportBranding(
    val logo: String?,
    val footerLines: List<String>,
)

/** Fußzeile fürs PDF: getrimmt, ohne Leerzeilen, höchstens 3 Zeilen. */
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

// ─── Eingabe der Fußzeile ───────────────────────────────────

/** Ergebnis einer Fußzeilen-Eingabe; [cursor] null = Auswahl der Eingabe beibehalten. */
data class ReportFooterEdit(val text: String, val cursor: Int?, val truncated: Boolean)

/** Wie im PDF zählen nur Zeilen mit Inhalt. */
private fun footerContentLines(text: String): Int = text.lines().count { it.isNotBlank() }

private fun fitsReportFooter(text: String): Boolean =
    text.length <= REPORT_FOOTER_MAX_CHARS && footerContentLines(text) <= REPORT_FOOTER_MAX_LINES

/**
 * Begrenzt eine Eingabe auf 3 Inhaltszeilen / 300 Zeichen. Gekürzt wird
 * nur der neu eingefügte Teil — bestehender Text bleibt immer erhalten,
 * und ein Emoji wird nie halbiert. Löschen in einem (z.B. aus einem
 * fremden Backup) zu langen Text ist immer erlaubt.
 */
fun limitReportFooterEdit(old: String, new: String): ReportFooterEdit {
    if (fitsReportFooter(new)) return ReportFooterEdit(new, null, false)
    if (new.length <= old.length && footerContentLines(new) <= footerContentLines(old)) {
        return ReportFooterEdit(new, null, false)
    }

    val prefix = old.commonPrefixWith(new).length
    val maxSuffix = minOf(old.length, new.length) - prefix
    val suffix = minOf(old.commonSuffixWith(new).length, maxSuffix)
    val head = new.substring(0, prefix)
    val inserted = new.substring(prefix, new.length - suffix)
    val tail = new.substring(new.length - suffix)

    for (keep in inserted.length - 1 downTo 0) {
        if (keep > 0 && inserted[keep - 1].isHighSurrogate()) continue
        val candidate = head + inserted.take(keep) + tail
        if (fitsReportFooter(candidate)) return ReportFooterEdit(candidate, prefix + keep, true)
    }
    // Selbst ohne Einfügung zu lang (Altbestand) → Eingabe verwerfen
    return ReportFooterEdit(old, minOf(prefix, old.length), true)
}
