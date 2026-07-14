package com.estundnzettl.app.ui

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddComment
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.OpenInFull
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.pdf.ReportPdfGenerator
import com.estundnzettl.app.pdf.ReportPdfInput
import com.estundnzettl.app.ui.settings.SettingsToggleRow
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.calc.applyEffectiveDurations
import com.estundnzettl.core.calc.calculatePeriodStats
import com.estundnzettl.core.calc.getEffectivePdfDisplay
import com.estundnzettl.core.calc.getWeekNumber
import com.estundnzettl.core.calc.getWeekRangeInMonth
import com.estundnzettl.core.model.Attachment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale as JavaLocale

/**
 * PDF-Bericht mit Live-Vorschau — Port von PrintReport.tsx.
 *
 * Die Vorschau rendert die fertig generierte PDF über PdfRenderer auf
 * Bitmaps (Pendant zur pdfjs-Canvas-Vorschau der Web-App). Export via
 * Teilen (FileProvider) oder Speichern (SAF-Dialog statt festem
 * Dokumente-Ordner — der Nutzer wählt den Zielort selbst).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportScreen(viewModel: MainViewModel) {
    val context = LocalContext.current
    val colors = LocalAppColors.current
    val i18n = LocalI18n.current
    val s by viewModel.state.collectAsState()

    val userData = s.userData
    val locale = s.locale
    val config = s.calculationConfig
    val month = s.currentMonth
    val language = s.language
    val javaLocale = if (language == "en") JavaLocale.ENGLISH else JavaLocale.GERMAN

    // Korrigierte Monats-Einträge inkl. Auto-Feiertage (Single Source of Truth)
    val entries = s.appData?.entriesWithHolidays ?: emptyList()

    // Komplette Liste mit Krank-Korrektur — für Urlaubsbilanz + Wochen-Stats
    val allCorrected = remember(s.appData, userData, locale, config) {
        applyEffectiveDurations(viewModel.rawAllEntries(), userData, locale, config)
    }

    // Filter: null = ganzer Monat, sonst KW (Startwert wie PrintReport:
    // aktueller Monat → aktuelle Woche)
    var filterWeek by remember {
        mutableStateOf(
            if (month == YearMonth.now()) getWeekNumber(LocalDate.now()) else null,
        )
    }

    val filteredEntries = remember(entries, filterWeek) {
        val week = filterWeek
        val list = if (week == null) {
            entries
        } else {
            entries.filter { getWeekNumber(LocalDate.parse(it.date)) == week }
        }
        list.sortedWith(compareBy({ it.date }, { it.start ?: "" }))
    }

    val availableWeeks = remember(entries) {
        entries.map { getWeekNumber(LocalDate.parse(it.date)) }.distinct().sortedDescending()
    }

    val dateFmt = remember(language) {
        DateTimeFormatter.ofPattern(if (language == "en") "MM/dd" else "dd.MM.")
    }

    // KW-Label "01.07. - 07.07." — Port von getWeekLabel (inkl. JS-Datumslogik)
    fun weekLabel(week: Int): String {
        val simple = LocalDate.of(month.year, 1, 1).plusDays(((week - 1) * 7).toLong())
        val jsDay = simple.dayOfWeek.value % 7 // JS getDay(): 0 = Sonntag
        val monday = if (jsDay <= 4) {
            simple.plusDays((1 - jsDay).toLong())
        } else {
            simple.plusDays((8 - jsDay).toLong())
        }
        val sunday = monday.plusDays(6)
        return "${monday.format(dateFmt)} - ${sunday.format(dateFmt)}"
    }

    // Statistik-Zeitraum (Monat oder Woche des ersten gefilterten Eintrags)
    val period = remember(filterWeek, month, filteredEntries) {
        val week = filterWeek
        if (week == null) {
            month.atDay(1) to month.atEndOfMonth()
        } else if (filteredEntries.isNotEmpty()) {
            val range = getWeekRangeInMonth(LocalDate.parse(filteredEntries.first().date), month.atDay(1))
            range.start to range.end
        } else {
            LocalDate.now() to LocalDate.now()
        }
    }

    val stats = remember(entries, userData, period, allCorrected, locale, config) {
        calculatePeriodStats(entries, userData, period.first, period.second, allCorrected, locale, config)
    }

    val allAttachments by produceState(initialValue = emptyList<Attachment>(), s.appData) {
        value = viewModel.getAllAttachments()
    }
    val reportAttachments = remember(filteredEntries, allAttachments) {
        val ids = filteredEntries.map { it.id }.toSet()
        allAttachments.filter { it.entryId in ids }
    }

    var customNote by remember { mutableStateOf("") }
    var userScale by remember { mutableStateOf(1f) }
    var noteDialogOpen by remember { mutableStateOf(false) }
    var exportDialogOpen by remember { mutableStateOf(false) }
    var layoutPanelOpen by remember { mutableStateOf(false) }
    var filterMenuOpen by remember { mutableStateOf(false) }
    var monthPickerOpen by remember { mutableStateOf(false) }

    val layoutTogglesAvailable = (userData?.expertMode == true) && config != null

    // ── PDF-Generierung + Vorschau-Render ───────────────────────────
    var pdfBytes by remember { mutableStateOf<ByteArray?>(null) }
    var pageBitmaps by remember { mutableStateOf<List<Bitmap>>(emptyList()) }

    val previewWidthPx = with(LocalDensity.current) {
        (LocalConfiguration.current.screenWidthDp.dp.toPx() * 1.5f).toInt().coerceAtMost(2000)
    }

    fun buildInput(note: String) = ReportPdfInput(
        entries = filteredEntries,
        userData = userData,
        monthDate = month,
        filterWeek = filterWeek,
        stats = stats,
        workCodes = s.workCodes,
        attachments = reportAttachments,
        customNote = note,
        locale = locale,
        calculationConfig = config,
        allEntries = allCorrected,
    )

    LaunchedEffect(
        filteredEntries, userData, month, filterWeek, stats,
        s.workCodes, reportAttachments, customNote, locale, config, allCorrected, i18n,
    ) {
        // Debounce (PREVIEW_DEBOUNCE_MS) — Tippen im Notizfeld soll nicht
        // jeden Tastendruck ein PDF rendern lassen.
        delay(350)
        try {
            val result = withContext(Dispatchers.Default) {
                val bytes = ReportPdfGenerator(i18n).generate(buildInput(customNote))
                bytes to renderPdfPages(context, bytes, previewWidthPx)
            }
            pdfBytes = result.first
            pageBitmaps = result.second
        } catch (e: Exception) {
            android.util.Log.e("ReportScreen", "PDF-Vorschau fehlgeschlagen", e)
            pageBitmaps = emptyList()
        }
    }

    // ── Export ──────────────────────────────────────────────────────
    fun buildFilename(): String {
        val nameClean = (userData?.name ?: "")
            .replace(Regex("\\s+"), "_")
            .replace(Regex("[^a-zA-Z0-9_]"), "")
        val week = filterWeek
        val timePeriod = if (week == null) {
            month.atDay(1).format(DateTimeFormatter.ofPattern("LLLL yyyy", javaLocale))
        } else {
            "KW_${week}_(${weekLabel(week).replace(Regex("[\\s\\-.]"), "")})"
        }
        val timestamp = System.currentTimeMillis().toString().takeLast(6)
        return "${nameClean}_Stundenzettel_${timePeriod.replace(Regex("\\s+"), "_")}_$timestamp.pdf"
    }

    val saveLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/pdf"),
    ) { uri ->
        val bytes = pdfBytes
        if (uri != null && bytes != null) {
            try {
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                viewModel.showRawMessage(("📂 " + i18n.t("reports.toast.readyToShare")))
            } catch (e: Exception) {
                viewModel.showRawMessage((i18n.t("reports.toast.error", "message" to (e.message ?: ""))))
            }
        }
    }

    fun sharePdf() {
        val bytes = pdfBytes ?: return
        try {
            val authority = "${context.packageName}.fileprovider"
            val dir = File(context.cacheDir, "reports").apply { mkdirs() }
            val file = File(dir, buildFilename())
            file.writeBytes(bytes)
            val uris = arrayListOf(FileProvider.getUriForFile(context, authority, file))

            // Report-Bundle: verknüpfte Dokumente des Zeitraums mit teilen
            // (Port von shareReportBundle in useAttachmentShare)
            reportAttachments.forEach { attachment ->
                val attachmentFile = viewModel.attachmentFile(attachment)
                if (attachmentFile.exists()) {
                    uris.add(FileProvider.getUriForFile(context, authority, attachmentFile))
                }
            }

            val intent = if (uris.size == 1) {
                Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"
                    putExtra(Intent.EXTRA_STREAM, uris.first())
                }
            } else {
                Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = "*/*"
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                }
            }
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            context.startActivity(Intent.createChooser(intent, i18n.t("reports.title")))
            viewModel.showRawMessage((i18n.t("reports.toast.readyToShare")))
        } catch (e: Exception) {
            viewModel.showRawMessage((i18n.t("reports.toast.error", "message" to (e.message ?: ""))))
        }
    }

    // ── UI ──────────────────────────────────────────────────────────
    if (monthPickerOpen) {
        MonthPickerDialog(
            selected = month,
            javaLocale = javaLocale,
            onSelect = {
                viewModel.setMonth(it)
                filterWeek = null
                monthPickerOpen = false
            },
            onDismiss = { monthPickerOpen = false },
        )
    }

    if (noteDialogOpen) {
        NoteDialog(
            i18n = i18n,
            note = customNote,
            onChange = { customNote = it },
            onDismiss = { noteDialogOpen = false },
        )
    }

    if (exportDialogOpen) {
        ExportDialog(
            i18n = i18n,
            onShare = { exportDialogOpen = false; sharePdf() },
            onFolder = { exportDialogOpen = false; saveLauncher.launch(buildFilename()) },
            onDismiss = { exportDialogOpen = false },
        )
    }

    // Einmaliger Hinweis beim ersten Öffnen (modales Popup wie das Original)
    FirstOpenHint(
        viewModel = viewModel,
        storageKey = "estundnzettl_hint_report_seen_v2",
        title = i18n.t("hints.reportTitle"),
        body = i18n.t("hints.report"),
    )

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // ── Steuerleiste — dunkel wie der Original-Viewer ───────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Palette.Zinc900)
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // Kopfzeile: Titel + Monats-Stepper + Schließen (Port der
                // Vorschau-Toolbar aus PrintReport.tsx)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(
                            Icons.Outlined.Description,
                            contentDescription = null,
                            tint = Palette.Emerald500,
                            modifier = Modifier.size(20.dp),
                        )
                        Text(
                            text = i18n.t("reports.preview"),
                            color = Palette.Zinc100,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            maxLines = 1,
                        )
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Palette.Zinc800)
                            .border(1.dp, Palette.Zinc700, RoundedCornerShape(10.dp))
                            .padding(2.dp),
                    ) {
                        IconButton(
                            onClick = {
                                viewModel.changeMonth(-1L)
                                filterWeek = null
                            },
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                                contentDescription = null,
                                tint = Palette.Zinc300,
                            )
                        }
                        Text(
                            text = month.atDay(1).format(DateTimeFormatter.ofPattern("MMM yy", javaLocale)),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            maxLines = 1,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { monthPickerOpen = true }
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                        )
                        IconButton(
                            onClick = {
                                viewModel.changeMonth(1L)
                                filterWeek = null
                            },
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                contentDescription = null,
                                tint = Palette.Zinc300,
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .padding(start = 8.dp)
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Palette.Zinc800)
                            .clickable { viewModel.setView("dashboard") },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = i18n.t("common.close"),
                            tint = Color.White,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }

                // Notiz + Layout-Toggles + Zeitraum-Filter
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    val hasNote = customNote.isNotEmpty()
                    DarkToolbarButton(
                        icon = Icons.Filled.AddComment,
                        contentDescription = i18n.t("reports.noteModal.title"),
                        tint = if (hasNote) Palette.Blue400 else Palette.Zinc400,
                        background = if (hasNote) Palette.Blue500.copy(alpha = 0.2f) else Palette.Zinc800,
                        border = if (hasNote) Palette.Blue500.copy(alpha = 0.5f) else Palette.Zinc700,
                    ) { noteDialogOpen = true }
                    if (layoutTogglesAvailable) {
                        DarkToolbarButton(
                            icon = Icons.Filled.Tune,
                            contentDescription = i18n.t("reports.layoutPanel.title"),
                            tint = if (layoutPanelOpen) Palette.Emerald400 else Palette.Zinc400,
                            background = if (layoutPanelOpen) Palette.Emerald500.copy(alpha = 0.2f) else Palette.Zinc800,
                            border = if (layoutPanelOpen) Palette.Emerald500.copy(alpha = 0.5f) else Palette.Zinc700,
                        ) { layoutPanelOpen = true }
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Palette.Zinc800)
                                .border(1.dp, Palette.Zinc700, RoundedCornerShape(10.dp))
                                .clickable { filterMenuOpen = true }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = filterWeek?.let {
                                    i18n.t("dashboard.calendarWeekShort", "week" to it) + " (${weekLabel(it)})"
                                } ?: i18n.t("reports.fullMonth"),
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                            )
                            Icon(
                                Icons.Filled.KeyboardArrowDown,
                                contentDescription = null,
                                tint = Palette.Zinc400,
                                modifier = Modifier.size(16.dp),
                            )
                        }
                        DropdownMenu(
                            expanded = filterMenuOpen,
                            onDismissRequest = { filterMenuOpen = false },
                            modifier = Modifier.background(Palette.Zinc800),
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        i18n.t("reports.fullMonth"),
                                        color = if (filterWeek == null) Palette.Emerald500 else Palette.Zinc300,
                                    )
                                },
                                trailingIcon = {
                                    if (filterWeek == null) {
                                        Icon(
                                            Icons.Filled.Check,
                                            contentDescription = null,
                                            tint = Palette.Emerald500,
                                            modifier = Modifier.size(16.dp),
                                        )
                                    }
                                },
                                onClick = { filterWeek = null; filterMenuOpen = false },
                            )
                            availableWeeks.forEach { week ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            i18n.t("dashboard.calendarWeekShort", "week" to week) +
                                                " (${weekLabel(week)})",
                                            color = if (filterWeek == week) Palette.Emerald500 else Palette.Zinc300,
                                        )
                                    },
                                    trailingIcon = {
                                        if (filterWeek == week) {
                                            Icon(
                                                Icons.Filled.Check,
                                                contentDescription = null,
                                                tint = Palette.Emerald500,
                                                modifier = Modifier.size(16.dp),
                                            )
                                        }
                                    },
                                    onClick = { filterWeek = week; filterMenuOpen = false },
                                )
                            }
                        }
                    }
                }
            }

            // ── PDF-Vorschau — dunkler Hintergrund + Zoom wie das
            //    Original (PdfBlobPreview: 0.5x–3x in 0.25er-Schritten) ─
            androidx.compose.foundation.layout.BoxWithConstraints(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Palette.Zinc950),
            ) {
                val baseWidth = maxWidth
                val animatedScale by androidx.compose.animation.core.animateFloatAsState(
                    targetValue = userScale,
                    animationSpec = androidx.compose.animation.core.tween(80),
                    label = "pdfZoom",
                )
                if (pageBitmaps.isEmpty()) {
                    CircularProgressIndicator(
                        color = colors.accent,
                        modifier = Modifier.align(Alignment.Center),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Palette.Zinc800.copy(alpha = 0.5f))
                            .horizontalScroll(rememberScrollState()),
                    ) {
                        LazyColumn(
                            modifier = Modifier
                                .width(baseWidth * animatedScale)
                                .fillMaxHeight(),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                                start = 12.dp, end = 12.dp, top = 12.dp, bottom = 96.dp,
                            ),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(pageBitmaps) { bitmap ->
                                Image(
                                    bitmap = bitmap.asImageBitmap(),
                                    contentDescription = null,
                                    contentScale = ContentScale.FillWidth,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .aspectRatio(bitmap.width.toFloat() / bitmap.height)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(Color.White),
                                )
                            }
                        }
                    }
                }

                // Zoom-Toolbar unten links (Port der PdfBlobPreview-Buttons)
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 12.dp, bottom = 28.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Palette.Zinc900.copy(alpha = 0.85f))
                        .border(1.dp, Palette.Zinc700, RoundedCornerShape(8.dp))
                        .padding(4.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    ZoomButton(
                        icon = Icons.Filled.Add,
                        enabled = userScale < ZOOM_MAX - 0.0001f,
                    ) { userScale = (userScale + ZOOM_STEP).coerceAtMost(ZOOM_MAX) }
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .clickable { userScale = 1f },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (userScale == 1f) {
                            Icon(
                                Icons.Filled.OpenInFull,
                                contentDescription = null,
                                tint = Palette.Zinc100,
                                modifier = Modifier.size(14.dp),
                            )
                        } else {
                            Text(
                                text = "${(userScale * 100).toInt()}%",
                                color = Palette.Zinc100,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                            )
                        }
                    }
                    ZoomButton(
                        icon = Icons.Filled.Remove,
                        enabled = userScale > ZOOM_MIN + 0.0001f,
                    ) { userScale = (userScale - ZOOM_STEP).coerceAtLeast(ZOOM_MIN) }
                }
            }
        }

        // Senden-Pill unten rechts (emerald-500 mit Ring wie das Original)
        Row(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(24.dp)
                .shadow(12.dp, CircleShape, spotColor = Palette.Emerald700)
                .clip(CircleShape)
                .background(Palette.Emerald500)
                .border(2.dp, Palette.Emerald400.copy(alpha = 0.5f), CircleShape)
                .clickable { if (pdfBytes != null) exportDialogOpen = true }
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.AutoMirrored.Filled.Send,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(20.dp),
            )
            Text(
                i18n.t("reports.exportButton"),
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
            )
        }

        // ── PDF-Einstellungen als Seitenleiste von rechts (Port des
        //    Layout-Panels aus PrintReport.tsx, nur Hausmasta-Modus) ──
        androidx.activity.compose.BackHandler(enabled = layoutPanelOpen) { layoutPanelOpen = false }
        AnimatedVisibility(
            visible = layoutPanelOpen && layoutTogglesAvailable,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.4f))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { layoutPanelOpen = false },
            )
        }
        AnimatedVisibility(
            visible = layoutPanelOpen && layoutTogglesAvailable,
            enter = slideInHorizontally(initialOffsetX = { it }),
            exit = slideOutHorizontally(targetOffsetX = { it }),
            modifier = Modifier.align(Alignment.CenterEnd),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(0.92f)
                    .background(colors.background)
                    .safeDrawingPadding(),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(colors.accent.copy(alpha = if (colors.isDark) 0.25f else 0.15f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Filled.Tune, contentDescription = null,
                                tint = colors.accent, modifier = Modifier.size(18.dp),
                            )
                        }
                        Column {
                            Text(
                                i18n.t("reports.layoutPanel.title"),
                                color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp,
                            )
                            Text(
                                i18n.t("reports.layoutPanel.subtitle"),
                                color = colors.textMuted, fontSize = 12.sp,
                            )
                        }
                    }
                    IconButton(onClick = { layoutPanelOpen = false }) {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = i18n.t("common.close"),
                            tint = colors.textSecondary,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
                HorizontalDivider(color = colors.border)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(12.dp),
                ) {
                    PdfDisplayToggles(viewModel = viewModel, showHeader = false)
                }
            }
        }
    }
}

