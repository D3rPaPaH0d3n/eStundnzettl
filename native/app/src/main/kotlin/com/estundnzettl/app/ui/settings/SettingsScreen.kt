package com.estundnzettl.app.ui.settings

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.ColorLens
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.model.WORK_CODE_PRESETS
import com.estundnzettl.core.model.WORK_MODELS
import java.io.ByteArrayOutputStream

/**
 * Einstellungen — Port von Settings.tsx mit den Kern-Sektionen:
 * Profil, Aufzeichnungsart, Arbeitszeitmodell, Tätigkeiten,
 * Stundenberechnung (inkl. Locale im Hausmasta-Modus), Backup & Export,
 * Darstellung (Sprache/Theme/Material You), Hausmasta, App-Info.
 * Cloud-Ziele (Google Drive/Nextcloud) und PDF-Archiv folgen in Phase 5.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: MainViewModel,
    onExportBackup: () -> Unit,
    onImportBackup: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val userData = state.userData ?: com.estundnzettl.core.model.UserData()
    val expertMode = userData.expertMode

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        ProfileSection(viewModel)
        RecordingModeSection(viewModel)
        WorkScheduleSection(viewModel)
        WorkCodesSection(viewModel)

        // Stundenberechnung (Locale im Hausmasta-Modus + Berechnungsregeln)
        CollapsibleSettingsCard(
            title = t.t("settings.locale.header"),
            subtitle = t.t("settings.locale.subtitle"),
            icon = { SectionIconBadge(Icons.Filled.Calculate, colors.accent) },
            defaultExpanded = false,
        ) {
            if (expertMode) {
                LocaleSection(viewModel)
            }
            state.calculationConfig?.let { config ->
                CalculationSection(
                    config = config,
                    language = state.language,
                    onPatch = viewModel::patchCalculationConfig,
                    onRecalculate = viewModel::recalculateAllEntries,
                    onMessage = { viewModel.showRawMessage(it) },
                )
            }
        }

        BackupSection(viewModel, t, colors.accent, onExportBackup, onImportBackup)
        PdfArchiveSection(viewModel)
        AppearanceSection(viewModel)
        ExpertModeSection(viewModel)
        AppInfoSection(viewModel)

        Spacer(Modifier.height(24.dp))
    }
}

// ─── 1. Profil ───────────────────────────────────────────────

@Composable
private fun ProfileSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val userData = state.userData ?: com.estundnzettl.core.model.UserData()

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            runCatching {
                val dataUrl = uriToJpegDataUrl(context, uri)
                viewModel.setUserData { it.copy(photo = dataUrl) }
                viewModel.showRawMessage(t.t("settings.profile.toastPhotoUpdated"))
            }.onFailure {
                viewModel.showRawMessage(t.t("settings.profile.toastPhotoError"))
            }
        }
    }

    com.estundnzettl.app.ui.AppCard {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(colors.surfaceVariant)
                        .clickable {
                            photoPicker.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    if (userData.photo != null) {
                        val bitmap = remember(userData.photo) { dataUrlToBitmap(userData.photo!!) }
                        if (bitmap != null) {
                            androidx.compose.foundation.Image(
                                bitmap = bitmap.asImageBitmap(),
                                contentDescription = t.t("settings.profile.photoAlt"),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        }
                    } else {
                        Icon(
                            Icons.Filled.Person, contentDescription = t.t("settings.profile.photoHint"),
                            tint = colors.textFaint, modifier = Modifier.size(32.dp),
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        t.t("settings.profile.title"),
                        color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 17.sp,
                    )
                    Text(t.t("settings.profile.photoHint"), color = colors.textFaint, fontSize = 12.sp)
                    if (userData.photo != null) {
                        Text(
                            "✕ " + t.t("common.delete"),
                            color = colors.danger, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable {
                                    viewModel.setUserData { it.copy(photo = null) }
                                    viewModel.showRawMessage(t.t("settings.profile.toastPhotoRemoved"))
                                }
                                .padding(top = 4.dp),
                        )
                    }
                }
            }

            ProfileTextField(t.t("settings.profile.nameLabel"), userData.name, t.t("settings.profile.namePlaceholder")) { value ->
                viewModel.setUserData { it.copy(name = value) }
            }
            ProfileTextField(t.t("settings.profile.companyLabel"), userData.company ?: "", t.t("settings.profile.companyPlaceholder")) { value ->
                viewModel.setUserData { it.copy(company = value.ifEmpty { null }) }
            }
            ProfileTextField(t.t("settings.profile.positionLabel"), userData.position, t.t("settings.profile.positionPlaceholder")) { value ->
                viewModel.setUserData { it.copy(position = value) }
            }
        }
    }
}

@Composable
private fun ProfileTextField(label: String, value: String, placeholder: String, onChange: (String) -> Unit) {
    var text by remember(value) { mutableStateOf(value) }
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SettingsFieldLabel(label)
        OutlinedTextField(
            value = text,
            onValueChange = { text = it; onChange(it) },
            placeholder = { Text(placeholder) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

// ─── 2. Aufzeichnungsart ─────────────────────────────────────

@Composable
private fun RecordingModeSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val simpleMode = state.userData?.simpleMode == true

    com.estundnzettl.app.ui.AppCard {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                SectionIconBadge(Icons.Filled.Calculate, colors.accent)
                Column {
                    Text(
                        t.t("settings.recordingMode.title"),
                        color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp,
                    )
                    Text(
                        if (simpleMode) t.t("settings.recordingMode.subtitleSimple")
                        else t.t("settings.recordingMode.subtitleCalculated"),
                        color = colors.textMuted, fontSize = 12.sp,
                    )
                }
            }

            ModeCard(
                title = t.t("settings.recordingMode.simpleTitle"),
                description = t.t("settings.recordingMode.simpleDescription"),
                selected = simpleMode,
                tint = colors.accent,
            ) { viewModel.setSimpleMode(true) }
            ModeCard(
                title = t.t("settings.recordingMode.calculatedTitle"),
                description = t.t("settings.recordingMode.calculatedDescription"),
                selected = !simpleMode,
                tint = colors.info,
            ) { viewModel.setSimpleMode(false) }

            Text(t.t("settings.recordingMode.noDataLossHint"), color = colors.textFaint, fontSize = 11.sp)
        }
    }
}

@Composable
private fun ModeCard(title: String, description: String, selected: Boolean, tint: Color, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) tint.copy(alpha = 0.08f) else Color.Transparent)
            .border(2.dp, if (selected) tint else colors.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Text(description, color = colors.textMuted, fontSize = 12.sp)
    }
}

// ─── 3. Arbeitszeitmodell ────────────────────────────────────

@Composable
private fun WorkScheduleSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val userData = state.userData ?: com.estundnzettl.core.model.UserData()
    val workDays = userData.workDays ?: List(7) { 0 }
    val activeModelId = userData.workModelId ?: "custom"
    val isCustomMode = activeModelId == "custom"
    val activeModelLabel = WORK_MODELS.firstOrNull { it.id == activeModelId }?.label
        ?: t.t("settings.data.workModel.defaultLabel")

    var isLocked by rememberSaveable(activeModelId) { mutableStateOf(true) }
    var showPresetWarning by remember { mutableStateOf(false) }
    var showPresetPicker by remember { mutableStateOf(false) }
    var dayPickerIndex by remember { mutableStateOf<Int?>(null) }

    if (showPresetWarning) {
        AlertDialog(
            onDismissRequest = { showPresetWarning = false },
            title = { Text(t.t("settings.data.presetWarning.title")) },
            text = { Text(t.t("settings.data.presetWarning.message")) },
            confirmButton = {
                TextButton(onClick = { showPresetWarning = false; showPresetPicker = true }) {
                    Text(t.t("settings.data.presetWarning.confirm"), color = colors.danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { showPresetWarning = false }) { Text(t.t("common.cancel")) }
            },
        )
    }

    if (showPresetPicker) {
        OptionSheet(
            title = t.t("settings.data.workModel.templatesButton"),
            options = WORK_MODELS.map { it.id to "${it.label} — ${it.description}" },
            selected = activeModelId,
            onSelect = { id ->
                WORK_MODELS.firstOrNull { it.id == id }?.let { viewModel.applyWorkModel(it) }
                showPresetPicker = false
            },
            onDismiss = { showPresetPicker = false },
        )
    }

    dayPickerIndex?.let { index ->
        DayDurationDialog(
            title = t.t(
                "settings.editDay",
                "weekday" to t.t("settings.weekdays.${listOf("sun", "mon", "tue", "wed", "thu", "fri", "sat")[index]}"),
            ),
            initialMinutes = workDays.getOrElse(index) { 0 },
            onConfirm = { minutes ->
                viewModel.setWorkDayMinutes(index, minutes)
                dayPickerIndex = null
            },
            onDismiss = { dayPickerIndex = null },
        )
    }

    CollapsibleSettingsCard(
        title = t.t("settings.data.cardTitle"),
        subtitle = t.t("settings.data.cardSubtitle"),
        icon = { SectionIconBadge(Icons.Filled.CalendarMonth, colors.accent) },
        defaultExpanded = false,
    ) {
        if (userData.simpleMode) {
            Text(
                t.t("settings.data.simpleWorkScheduleHint"),
                color = colors.accent, fontSize = 12.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(colors.accent.copy(alpha = 0.08f))
                    .padding(12.dp),
            )
            return@CollapsibleSettingsCard
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    t.t("settings.data.workModel.heading"),
                    color = colors.textSecondary, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                )
                Text(
                    t.t("settings.data.workModel.currentLabel") + activeModelLabel,
                    color = colors.textMuted, fontSize = 11.sp,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (isCustomMode) {
                    Icon(
                        if (isLocked) Icons.Filled.Lock else Icons.Filled.LockOpen,
                        contentDescription = null,
                        tint = if (isLocked) colors.textMuted else colors.accent,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isLocked) colors.surfaceVariant else colors.accent.copy(alpha = 0.15f))
                            .clickable {
                                isLocked = !isLocked
                                if (!isLocked) viewModel.showRawMessage(t.t("settings.toast.unlocked"))
                            }
                            .padding(8.dp)
                            .size(14.dp),
                    )
                }
                Text(
                    t.t("settings.data.workModel.templatesButton"),
                    color = colors.textSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .border(1.dp, colors.border, RoundedCornerShape(8.dp))
                        .clickable { showPresetWarning = true }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }
        }

        // Wochenstunden-Chip
        Text(
            t.t("settings.data.workModel.weekHours", "hours" to formatHoursLocalized(workDays.sum(), state.language).removeSuffix(" h")),
            color = colors.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .clip(RoundedCornerShape(50))
                .background(colors.accent.copy(alpha = 0.12f))
                .padding(horizontal = 12.dp, vertical = 4.dp),
        )

        // 7-Tage-Grid (Mo..So, wie die Web-App)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(
                "mon" to 1, "tue" to 2, "wed" to 3, "thu" to 4, "fri" to 5, "sat" to 6, "sun" to 0,
            ).forEach { (key, dayIndex) ->
                val isWeekend = dayIndex == 0 || dayIndex == 6
                val minutes = workDays.getOrElse(dayIndex) { 0 }
                val interactive = isCustomMode && !isLocked
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        t.t("settings.weekdays.$key").uppercase(),
                        color = if (isWeekend) Palette.Red400 else colors.textMuted,
                        fontSize = 10.sp, fontWeight = FontWeight.Bold,
                    )
                    Text(
                        if (minutes > 0) {
                            String.format(java.util.Locale.GERMAN, "%.2f", minutes / 60.0)
                        } else "-",
                        color = if (interactive) colors.textPrimary else colors.textFaint,
                        fontSize = 12.sp, fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (interactive) colors.surface else Color.Transparent)
                            .border(
                                1.dp,
                                if (interactive) colors.border else Color.Transparent,
                                RoundedCornerShape(8.dp),
                            )
                            .clickable {
                                when {
                                    !isCustomMode -> viewModel.showRawMessage(t.t("settings.toast.customModeRequired"))
                                    isLocked -> viewModel.showRawMessage(t.t("settings.toast.unlockRequired"))
                                    else -> dayPickerIndex = dayIndex
                                }
                            }
                            .padding(vertical = 8.dp),
                    )
                }
            }
        }
    }
}

/** DecimalDurationPicker-Ersatz: Stunden als Dezimalzahl eingeben. */
@Composable
private fun DayDurationDialog(
    title: String,
    initialMinutes: Int,
    onConfirm: (Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val t = LocalI18n.current
    var text by remember {
        mutableStateOf(
            if (initialMinutes > 0) String.format(java.util.Locale.GERMAN, "%.2f", initialMinutes / 60.0) else ""
        )
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text(t.t("drawers.decimalDuration.title")) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
            )
        },
        confirmButton = {
            TextButton(onClick = {
                val hours = text.replace(",", ".").toDoubleOrNull() ?: 0.0
                onConfirm((hours * 60).toInt().coerceIn(0, 24 * 60))
            }) { Text("OK") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(t.t("common.cancel")) }
        },
    )
}

