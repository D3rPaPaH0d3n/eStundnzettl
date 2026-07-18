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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.theme.AppColors
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.calc.AppData
import com.estundnzettl.core.calc.WorkCodes
import com.estundnzettl.core.calc.calculateDisplayedDayMinutes
import com.estundnzettl.core.calc.calculateMonthlyTargetProgress
import com.estundnzettl.core.calc.calculatePeriodStats
import com.estundnzettl.core.calc.calculateWeekStats
import com.estundnzettl.core.calc.getTargetMinutesForDate
import com.estundnzettl.core.calc.getWeekNumber
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
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val simpleMode = userData?.simpleMode == true
    val javaLocale = if (language == "en") JavaLocale.ENGLISH else JavaLocale.GERMAN

    var monthPickerOpen by remember { mutableStateOf(false) }
    val currentWeek = remember { getWeekNumber(LocalDate.now()) }
    var expandedWeeks by remember { mutableStateOf(setOf(currentWeek)) }

    val workCodeLabelMap = remember(workCodes) { workCodes.associate { it.id to it.label } }

    // Wochen nach Startdatum der Einträge sortieren (wie sortedWeeks im Original)
    val sortedWeeks = remember(appData) {
        appData.groupedByWeek.sortedByDescending { it.second.firstOrNull()?.date ?: "" }
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
                    onChangeMonth = onChangeMonth,
                    onOpenPicker = { monthPickerOpen = true },
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
                key = { (week, _) -> "week-$week" },
            ) { (week, weekEntries) ->
                WeekGroup(
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
    onChangeMonth: (Long) -> Unit,
    onOpenPicker: () -> Unit,
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
        }
    }
}

@Composable
private fun WeekGroup(
    week: Int,
    weekEntries: List<Entry>,
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

    // Wochen-Range + Monats-Clipping (Port der Boundary-Wochen-Logik)
    val anyDate = LocalDate.parse(weekEntries.first().date)
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
    val weekStats = if (isBoundaryWeek) {
        calculatePeriodStats(visibleEntries, userData, clippedMonday, clippedSunday, null, locale, config)
    } else {
        calculateWeekStats(weekEntries, userData, locale, config)
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

    // Tage gruppieren, absteigend
    val sortedDays = visibleEntries.groupBy { it.date }.entries.sortedByDescending { it.key }

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
                sortedDays.forEach { (dateStr, dayEntries) ->
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
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val daySum = calculateDisplayedDayMinutes(dayEntries)
    val dayTarget = if (!simpleMode) {
        getTargetMinutesForDate(dateStr, userData?.workDays, locale, config)
    } else 0
    val dayBalance = if (dayTarget > 0) daySum - dayTarget else null
    val date = LocalDate.parse(dateStr)
    val sortedEntries = dayEntries.sortedBy { it.start ?: "" }

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
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    formatShortDate(date),
                    color = Color.White,
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

@Composable
private fun EntryRow(
    entry: Entry,
    showDivider: Boolean,
    workCodeLabelMap: Map<Int, String>,
    t: I18n,
    colors: AppColors,
    onEditEntry: (Entry) -> Unit,
    onDeleteEntry: (Entry) -> Unit,
    attachmentCount: Int = 0,
    onManageAttachments: (Entry) -> Unit = {},
) {
    val context = androidx.compose.ui.platform.LocalContext.current
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
                    .background(
                        when {
                            isHoliday -> colors.info.copy(alpha = if (colors.isDark) 0.2f else 0.06f)
                            isTimeComp -> colors.special.copy(alpha = if (colors.isDark) 0.1f else 0.04f)
                            else -> colors.surface
                        }
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
                    if (codeLabel.isNotEmpty()) {
                        Text(codeLabel, color = colors.textMuted, fontSize = 12.sp, lineHeight = 15.sp)
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

    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                Haptics.heavy(context)
                onDeleteEntry(entry)
            }
            false // Row bleibt sichtbar; Löschen läuft über Bestätigungs-Dialog
        },
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
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
        },
    ) {
        Box(modifier = Modifier.clickable { onEditEntry(entry) }) {
            rowContent()
        }
    }
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