// ─── Notiz-Dialog (Port des Note-Modals) ────────────────────────────

@Composable
private fun NoteDialog(
    i18n: I18n,
    note: String,
    onChange: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    var draft by remember { mutableStateOf(note) }
    AlertDialog(
        onDismissRequest = { onChange(draft); onDismiss() },
        title = { Text(i18n.t("reports.noteModal.title")) },
        text = {
            OutlinedTextField(
                value = draft,
                onValueChange = { draft = it },
                placeholder = { Text(i18n.t("reports.noteModal.placeholder")) },
                minLines = 4,
                maxLines = 8,
                modifier = Modifier.fillMaxWidth(),
            )
        },
        confirmButton = {
            TextButton(onClick = { onChange(draft); onDismiss() }) {
                Text(i18n.t("reports.noteModal.done"), fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { draft = ""; onChange(""); onDismiss() }) {
                Text(i18n.t("common.delete"), color = colors.danger)
            }
        },
    )
}

// ─── Export-Dialog (Port von ExportModal) ───────────────────────────

@Composable
private fun ExportDialog(
    i18n: I18n,
    onShare: () -> Unit,
    onFolder: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(i18n.t("exportModal.titlePdf")) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ExportOptionRow(
                    icon = { Icon(Icons.Filled.Share, contentDescription = null, tint = colors.accent) },
                    title = i18n.t("exportModal.share"),
                    subtitle = i18n.t("exportModal.shareDescription"),
                    onClick = onShare,
                )
                ExportOptionRow(
                    icon = { Icon(Icons.Filled.FolderOpen, contentDescription = null, tint = colors.info) },
                    title = i18n.t("exportModal.folderData"),
                    subtitle = i18n.t("exportModal.folderDataDescription"),
                    onClick = onFolder,
                )
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(i18n.t("common.cancel")) }
        },
    )
}

