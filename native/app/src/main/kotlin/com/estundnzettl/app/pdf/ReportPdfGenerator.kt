package com.estundnzettl.app.pdf

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Base64
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.core.calc.WorkCodes
import com.estundnzettl.core.calc.buildDayBalanceMetaMap
import com.estundnzettl.core.calc.getEffectivePdfDisplay
import com.estundnzettl.core.calc.isOvernightShift
import com.estundnzettl.core.calc.resolveEffectiveRules
import com.estundnzettl.core.calc.PeriodStatsResult
import com.estundnzettl.core.format.formatSignedTime
import com.estundnzettl.core.format.formatTime
import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import java.io.ByteArrayOutputStream
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale as JavaLocale

/**
 * Eingaben für [ReportPdfGenerator.generate] — Pendant zu den Props von
 * ReportPdfDocument.tsx. `entries` ist die bereits gefilterte, aufsteigend
 * sortierte Liste des Berichtszeitraums; `allEntries` die komplette
 * (korrigierte) Liste für die Urlaubsbilanz.
 */
data class ReportPdfInput(
    val entries: List<Entry>,
    val userData: UserData?,
    val monthDate: YearMonth,
    /** null = ganzer Monat, sonst KW-Nummer. */
    val filterWeek: Int? = null,
    val stats: PeriodStatsResult,
    val workCodes: List<WorkCode> = emptyList(),
    val attachments: List<Attachment> = emptyList(),
    val customNote: String = "",
    val locale: AppLocale,
    val calculationConfig: CalculationConfig? = null,
    val allEntries: List<Entry> = emptyList(),
)

/**
 * Vektor-PDF-Erzeugung des Stundenzettels via android.graphics.pdf —
 * Layout-Port von ReportPdfDocument.tsx (@react-pdf/renderer). Maße in
 * PDF-Punkten (1/72"), A4 hochkant, Seitenumbruch mit wiederholtem
 * Kopf + Tabellenkopf wie das `fixed`-Verhalten von react-pdf.
 *
 * Schrift: System-Sans (auf Android = Roboto) — identisch zur im
 * Original registrierten Roboto-Familie.
 */
