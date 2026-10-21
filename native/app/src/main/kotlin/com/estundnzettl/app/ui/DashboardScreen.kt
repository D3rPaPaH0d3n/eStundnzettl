package com.estundnzettl.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.runtime.getValue
import androidx.compose.ui.draw.rotate
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.theme.AppColors
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.calc.AppData
import com.estundnzettl.core.calc.MissingWorkDay
import com.estundnzettl.core.calc.OvertimeAccountMonth
import com.estundnzettl.core.calc.OvertimeAccountSuggestion
import com.estundnzettl.core.calc.VacationBalance
import com.estundnzettl.core.calc.WorkCodes
import com.estundnzettl.core.calc.calculateDisplayedDayMinutes
import com.estundnzettl.core.calc.calculateMonthlyTargetProgress
import com.estundnzettl.core.calc.calculatePeriodStats
import com.estundnzettl.core.calc.formatHalfDays
import com.estundnzettl.core.calc.formatSignedDurationInput
import com.estundnzettl.core.calc.getTargetMinutesForDate
import com.estundnzettl.core.calc.getWeekNumber
import com.estundnzettl.core.calc.parseSignedDurationInput
import com.estundnzettl.core.calc.pendingMissingDayHint
import com.estundnzettl.core.format.formatSignedTime
import com.estundnzettl.core.format.formatTime
import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale as JavaLocale

/**
 * Dashboard — Port von Dashboard.tsx: Monats-Statistik-Karte mit
 * Navigation und Fortschrittsbalken, darunter Wochen-Gruppen mit
 * aufklappbaren Tages-Karten (Swipe-links = Löschen, Tap = Bearbeiten).
 */
