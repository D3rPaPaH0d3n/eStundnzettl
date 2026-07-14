package com.estundnzettl.app.ui

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AddComment
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
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

    if (layoutPanelOpen && layoutTogglesAvailable) {
        ModalBottomSheet(
            onDismissRequest = { layoutPanelOpen = false },
            containerColor = colors.surface,
        ) {
            PdfDisplayToggles(viewModel = viewModel)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // ── Steuerleiste ────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surface)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Monat wechseln
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = {
                        viewModel.changeMonth(-1L)
                        filterWeek = null
                    }) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                            contentDescription = null,
                            tint = colors.textPrimary,
                        )
                    }
                    Text(
                        text = month.atDay(1).format(DateTimeFormatter.ofPattern("LLL yy", javaLocale)),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { monthPickerOpen = true }
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    IconButton(onClick = {
                        viewModel.changeMonth(1L)
                        filterWeek = null
                    }) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = null,
                            tint = colors.textPrimary,
                        )
                    }
                }

                // Einmaliger Hinweis beim ersten Öffnen (Port von FirstOpenHint)
                FirstOpenHint(
                    viewModel = viewModel,
                    storageKey = "estundnzettl_hint_report_seen_v2",
                    title = i18n.t("hints.reportTitle"),
                    body = i18n.t("hints.report"),
                )

                // Notiz + Layout-Toggles + Zeitraum-Filter
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = { noteDialogOpen = true }) {
                        Icon(
                            Icons.Filled.AddComment,
                            contentDescription = i18n.t("reports.noteModal.title"),
                            tint = if (customNote.isNotEmpty()) colors.info else colors.textMuted,
                        )
                    }
                    if (layoutTogglesAvailable) {
                        IconButton(onClick = { layoutPanelOpen = true }) {
                            Icon(
                                Icons.Filled.Tune,
                                contentDescription = i18n.t("reports.layoutPanel.title"),
                                tint = colors.textMuted,
                            )
                        }
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(colors.surface)
                                .clickable { filterMenuOpen = true }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = filterWeek?.let {
                                    i18n.t("dashboard.calendarWeekShort", "week" to it) + " (${weekLabel(it)})"
                                } ?: i18n.t("reports.fullMonth"),
                                color = colors.textPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                            )
                            Icon(
                                Icons.Filled.KeyboardArrowDown,
                                contentDescription = null,
                                tint = colors.textFaint,
                                modifier = Modifier.size(16.dp),
                            )
                        }
                        DropdownMenu(
                            expanded = filterMenuOpen,
                            onDismissRequest = { filterMenuOpen = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text(i18n.t("reports.fullMonth")) },
                                trailingIcon = {
                                    if (filterWeek == null) {
                                        Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp))
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
                                        )
                                    },
                                    trailingIcon = {
                                        if (filterWeek == week) {
                                            Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                        }
                                    },
                                    onClick = { filterWeek = week; filterMenuOpen = false },
                                )
                            }
                        }
                    }
                }
            }

            // ── PDF-Vorschau ────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(colors.background),
            ) {
                if (pageBitmaps.isEmpty()) {
                    CircularProgressIndicator(
                        color = colors.accent,
                        modifier = Modifier.align(Alignment.Center),
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
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
        }

        // Senden-FAB unten rechts (wie der Export-FAB im Original)
        ExtendedFloatingActionButton(
            onClick = { if (pdfBytes != null) exportDialogOpen = true },
            containerColor = colors.accentStrong,
            contentColor = Color.White,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp),
            icon = { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null) },
            text = { Text(i18n.t("reports.exportButton"), fontWeight = FontWeight.Bold) },
        )
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
fun PdfDisplayToggles(viewModel: MainViewModel) {
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
        Text(
            i18n.t("settings.pdfDisplay.title"),
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
        )
        Text(
            i18n.t("settings.pdfDisplay.subtitle"),
            color = colors.textMuted,
            fontSize = 12.sp,
        )
        toggles.forEach { toggle ->
            SettingsToggleRow(
                title = i18n.t("settings.pdfDisplay.${toggle.key}"),
                subtitle = i18n.t("settings.pdfDisplay.${toggle.key}Desc"),
                checked = toggle.checked,
                accent = colors.accentStrong,
                onToggle = toggle.update,
            )
        }
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