class ReportPdfGenerator(
    private val i18n: I18n,
) {

    // ─── Farbpalette (1:1 aus ReportPdfDocument) ────────────────────
    private object C {
        val textBlack = Color.parseColor("#000000")
        val textDark = Color.parseColor("#27272a")
        val textMedium = Color.parseColor("#52525b")
        val textLight = Color.parseColor("#a1a1aa")
        val bgGray = Color.parseColor("#fafafa")
        val bgZebra = Color.parseColor("#f4f4f5")
        val bgBlueLight = Color.parseColor("#eff6ff")
        val textBlue = Color.parseColor("#1e40af")
        val textRed = Color.parseColor("#b91c1c")
        val textGreen = Color.parseColor("#15803d")
        val textPurple = Color.parseColor("#7e22ce")
        val borderDark = Color.parseColor("#27272a")
        val borderLight = Color.parseColor("#e4e4e7")
    }

    // A4-Portrait in Punkt + Seitenränder wie styles.page
    private companion object {
        const val PAGE_W = 595
        const val PAGE_H = 842
        const val PAD_L = 18f
        const val PAD_R = 18f
        const val PAD_T = 18f
        const val PAD_B = 22f
        const val CONTENT_RIGHT = PAGE_W - PAD_R

        // Spaltenbreiten (COL in ReportPdfDocument)
        const val COL_DATE = 60f
        const val COL_TIME = 80f
        const val COL_CODE = 65f
        const val COL_HOURS = 38f
        const val COL_BALANCE = 42f
    }

    private fun t(key: String, vararg args: Pair<String, Any?>): String = i18n.t(key, *args)

    private val javaLocale: JavaLocale =
        if (i18n.language == "en") JavaLocale.ENGLISH else JavaLocale.GERMAN

    // ─── Paint-Fabriken ─────────────────────────────────────────────

    private fun textPaint(
        sizePt: Float,
        color: Int,
        bold: Boolean = false,
        italic: Boolean = false,
        letterSpacingPt: Float = 0f,
    ): TextPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = sizePt
        this.color = color
        val style = when {
            bold && italic -> Typeface.BOLD_ITALIC
            bold -> Typeface.BOLD
            italic -> Typeface.ITALIC
            else -> Typeface.NORMAL
        }
        typeface = Typeface.create(Typeface.SANS_SERIF, style)
        if (letterSpacingPt > 0f) letterSpacing = letterSpacingPt / sizePt
    }

    private fun linePaint(color: Int, widthPt: Float, dashed: Boolean = false): Paint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            style = Paint.Style.STROKE
            strokeWidth = widthPt
            if (dashed) pathEffect = DashPathEffect(floatArrayOf(2f, 2f), 0f)
        }

    private fun fillPaint(color: Int): Paint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color; style = Paint.Style.FILL }

    private val TextPaint.lineHeight: Float
        get() = fontMetrics.descent - fontMetrics.ascent

    /** Zeichnet einzeiligen Text mit Oberkante bei [top]. */
    private fun Canvas.drawTextTop(text: String, x: Float, top: Float, paint: TextPaint) {
        drawText(text, x, top - paint.fontMetrics.ascent, paint)
    }

    /** Rechtsbündiger einzeiliger Text, rechte Kante bei [right]. */
    private fun Canvas.drawTextTopRight(text: String, right: Float, top: Float, paint: TextPaint) {
        drawText(text, right - paint.measureText(text), top - paint.fontMetrics.ascent, paint)
    }

    private fun staticLayout(
        text: CharSequence,
        paint: TextPaint,
        width: Float,
        spacingMult: Float = 1f,
        align: Layout.Alignment = Layout.Alignment.ALIGN_NORMAL,
    ): StaticLayout =
        StaticLayout.Builder.obtain(text, 0, text.length, paint, width.toInt().coerceAtLeast(1))
            .setAlignment(align)
            .setLineSpacing(0f, spacingMult)
            .setIncludePad(false)
            .build()

    // ─── Datum/Monats-Formatierung (Port von formatDateParts) ───────

    private fun formatDateParts(dateStr: String): Pair<String, String> {
        val d = LocalDate.parse(dateStr)
        val wd = d.dayOfWeek.getDisplayName(TextStyle.SHORT, javaLocale).take(2)
        val ds = if (i18n.language == "en") {
            d.format(DateTimeFormatter.ofPattern("MM/dd"))
        } else {
            d.format(DateTimeFormatter.ofPattern("dd.MM."))
        }
        return wd to ds
    }

    private fun monthLabel(month: YearMonth): String =
        month.atDay(1).format(DateTimeFormatter.ofPattern("LLLL yyyy", javaLocale))

    // ─── Urlaubsbilanz (Port des vacationBalance-useMemo) ───────────

    private data class VacationBalance(
        val allowance: Int,
        val carryover: Int,
        val usedDays: Int,
        val remaining: Int,
    )

    private fun vacationBalance(input: ReportPdfInput): VacationBalance? {
        val allowance = input.calculationConfig?.vacationAllowanceDays ?: 0
        if (allowance <= 0) return null
        val carryover = input.calculationConfig?.vacationCarryoverDays ?: 0
        val yearPrefix = "${input.monthDate.year}-"
        val source = input.allEntries.ifEmpty { input.entries }
        val usedDays = source.count {
            it.type == EntryType.VACATION && it.date.startsWith(yearPrefix)
        }
        return VacationBalance(allowance, carryover, usedDays, allowance + carryover - usedDays)
    }

    // ─── Haupteinstieg ──────────────────────────────────────────────

    fun generate(input: ReportPdfInput): ByteArray {
        val display = getEffectivePdfDisplay(input.calculationConfig)
        val rules = resolveEffectiveRules(input.locale, input.calculationConfig)
        val showOvertimeColumns = rules.overtimeMode != OvertimeMode.NONE
        val showCode = display.showWorkCodeColumn
        val showBalance = display.showBalance

        val workCodeLabels = input.workCodes.associate { it.id to it.label }
        val attachmentsByEntry = input.attachments.groupBy { it.entryId }
        val dayMeta = buildDayBalanceMetaMap(
            input.entries, input.userData, input.locale, input.calculationConfig,
        )

        // Spaltengeometrie abhängig von den Anzeige-Toggles
        val xDate = PAD_L
        val xTime = xDate + COL_DATE
        val xProject = xTime + COL_TIME
        val balanceRight = CONTENT_RIGHT.toFloat()
        val hoursRight = balanceRight - (if (showBalance) COL_BALANCE else 0f)
        val codeLeft = hoursRight - COL_HOURS - (if (showCode) COL_CODE else 0f)
        val projectWidth = codeLeft - xProject - 6f // paddingRight 6

        val doc = PdfDocument()
        var pageNumber = 0
        var page: PdfDocument.Page? = null
        var canvas: Canvas? = null
        var y = PAD_T

        fun startPage() {
            pageNumber++
            page = doc.startPage(
                PdfDocument.PageInfo.Builder(PAGE_W, PAGE_H, pageNumber).create(),
            )
            canvas = page!!.canvas
            y = PAD_T
            y = drawHeader(canvas!!, y, input)
            y = drawTableHead(canvas!!, y, showCode, showBalance, xDate, xTime, xProject, codeLeft, hoursRight, balanceRight)
        }

        fun endPage() {
            page?.let { doc.finishPage(it) }
            page = null
        }

        fun ensureSpace(needed: Float) {
            if (y + needed > PAGE_H - PAD_B) {
                endPage()
                startPage()
            }
        }

        startPage()

        // ── Zeilen ──────────────────────────────────────────────────
        input.entries.forEachIndexed { idx, e ->
            val prev = input.entries.getOrNull(idx - 1)
            val next = input.entries.getOrNull(idx + 1)
            val row = buildRow(
                e = e,
                sameDay = prev?.date == e.date,
                lastOfDay = next?.date != e.date,
                workCodeLabels = workCodeLabels,
                attachments = attachmentsByEntry[e.id].orEmpty(),
                meta = dayMeta[e.id],
                showAttachments = display.showAttachmentsList,
                projectWidth = projectWidth,
            )
            ensureSpace(row.height)
            drawRow(
                canvas!!, y, row, e,
                showCode, showBalance,
                xDate, xTime, xProject, codeLeft, hoursRight, balanceRight,
            )
            y += row.height
        }

        // ── Summary (wrap=false → am Stück auf eine Seite) ──────────
        if (display.showSummary) {
            val vac = if (display.showVacationBalance) vacationBalance(input) else null
            val summaryHeight = drawSummary(
                null, 0f, input, display.showTargetTime, display.showBalance,
                display.showOvertimeSplit && showOvertimeColumns, vac,
            )
            ensureSpace(8f + summaryHeight)
            y += 8f
            // Box-Hintergrund + Rahmen zuerst (Höhe aus dem Messdurchlauf)
            val box = RectF(PAD_L, y, CONTENT_RIGHT.toFloat(), y + summaryHeight)
            canvas!!.drawRoundRect(box, 4f, 4f, fillPaint(C.bgGray))
            canvas!!.drawRoundRect(box, 4f, 4f, linePaint(C.borderLight, 0.5f))
            drawSummary(
                canvas!!, y, input, display.showTargetTime, display.showBalance,
                display.showOvertimeSplit && showOvertimeColumns, vac,
            )
            y += summaryHeight
        }

        // ── Notiz-Block (wrap=false) ────────────────────────────────
        if (display.showCustomNote && input.customNote.isNotBlank()) {
            val noteHeight = drawNote(null, 0f, input.customNote)
            ensureSpace(14f + noteHeight)
            y += 14f
            drawNote(canvas!!, y, input.customNote)
            y += noteHeight
        }

        endPage()

        val out = ByteArrayOutputStream()
        doc.writeTo(out)
        doc.close()
        return out.toByteArray()
    }

    // ─── Kopfzeile (styles.headerRow, fixed) ────────────────────────

    private fun drawHeader(canvas: Canvas, top: Float, input: ReportPdfInput): Float {
        val titlePaint = textPaint(18f, C.textDark, bold = true, letterSpacingPt = 0.4f)
        val companyPaint = textPaint(9f, C.textMedium, bold = true)
        val namePaint = textPaint(9.5f, C.textBlack, bold = true)
        val monthPaint = textPaint(8.5f, C.textMedium)

        val company = input.userData?.company.orEmpty()
        val name = input.userData?.name.orEmpty()
        val monthText = monthLabel(input.monthDate) + if (input.filterWeek != null) {
            " (${t("dashboard.calendarWeekShort", "week" to input.filterWeek)})"
        } else {
            ""
        }
        val photoBitmap = decodeDataUrl(input.userData?.photo)

        val leftH = titlePaint.lineHeight +
            (if (company.isNotEmpty()) 2f + companyPaint.lineHeight else 0f)
        val metaH = namePaint.lineHeight + 1f + monthPaint.lineHeight
        val rightH = maxOf(metaH, if (photoBitmap != null) 38f else 0f)
        val contentH = maxOf(leftH, rightH)

        // alignItems flex-end → Blöcke an der Unterkante ausrichten
        var ly = top + contentH - leftH
        canvas.drawTextTop(t("reports.title").uppercase(javaLocale), PAD_L, ly, titlePaint)
        ly += titlePaint.lineHeight
        if (company.isNotEmpty()) {
            canvas.drawTextTop(company, PAD_L, ly + 2f, companyPaint)
        }

        val avatarSize = 38f
        val metaRight = if (photoBitmap != null) CONTENT_RIGHT - avatarSize - 8f else CONTENT_RIGHT.toFloat()
        var ry = top + contentH - metaH
        canvas.drawTextTopRight(name, metaRight, ry, namePaint)
        ry += namePaint.lineHeight + 1f
        canvas.drawTextTopRight(monthText, metaRight, ry, monthPaint)

        if (photoBitmap != null) {
            val left = CONTENT_RIGHT - avatarSize
            val avatarTop = top + contentH - avatarSize
            val rect = RectF(left, avatarTop, left + avatarSize, avatarTop + avatarSize)
            canvas.save()
            val clip = Path().apply { addOval(rect, Path.Direction.CW) }
            canvas.clipPath(clip)
            canvas.drawBitmap(photoBitmap, null, coverRect(photoBitmap, rect), fillPaint(Color.WHITE))
            canvas.restore()
            canvas.drawOval(rect, linePaint(C.borderLight, 1f))
        }

        val borderY = top + contentH + 8f
        canvas.drawLine(PAD_L, borderY, CONTENT_RIGHT.toFloat(), borderY, linePaint(C.borderDark, 2f))
        return borderY + 2f + 10f
    }

    /** Skaliert das Bitmap auf "cover" innerhalb von [target]. */
    private fun coverRect(bitmap: Bitmap, target: RectF): RectF {
        val scale = maxOf(target.width() / bitmap.width, target.height() / bitmap.height)
        val w = bitmap.width * scale
        val h = bitmap.height * scale
        val cx = target.centerX()
        val cy = target.centerY()
        return RectF(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    }

    private fun decodeDataUrl(dataUrl: String?): Bitmap? {
        if (dataUrl.isNullOrBlank()) return null
        return try {
            val base64 = dataUrl.substringAfter("base64,", "")
            if (base64.isEmpty()) return null
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } catch (_: Exception) {
            null
        }
    }

    // ─── Tabellenkopf (styles.thead, fixed) ─────────────────────────

    private fun drawTableHead(
        canvas: Canvas,
        top: Float,
        showCode: Boolean,
        showBalance: Boolean,
        xDate: Float,
        xTime: Float,
        xProject: Float,
        codeLeft: Float,
        hoursRight: Float,
        balanceRight: Float,
    ): Float {
        val th = textPaint(7.5f, C.textMedium, bold = true, letterSpacingPt = 0.3f)
        val textTop = top + 4f
        canvas.drawTextTop(t("reports.columns.date").uppercase(javaLocale), xDate, textTop, th)
        canvas.drawTextTop(t("reports.columns.time").uppercase(javaLocale), xTime, textTop, th)
        canvas.drawTextTop(t("reports.columns.project").uppercase(javaLocale), xProject, textTop, th)
        if (showCode) {
            canvas.drawTextTop(t("reports.columns.code").uppercase(javaLocale), codeLeft, textTop, th)
        }
        canvas.drawTextTopRight(t("reports.columns.hours").uppercase(javaLocale), hoursRight, textTop, th)
        if (showBalance) {
            canvas.drawTextTopRight(t("reports.columns.balance").uppercase(javaLocale), balanceRight, textTop, th)
        }
        val bottom = textTop + th.lineHeight + 4f
        canvas.drawLine(PAD_L, bottom, CONTENT_RIGHT.toFloat(), bottom, linePaint(C.borderDark, 2f))
        return bottom + 2f
    }

    // ─── Zeile (Row-Komponente) ─────────────────────────────────────

    private class RowLayout(
        val height: Float,
        val sameDay: Boolean,
        val lastOfDay: Boolean,
        val timeLine1: String?,
        val timeLine1Paint: TextPaint,
        val timeLine2: String?,
        val timeLine2Paint: TextPaint?,
        val projectLayout: StaticLayout,
        val attachmentLayout: StaticLayout?,
        val codeText: String,
        val hoursText: String,
        val hoursPaint: TextPaint,
        val balanceText: String?,
        val balancePaint: TextPaint?,
        val meta: com.estundnzettl.core.calc.DayBalanceMeta?,
    )

    private fun buildRow(
        e: Entry,
        sameDay: Boolean,
        lastOfDay: Boolean,
        workCodeLabels: Map<Int, String>,
        attachments: List<Attachment>,
        meta: com.estundnzettl.core.calc.DayBalanceMeta?,
        showAttachments: Boolean,
        projectWidth: Float,
    ): RowLayout {
        val timeBold = textPaint(9f, C.textDark, bold = true)
        val emptyDash = textPaint(9f, C.textLight)

        // Zeit-Zelle
        var line1: String? = null
        var line1Paint = timeBold
        var line2: String? = null
        var line2Paint: TextPaint? = null
        if (!e.start.isNullOrEmpty() && !e.end.isNullOrEmpty()) {
            val suffix = if (isOvernightShift(e.start!!, e.end!!)) "⁺¹" else ""
            line1 = "${e.start} – ${e.end}$suffix"
            if (e.type == EntryType.WORK) {
                if (e.pause > 0) {
                    line2 = t("reports.pauseMin", "minutes" to e.pause).uppercase(javaLocale)
                    line2Paint = textPaint(6.5f, C.textMedium)
                } else {
                    line2 = t("reports.noPauseUpper").uppercase(javaLocale)
                    line2Paint = textPaint(6.5f, C.textLight)
                }
            }
        } else if (e.type == EntryType.PUBLIC_HOLIDAY) {
            line1 = t("entryTypes.holiday")
        } else {
            line1 = "—"
            line1Paint = emptyDash
        }

        // Projekt
        var projectColor = C.textMedium
        var projectText = e.project.orEmpty()
        when (e.type) {
            EntryType.PUBLIC_HOLIDAY -> {
                projectColor = C.textBlue
                projectText = e.project.takeUnless { it.isNullOrEmpty() } ?: t("reports.publicHoliday")
            }
            EntryType.TIME_COMP -> {
                projectColor = C.textPurple
                projectText = t("entryTypes.timeComp")
            }
            EntryType.VACATION -> projectText = t("entryTypes.vacation")
            EntryType.SICK -> projectText = t("entryTypes.sick")
            else -> {}
        }
        val projectLayout = staticLayout(projectText, textPaint(9f, projectColor, bold = true), projectWidth)

        val attachmentLayout = if (showAttachments && attachments.isNotEmpty()) {
            val text = t("reports.documentsLabel") + " " + attachments.joinToString(", ") { it.label }
            staticLayout(text, textPaint(6.5f, C.textLight), projectWidth)
        } else {
            null
        }

        // Stunden
        var hoursText = formatTime(e.netDuration)
        var hoursPaint = textPaint(9f, C.textDark, bold = true)
        if (e.type == EntryType.WORK && e.code == WorkCodes.DRIVE) {
            hoursText = "—"
            hoursPaint = textPaint(9f, C.textLight)
        } else if (e.type == EntryType.PUBLIC_HOLIDAY) {
            hoursPaint = textPaint(9f, C.textBlue, bold = true)
        } else if (e.type == EntryType.TIME_COMP) {
            hoursText = "—"
            hoursPaint = textPaint(9f, C.textPurple, bold = true)
        }

        // Saldo
        var balanceText: String? = null
        var balancePaint: TextPaint? = null
        if (lastOfDay && meta?.showBalance == true) {
            balanceText = formatSignedTime(meta.balance)
            balancePaint = textPaint(
                7.5f,
                if (meta.balance >= 0) C.textGreen else C.textRed,
                bold = true,
            )
        }

        val timeH = line1Paint.lineHeight + (line2Paint?.let { 1f + it.lineHeight } ?: 0f)
        val projectH = projectLayout.height.toFloat() +
            (attachmentLayout?.let { 2f + it.height.toFloat() } ?: 0f)
        val contentH = maxOf(timeH, projectH, textPaint(9f, C.textDark).lineHeight)
        val height = 4f + contentH + 4f + 0.5f

        return RowLayout(
            height, sameDay, lastOfDay,
            line1, line1Paint, line2, line2Paint,
            projectLayout, attachmentLayout,
            codeText = e.code?.let { workCodeLabels[it] }.orEmpty(),
            hoursText = hoursText, hoursPaint = hoursPaint,
            balanceText = balanceText, balancePaint = balancePaint,
            meta = meta,
        )
    }

    private fun drawRow(
        canvas: Canvas,
        top: Float,
        row: RowLayout,
        e: Entry,
        showCode: Boolean,
        showBalance: Boolean,
        xDate: Float,
        xTime: Float,
        xProject: Float,
        codeLeft: Float,
        hoursRight: Float,
        balanceRight: Float,
    ) {
        // Hintergrund: Feiertag > Zebra
        val bg = when {
            e.type == EntryType.PUBLIC_HOLIDAY -> C.bgBlueLight
            row.meta?.isEvenDay == true -> C.bgZebra
            else -> null
        }
        if (bg != null) {
            canvas.drawRect(PAD_L, top, CONTENT_RIGHT.toFloat(), top + row.height, fillPaint(bg))
        }

        val contentTop = top + 4f

        // Datum (nur erste Zeile des Tages)
        if (!row.sameDay) {
            val (wd, ds) = formatDateParts(e.date)
            canvas.drawTextTop(wd, xDate, contentTop, textPaint(9f, C.textBlack, bold = true))
            canvas.drawTextTop(ds, xDate + 18f, contentTop, textPaint(9f, C.textMedium))
        }

        // Zeit
        row.timeLine1?.let { canvas.drawTextTop(it, xTime, contentTop, row.timeLine1Paint) }
        if (row.timeLine2 != null && row.timeLine2Paint != null) {
            canvas.drawTextTop(
                row.timeLine2, xTime,
                contentTop + row.timeLine1Paint.lineHeight + 1f,
                row.timeLine2Paint,
            )
        }

        // Projekt (+ Anhänge)
        canvas.save()
        canvas.translate(xProject, contentTop)
        row.projectLayout.draw(canvas)
        row.attachmentLayout?.let {
            canvas.translate(0f, row.projectLayout.height + 2f)
            it.draw(canvas)
        }
        canvas.restore()

        // Code
        if (showCode && row.codeText.isNotEmpty()) {
            canvas.drawTextTop(row.codeText, codeLeft, contentTop, textPaint(7.5f, C.textMedium))
        }

        // Stunden
        canvas.drawTextTopRight(row.hoursText, hoursRight, contentTop, row.hoursPaint)

        // Saldo
        if (showBalance && row.balanceText != null && row.balancePaint != null) {
            canvas.drawTextTopRight(row.balanceText, balanceRight, contentTop, row.balancePaint)
        }

        // Untere Trennlinie nur bei letzter Zeile des Tages
        if (row.lastOfDay) {
            val by = top + row.height - 0.25f
            canvas.drawLine(PAD_L, by, CONTENT_RIGHT.toFloat(), by, linePaint(C.borderLight, 0.5f))
        }
    }

    // ─── Zusammenfassung (Summary-Komponente) ───────────────────────
    // canvas == null → nur Höhe messen (wrap=false-Emulation).

    private fun drawSummary(
        canvas: Canvas?,
        top: Float,
        input: ReportPdfInput,
        showTargetTime: Boolean,
        showBalance: Boolean,
        showOvertimeSplit: Boolean,
        vacation: VacationBalance?,
    ): Float {
        val stats = input.stats
        val simpleMode = input.userData?.simpleMode == true
        val showSollSection = !simpleMode && showTargetTime
        val showSaldoSection = !simpleMode && showBalance
        val overtimeVisible = showOvertimeSplit &&
            (stats.overtimeSplit.mehrarbeit > 0 || stats.overtimeSplit.ueberstunden > 0)

        val pad = 8f
        val boxLeft = PAD_L
        val boxRight = CONTENT_RIGHT.toFloat()
        val innerLeft = boxLeft + pad
        val innerRight = boxRight - pad
        val innerWidth = innerRight - innerLeft
        val colWidth = innerWidth / 2f
        val leftColRight = innerLeft + colWidth - 12f // paddingRight 12
        val rightColLeft = innerLeft + colWidth

        val titlePaint = textPaint(7.5f, C.textMedium, bold = true, letterSpacingPt = 0.4f)

        var yy = top + pad

        // Titel mit Trennlinie
        canvas?.drawTextTop(t("reports.summary.title").uppercase(javaLocale), innerLeft, yy, titlePaint)
        yy += titlePaint.lineHeight + 2f
        canvas?.drawLine(innerLeft, yy, innerRight, yy, linePaint(C.borderLight, 0.5f))
        yy += 0.5f + 4f

        val gridTop = yy

        fun sumRow(
            canvasRef: Canvas?,
            rowTop: Float,
            left: Float,
            right: Float,
            label: String,
            value: String,
            labelColor: Int = C.textDark,
            valueColor: Int = C.textDark,
            valueBold: Boolean = true,
            size: Float = 8f,
            bothBold: Boolean = false,
        ): Float {
            val lp = textPaint(size, labelColor, bold = bothBold)
            val vp = textPaint(size, valueColor, bold = valueBold || bothBold)
            canvasRef?.drawTextTop(label, left, rowTop, lp)
            canvasRef?.drawTextTopRight(value, right, rowTop, vp)
            return lp.lineHeight
        }

        // ── Linke Spalte: Kategorien ─────────────────────────────
        var leftY = gridTop
        leftY += sumRow(canvas, leftY, innerLeft, leftColRight, t("reports.summary.work"), formatTime(stats.work)) + 1f
        if (stats.holiday > 0) {
            leftY += sumRow(
                canvas, leftY, innerLeft, leftColRight, t("reports.summary.holidays"),
                formatTime(stats.holiday), C.textBlue, C.textBlue,
            ) + 1f
        }
        if (stats.vacation > 0) {
            leftY += sumRow(
                canvas, leftY, innerLeft, leftColRight, t("reports.summary.vacation"),
                formatTime(stats.vacation), C.textBlue, C.textBlue,
            ) + 1f
        }
        if (stats.timeComp > 0) {
            leftY += sumRow(
                canvas, leftY, innerLeft, leftColRight, t("reports.summary.timeComp"),
                formatTime(stats.timeComp), C.textPurple, C.textPurple,
            ) + 1f
        }
        if (stats.sick > 0) {
            leftY += sumRow(
                canvas, leftY, innerLeft, leftColRight, t("reports.summary.sickness"),
                formatTime(stats.sick), C.textRed, C.textRed,
            ) + 1f
        }

        // ── Rechte Spalte: Gesamtwerte ───────────────────────────
        var rightY = gridTop
        rightY += sumRow(
            canvas, rightY, rightColLeft, innerRight,
            t("reports.summary.totalActual"), formatTime(stats.totalIst),
        ) + 2f
        canvas?.drawLine(rightColLeft, rightY, innerRight, rightY, linePaint(C.borderLight, 0.5f, dashed = true))
        rightY += 0.5f + 2f
        if (showSollSection) {
            rightY += sumRow(
                canvas, rightY, rightColLeft, innerRight,
                t("reports.summary.targetTime"), formatTime(stats.totalTarget),
                C.textMedium, C.textMedium, valueBold = false,
            ) + 1f
        }
        if (showSaldoSection) {
            rightY += 3f
            rightY += sumRow(
                canvas, rightY, rightColLeft, innerRight,
                t("reports.summary.balance"), formatSignedTime(stats.totalSaldo),
                C.textBlack, if (stats.totalSaldo >= 0) C.textGreen else C.textRed,
                size = 9f, bothBold = true,
            )
        }
        if (overtimeVisible) {
            rightY += 4f
            canvas?.drawLine(rightColLeft, rightY, innerRight, rightY, linePaint(C.borderLight, 0.5f, dashed = true))
            rightY += 0.5f + 2f
            if (stats.overtimeSplit.mehrarbeit > 0) {
                rightY += sumRow(
                    canvas, rightY, rightColLeft, innerRight,
                    t("reports.summary.extraHours"), formatTime(stats.overtimeSplit.mehrarbeit),
                    C.textBlue, C.textBlue,
                ) + 1f
            }
            if (stats.overtimeSplit.ueberstunden > 0) {
                rightY += sumRow(
                    canvas, rightY, rightColLeft, innerRight,
                    t("reports.summary.overtime"), formatTime(stats.overtimeSplit.ueberstunden),
                    C.textPurple, C.textPurple,
                ) + 1f
            }
        }

        yy = maxOf(leftY, rightY)

        // ── Fahrtzeit-Fußzeile ───────────────────────────────────
        if (stats.drive > 0) {
            yy += 3f
            canvas?.drawLine(innerLeft, yy, innerRight, yy, linePaint(C.borderLight, 0.5f))
            yy += 0.5f + 2f
            val drivePaint = textPaint(7.5f, C.textLight, italic = true)
            canvas?.drawTextTop(t("reports.summary.driveUnpaid"), innerLeft, yy, drivePaint)
            canvas?.drawTextTopRight(formatTime(stats.drive), innerRight, yy, drivePaint)
            yy += drivePaint.lineHeight
        }

        // ── Urlaubsbilanz ────────────────────────────────────────
        if (vacation != null) {
            yy += 4f
            canvas?.drawLine(innerLeft, yy, innerRight, yy, linePaint(C.borderLight, 0.5f))
            yy += 0.5f + 3f
            val days = t("reports.vacationBalance.days")
            yy += sumRow(
                canvas, yy, innerLeft, innerRight,
                t("reports.vacationBalance.allowance"), "${vacation.allowance} $days",
                C.textMedium, C.textBlack, size = 7.5f,
            ) + 1.5f
            if (vacation.carryover != 0) {
                val label = if (vacation.carryover > 0) {
                    t("reports.vacationBalance.carryoverPositive")
                } else {
                    t("reports.vacationBalance.carryoverNegative")
                }
                val value = (if (vacation.carryover > 0) "+${vacation.carryover}" else "${vacation.carryover}") + " $days"
                yy += sumRow(canvas, yy, innerLeft, innerRight, label, value, C.textMedium, C.textBlack, size = 7.5f) + 1.5f
            }
            yy += sumRow(
                canvas, yy, innerLeft, innerRight,
                t("reports.vacationBalance.used", "year" to input.monthDate.year),
                "${vacation.usedDays} $days",
                C.textMedium, C.textBlack, size = 7.5f,
            ) + 1.5f
            yy += sumRow(
                canvas, yy, innerLeft, innerRight,
                t("reports.vacationBalance.remaining"), "${vacation.remaining} $days",
                C.textBlack, if (vacation.remaining >= 0) C.textGreen else C.textRed,
                size = 7.5f, bothBold = true,
            )
        }

        // Box-Hintergrund + Rahmen zeichnet der Aufrufer VOR dem Text —
        // dafür läuft diese Funktion zweiphasig (canvas==null misst nur).
        yy += pad
        return yy - top
    }

    // ─── Notiz-Block ────────────────────────────────────────────────

    private fun drawNote(canvas: Canvas?, top: Float, note: String): Float {
        val titlePaint = textPaint(8f, C.textMedium, bold = true)
        val notePaint = textPaint(8.5f, C.textDark)
        val layout = staticLayout(note, notePaint, CONTENT_RIGHT - PAD_L, spacingMult = 1.2f)

        var yy = top
        canvas?.drawLine(PAD_L, yy, CONTENT_RIGHT.toFloat(), yy, linePaint(C.borderLight, 1f, dashed = true))
        yy += 1f + 8f
        canvas?.drawTextTop(t("reports.notesTitle").uppercase(javaLocale), PAD_L, yy, titlePaint)
        yy += titlePaint.lineHeight + 4f
        if (canvas != null) {
            canvas.save()
            canvas.translate(PAD_L, yy)
            layout.draw(canvas)
            canvas.restore()
        }
        yy += layout.height
        return yy - top
    }
}