@Composable
fun DashboardScreen(
    currentMonth: YearMonth,
    appData: AppData,
    userData: UserData?,
    workCodes: List<WorkCode>,
    locale: AppLocale,
    calculationConfig: CalculationConfig?,
    language: String,
    onChangeMonth: (Long) -> Unit,
    onSetMonth: (YearMonth) -> Unit,
    onEditEntry: (Entry) -> Unit,
    onDeleteEntry: (Entry) -> Unit,
    attachmentCounts: Map<EntryId, Int> = emptyMap(),
    onManageAttachments: (Entry) -> Unit = {},
    overtimeAccountHintDismissed: Boolean = true,
    onEnableOvertimeAccount: (YearMonth) -> Unit = {},
    onDismissOvertimeAccountHint: () -> Unit = {},
    onBookOvertimePayout: (YearMonth, Int) -> Unit = { _, _ -> },
    onAddEntryForDate: (LocalDate) -> Unit = {},
    missingDaysHintEnabled: Boolean = false,
    missingDaysAcknowledgedThrough: LocalDate? = null,
    onDismissMissingDaysHint: (LocalDate) -> Unit = {},
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val simpleMode = userData?.simpleMode == true
    val javaLocale = if (language == "en") JavaLocale.ENGLISH else JavaLocale.GERMAN

    var monthPickerOpen by remember { mutableStateOf(false) }
    val currentWeek = remember { getWeekNumber(LocalDate.now()) }
    var expandedWeeks by remember { mutableStateOf(setOf(currentWeek)) }

    val workCodeLabelMap = remember(workCodes) { workCodes.associate { it.id to it.label } }

    // Wochen aus Einträgen und Tagen ohne Eintrag — auch eine komplett
    // vergessene Woche taucht auf. Sortiert nach dem jüngsten Tag.
    val sortedWeeks = remember(appData) {
        val entryWeeks = appData.groupedByWeek.toMap()
        val missingWeeks = appData.missingWorkDays.groupBy { getWeekNumber(it.date) }
        (entryWeeks.keys + missingWeeks.keys).map { week ->
            WeekRows(week, entryWeeks[week].orEmpty(), missingWeeks[week].orEmpty())
        }.sortedByDescending { it.latestDate }
    }

    if (monthPickerOpen) {
        MonthPickerDialog(
            selected = currentMonth,
            onSelect = { onSetMonth(it); monthPickerOpen = false },
            onDismiss = { monthPickerOpen = false },
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            top = 12.dp,
            bottom = 108.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item(key = "month-stats") {
            Box(modifier = Modifier.padding(bottom = 8.dp)) {
                MonthStatsCard(
                    currentMonth = currentMonth,
                    appData = appData,
                    simpleMode = simpleMode,
                    monthlyTargetMinutes = userData?.monthlyTargetMinutes,
                    javaLocale = javaLocale,
                    language = language,
                    onChangeMonth = onChangeMonth,
                    onOpenPicker = { monthPickerOpen = true },
                    onBookPayout = { minutes -> onBookOvertimePayout(currentMonth, minutes) },
                )
            }
        }

        // Hinweis auf vergessene Tage (Vor- und laufender Monat), nur neue seit dem Ausblenden
        val pendingMissing = if (missingDaysHintEnabled && currentMonth == YearMonth.now()) {
            pendingMissingDayHint(appData.recentMissingWorkDays, missingDaysAcknowledgedThrough)
        } else {
            emptyList()
        }
        if (pendingMissing.isNotEmpty()) {
            item(key = "missing-days-hint") {
                MissingDaysHint(
                    days = pendingMissing,
                    javaLocale = javaLocale,
                    onAdd = { onAddEntryForDate(pendingMissing.first().date) },
                    onDismiss = { onDismissMissingDaysHint(pendingMissing.last().date) },
                )
            }
        }

        val suggestion = appData.overtimeAccountSuggestion
        if (suggestion != null && !overtimeAccountHintDismissed && currentMonth == YearMonth.now()) {
            item(key = "overtime-account-hint") {
                OvertimeAccountHint(
                    suggestion = suggestion,
                    javaLocale = javaLocale,
                    onEnable = { onEnableOvertimeAccount(suggestion.startMonth) },
                    onDismiss = onDismissOvertimeAccountHint,
                )
            }
        }

        item(key = "recent-entries-title") {
            Text(
                text = t.t("dashboard.recentEntries"),
                color = colors.textMuted,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
        }

        if (sortedWeeks.isEmpty()) {
            item(key = "empty-state") {
                EmptyState(t, colors)
            }
        } else {
            items(
                items = sortedWeeks,
                key = { "week-${it.week}" },
            ) { (week, weekEntries, missingDays) ->
                WeekGroup(
                    missingDays = missingDays,
                    onAddEntry = onAddEntryForDate,
                    attachmentCounts = attachmentCounts,
                    onManageAttachments = onManageAttachments,
                    week = week,
                    weekEntries = weekEntries,
                    currentMonth = currentMonth,
                    expanded = week in expandedWeeks,
                    onToggle = {
                        expandedWeeks = if (week in expandedWeeks) {
                            expandedWeeks - week
                        } else {
                            expandedWeeks + week
                        }
                    },
                    userData = userData,
                    locale = locale,
                    config = calculationConfig,
                    simpleMode = simpleMode,
                    workCodeLabelMap = workCodeLabelMap,
                    javaLocale = javaLocale,
                    onEditEntry = onEditEntry,
                    onDeleteEntry = onDeleteEntry,
                )
            }
        }
    }
}

@Composable
private fun MonthStatsCard(
    currentMonth: YearMonth,
    appData: AppData,
    simpleMode: Boolean,
    monthlyTargetMinutes: Int?,
    javaLocale: JavaLocale,
    language: String,
    onChangeMonth: (Long) -> Unit,
    onOpenPicker: () -> Unit,
    onBookPayout: (Int) -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val stats = appData.stats
    val overtime = appData.overtime
    val monthlyProgress = calculateMonthlyTargetProgress(
        actualMinutes = stats.totalIst,
        userData = UserData(simpleMode = simpleMode, monthlyTargetMinutes = monthlyTargetMinutes),
    )
    val monthLabel = currentMonth.month.getDisplayName(TextStyle.FULL_STANDALONE, javaLocale)
        .replaceFirstChar { it.uppercase(javaLocale) } + " " + currentMonth.year

    AppCard {
        // Header: Monats-Navigation
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { onChangeMonth(-1) }) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = t.t("dashboard.prevMonth"),
                    tint = colors.textFaint,
                )
            }
            Text(
                text = monthLabel,
                color = colors.textPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clickable(onClick = onOpenPicker),
            )
            IconButton(onClick = { onChangeMonth(1) }) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = t.t("dashboard.nextMonth"),
                    tint = colors.textFaint,
                )
            }
        }

        HorizontalDivider(colors)

        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Column {
                    StatLabel(t.t("dashboard.actual"), colors)
                    Text(
                        formatTime(stats.totalIst),
                        color = colors.textPrimary,
                        fontSize = 24.sp,
                        // leading-none des Originals
                        lineHeight = 24.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                if (monthlyProgress != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                        Column(horizontalAlignment = Alignment.End) {
                            StatLabel(t.t("dashboard.monthlyTarget"), colors)
                            Text(formatTime(monthlyProgress.targetMinutes), color = colors.textSecondary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            StatLabel(
                                when {
                                    monthlyProgress.exceededMinutes > 0 -> t.t("dashboard.monthlyExceeded")
                                    monthlyProgress.remainingMinutes > 0 -> t.t("dashboard.monthlyRemaining")
                                    else -> t.t("dashboard.monthlyReached")
                                }, colors,
                            )
                            Text(
                                formatTime(if (monthlyProgress.exceededMinutes > 0) monthlyProgress.exceededMinutes else monthlyProgress.remainingMinutes),
                                color = if (monthlyProgress.remainingMinutes == 0) colors.positive else colors.textSecondary,
                                fontSize = 20.sp, fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                } else if (!simpleMode) {
                    Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                        Column(horizontalAlignment = Alignment.End) {
                            StatLabel(t.t("dashboard.target"), colors)
                            Text(
                                formatTime(stats.totalTarget),
                                color = colors.textSecondary,
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            StatLabel(t.t("dashboard.balance"), colors)
                            Text(
                                formatSignedTime(overtime),
                                color = if (overtime >= 0) colors.positive else colors.negative,
                                fontSize = 20.sp,
                                lineHeight = 20.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }

            if (!simpleMode || monthlyProgress != null) {
                // Durchgehender Balken wie das Original (motion.div: Breite
                // animiert beim Einblenden von 0 auf den Prozentwert).
                var progressStarted by remember { mutableStateOf(false) }
                LaunchedEffect(Unit) { progressStarted = true }
                val progressFraction by androidx.compose.animation.core.animateFloatAsState(
                    targetValue = if (progressStarted) {
                        (monthlyProgress?.progressPercent
                            ?: appData.progressPercent.toFloat()).div(100f).coerceIn(0f, 1f)
                    } else {
                        0f
                    },
                    animationSpec = androidx.compose.animation.core.tween(
                        durationMillis = 800,
                        easing = androidx.compose.animation.core.FastOutSlowInEasing,
                    ),
                    label = "dashboardProgress",
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(if (colors.isDark) Palette.Zinc700 else Palette.Zinc200),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progressFraction)
                            .clip(RoundedCornerShape(5.dp))
                            .background(if (monthlyProgress != null || overtime >= 0) colors.positive else colors.negative),
                    )
                }
            }

            // Footer: Fahrzeit + MA/ÜS
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                if (stats.drive > 0) {
                    Text(
                        text = androidx.compose.ui.text.buildAnnotatedString {
                            append(t.t("dashboard.driveTime", "code" to WorkCodes.DRIVE) + ": ")
                            withStyle(
                                androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.SemiBold),
                            ) {
                                append(formatTime(stats.drive))
                            }
                        },
                        color = colors.textMuted,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                    )
                } else {
                    Spacer(Modifier.width(1.dp))
                }

                if (!simpleMode) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (stats.overtimeSplit.mehrarbeit > 0) {
                            Text(
                                text = formatTime(stats.overtimeSplit.mehrarbeit) + " " +
                                    t.t("dashboard.overtimeShort.extra"),
                                color = colors.info,
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                        if (stats.overtimeSplit.ueberstunden > 0) {
                            Text(
                                text = formatTime(stats.overtimeSplit.ueberstunden) + " " +
                                    t.t("dashboard.overtimeShort.overtime"),
                                color = colors.positive,
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                    }
                }
            }

            val account = appData.overtimeAccount
            val vacation = appData.vacationBalance
            if (account != null || vacation != null) {
                MonthDetails(account, vacation, javaLocale, language, onBookPayout)
            }
        }
    }
}

/** Zeitausgleichskonto: Übertrag, genommener ZA, Auszahlung und aktueller Stand. */
@Composable
private fun OvertimeAccountPanel(
    account: OvertimeAccountMonth,
    javaLocale: JavaLocale,
    onBookPayout: (Int) -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var payoutDialogOpen by remember { mutableStateOf(false) }

    if (payoutDialogOpen) {
        PayoutDialog(
            account = account,
            javaLocale = javaLocale,
            onConfirm = { minutes ->
                payoutDialogOpen = false
                onBookPayout(minutes)
            },
            onDismiss = { payoutDialogOpen = false },
        )
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(colors.special.copy(alpha = if (colors.isDark) 0.14f else 0.06f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        StatLabel(t.t("dashboard.overtimeAccount.title"), colors)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                AccountLabel(t.t("dashboard.overtimeAccount.opening"), colors)
                Text(
                    formatSignedTime(account.openingMinutes),
                    color = colors.textSecondary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                AccountLabel(t.t("dashboard.overtimeAccount.timeComp"), colors)
                Text(
                    formatSignedTime(-account.timeCompMinutes),
                    color = if (account.timeCompMinutes > 0) colors.special else colors.textSecondary,
                    fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                )
            }
            Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                AccountLabel(
                    t.t(
                        if (account.isComplete) "dashboard.overtimeAccount.closingMonthEnd"
                        else "dashboard.overtimeAccount.closingToday"
                    ),
                    colors,
                )
                Text(
                    formatSignedTime(account.closingMinutes),
                    color = if (account.closingMinutes >= 0) colors.positive else colors.negative,
                    fontSize = 18.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold,
                )
            }
        }
        // Im Stand enthalten, aber getrennt vom ZA: vergessen ist nicht genommen
        if (account.missingDayMinutes > 0) {
            Text(
                t.t("dashboard.overtimeAccount.missingDays", "time" to formatSignedTime(-account.missingDayMinutes)),
                color = colors.negative,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )
        }
        // Auszahlung nur bei Plusstunden anbieten; eine gebuchte bleibt änderbar
        if (account.payoutMinutes > 0 || account.payableMinutes > 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (account.payoutMinutes > 0) {
                    Text(
                        t.t("dashboard.payout.paid", "time" to formatTime(account.payoutMinutes)),
                        color = colors.textSecondary, fontSize = 12.sp, fontWeight = FontWeight.Medium,
                    )
                } else {
                    Spacer(Modifier.width(1.dp))
                }
                TonalButton(
                    label = t.t(if (account.payoutMinutes > 0) "dashboard.payout.edit" else "dashboard.payout.action"),
                    tint = colors.special,
                ) { payoutDialogOpen = true }
            }
        }
    }
}

/**
 * Auszahlung des Anzeige-Monats buchen: vorbefüllt mit dem ganzen
 * auszahlbaren Stand (Konto danach auf 0), Teilbeträge sind möglich.
 */
@Composable
private fun PayoutDialog(
    account: OvertimeAccountMonth,
    javaLocale: JavaLocale,
    onConfirm: (Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val monthLabel = account.month.month.getDisplayName(TextStyle.FULL_STANDALONE, javaLocale)
        .replaceFirstChar { it.uppercase(javaLocale) } + " " + account.month.year
    var input by remember {
        mutableStateOf(
            formatSignedDurationInput(
                if (account.payoutMinutes > 0) account.payoutMinutes else account.payableMinutes,
            ),
        )
    }
    val parsed = parseSignedDurationInput(input)?.takeIf { it > 0 }
    val invalid = input.isNotBlank() && parsed == null

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(t.t("dashboard.payout.title"), color = colors.textPrimary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    t.t("dashboard.payout.body", "month" to monthLabel),
                    color = colors.textSecondary,
                    fontSize = 14.sp,
                )
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    label = { Text(t.t("dashboard.payout.amount")) },
                    supportingText = {
                        Text(
                            if (invalid) t.t("dashboard.payout.invalid")
                            else t.t("dashboard.payout.available", "time" to formatSignedTime(account.payableMinutes)),
                        )
                    },
                    isError = invalid,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = ImeAction.Done),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { parsed?.let(onConfirm) }, enabled = parsed != null) {
                Text(
                    t.t("dashboard.payout.confirm"),
                    color = if (parsed != null) colors.accent else colors.textFaint,
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        dismissButton = {
            Row {
                if (account.payoutMinutes > 0) {
                    TextButton(onClick = { onConfirm(0) }) {
                        Text(t.t("dashboard.payout.remove"), color = colors.danger)
                    }
                }
                TextButton(onClick = onDismiss) {
                    Text(t.t("common.cancel"), color = colors.accent)
                }
            }
        },
        containerColor = colors.surface,
    )
}

/** Urlaubsbilanz des Kalenderjahres, Stand Ende des Anzeige-Monats. */
@Composable
private fun VacationPanel(balance: VacationBalance, language: String) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    fun days(halfDays: Int): String = vacationDaysText(halfDays, language, t)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(colors.info.copy(alpha = if (colors.isDark) 0.14f else 0.06f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        StatLabel(t.t("dashboard.vacation.title", "year" to balance.month.year), colors)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                AccountLabel(t.t("dashboard.vacation.used"), colors)
                Text(
                    days(balance.usedHalfDays),
                    color = colors.textSecondary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                AccountLabel(t.t("dashboard.vacation.planned"), colors)
                Text(
                    days(balance.plannedHalfDays),
                    color = if (balance.plannedHalfDays > 0) colors.info else colors.textSecondary,
                    fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                )
            }
            Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                AccountLabel(t.t("dashboard.vacation.remaining"), colors)
                Text(
                    days(balance.remainingHalfDays),
                    color = if (balance.remainingHalfDays >= 0) colors.positive else colors.negative,
                    fontSize = 18.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

/** Hinweis: Saldo des Vormonats mit dem ZA-Konto in den laufenden Monat übertragen. */
@Composable
private fun OvertimeAccountHint(
    suggestion: OvertimeAccountSuggestion,
    javaLocale: JavaLocale,
    onEnable: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    fun monthName(month: YearMonth) = month.month.getDisplayName(TextStyle.FULL_STANDALONE, javaLocale)

    AppCard {
        Column(
            modifier = Modifier.padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                StatLabel(t.t("dashboard.overtimeHint.title"), colors)
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = t.t("common.close"),
                        tint = colors.textFaint,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            Text(
                t.t(
                    "dashboard.overtimeHint.body",
                    "month" to monthName(suggestion.startMonth),
                    "balance" to formatSignedTime(suggestion.balanceMinutes),
                    "next" to monthName(suggestion.startMonth.plusMonths(1)),
                ),
                color = colors.textSecondary,
                fontSize = 14.sp,
                modifier = Modifier.padding(end = 8.dp),
            )
            Text(
                t.t("dashboard.overtimeHint.settings"),
                color = colors.textMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(end = 8.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onDismiss) {
                    Text(t.t("dashboard.overtimeHint.dismiss"), color = colors.textMuted)
                }
                TextButton(onClick = onEnable) {
                    Text(t.t("dashboard.overtimeHint.enable"), color = colors.accent, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

/**
 * ZA-Konto und Urlaub unter der Monatskarte: startet immer zugeklappt, damit
 * das Dashboard ruhig bleibt; die Leiste zeigt die zwei wichtigsten Werte
 * trotzdem. Animation wie beim Aufklappen der Kalenderwochen.
 */
@Composable
private fun MonthDetails(
    account: OvertimeAccountMonth?,
    vacation: VacationBalance?,
    javaLocale: JavaLocale,
    language: String,
    onBookPayout: (Int) -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    // Bewusst nicht gespeichert: Jeder App-Start beginnt zugeklappt
    var expanded by remember { mutableStateOf(false) }
    val chevronRotation by androidx.compose.animation.core.animateFloatAsState(
        targetValue = if (expanded) 180f else 0f,
        label = "monthDetailsChevron",
    )
    val expandSpec = androidx.compose.animation.core.tween<androidx.compose.ui.unit.IntSize>(
        durationMillis = 220,
        easing = androidx.compose.animation.core.FastOutSlowInEasing,
    )
    val fadeSpec = androidx.compose.animation.core.tween<Float>(
        durationMillis = 220,
        easing = androidx.compose.animation.core.FastOutSlowInEasing,
    )

    Column {
        HorizontalDivider(colors)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .clickable(
                    onClickLabel = t.t(if (expanded) "dashboard.details.hide" else "dashboard.details.show"),
                    role = Role.Button,
                ) { expanded = !expanded }
                .semantics {
                    stateDescription = t.t(if (expanded) "common.expanded" else "common.collapsed")
                }
                .padding(vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (account != null) {
                    DetailsSummary(
                        t.t("dashboard.details.overtime"),
                        formatSignedTime(account.closingMinutes),
                        if (account.closingMinutes >= 0) colors.positive else colors.negative,
                    )
                }
                if (account != null && vacation != null) {
                    Text("·", color = colors.textFaint, fontSize = 13.sp)
                }
                if (vacation != null) {
                    DetailsSummary(
                        t.t("dashboard.details.vacation"),
                        vacationDaysText(vacation.remainingHalfDays, language, t),
                        if (vacation.remainingHalfDays >= 0) colors.textSecondary else colors.negative,
                    )
                }
            }
            Icon(
                Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = colors.textMuted,
                modifier = Modifier
                    .size(20.dp)
                    .rotate(chevronRotation),
            )
        }
        AnimatedVisibility(
            visible = expanded,
            enter = androidx.compose.animation.expandVertically(animationSpec = expandSpec) +
                androidx.compose.animation.fadeIn(animationSpec = fadeSpec),
            exit = androidx.compose.animation.shrinkVertically(animationSpec = expandSpec) +
                androidx.compose.animation.fadeOut(animationSpec = fadeSpec),
        ) {
            Column(
                modifier = Modifier.padding(top = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                account?.let { OvertimeAccountPanel(it, javaLocale, onBookPayout) }
                vacation?.let { VacationPanel(it, language) }
            }
        }
    }
}

@Composable
private fun DetailsSummary(label: String, value: String, valueColor: Color) {
    val colors = LocalAppColors.current
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = colors.textMuted, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text(value, color = valueColor, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

/** "12 Tage", "1 Tag", "0,5 Tage". */
private fun vacationDaysText(halfDays: Int, language: String, t: I18n): String =
    formatHalfDays(halfDays, language) + " " +
        t.t(if (halfDays == 2 || halfDays == -2) "dashboard.vacation.day" else "dashboard.vacation.days")

/**
 * Dezenter Button im Stil von ActionButton (Einstellungen): Farbe mit 10 %
 * Fläche und 40 % Rahmen — aber kompakt statt über die volle Breite.
 */
@Composable
private fun TonalButton(label: String, tint: Color, onClick: () -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Text(
        text = label,
        color = tint,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
        modifier = Modifier
            .clip(shape)
            .background(tint.copy(alpha = 0.1f))
            .border(1.dp, tint.copy(alpha = 0.4f), shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 7.dp),
    )
}

/** Hinweis beim Start: vergangene Arbeitstage ohne Eintrag, mit Nachtragen/Ausblenden. */
@Composable
private fun MissingDaysHint(
    days: List<MissingWorkDay>,
    javaLocale: JavaLocale,
    onAdd: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val shown = days.take(MISSING_HINT_MAX_DAYS).joinToString(", ") { day ->
        day.date.dayOfWeek.getDisplayName(TextStyle.SHORT, javaLocale).take(2) + " " + formatShortDate(day.date)
    }
    val list = if (days.size > MISSING_HINT_MAX_DAYS) {
        shown + " " + t.t("dashboard.missingHint.more", "count" to days.size - MISSING_HINT_MAX_DAYS)
    } else {
        shown
    }

    AppCard(
        borderColor = colors.negative.copy(alpha = 0.3f),
    ) {
        Column(
            modifier = Modifier.padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                StatLabel(t.t("dashboard.missingHint.title"), colors)
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = t.t("common.close"),
                        tint = colors.textFaint,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            Text(
                if (days.size == 1) t.t("dashboard.missingHint.one", "days" to list)
                else t.t("dashboard.missingHint.many", "count" to days.size, "days" to list),
                color = colors.textSecondary,
                fontSize = 14.sp,
                modifier = Modifier.padding(end = 8.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onDismiss) {
                    Text(t.t("dashboard.missingHint.dismiss"), color = colors.textMuted)
                }
                TextButton(onClick = onAdd) {
                    Text(t.t("dashboard.missingHint.add"), color = colors.accent, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

private const val MISSING_HINT_MAX_DAYS = 4

@Composable
private fun AccountLabel(text: String, colors: AppColors) {
    Text(
        text = text,
        color = colors.textMuted,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        fontWeight = FontWeight.Medium,
        maxLines = 1,
    )
}

@Composable
private fun WeekGroup(
    week: Int,
    weekEntries: List<Entry>,
    missingDays: List<MissingWorkDay>,
    onAddEntry: (LocalDate) -> Unit,
    currentMonth: YearMonth,
    expanded: Boolean,
    onToggle: () -> Unit,
    userData: UserData?,
    locale: AppLocale,
    config: CalculationConfig?,
    simpleMode: Boolean,
    workCodeLabelMap: Map<Int, String>,
    javaLocale: JavaLocale,
    onEditEntry: (Entry) -> Unit,
    onDeleteEntry: (Entry) -> Unit,
    attachmentCounts: Map<EntryId, Int> = emptyMap(),
    onManageAttachments: (Entry) -> Unit = {},
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    // Wochen-Range + Monats-Clipping (Port der Boundary-Wochen-Logik);
    // eine Woche kann auch nur aus Tagen ohne Eintrag bestehen
    val anyDate = weekEntries.firstOrNull()?.let { LocalDate.parse(it.date) } ?: missingDays.first().date
    val jsDay = anyDate.dayOfWeek.value // 1=Mo..7=So (JS: getDay() || 7)
    val monday = anyDate.minusDays((jsDay - 1).toLong())
    val sunday = monday.plusDays(6)
    val monthStart = currentMonth.atDay(1)
    val monthEnd = currentMonth.atEndOfMonth()
    val clippedMonday = if (monday.isBefore(monthStart)) monthStart else monday
    val clippedSunday = if (sunday.isAfter(monthEnd)) monthEnd else sunday
    val clippedStartStr = clippedMonday.toString()
    val clippedEndStr = clippedSunday.toString()
    val visibleEntries = weekEntries.filter { it.date in clippedStartStr..clippedEndStr }

    val isBoundaryWeek = monday.isBefore(monthStart) || sunday.isAfter(monthEnd)
    // Volle Woche wie calculateWeekStats, aber ohne Ableitung aus dem ersten
    // Eintrag — den gibt es in einer vergessenen Woche nicht
    val weekStats = if (isBoundaryWeek) {
        calculatePeriodStats(visibleEntries, userData, clippedMonday, clippedSunday, null, locale, config)
    } else {
        calculatePeriodStats(weekEntries, userData, monday, sunday, null, locale, config)
    }

    val workMinutes = weekStats.totalIst
    val diff = weekStats.totalSaldo
    val mehrarbeit = weekStats.overtimeSplit.mehrarbeit
    val ueberstunden = weekStats.overtimeSplit.ueberstunden

    val balanceColor = when {
        diff < 0 -> colors.danger
        ueberstunden > 0 -> colors.positive
        else -> colors.info
    }
    val totalColor = when {
        diff < 0 -> colors.danger
        ueberstunden > 0 -> colors.positive
        mehrarbeit > 0 -> colors.info
        else -> colors.textSecondary
    }

    // Tage gruppieren, absteigend — Tage ohne Eintrag dazwischen einreihen
    val entriesByDay = visibleEntries.groupBy { it.date }
    val missingByDay = missingDays.associateBy { it.date.toString() }
    val sortedDayKeys = (entriesByDay.keys + missingByDay.keys).sortedDescending()

    // Der Abstand zwischen Wochen kommt zentral aus der umgebenden Liste.
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(if (colors.isDark) colors.surface else colors.surfaceVariant)
                .clickable(onClick = onToggle)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    t.t("dashboard.calendarWeek").uppercase(),
                    color = colors.textMuted,
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        t.t("dashboard.calendarWeekShort", "week" to week),
                        color = colors.textPrimary,
                        fontSize = 16.sp,
                        lineHeight = 24.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        " (${formatShortDate(clippedMonday)} – ${formatShortDate(clippedSunday)})",
                        color = colors.textMuted,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                    )
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp),
                ) {
                    Text(
                        formatTime(workMinutes),
                        color = if (simpleMode) colors.textSecondary else totalColor,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    if (!simpleMode) {
                        Text(
                            (if (diff >= 0) "+" else "-") + formatTime(kotlin.math.abs(diff)),
                            color = balanceColor,
                            fontSize = 14.sp,
                            lineHeight = 20.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        if (diff > 0 && (mehrarbeit > 0 || ueberstunden > 0)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                if (mehrarbeit > 0) {
                                    Text(
                                        formatTime(mehrarbeit) + " " + t.t("dashboard.overtimeShort.extra"),
                                        color = colors.info, fontSize = 10.sp, lineHeight = 15.sp,
                                    )
                                }
                                if (ueberstunden > 0) {
                                    Text(
                                        formatTime(ueberstunden) + " " + t.t("dashboard.overtimeShort.overtime"),
                                        color = colors.positive, fontSize = 10.sp, lineHeight = 15.sp,
                                    )
                                }
                            }
                        }
                    }
                }
            }
            val chevronRotation by androidx.compose.animation.core.animateFloatAsState(
                targetValue = if (expanded) 90f else 0f,
                label = "weekChevron",
            )
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = colors.textMuted,
                modifier = Modifier
                    .size(18.dp)
                    .rotate(chevronRotation),
            )
        }

        // 220ms easeOut wie die framer-motion-Transition des Originals
        val weekExpandSpec = androidx.compose.animation.core.tween<androidx.compose.ui.unit.IntSize>(
            durationMillis = 220,
            easing = androidx.compose.animation.core.FastOutSlowInEasing,
        )
        val weekFadeSpec = androidx.compose.animation.core.tween<Float>(
            durationMillis = 220,
            easing = androidx.compose.animation.core.FastOutSlowInEasing,
        )
        AnimatedVisibility(
            visible = expanded,
            enter = androidx.compose.animation.expandVertically(animationSpec = weekExpandSpec) +
                androidx.compose.animation.fadeIn(animationSpec = weekFadeSpec),
            exit = androidx.compose.animation.shrinkVertically(animationSpec = weekExpandSpec) +
                androidx.compose.animation.fadeOut(animationSpec = weekFadeSpec),
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.padding(top = 8.dp),
            ) {
                sortedDayKeys.forEach { dateStr ->
                    val dayEntries = entriesByDay[dateStr]
                    if (dayEntries == null) {
                        missingByDay[dateStr]?.let { MissingDayCard(it, javaLocale, onAddEntry) }
                        return@forEach
                    }
                    DayCard(
                        dateStr = dateStr,
                        dayEntries = dayEntries,
                        userData = userData,
                        locale = locale,
                        config = config,
                        simpleMode = simpleMode,
                        workCodeLabelMap = workCodeLabelMap,
                        javaLocale = javaLocale,
                        onEditEntry = onEditEntry,
                        onDeleteEntry = onDeleteEntry,
                        attachmentCounts = attachmentCounts,
                        onManageAttachments = onManageAttachments,
                    )
                }
            }
        }
    }
}

@Composable
private fun DayCard(
    dateStr: String,
    dayEntries: List<Entry>,
    userData: UserData?,
    locale: AppLocale,
    config: CalculationConfig?,
    simpleMode: Boolean,
    workCodeLabelMap: Map<Int, String>,
    javaLocale: JavaLocale,
    onEditEntry: (Entry) -> Unit,
    onDeleteEntry: (Entry) -> Unit,
    attachmentCounts: Map<EntryId, Int> = emptyMap(),
    onManageAttachments: (Entry) -> Unit = {},
) {
    val daySum = calculateDisplayedDayMinutes(dayEntries)
    val dayTarget = if (!simpleMode) {
        getTargetMinutesForDate(dateStr, userData?.workDays, locale, config)
    } else 0
    val dayBalance = if (dayTarget > 0) daySum - dayTarget else null
    val date = LocalDate.parse(dateStr)
    val sortedEntries = dayEntries.sortedBy { it.start ?: "" }
    // Ein einzelner Eintrag: die ganze Karte wischt. Bei mehreren bleibt es
    // pro Zeile, sonst wäre unklar, welcher Eintrag gelöscht wird.
    val cardEntry = sortedEntries.singleOrNull()?.takeIf { it.type != EntryType.PUBLIC_HOLIDAY }

    if (cardEntry != null) {
        SwipeToDelete(onDelete = { onDeleteEntry(cardEntry) }, shape = RoundedCornerShape(12.dp)) {
            DayCardContent(
                date, sortedEntries, daySum, dayBalance, rowSwipe = false, workCodeLabelMap, javaLocale,
                onEditEntry, onDeleteEntry, attachmentCounts, onManageAttachments,
            )
        }
    } else {
        DayCardContent(
            date, sortedEntries, daySum, dayBalance, rowSwipe = true, workCodeLabelMap, javaLocale,
            onEditEntry, onDeleteEntry, attachmentCounts, onManageAttachments,
        )
    }
}

@Composable
private fun DayCardContent(
    date: LocalDate,
    sortedEntries: List<Entry>,
    daySum: Int,
    dayBalance: Int?,
    rowSwipe: Boolean,
    workCodeLabelMap: Map<Int, String>,
    javaLocale: JavaLocale,
    onEditEntry: (Entry) -> Unit,
    onDeleteEntry: (Entry) -> Unit,
    attachmentCounts: Map<EntryId, Int>,
    onManageAttachments: (Entry) -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    AppCard {
        Row(modifier = Modifier.height(androidx.compose.foundation.layout.IntrinsicSize.Min)) {
            // Datums-Streifen links
            Column(
                modifier = Modifier
                    .width(48.dp)
                    .fillMaxHeight()
                    .background(colors.dayStrip)
                    .padding(vertical = 12.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    date.dayOfWeek.getDisplayName(TextStyle.SHORT, javaLocale).take(2),
                    color = colors.dayStripContent.copy(alpha = 0.8f),
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    formatShortDate(date),
                    color = colors.dayStripContent,
                    fontSize = 13.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Bold,
                )
            }

            // Einträge
            Column(modifier = Modifier.weight(1f)) {
                sortedEntries.forEachIndexed { index, entry ->
                    EntryRow(
                        entry = entry,
                        swipeToDelete = rowSwipe,
                        showDivider = index < sortedEntries.size - 1,
                        workCodeLabelMap = workCodeLabelMap,
                        t = t,
                        colors = colors,
                        onEditEntry = onEditEntry,
                        onDeleteEntry = onDeleteEntry,
                        attachmentCount = attachmentCounts[entry.id] ?: 0,
                        onManageAttachments = onManageAttachments,
                    )
                }
            }

            // Summen-Spalte rechts
            Column(
                modifier = Modifier
                    .width(80.dp)
                    .fillMaxHeight()
                    .background(colors.surfaceVariant.copy(alpha = 0.5f))
                    .padding(vertical = 12.dp, horizontal = 4.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    t.t("dashboard.total").uppercase(javaLocale),
                    color = colors.textFaint,
                    fontSize = 9.sp,
                    lineHeight = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    formatTime(daySum),
                    color = colors.textPrimary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Bold,
                )
                if (dayBalance != null && dayBalance != 0) {
                    Text(
                        formatSignedTime(dayBalance),
                        color = if (dayBalance > 0) colors.positive else colors.negative,
                        fontSize = 9.sp,
                        lineHeight = 11.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}

/**
 * Arbeitstag ohne Eintrag: Aufbau wie [DayCard], aber gedämpft und mit
 * dem fehlenden Tagessoll als Minus. Tippen öffnet einen neuen Eintrag
 * für genau diesen Tag.
 */
@Composable
private fun MissingDayCard(day: MissingWorkDay, javaLocale: JavaLocale, onAdd: (LocalDate) -> Unit) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    AppCard(
        containerColor = colors.negative.copy(alpha = if (colors.isDark) 0.08f else 0.04f),
        borderColor = colors.negative.copy(alpha = 0.3f),
        shadowElevation = 0.dp,
    ) {
        Row(
            modifier = Modifier
                .height(androidx.compose.foundation.layout.IntrinsicSize.Min)
                .clickable(
                    onClickLabel = t.t("dashboard.missingDay.add"),
                    role = Role.Button,
                ) { onAdd(day.date) },
        ) {
            // Datums-Streifen wie DayCard, abgeschwächt
            Column(
                modifier = Modifier
                    .width(48.dp)
                    .fillMaxHeight()
                    .background(colors.dayStrip.copy(alpha = 0.45f))
                    .padding(vertical = 12.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    day.date.dayOfWeek.getDisplayName(TextStyle.SHORT, javaLocale).take(2),
                    color = colors.dayStripContent.copy(alpha = 0.6f),
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    formatShortDate(day.date),
                    color = colors.dayStripContent.copy(alpha = 0.8f),
                    fontSize = 13.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Bold,
                )
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(12.dp),
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    t.t("dashboard.missingDay.title"),
                    color = colors.textSecondary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    t.t("dashboard.missingDay.hint"),
                    color = colors.textMuted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                )
            }

            // Summen-Spalte wie DayCard: 0 Ist, Minus = entgangenes Soll
            Column(
                modifier = Modifier
                    .width(80.dp)
                    .fillMaxHeight()
                    .background(colors.surfaceVariant.copy(alpha = 0.5f))
                    .padding(vertical = 12.dp, horizontal = 4.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    t.t("dashboard.total").uppercase(javaLocale),
                    color = colors.textFaint,
                    fontSize = 9.sp,
                    lineHeight = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    formatTime(0),
                    color = colors.textMuted,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    formatSignedTime(-day.targetMinutes),
                    color = colors.negative,
                    fontSize = 9.sp,
                    lineHeight = 11.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

/** Eine KW im Dashboard: Einträge (inkl. Nachbarmonat) plus Tage ohne Eintrag. */
private data class WeekRows(
    val week: Int,
    val entries: List<Entry>,
    val missingDays: List<MissingWorkDay>,
) {
    val latestDate: String
        get() = maxOf(entries.firstOrNull()?.date ?: "", missingDays.maxOfOrNull { it.date.toString() } ?: "")
}

@Composable
private fun EntryRow(
    entry: Entry,
    swipeToDelete: Boolean,
    showDivider: Boolean,
    workCodeLabelMap: Map<Int, String>,
    t: I18n,
    colors: AppColors,
    onEditEntry: (Entry) -> Unit,
    onDeleteEntry: (Entry) -> Unit,
    attachmentCount: Int = 0,
    onManageAttachments: (Entry) -> Unit = {},
) {
    val isHoliday = entry.type == EntryType.PUBLIC_HOLIDAY
    val isTimeComp = entry.type == EntryType.TIME_COMP
    val hasExplicitTime = !entry.start.isNullOrEmpty() && !entry.end.isNullOrEmpty()

    val timeLabel = when {
        entry.type == EntryType.WORK -> "${entry.start ?: ""} - ${entry.end ?: ""}"
        hasExplicitTime -> "${entry.start} - ${entry.end}"
        isHoliday -> t.t("entryTypes.holiday")
        else -> t.t("entryTypes.allDay")
    }

    val codeLabel = if (entry.type == EntryType.WORK) {
        entry.code?.let { workCodeLabelMap[it] } ?: ""
    } else {
        when (entry.type) {
            EntryType.PUBLIC_HOLIDAY -> t.t("entryTypes.paidOff")
            EntryType.TIME_COMP -> t.t("entryTypes.timeComp")
            EntryType.DAY_OFF -> t.t("entryTypes.dayOff")
            EntryType.VACATION -> t.t("entryTypes.vacation")
            EntryType.SICK -> t.t("entryTypes.sick")
            else -> ""
        }
    }

    val pauseLabel = if (entry.type == EntryType.WORK && entry.code != WorkCodes.DRIVE) {
        if (entry.pause > 0) " - " + t.t("dashboard.pause", "minutes" to entry.pause)
        else " - " + t.t("dashboard.noPause")
    } else ""

    val rowContent: @Composable () -> Unit = {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    // Deckend gemischt: Unter der Zeile liegt beim Wischen das Rot
                    .background(
                        when {
                            isHoliday -> colors.info.copy(alpha = if (colors.isDark) 0.2f else 0.06f)
                            isTimeComp -> colors.special.copy(alpha = if (colors.isDark) 0.1f else 0.04f)
                            else -> colors.surface
                        }.compositeOver(colors.surface)
                    )
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Row {
                        // leading-none / leading-tight des Originals
                        Text(
                            timeLabel,
                            color = when {
                                isHoliday -> colors.info
                                isTimeComp -> colors.special
                                else -> colors.textPrimary
                            },
                            fontSize = 14.sp,
                            lineHeight = 14.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        if (pauseLabel.isNotEmpty()) {
                            Text(
                                pauseLabel,
                                color = colors.textPrimary.copy(alpha = 0.7f),
                                fontSize = 14.sp,
                                lineHeight = 14.sp,
                            )
                        }
                    }
                    if (!entry.project.isNullOrEmpty()) {
                        Text(
                            entry.project!!,
                            color = colors.textSecondary,
                            fontSize = 14.sp,
                            lineHeight = 17.5.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    // Nächtigung dezent hinter dem Code
                    val codeLine = buildAnnotatedString {
                        append(codeLabel)
                        if (entry.overnight) {
                            if (codeLabel.isNotEmpty()) append(" · ")
                            withStyle(SpanStyle(color = colors.special, fontWeight = FontWeight.Medium)) {
                                append(t.t("dashboard.overnight"))
                            }
                        }
                    }
                    if (codeLine.isNotEmpty()) {
                        Text(codeLine, color = colors.textMuted, fontSize = 12.sp, lineHeight = 15.sp)
                    }
                    if (!isHoliday) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier
                                .padding(top = 4.dp)
                                .clip(RoundedCornerShape(50))
                                .background(colors.surfaceVariant)
                                .clickable { onManageAttachments(entry) }
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                        ) {
                            Icon(
                                Icons.Filled.AttachFile,
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                if (attachmentCount > 0) {
                                    t.t("dashboard.documentsCount", "count" to attachmentCount)
                                } else {
                                    t.t("dashboard.documentsLabel")
                                },
                                color = colors.textMuted,
                                fontSize = 11.sp,
                                lineHeight = 16.sp,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                    }
                }
                Text(
                    formatTime(entry.netDuration),
                    color = colors.textFaint,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(start = 8.dp),
                )
            }
            if (showDivider) HorizontalDivider(colors)
        }
    }

    if (isHoliday) {
        // Feiertage: nicht editierbar, nicht löschbar
        rowContent()
        return
    }

    if (!swipeToDelete) {
        // Gewischt wird die ganze Tageskarte (DayCard)
        Box(modifier = Modifier.clickable { onEditEntry(entry) }) {
            rowContent()
        }
        return
    }

    SwipeToDelete(onDelete = { onDeleteEntry(entry) }) {
        Box(modifier = Modifier.clickable { onEditEntry(entry) }) {
            rowContent()
        }
    }
}

/**
 * Nach links wischen → Löschen (bestätigt über den Dialog, der Inhalt
 * bleibt stehen). Das Rot liegt nur während des Wischens darunter —
 * vorher schien es dauerhaft durch die halbtransparente ZA-Zeile.
 */
@Composable
private fun SwipeToDelete(
    onDelete: () -> Unit,
    shape: Shape = RectangleShape,
    content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                Haptics.heavy(context)
                onDelete()
            }
            false // Inhalt bleibt sichtbar; Löschen läuft über Bestätigungs-Dialog
        },
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            if (dismissState.dismissDirection == SwipeToDismissBoxValue.EndToStart) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(shape)
                        .background(colors.danger),
                    contentAlignment = Alignment.CenterEnd,
                ) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = t.t("common.delete"),
                        tint = Color.White,
                        modifier = Modifier.padding(end = 16.dp),
                    )
                }
            }
        },
        content = content,
    )
}

@Composable
private fun EmptyState(t: I18n, colors: AppColors) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface)
            .border(1.dp, colors.border, RoundedCornerShape(12.dp))
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            Icons.Filled.CalendarMonth,
            contentDescription = null,
            tint = colors.textFaint.copy(alpha = 0.3f),
            modifier = Modifier.size(32.dp),
        )
        Text(t.t("dashboard.noEntries"), color = colors.textFaint)
    }
}

/**
 * Kompakter nativer Monats-Picker: Jahr-Stepper, 12 Monate und
 * explizite Bestätigung. Bewusst ohne irreführende Tagesdatums-Anzeige.
 */
@Composable
internal fun MonthPickerDialog(
    selected: YearMonth,
    onSelect: (YearMonth) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var year by remember { mutableStateOf(selected.year) }
    var month by remember { mutableStateOf(selected.monthValue) }
    // Monatsnamen wie das Original-Plugin über die Gerätesprache
    // (de-AT → "Jän."), nicht über die App-Sprache.
    val deviceLocale = remember { JavaLocale.getDefault() }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = t.t("dashboard.selectMonth"),
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = { year-- }) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                            contentDescription = t.t("dashboard.previousYear"),
                            tint = colors.accent,
                        )
                    }
                    Text(
                        year.toString(),
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        color = colors.textPrimary,
                    )
                    IconButton(onClick = { year++ }) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = t.t("dashboard.nextYear"),
                            tint = colors.accent,
                        )
                    }
                }
                (0 until 4).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (1..3).forEach { col ->
                            val m = row * 3 + col
                            val isSelected = month == m
                            val monthName = java.time.Month.of(m)
                                .getDisplayName(TextStyle.FULL, deviceLocale)
                            Text(
                                text = java.time.Month.of(m).getDisplayName(TextStyle.SHORT, deviceLocale),
                                textAlign = TextAlign.Center,
                                color = if (isSelected) Color.White else colors.textPrimary,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (isSelected) colors.accentStrong else colors.surfaceVariant)
                                    .selectable(
                                        selected = isSelected,
                                        role = Role.RadioButton,
                                        onClick = { month = m },
                                    )
                                    .semantics {
                                        contentDescription = "$monthName $year"
                                    }
                                    .padding(vertical = 13.dp),
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onSelect(YearMonth.of(year, month)) }) {
                Text(t.t("common.confirm"), color = colors.accent, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(t.t("common.cancel"), color = colors.accent)
            }
        },
        containerColor = colors.surface,
    )
}

// ─── Gemeinsame Bausteine ────────────────────────────────────

@Composable
fun AppCard(
    containerColor: Color? = null,
    borderColor: Color? = null,
    shadowElevation: androidx.compose.ui.unit.Dp = 2.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            // shadow-sm der Original-Card
            .shadow(shadowElevation, RoundedCornerShape(12.dp), spotColor = Color.Black.copy(alpha = 0.35f))
            .clip(RoundedCornerShape(12.dp))
            .background(containerColor ?: colors.surface)
            .border(1.dp, borderColor ?: colors.border, RoundedCornerShape(12.dp))
            .animateContentSize(),
        content = content,
    )
}

@Composable
fun HorizontalDivider(colors: AppColors) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(colors.borderSubtle),
    )
}

@Composable
private fun StatLabel(text: String, colors: AppColors) {
    Text(
        text = text.uppercase(),
        color = colors.textMuted,
        fontSize = 10.sp,
        lineHeight = 15.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
    )
}

private fun formatShortDate(date: LocalDate): String =
    "%02d.%02d.".format(date.dayOfMonth, date.monthValue)
