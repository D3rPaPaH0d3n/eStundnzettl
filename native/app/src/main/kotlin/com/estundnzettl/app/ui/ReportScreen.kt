package com.estundnzettl.app.ui

import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.Patterns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.calculateCentroid
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.ShareChosenReceiver
import com.estundnzettl.app.ShareHandoffStore
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale as JavaLocale
import kotlin.math.cos
import kotlin.math.sin

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
    var shareHandoffVisible by remember { mutableStateOf(false) }
    val preferredShareTargetLabel = if (ShareHandoffStore.usePreferredTarget(context)) {
        ShareHandoffStore.preferredTargetLabel(context)
    } else {
        null
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, context) {
        fun showPendingShareHandoff() {
            if (ShareHandoffStore.consume(context)) {
                shareHandoffVisible = true
            }
        }

        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) showPendingShareHandoff()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        if (lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) {
            showPendingShareHandoff()
        }
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val layoutTogglesAvailable = (userData?.expertMode == true) && config != null

    // ── PDF-Generierung + Vorschau-Render ───────────────────────────
    var pdfBytes by remember { mutableStateOf<ByteArray?>(null) }
    var pageBitmaps by remember { mutableStateOf<List<Bitmap>>(emptyList()) }

    // Vorschau-Auflösung: 1.5x Bildschirmbreite reicht für 1x-Ansicht;
    // sobald gezoomt wird, einmalig scharf für ZOOM_MAX nachrendern.
    var hiResPreview by remember { mutableStateOf(false) }
    val previewWidthPx = with(LocalDensity.current) {
        val base = LocalConfiguration.current.screenWidthDp.dp.toPx()
        if (hiResPreview) {
            (base * 3f).toInt().coerceAtMost(3000)
        } else {
            (base * 1.5f).toInt().coerceAtMost(2000)
        }
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
        previewWidthPx,
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

    fun buildSharePeriod(): String {
        val week = filterWeek
        return if (week == null) {
            month.atDay(1).format(DateTimeFormatter.ofPattern("LLLL yyyy", javaLocale))
        } else {
            i18n.t(
                "reports.shareMessage.weekPeriod",
                "week" to week,
                "range" to weekLabel(week),
            )
        }
    }

    fun buildShareMessage(): String {
        val name = userData?.name?.trim().orEmpty()
        val period = buildSharePeriod()
        fun fillTemplate(template: String): String = template
            .replace("{{period}}", period)
            .replace("{{name}}", name)
            .replace("[Zeitraum]", period)
            .replace("[Period]", period)
            .replace("[Name]", name)

        ShareHandoffStore.customMessageTemplate(context)?.let { template ->
            return fillTemplate(template).trimEnd()
        }
        val key = if (name.isEmpty()) {
            "reports.shareMessage.bodyWithoutName"
        } else {
            "reports.shareMessage.body"
        }
        return i18n.t(key, "period" to buildSharePeriod(), "name" to name)
    }

    fun buildShareSubject(): String {
        val period = buildSharePeriod()
        val name = userData?.name?.trim().orEmpty()
        val template = ShareHandoffStore.customSubjectTemplate(context)
            ?: i18n.t("reports.shareMessage.subject")
        return template
            .replace("{{period}}", period)
            .replace("{{name}}", name)
            .replace("[Zeitraum]", period)
            .replace("[Period]", period)
            .replace("[Name]", name)
            .trim()
    }

    val saveLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/pdf"),
    ) { uri ->
        val bytes = pdfBytes
        if (uri != null && bytes != null) {
            try {
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                viewModel.showRawMessage(("📂 " + i18n.t("reports.toast.saved")))
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
            val shareSubject = buildShareSubject()
            intent.putExtra(Intent.EXTRA_SUBJECT, shareSubject)
            intent.putExtra(Intent.EXTRA_TEXT, buildShareMessage())
            intent.putExtra(Intent.EXTRA_TITLE, shareSubject)
            ShareHandoffStore.emailRecipient(context)
                .trim()
                .takeIf { Patterns.EMAIL_ADDRESS.matcher(it).matches() }
                ?.let { recipient ->
                    intent.putExtra(Intent.EXTRA_EMAIL, arrayOf(recipient))
                }
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)

            val preferredComponent = if (ShareHandoffStore.usePreferredTarget(context)) {
                ShareHandoffStore.preferredComponent(context)
            } else {
                null
            }
            if (preferredComponent != null) {
                intent.component = preferredComponent
                try {
                    context.startActivity(intent)
                    ShareHandoffStore.markChosen(
                        context,
                        selectedComponent = preferredComponent,
                    )
                    return
                } catch (_: ActivityNotFoundException) {
                    ShareHandoffStore.clearPreferredTarget(context)
                    intent.component = null
                } catch (_: SecurityException) {
                    ShareHandoffStore.clearPreferredTarget(context)
                    intent.component = null
                }
            }

            val callbackIntent = Intent(context, ShareChosenReceiver::class.java).apply {
                action = "${context.packageName}.SHARE_TARGET_CHOSEN"
            }
            val requestCode = (System.currentTimeMillis() and 0x7FFFFFFF).toInt()
            val callback = PendingIntent.getBroadcast(
                context,
                requestCode,
                callbackIntent,
                PendingIntent.FLAG_CANCEL_CURRENT or
                    PendingIntent.FLAG_ONE_SHOT or
                    PendingIntent.FLAG_MUTABLE,
            )
            val chooser = Intent.createChooser(
                intent,
                i18n.t("reports.title"),
                callback.intentSender,
            )
            context.startActivity(chooser)
        } catch (e: Exception) {
            viewModel.showRawMessage((i18n.t("reports.toast.error", "message" to (e.message ?: ""))))
        }
    }

    // ── UI ──────────────────────────────────────────────────────────
    if (monthPickerOpen) {
        MonthPickerDialog(
            selected = month,
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
            preferredAppLabel = preferredShareTargetLabel,
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
                val baseWidthPx = constraints.maxWidth.toFloat()
                val hScroll = rememberScrollState()
                val listState = androidx.compose.foundation.lazy.rememberLazyListState()
                val pinchScope = rememberCoroutineScope()
                val pageAspect = pageBitmaps.firstOrNull()
                    ?.let { it.height.toFloat() / it.width } ?: 1.414f
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
                            // Pinch-to-Zoom wie das Original: greift nur bei
                            // zwei Fingern ein, Ein-Finger-Scrollen bleibt frei.
                            // Die Scroll-Offsets folgen dem Finger-Mittelpunkt,
                            // damit die Stelle unter den Fingern stehen bleibt.
                            .pointerInput(Unit) {
                                awaitEachGesture {
                                    awaitFirstDown(requireUnconsumed = false)
                                    do {
                                        val event = awaitPointerEvent(PointerEventPass.Initial)
                                        if (event.changes.count { it.pressed } >= 2) {
                                            val zoomChange = event.calculateZoom()
                                            if (zoomChange != 1f) {
                                                val oldScale = userScale
                                                val newScale = (oldScale * zoomChange)
                                                    .coerceIn(ZOOM_MIN, ZOOM_MAX)
                                                if (newScale != oldScale) {
                                                    val factor = newScale / oldScale
                                                    val centroid = event.calculateCentroid()
                                                    val spacingPx = 12.dp.toPx()
                                                    val pageH = baseWidthPx * oldScale * pageAspect
                                                    val absY = listState.firstVisibleItemIndex *
                                                        (pageH + spacingPx) +
                                                        listState.firstVisibleItemScrollOffset
                                                    userScale = newScale
                                                    if (newScale > 1.05f) hiResPreview = true
                                                    pinchScope.launch {
                                                        hScroll.scrollBy(
                                                            (hScroll.value + centroid.x) * (factor - 1f),
                                                        )
                                                    }
                                                    pinchScope.launch {
                                                        listState.scrollBy(
                                                            (absY + centroid.y) * (factor - 1f),
                                                        )
                                                    }
                                                }
                                            }
                                            event.changes.forEach { it.consume() }
                                        }
                                    } while (event.changes.any { it.pressed })
                                }
                            }
                            .horizontalScroll(hScroll),
                    ) {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .width(baseWidth * userScale)
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
                    ) {
                        userScale = (userScale + ZOOM_STEP).coerceAtMost(ZOOM_MAX)
                        if (userScale > 1.05f) hiResPreview = true
                    }
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
        if (layoutPanelOpen && layoutTogglesAvailable) {
            AppSelectionSheet(
                title = i18n.t("reports.layoutPanel.title"),
                subtitle = i18n.t("reports.layoutPanel.subtitle"),
                icon = Icons.Filled.Tune,
                onDismiss = { layoutPanelOpen = false },
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(12.dp),
                ) {
                    PdfDisplayToggles(viewModel = viewModel, showHeader = false)
                }
            }
        }

        ShareHandoffAnimation(
            visible = shareHandoffVisible,
            i18n = i18n,
            onFinished = { shareHandoffVisible = false },
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
    preferredAppLabel: String?,
    onShare: () -> Unit,
    onFolder: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = colors.surface,
            shadowElevation = 24.dp,
        ) {
            Column(
                modifier = Modifier.padding(start = 18.dp, end = 18.dp, top = 18.dp, bottom = 10.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ExportOptionRow(
                    icon = Icons.Filled.Share,
                    title = preferredAppLabel?.let {
                        i18n.t("reports.shareTarget.shareWith", "app" to it)
                    } ?: i18n.t("modals.export.share"),
                    subtitle = if (preferredAppLabel != null) {
                        i18n.t("reports.shareTarget.directDescription")
                    } else {
                        i18n.t("modals.export.shareDescription")
                    },
                    primary = true,
                    onClick = onShare,
                )
                ExportOptionRow(
                    icon = Icons.Filled.FolderOpen,
                    title = i18n.t("modals.export.folderData"),
                    subtitle = i18n.t("modals.export.folderDataDescription"),
                    primary = false,
                    onClick = onFolder,
                )
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.End),
                ) {
                    Text(i18n.t("common.cancel"), color = colors.textMuted)
                }
            }
        }
    }
}