@Composable
private fun ExportOptionRow(
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        icon()
        Column {
            Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(subtitle, color = colors.textMuted, fontSize = 12.sp)
        }
    }
}

// ─── PDF-Anzeige-Toggles (Port von PdfDisplayToggles.tsx) ───────────

@Composable
fun PdfDisplayToggles(viewModel: MainViewModel, showHeader: Boolean = true) {
    val colors = LocalAppColors.current
    val i18n = LocalI18n.current
    val s by viewModel.state.collectAsState()
    val display = getEffectivePdfDisplay(s.calculationConfig)

    data class ToggleSpec(
        val key: String,
        val checked: Boolean,
        val update: (Boolean) -> Unit,
    )

    fun patch(transform: (com.estundnzettl.core.model.PdfDisplayConfig) -> com.estundnzettl.core.model.PdfDisplayConfig) {
        viewModel.patchCalculationConfig { cfg ->
            cfg.copy(pdfDisplay = transform(getEffectivePdfDisplay(cfg)))
        }
    }

    val toggles = listOf(
        ToggleSpec("showSummary", display.showSummary) { v -> patch { it.copy(showSummary = v) } },
        ToggleSpec("showTargetTime", display.showTargetTime) { v -> patch { it.copy(showTargetTime = v) } },
        ToggleSpec("showBalance", display.showBalance) { v -> patch { it.copy(showBalance = v) } },
        ToggleSpec("showOvertimeSplit", display.showOvertimeSplit) { v -> patch { it.copy(showOvertimeSplit = v) } },
        ToggleSpec("showVacationBalance", display.showVacationBalance) { v -> patch { it.copy(showVacationBalance = v) } },
        ToggleSpec("showAttachmentsList", display.showAttachmentsList) { v -> patch { it.copy(showAttachmentsList = v) } },
        ToggleSpec("showWorkCodeColumn", display.showWorkCodeColumn) { v -> patch { it.copy(showWorkCodeColumn = v) } },
        ToggleSpec("showCustomNote", display.showCustomNote) { v -> patch { it.copy(showCustomNote = v) } },
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 20.dp, end = 20.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (showHeader) {
            Text(
                i18n.t("settings.pdfLayout.title"),
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
            )
            Text(
                i18n.t("settings.pdfLayout.subtitle"),
                color = colors.textMuted,
                fontSize = 12.sp,
            )
        }
        toggles.forEach { toggle ->
            SettingsToggleRow(
                title = i18n.t("settings.pdfLayout.${toggle.key}"),
                subtitle = i18n.t("settings.pdfLayout.${toggle.key}Desc"),
                checked = toggle.checked,
                accent = colors.accentStrong,
                onToggle = toggle.update,
            )
        }
    }
}

