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

private fun Char.isLineBreak() = this == '\n' || this == '\r'

/**
 * Begrenzt eine Eingabe auf 3 Inhaltszeilen / 300 Zeichen. Gekürzt wird
 * nur der neu eingefügte Teil — bestehender Text bleibt immer erhalten,
 * ein Emoji wird nie halbiert und gekürzter Text verschmilzt nie mit der
 * folgenden Zeile. Löschen in einem (z.B. aus einem fremden Backup) zu
 * langen Text ist immer erlaubt.
 *
 * Die Einfügestelle kommt bevorzugt aus dem Textfeld: ersetzte Auswahl
 * [replacedStart]..[replacedEnd] im alten Text und Cursor [newCursor]
 * danach. Passen die Angaben nicht zum Text, wird sie aus dem Unterschied
 * geschätzt — das kann bei gleichen Zeichen rund um den Cursor danebenliegen.
 */
fun limitReportFooterEdit(
    old: String,
    new: String,
    replacedStart: Int? = null,
    replacedEnd: Int? = null,
    newCursor: Int? = null,
): ReportFooterEdit {
    if (fitsReportFooter(new)) return ReportFooterEdit(new, null, false)
    if (new.length <= old.length && footerContentLines(new) <= footerContentLines(old)) {
        return ReportFooterEdit(new, null, false)
    }

    val (prefix, suffix) = splitByCursor(old, new, replacedStart, replacedEnd, newCursor)
        ?: splitByDiff(old, new)
    val head = new.substring(0, prefix)
    val inserted = new.substring(prefix, new.length - suffix)
    val tail = new.substring(new.length - suffix)

    // Mehr als 300 Zeichen können nie passen → Suche begrenzen (riesiges Einfügen)
    val maxKeep = minOf(inserted.length - 1, REPORT_FOOTER_MAX_CHARS - head.length - tail.length)
    val tailStartsLine = tail.isEmpty() || tail.first().isLineBreak()
    // Bleibt von der Eingabe nichts übrig, gilt sie als abgelehnt (Auswahl bleibt erhalten)
    for (keep in maxKeep downTo 1) {
        val kept = inserted.take(keep)
        val dropped = inserted.substring(keep)
        if (keep > 0 && kept.last().isHighSurrogate()) continue
        if (kept.endsWith('\r') && dropped.startsWith('\n')) continue
        // Fiele der trennende Zeilenumbruch weg, klebte der Rest an der Folgezeile
        val mergesIntoTail = keep > 0 && !tailStartsLine && !kept.last().isLineBreak() &&
            dropped.any { it.isLineBreak() }
        if (mergesIntoTail) continue
        val candidate = head + kept + tail
        if (fitsReportFooter(candidate)) return ReportFooterEdit(candidate, prefix + keep, true)
    }
    return ReportFooterEdit(old, minOf(prefix, old.length), true)
}

/** (Länge Kopf, Länge Ende) aus Auswahl + Cursor, wenn sie zum Text passen. */
private fun splitByCursor(old: String, new: String, start: Int?, end: Int?, cursor: Int?): Pair<Int, Int>? {
    if (start == null || end == null || cursor == null) return null
    if (start < 0 || end < start || end > old.length || cursor < start || cursor > new.length) return null
    if (new.length - cursor != old.length - end) return null
    if (!new.regionMatches(0, old, 0, start)) return null
    if (!new.regionMatches(cursor, old, end, old.length - end)) return null
    return start to old.length - end
}

/** Schätzung über gemeinsamen Anfang und gemeinsames Ende. */
private fun splitByDiff(old: String, new: String): Pair<Int, Int> {
    val prefix = old.commonPrefixWith(new).length
    val maxSuffix = minOf(old.length, new.length) - prefix
    return prefix to minOf(old.commonSuffixWith(new).length, maxSuffix)
}