@Composable
private fun ExportOptionRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    primary: Boolean,
    onClick: () -> Unit,
) {
    val styrianGreen = Color(0xFF08623B)
    val deepGreen = Color(0xFF06472D)
    val warmCream = Color(0xFFFFFCF3)
    val lightLeaf = Color(0xFFEAF5E9)
    val background = if (primary) {
        Brush.linearGradient(listOf(deepGreen, Color(0xFF0B8050)))
    } else {
        Brush.linearGradient(listOf(warmCream, lightLeaf))
    }
    val titleColor = if (primary) Color.White else Color(0xFF153D2A)
    val subtitleColor = if (primary) Color.White.copy(alpha = 0.82f) else Color(0xFF50685A)
    val iconColor = if (primary) Color.White else styrianGreen
    val iconBackground = if (primary) Color.White.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.86f)
    val outline = if (primary) Color.White.copy(alpha = 0.16f) else styrianGreen.copy(alpha = 0.48f)
    val shape = RoundedCornerShape(20.dp)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(94.dp)
            .shadow(5.dp, shape, spotColor = deepGreen.copy(alpha = 0.25f))
            .clip(shape)
            .background(background)
            .border(if (primary) 1.dp else 2.dp, outline, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(iconBackground),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(24.dp),
            )
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(title, color = titleColor, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            Text(subtitle, color = subtitleColor, fontSize = 12.sp, lineHeight = 16.sp)
        }
        StyrianRibbon(inverted = primary)
    }
}