// ─── 4. Tätigkeiten ──────────────────────────────────────────

@Composable
private fun WorkCodesSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var managerOpen by remember { mutableStateOf(false) }

    if (managerOpen) {
        WorkCodeManagerDialog(
            workCodes = state.workCodes,
            onAdd = viewModel::addWorkCode,
            onUpdate = viewModel::updateWorkCode,
            onDelete = viewModel::deleteWorkCode,
            onLoadPreset = viewModel::loadWorkCodePreset,
            onClearAll = viewModel::clearAllWorkCodes,
            onDismiss = { managerOpen = false },
        )
    }

    com.estundnzettl.app.ui.AppCard {
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
                modifier = Modifier.weight(1f),
            ) {
                SectionIconBadge(Icons.Filled.Checklist, Palette.Blue500)
                Column {
                    Text(
                        t.t("settings.workCodesCard.title"),
                        color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp,
                    )
                    Text(t.t("settings.workCodesCard.subtitle"), color = colors.textMuted, fontSize = 12.sp)
                }
            }
            Text(
                t.t("settings.workCodesCard.manageButton"),
                color = Palette.Blue500, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Palette.Blue500.copy(alpha = 0.12f))
                    .clickable { managerOpen = true }
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            )
        }
    }
}

// ─── 6. Backup & Export ──────────────────────────────────────

