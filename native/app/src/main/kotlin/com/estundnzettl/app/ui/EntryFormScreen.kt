package com.estundnzettl.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.FormUiState
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.calc.WorkCodes
import com.estundnzettl.core.calc.isOvernightShift
import com.estundnzettl.core.locale.holidays.toDateString
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale as JavaLocale

/**
 * Eintragsformular — Port von EntryForm.tsx: Typ-Auswahl (Arbeit, Fahrt,
 * Krank, Urlaub, ZA), Datum mit Tages-Steppern, Material-Zeit-Picker,
 * Pause, Tätigkeitscode-Auswahl (Dialog), Projekt mit Vorschlägen.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntryFormScreen(
    form: FormUiState,
    userData: UserData?,
    workCodes: List<WorkCode>,
    uniqueProjects: List<String>,
    lastWorkEntry: Entry?,
    language: String,
    onUpdateForm: ((FormUiState) -> FormUiState) -> Unit,
    onDateChanged: (String) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
    onAddWorkCode: (String) -> Boolean,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = androidx.compose.ui.platform.LocalContext.current
    val javaLocale = if (language == "en") JavaLocale.ENGLISH else JavaLocale.GERMAN

    val isSpecialType = form.entryType in listOf("vacation", "sick", "time_comp")
    val simpleMode = userData?.simpleMode == true
    val effectiveManual = if (simpleMode && isSpecialType) true else form.specialManualMode
    val showTimeInputs = form.entryType == "work" || form.entryType == "drive" ||
        (isSpecialType && effectiveManual)
    val isArrival = form.entryType == "work" && form.code == WorkCodes.ARRIVAL

    var showDatePicker by remember { mutableStateOf(false) }
    var activeTimeField by remember { mutableStateOf<String?>(null) }
    var showPausePicker by remember { mutableStateOf(false) }
    var showCodeDialog by remember { mutableStateOf(false) }
    var quickAddOpen by remember { mutableStateOf(false) }
    var quickAddValue by remember { mutableStateOf("") }
    var showSuggestions by remember { mutableStateOf(false) }

    val defaultCode = if (workCodes.isNotEmpty()) workCodes[0].id else 1
    val currentCodeLabel = workCodes.firstOrNull { it.id == form.code }?.label
        ?: t.t("entryForm.codePlaceholder")

    val formDate = runCatching { LocalDate.parse(form.formDate) }.getOrDefault(LocalDate.now())

    // ─── Picker-Dialoge ──────────────────────────────────────

    if (showDatePicker) {
        WeekendDatePickerDialog(
            initialDate = formDate,
            locale = javaLocale,
            onConfirm = { date ->
                onDateChanged(date.toDateString())
                showDatePicker = false
            },
            onDismiss = { showDatePicker = false },
        )
    }

    activeTimeField?.let { field ->
        val current = if (field == "start") form.startTime else form.endTime
        // Material3-Uhr wie die Original-App (Material3TimePickerActivity)
        AppTimePickerDialog(
            title = if (field == "start") t.t("entryForm.startTime") else t.t("entryForm.endTime"),
            initial = current,
            onConfirm = { value ->
                onUpdateForm { f ->
                    if (field == "start") f.copy(startTime = value) else f.copy(endTime = value)
                }
                activeTimeField = null
            },
            onDismiss = { activeTimeField = null },
        )
    }

    if (showPausePicker) {
        // Pausendauer als HH:MM in der M3-Uhr mit orangem Akzent (wie Original)
        val pauseMinutes = if (form.pauseDuration > 0) form.pauseDuration else 30
        AppTimePickerDialog(
            title = t.t("entryForm.pause"),
            initial = "%02d:%02d".format(pauseMinutes / 60, pauseMinutes % 60),
            orangeAccent = true,
            onConfirm = { value ->
                val (h, m) = value.split(":").map { it.toInt() }
                onUpdateForm { it.copy(pauseDuration = h * 60 + m) }
                showPausePicker = false
            },
            onDismiss = { showPausePicker = false },
        )
    }

    if (showCodeDialog) {
        val selectableCodes = workCodes.filter {
            it.id != WorkCodes.ARRIVAL && it.id != WorkCodes.DRIVE
        }
        val selectedIndex = selectableCodes.indexOfFirst { it.id == form.code }
            .coerceAtLeast(0)
        val listState = rememberLazyListState(
            initialFirstVisibleItemIndex = selectedIndex,
        )

        AlertDialog(
            onDismissRequest = { showCodeDialog = false },
            title = {
                Text(
                    t.t("entryForm.selectActivity"),
                    fontWeight = FontWeight.Bold,
                )
            },
            text = {
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp),
                ) {
                    items(selectableCodes, key = { it.id }) { code ->
                        val selected = code.id == form.code
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (selected) colors.accent.copy(alpha = 0.12f)
                                    else Color.Transparent,
                                )
                                .clickable {
                                    onUpdateForm { it.copy(code = code.id) }
                                    showCodeDialog = false
                                }
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(
                                selected = selected,
                                onClick = {
                                    onUpdateForm { it.copy(code = code.id) }
                                    showCodeDialog = false
                                },
                            )
                            Text(
                                text = code.label,
                                color = if (selected) colors.accent else colors.textPrimary,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(vertical = 10.dp),
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCodeDialog = false }) {
                    Text(t.t("common.close"))
                }
            },
        )
    }

    // ─── Formular ────────────────────────────────────────────

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp, Alignment.Bottom),
    ) {
        // Datums-Header
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Text(
                text = formDate.dayOfWeek.getDisplayName(TextStyle.FULL, javaLocale)
                    .replaceFirstChar { it.uppercase(javaLocale) },
                color = colors.textPrimary,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = "%02d. %s %d".format(
                    formDate.dayOfMonth,
                    formDate.month.getDisplayName(TextStyle.FULL_STANDALONE, javaLocale),
                    formDate.year,
                ),
                color = colors.accent,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
            )
        }

        AppCard {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Kopfzeile: Label + "Wie zuletzt"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    FieldLabel(t.t("entryForm.entryTypeLabel"))
                    if (form.entryType == "work" && !isArrival && lastWorkEntry != null) {
                        Text(
                            text = "✨ " + t.t("entryForm.asLast"),
                            color = colors.accent,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(colors.accent.copy(alpha = 0.1f))
                                .clickable {
                                    onUpdateForm {
                                        it.copy(
                                            startTime = lastWorkEntry.start ?: "06:00",
                                            endTime = lastWorkEntry.end ?: "16:30",
                                            pauseDuration = lastWorkEntry.pause,
                                            project = lastWorkEntry.project ?: "",
                                            code = lastWorkEntry.code ?: it.code,
                                        )
                                    }
                                }
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }

                // Typ-Auswahl (5 Segmente)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(colors.surfaceVariant)
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    TypeSegment(t.t("entryForm.types.work"), form.entryType == "work" && !isArrival, colors.textPrimary) {
                        onUpdateForm { it.copy(entryType = "work", code = defaultCode) }
                    }
                    TypeSegment(t.t("entryForm.types.drive"), form.entryType == "drive" || isArrival, colors.accent) {
                        onUpdateForm { it.copy(entryType = "drive", code = WorkCodes.DRIVE, pauseDuration = 0) }
                    }
                    TypeSegment(t.t("entryForm.types.sick"), form.entryType == "sick", colors.danger) {
                        onUpdateForm { it.copy(entryType = "sick") }
                    }
                    TypeSegment(t.t("entryForm.types.vacation"), form.entryType == "vacation", colors.info) {
                        onUpdateForm { it.copy(entryType = "vacation") }
                    }
                    TypeSegment(t.t("entryForm.types.timeCompShort"), form.entryType == "time_comp", colors.special) {
                        onUpdateForm { it.copy(entryType = "time_comp") }
                    }
                }

                // Fahrt-Untertyp: An/Abreise vs Fahrzeit
                if (form.entryType == "drive" || isArrival) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SubtypeButton(
                            label = t.t("entryForm.driveSubtype.arrival"),
                            badge = t.t("entryForm.driveSubtype.arrivalBadge"),
                            selected = isArrival,
                            modifier = Modifier.weight(1f),
                        ) {
                            onUpdateForm {
                                it.copy(entryType = "work", code = WorkCodes.ARRIVAL, pauseDuration = 0, project = "")
                            }
                        }
                        SubtypeButton(
                            label = t.t("entryForm.driveSubtype.driveTime"),
                            badge = t.t("entryForm.driveSubtype.driveTimeBadge"),
                            selected = form.entryType == "drive" && form.code == WorkCodes.DRIVE,
                            modifier = Modifier.weight(1f),
                        ) {
                            onUpdateForm {
                                it.copy(entryType = "drive", code = WorkCodes.DRIVE, pauseDuration = 0, project = "")
                            }
                        }
                    }
                }

                // Sondertypen: Hinweis + Auto/Manuell-Umschalter
                if (isSpecialType) {
                    if (!simpleMode && !form.specialManualMode) {
                        val tint = when (form.entryType) {
                            "sick" -> colors.danger
                            "vacation" -> colors.info
                            else -> colors.special
                        }
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(tint.copy(alpha = 0.08f))
                                .border(1.dp, tint.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                .padding(12.dp),
                        ) {
                            Text(
                                t.t("entryForm.autoCalc.title"),
                                color = tint,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                            )
                            Text(
                                t.t(
                                    "entryForm.autoCalc.message",
                                    "type" to when (form.entryType) {
                                        "vacation" -> t.t("entryForm.autoCalc.vacationType")
                                        "sick" -> t.t("entryForm.autoCalc.sickType")
                                        else -> t.t("entryForm.autoCalc.timeCompType")
                                    },
                                ),
                                color = tint,
                                fontSize = 14.sp,
                            )
                        }
                    }
                    if (!simpleMode) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.surfaceVariant)
                                .padding(4.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            TypeSegment(t.t("entryForm.mode.auto"), !form.specialManualMode, colors.textPrimary) {
                                onUpdateForm { it.copy(specialManualMode = false) }
                            }
                            TypeSegment(t.t("entryForm.mode.manual"), form.specialManualMode, colors.textPrimary) {
                                onUpdateForm { it.copy(specialManualMode = true) }
                            }
                        }
                    }
                }

                // Datum mit Steppern
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    FieldLabel(t.t("entryForm.date"))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        StepperButton(Icons.AutoMirrored.Filled.KeyboardArrowLeft) {
                            onDateChanged(formDate.minusDays(1).toDateString())
                        }
                        InputButton(
                            value = "%s, %02d.%02d.%d".format(
                                formDate.dayOfWeek.getDisplayName(TextStyle.SHORT, javaLocale),
                                formDate.dayOfMonth, formDate.monthValue, formDate.year,
                            ),
                            icon = { Icon(Icons.Filled.CalendarMonth, null, tint = colors.textFaint, modifier = Modifier.size(18.dp)) },
                            modifier = Modifier.weight(1f),
                        ) { showDatePicker = true }
                        StepperButton(Icons.AutoMirrored.Filled.KeyboardArrowRight) {
                            onDateChanged(formDate.plusDays(1).toDateString())
                        }
                    }
                }

                if (showTimeInputs) {
                    // Start / Ende
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            FieldLabel(t.t("entryForm.start"))
                            InputButton(
                                value = form.startTime,
                                icon = { Icon(Icons.Filled.Schedule, null, tint = colors.textFaint, modifier = Modifier.size(18.dp)) },
                            ) { activeTimeField = "start" }
                        }
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                FieldLabel(t.t("entryForm.end"))
                                if (isOvernightShift(form.startTime, form.endTime)) {
                                    Text(
                                        t.t("entryForm.nextDay").uppercase(),
                                        color = Palette.Amber600,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                            InputButton(
                                value = form.endTime,
                                icon = { Icon(Icons.Filled.Schedule, null, tint = colors.textFaint, modifier = Modifier.size(18.dp)) },
                            ) { activeTimeField = "end" }
                        }
                    }

                    // Pause
                    if (form.entryType == "work" && !isArrival) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            FieldLabel(t.t("entryForm.pause"))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                PauseButton(
                                    label = t.t("entryForm.noPause"),
                                    selected = form.pauseDuration == 0,
                                    modifier = Modifier.weight(1f),
                                ) { onUpdateForm { it.copy(pauseDuration = 0) } }
                                PauseButton(
                                    label = if (form.pauseDuration > 0) {
                                        if (form.pauseDuration >= 60) {
                                            "${form.pauseDuration / 60}h" +
                                                (if (form.pauseDuration % 60 > 0) " ${form.pauseDuration % 60}m" else "")
                                        } else {
                                            t.t("entryForm.pauseMinutes", "minutes" to form.pauseDuration)
                                        }
                                    } else {
                                        t.t("entryForm.pauseMinutes", "minutes" to 30)
                                    },
                                    selected = form.pauseDuration > 0,
                                    withChevron = true,
                                    modifier = Modifier.weight(1f),
                                ) { showPausePicker = true }
                            }
                        }
                    }

                    // Tätigkeit
                    if (form.entryType == "work" && !isArrival) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                FieldLabel(t.t("entryForm.activity"))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.clickable { quickAddOpen = !quickAddOpen },
                                ) {
                                    Icon(Icons.Filled.Add, null, tint = colors.textFaint, modifier = Modifier.size(12.dp))
                                    Text(t.t("entryForm.newActivity"), color = colors.textFaint, fontSize = 12.sp)
                                }
                            }

                            AnimatedVisibility(visible = quickAddOpen) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(bottom = 8.dp),
                                ) {
                                    OutlinedTextField(
                                        value = quickAddValue,
                                        onValueChange = { quickAddValue = it },
                                        placeholder = { Text(t.t("entryForm.quickAddPlaceholder"), fontSize = 14.sp) },
                                        singleLine = true,
                                        modifier = Modifier.weight(1f),
                                    )
                                    IconButton(
                                        onClick = {
                                            if (quickAddValue.trim().isNotEmpty()) {
                                                onAddWorkCode(quickAddValue.trim())
                                                quickAddValue = ""
                                                quickAddOpen = false
                                            }
                                        },
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Palette.Emerald500),
                                    ) {
                                        Icon(Icons.Filled.Add, null, tint = Color.White)
                                    }
                                }
                            }

                            InputButton(
                                value = currentCodeLabel,
                                icon = { Icon(Icons.AutoMirrored.Filled.List, null, tint = colors.textFaint, modifier = Modifier.size(18.dp)) },
                                centered = false,
                            ) { showCodeDialog = true }
                        }
                    }

                    // Projekt / Strecke
                    if (form.entryType == "work" || form.entryType == "drive") {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            FieldLabel(
                                if (form.entryType == "drive" || isArrival) {
                                    t.t("entryForm.distanceOrNote")
                                } else {
                                    t.t("entryForm.project")
                                }
                            )
                            OutlinedTextField(
                                value = form.project,
                                onValueChange = { value ->
                                    onUpdateForm { it.copy(project = value) }
                                    showSuggestions = value.isNotEmpty()
                                },
                                placeholder = { Text(t.t("entryForm.projectPlaceholder")) },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions.Default,
                                modifier = Modifier.fillMaxWidth(),
                            )

                            val suggestions = remember(form.project, uniqueProjects) {
                                if (form.project.isEmpty()) emptyList()
                                else uniqueProjects.filter {
                                    it.contains(form.project, ignoreCase = true) && it != form.project
                                }.take(5)
                            }
                            AnimatedVisibility(visible = showSuggestions && suggestions.isNotEmpty()) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(colors.surface)
                                        .border(1.dp, colors.border, RoundedCornerShape(12.dp)),
                                ) {
                                    Text(
                                        t.t("entryForm.knownProjects").uppercase(),
                                        color = colors.textFaint,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    )
                                    suggestions.forEach { suggestion ->
                                        Text(
                                            suggestion,
                                            color = colors.textSecondary,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    onUpdateForm { it.copy(project = suggestion) }
                                                    showSuggestions = false
                                                }
                                                .padding(horizontal = 16.dp, vertical = 12.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Aktionen
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        t.t("common.cancel"),
                        color = colors.textMuted,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.surfaceVariant)
                            .clickable(onClick = onCancel)
                            .padding(vertical = 14.dp),
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .weight(2f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (colors.isDark) Palette.Emerald600 else Palette.Zinc900)
                            .clickable {
                                Haptics.medium(context)
                                onSave()
                            }
                            .padding(vertical = 14.dp),
                    ) {
                        Icon(Icons.Filled.Save, null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Text(t.t("common.save"), color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

// ─── Bausteine ───────────────────────────────────────────────

@Composable
private fun FieldLabel(text: String) {
    val colors = LocalAppColors.current
    Text(
        text = text.uppercase(),
        color = colors.textMuted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.5.sp,
    )
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.TypeSegment(
    label: String,
    selected: Boolean,
    selectedColor: Color,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Text(
        text = label,
        color = if (selected) selectedColor else colors.textMuted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
        maxLines = 1,
        modifier = Modifier
            .weight(1f)
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) colors.surface else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
    )
}

@Composable
private fun SubtypeButton(
    label: String,
    badge: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    val tint = colors.accent
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) tint.copy(alpha = 0.12f) else colors.surface)
            .border(
                width = if (selected) 2.dp else 1.dp,
                color = if (selected) tint else colors.border,
                shape = RoundedCornerShape(8.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(
            label,
            color = if (selected) tint else colors.textSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            badge.uppercase(),
            color = if (selected) tint else colors.textMuted,
            fontSize = 10.sp,
            modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .background(colors.surfaceVariant)
                .padding(horizontal = 4.dp, vertical = 1.dp),
        )
    }
}

@Composable
private fun StepperButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(colors.surfaceVariant)
            .clickable(onClick = onClick)
            .padding(12.dp),
    ) {
        Icon(icon, contentDescription = null, tint = colors.textSecondary, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun InputButton(
    value: String,
    icon: (@Composable () -> Unit)? = null,
    modifier: Modifier = Modifier,
    centered: Boolean = true,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(if (colors.isDark) colors.surfaceVariant else colors.surface)
            .border(1.dp, if (colors.isDark) colors.border else Palette.Zinc300, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 14.dp),
    ) {
        Text(
            value,
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            textAlign = if (centered) TextAlign.Center else TextAlign.Start,
            maxLines = 1,
            modifier = Modifier.weight(1f),
        )
        icon?.invoke()
    }
}

@Composable
private fun PauseButton(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    withChevron: Boolean = false,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) colors.accent.copy(alpha = 0.08f) else colors.surface)
            .border(
                1.dp,
                if (selected) colors.accent else colors.border,
                RoundedCornerShape(8.dp),
            )
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
    ) {
        Text(
            text = label,
            color = if (selected) colors.accent else colors.textMuted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        if (withChevron) {
            // Dropdown-Pfeil wie das Original (öffnet den Dauer-Picker)
            Icon(
                Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = if (selected) colors.accent else colors.textMuted,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}