@Composable
private fun StyrianRibbon(inverted: Boolean) {
    val green = if (inverted) Color(0xFFB7E2C5) else Color(0xFF087044)
    Column(
        modifier = Modifier
            .width(7.dp)
            .height(48.dp)
            .clip(CircleShape),
    ) {
        Box(Modifier.weight(1f).fillMaxWidth().background(green))
        Box(Modifier.weight(1f).fillMaxWidth().background(Color.White))
    }
}

@Composable
private fun ShareHandoffAnimation(
    visible: Boolean,
    i18n: I18n,
    onFinished: () -> Unit,
) {
    val checkScale = remember { Animatable(0.55f) }
    val particleProgress = remember { Animatable(0f) }

    LaunchedEffect(visible) {
        if (visible) {
            checkScale.snapTo(0.55f)
            particleProgress.snapTo(0f)
            launch {
                checkScale.animateTo(
                    targetValue = 1f,
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessLow,
                    ),
                )
            }
            particleProgress.animateTo(1f, tween(durationMillis = 900))
            delay(1_450)
            onFinished()
        }
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(180)),
        exit = fadeOut(tween(280)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.58f))
                .clickable(onClick = onFinished),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier
                    .padding(28.dp)
                    .shadow(24.dp, RoundedCornerShape(32.dp), spotColor = Color(0xFF052F20))
                    .clip(RoundedCornerShape(32.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0xFF0B8050), Color(0xFF06472D)),
                        ),
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(32.dp))
                    .padding(horizontal = 30.dp, vertical = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier.size(138.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Canvas(Modifier.fillMaxSize()) {
                        val progress = particleProgress.value
                        repeat(12) { index ->
                            val angle = (Math.PI * 2.0 * index / 12.0).toFloat()
                            val distance = size.minDimension * (0.24f + progress * 0.22f)
                            val particleCenter = Offset(
                                x = center.x + cos(angle) * distance,
                                y = center.y + sin(angle) * distance,
                            )
                            val particleColor = when (index % 3) {
                                0 -> Color.White
                                1 -> Color(0xFFCDECD6)
                                else -> Color(0xFFFFF2B8)
                            }
                            drawCircle(
                                color = particleColor.copy(alpha = 1f - progress * 0.72f),
                                radius = (3.5f + (index % 2) * 2f) * density,
                                center = particleCenter,
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .size(82.dp)
                            .scale(checkScale.value)
                            .shadow(10.dp, CircleShape)
                            .clip(CircleShape)
                            .background(Color.White),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Filled.Check,
                            contentDescription = null,
                            tint = Color(0xFF087044),
                            modifier = Modifier.size(46.dp),
                        )
                    }
                }
                Text(
                    text = i18n.t("reports.shareHandoff.title"),
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 22.sp,
                )
                Text(
                    text = i18n.t("reports.shareHandoff.subtitle"),
                    color = Color.White.copy(alpha = 0.82f),
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
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