@Composable
private fun BackupSection(
    viewModel: MainViewModel,
    t: com.estundnzettl.app.i18n.I18n,
    accent: Color,
    onExport: () -> Unit,
    onImport: () -> Unit,
) {
    val colors = LocalAppColors.current
    CollapsibleSettingsCard(
        title = t.t("settings.backup.header"),
        subtitle = t.t("settings.backup.subtitle"),
        icon = { SectionIconBadge(Icons.Filled.Save, accent) },
        defaultExpanded = false,
    ) {
        CloudBackupContent(viewModel)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.weight(1f)) {
                ActionButton(label = t.t("settings.backup.export"), tint = accent) { onExport() }
            }
            Box(modifier = Modifier.weight(1f)) {
                ActionButton(label = t.t("settings.backup.import"), tint = colors.info) { onImport() }
            }
        }
    }
}

// ─── 7. Darstellung ──────────────────────────────────────────

@Composable
private fun AppearanceSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    CollapsibleSettingsCard(
        title = t.t("settings.appearance.title"),
        subtitle = t.t("settings.appearance.subtitle"),
        icon = { SectionIconBadge(Icons.Filled.ColorLens, Palette.Purple400) },
        defaultExpanded = false,
    ) {
        // Sprache
        SettingsFieldLabel(t.t("settings.language.header"))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("de", "en").forEach { lang ->
                val selected = state.language == lang
                Text(
                    t.t("settings.language.$lang"),
                    color = if (selected) colors.accent else colors.textSecondary,
                    fontWeight = FontWeight.Bold, fontSize = 14.sp, textAlign = TextAlign.Center,
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (selected) colors.accent.copy(alpha = 0.1f) else colors.surfaceVariant)
                        .border(
                            1.dp,
                            if (selected) colors.accent else colors.border,
                            RoundedCornerShape(12.dp),
                        )
                        .clickable { viewModel.setLanguage(lang) }
                        .padding(vertical = 10.dp),
                )
            }
        }

        // Theme
        SettingsFieldLabel(t.t("settings.theme.title"))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("light", "dark", "system").forEach { mode ->
                val selected = state.theme == mode
                Text(
                    t.t("settings.theme.$mode"),
                    color = if (selected) colors.accent else colors.textSecondary,
                    fontWeight = FontWeight.Bold, fontSize = 14.sp, textAlign = TextAlign.Center,
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (selected) colors.accent.copy(alpha = 0.1f) else colors.surfaceVariant)
                        .border(
                            1.dp,
                            if (selected) colors.accent else colors.border,
                            RoundedCornerShape(12.dp),
                        )
                        .clickable { viewModel.setTheme(mode) }
                        .padding(vertical = 10.dp),
                )
            }
        }

        SettingsToggleRow(
            title = t.t("settings.materialYou.title"),
            checked = state.materialYouEnabled,
            accent = Palette.Purple400,
            onToggle = { viewModel.setMaterialYou(it) },
        )
    }
}