// Zoom-Grenzen der Vorschau — identisch zu PdfBlobPreview.tsx
private const val ZOOM_MIN = 0.5f
private const val ZOOM_MAX = 3f
private const val ZOOM_STEP = 0.25f

/** Einzelner Zoom-Button (+/−) der Vorschau-Toolbar. */
@Composable
private fun ZoomButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(RoundedCornerShape(6.dp))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = Palette.Zinc100.copy(alpha = if (enabled) 1f else 0.3f),
            modifier = Modifier.size(16.dp),
        )
    }
}

/** Dunkler Toolbar-Button (Notiz/Layout) — Port der zinc-800-Buttons. */
@Composable
private fun DarkToolbarButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    tint: Color,
    background: Color,
    border: Color,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(background)
            .border(1.dp, border, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = contentDescription, tint = tint, modifier = Modifier.size(20.dp))
    }
}

// ─── PDF → Bitmaps für die Vorschau ─────────────────────────────────

private fun renderPdfPages(context: Context, bytes: ByteArray, targetWidth: Int): List<Bitmap> {
    val file = File.createTempFile("report-preview", ".pdf", context.cacheDir)
    return try {
        file.writeBytes(bytes)
        val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val renderer = PdfRenderer(pfd)
        try {
            (0 until renderer.pageCount).map { index ->
                val page = renderer.openPage(index)
                try {
                    val width = targetWidth.coerceAtLeast(1)
                    val height = (width.toFloat() * page.height / page.width).toInt().coerceAtLeast(1)
                    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    bitmap.eraseColor(android.graphics.Color.WHITE)
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    bitmap
                } finally {
                    page.close()
                }
            }
        } finally {
            renderer.close()
        }
    } finally {
        file.delete()
    }
}