// ─── 8. Hausmasta ────────────────────────────────────────────

@Composable
private fun ExpertModeSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val expertMode = state.userData?.expertMode == true
    var showRecalcWarning by remember { mutableStateOf(false) }
    var showDemoWarning by remember { mutableStateOf(false) }

    if (showDemoWarning) {
        AlertDialog(
            onDismissRequest = { showDemoWarning = false },
            title = { Text(t.t("settings.data.demoWarning.title")) },
            text = {
                Text(
                    t.t(
                        "settings.data.demoWarning.messageTemplate",
                        "hint" to t.t("settings.data.demoWarning.withBackupHint"),
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showDemoWarning = false
                    viewModel.loadDemoData()
                }) { Text(t.t("settings.data.demoWarning.confirm"), color = colors.danger) }
            },
            dismissButton = {
                TextButton(onClick = { showDemoWarning = false }) { Text(t.t("common.cancel")) }
            },
        )
    }

    if (showRecalcWarning) {
        AlertDialog(
            onDismissRequest = { showRecalcWarning = false },
            title = { Text(t.t("settings.appInfo.recalcModalTitle")) },
            text = { Text(t.t("settings.appInfo.recalcModalMessage")) },
            confirmButton = {
                TextButton(onClick = {
                    showRecalcWarning = false
                    viewModel.recalculateAllEntries()
                }) { Text(t.t("settings.appInfo.recalc"), color = colors.accent) }
            },
            dismissButton = {
                TextButton(onClick = { showRecalcWarning = false }) { Text(t.t("common.cancel")) }
            },
        )
    }

    com.estundnzettl.app.ui.AppCard {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SettingsToggleRow(
                title = t.t("settings.expertMode.title"),
                subtitle = if (expertMode) t.t("settings.expertMode.on") else t.t("settings.expertMode.off"),
                checked = expertMode,
                accent = Palette.Amber600,
                icon = { SectionIconBadge(Icons.Filled.Build, Palette.Amber600) },
                onToggle = { viewModel.setExpertMode(it) },
            )
            AnimatedVisibility(visible = expertMode) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        t.t("settings.expertMode.description"),
                        color = Palette.Amber600, fontSize = 12.sp,
                    )
                    ActionButton(label = t.t("settings.appInfo.recalc"), tint = Palette.Amber600) {
                        showRecalcWarning = true
                    }
                    ActionButton(label = t.t("settings.appInfo.demoData"), tint = Palette.Amber600) {
                        showDemoWarning = true
                    }
                }
            }
        }
    }
}

// ─── 9. App-Info & Danger Zone ───────────────────────────────

@Composable
private fun AppInfoSection(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var showDeleteAll by remember { mutableStateOf(false) }

    if (showDeleteAll) {
        AlertDialog(
            onDismissRequest = { showDeleteAll = false },
            title = { Text(t.t("app.deleteAllTitle")) },
            text = { Text(t.t("app.deleteAllMessage")) },
            confirmButton = {
                TextButton(onClick = { showDeleteAll = false; viewModel.deleteAllData() }) {
                    Text(t.t("common.delete"), color = colors.danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAll = false }) { Text(t.t("common.cancel")) }
            },
        )
    }

    var showHelp by remember { mutableStateOf(false) }
    var showChangelog by remember { mutableStateOf(false) }
    if (showHelp) com.estundnzettl.app.ui.HelpSheet(onDismiss = { showHelp = false })
    if (showChangelog) com.estundnzettl.app.ui.ChangelogSheet(onDismiss = { showChangelog = false })

    com.estundnzettl.app.ui.AppCard {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                t.t("settings.appInfo.versionLabel", "version" to "0.1.0 (Kotlin)"),
                color = colors.textMuted, fontSize = 12.sp,
            )
            ActionButton(label = t.t("settings.appInfo.help"), tint = colors.info) {
                showHelp = true
            }
            ActionButton(label = t.t("settings.appInfo.changelog"), tint = colors.info) {
                showChangelog = true
            }
            Text(
                t.t("settings.appInfo.dangerTitle"),
                color = colors.danger, fontWeight = FontWeight.Bold, fontSize = 14.sp,
            )
            Text(t.t("settings.appInfo.dangerBody"), color = colors.textMuted, fontSize = 12.sp)
            ActionButton(label = t.t("settings.appInfo.deleteAll"), tint = colors.danger) {
                showDeleteAll = true
            }
        }
    }
}

// ─── Foto-Helfer (Port von processImage: max 1024px, JPEG 90 %) ──

private fun uriToJpegDataUrl(context: android.content.Context, uri: Uri): String {
    val original: Bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, _, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        }
    } else {
        @Suppress("DEPRECATION")
        android.provider.MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
    }

    val maxDim = 1024
    val scale = minOf(
        maxDim.toFloat() / original.width,
        maxDim.toFloat() / original.height,
        1f,
    )
    val scaled = if (scale < 1f) {
        Bitmap.createScaledBitmap(
            original,
            (original.width * scale).toInt(),
            (original.height * scale).toInt(),
            true,
        )
    } else original

    val out = ByteArrayOutputStream()
    scaled.compress(Bitmap.CompressFormat.JPEG, 90, out)
    val base64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    return "data:image/jpeg;base64,$base64"
}

private fun dataUrlToBitmap(dataUrl: String): Bitmap? {
    val base64 = dataUrl.substringAfter("base64,", "")
    if (base64.isEmpty()) return null
    return runCatching {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }.getOrNull()
}
