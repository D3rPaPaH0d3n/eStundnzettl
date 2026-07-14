package com.estundnzettl.app.ui.onboarding

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.R
import com.estundnzettl.app.OnboardingUiState
import com.estundnzettl.app.ui.settings.ActionButton
import com.estundnzettl.app.ui.settings.OptionSheet
import com.estundnzettl.app.ui.settings.SettingsFieldLabel
import com.estundnzettl.app.ui.settings.formatHoursLocalized
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.locale.GERMANY_LOCALE_IDS
import com.estundnzettl.core.locale.SWITZERLAND_LOCALE_IDS
import com.estundnzettl.core.locale.getLocale
import com.estundnzettl.core.model.OvertimeMode
import com.estundnzettl.core.model.SickOnWorkDayMode
import com.estundnzettl.core.model.WORK_CODE_PRESETS
import com.estundnzettl.core.model.WORK_MODELS
import kotlinx.coroutines.launch

/**
 * Ersteinrichtungs-Wizard — Port von OnboardingWizard.tsx:
 * Welcome → Profil → Stundenberechnung (Locale/Eigener Plan) →
 * Arbeitszeitmodell → (Berechnung) → Tätigkeiten → (Restore) → Fertig.
 * Cloud-Backup-Einrichtung folgt in Phase 5.
 */
@Composable
fun OnboardingScreen(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val ob = state.onboarding
    val colors = LocalAppColors.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .safeDrawingPadding()
            .padding(16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(16.dp, RoundedCornerShape(20.dp))
                .clip(RoundedCornerShape(20.dp))
                .background(colors.surface),
        ) {
            // Fortschrittsbalken — Port der Wizard-Progress-Bar
            if (ob.step > 0) {
                val fraction by animateFloatAsState(
                    targetValue = when {
                        ob.step == 7 -> 1f
                        ob.step == 1 && ob.simpleMode -> 0.5f
                        else -> ob.step / (if (ob.customCalc) 7f else 6f)
                    },
                    label = "onboardingProgress",
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .background(colors.surfaceVariant),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction)
                            .height(6.dp)
                            .background(Palette.Emerald500),
                    )
                }
            }
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                when (ob.step) {
                    0 -> WelcomeStep(viewModel)
                    1 -> ProfileStep(viewModel, ob)
                    2 -> LocaleStep(viewModel, ob)
                    3 -> WorkScheduleStep(viewModel, ob, state.language)
                    4 -> CalculationStep(viewModel, ob)
                    5 -> WorkCodesStep(viewModel, ob)
                    6 -> RestoreStep(viewModel)
                    7 -> SummaryStep(viewModel, ob, state.language)
                }
            }
        }
    }
}

// ─── Navigation ──────────────────────────────────────────────

@Composable
private fun WizardNav(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(modifier = Modifier.weight(1f)) {
            ActionButton(label = t.t("onboarding.nav.back"), tint = colors.textMuted, outlined = true) {
                viewModel.onboardingBack()
            }
        }
        Box(modifier = Modifier.weight(2f)) {
            ActionButton(label = t.t("onboarding.nav.next"), tint = colors.accentStrong, filled = true) {
                viewModel.onboardingNext()
            }
        }
    }
}

// ─── Step 0: Welcome ─────────────────────────────────────────

@Composable
private fun WelcomeStep(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            modifier = Modifier
                .shadow(12.dp, RoundedCornerShape(24.dp), spotColor = colors.accent)
                .clip(RoundedCornerShape(24.dp))
                .background(if (colors.isDark) colors.surface else Color.White)
                .size(96.dp),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(R.drawable.app_logo),
                contentDescription = t.t("onboarding.welcome.logoAlt"),
                modifier = Modifier.size(80.dp),
            )
        }
        Text(t.t("onboarding.welcome.hello"), color = colors.textPrimary, fontSize = 28.sp, fontWeight = FontWeight.Black)
        Text(t.t("onboarding.welcome.glad"), color = colors.textSecondary, fontSize = 16.sp)
        WelcomeIntroText(t.t("onboarding.welcome.intro"))
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
        ) {
            WelcomeBadge(Icons.Filled.Smartphone, t.t("onboarding.welcome.badgeMobile"), Modifier.weight(1f))
            WelcomeBadge(Icons.Filled.WifiOff, t.t("onboarding.welcome.badgeOffline"), Modifier.weight(1f))
            WelcomeBadge(Icons.Filled.Lock, t.t("onboarding.welcome.badgePrivate"), Modifier.weight(1f))
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        WelcomeChoice(
            icon = Icons.AutoMirrored.Filled.Assignment,
            title = t.t("onboarding.welcome.simpleStart"),
            subtitle = t.t("onboarding.welcome.simpleStartHint"),
            iconTint = Color.White,
            filled = true,
        ) { viewModel.onboardingStartSimple() }
        WelcomeChoice(
            icon = Icons.Filled.Calculate,
            title = t.t("onboarding.welcome.calculatedStart"),
            subtitle = t.t("onboarding.welcome.calculatedStartHint"),
            iconTint = colors.info,
        ) { viewModel.onboardingStartNew() }
        WelcomeChoice(
            icon = Icons.Filled.Refresh,
            title = t.t("onboarding.welcome.restore"),
            subtitle = null,
            iconTint = colors.textSecondary,
        ) { viewModel.onboardingStartRestore() }
        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .clip(RoundedCornerShape(10.dp))
                .clickable { viewModel.onboardingDemoMode() }
                .padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Icon(
                Icons.Filled.Science, contentDescription = null,
                tint = colors.accent, modifier = Modifier.size(14.dp),
            )
            Text(
                t.t("onboarding.welcome.demo"),
                color = colors.accent, fontWeight = FontWeight.Bold, fontSize = 13.sp,
            )
        }
    }
}

/** Intro-Text mit hervorgehobenem <brand>-Markup wie im Original. */
@Composable
private fun WelcomeIntroText(raw: String) {
    val colors = LocalAppColors.current
    val text = buildAnnotatedString {
        val start = raw.indexOf("<brand>")
        val end = raw.indexOf("</brand>")
        if (start >= 0 && end > start) {
            append(raw.substring(0, start))
            withStyle(SpanStyle(color = colors.accent, fontWeight = FontWeight.Bold)) {
                append(raw.substring(start + "<brand>".length, end))
            }
            append(raw.substring(end + "</brand>".length))
        } else {
            append(raw.replace("<brand>", "").replace("</brand>", ""))
        }
    }
    Text(text, color = colors.textMuted, fontSize = 14.sp, textAlign = TextAlign.Center)
}

@Composable
private fun WelcomeBadge(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, modifier: Modifier = Modifier) {
    val colors = LocalAppColors.current
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (colors.isDark) colors.accent.copy(alpha = 0.12f) else Palette.Emerald50)
            .border(
                1.dp,
                if (colors.isDark) colors.accent.copy(alpha = 0.25f) else Palette.Emerald100,
                RoundedCornerShape(12.dp),
            )
            .padding(horizontal = 6.dp, vertical = 12.dp),
    ) {
        Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(18.dp))
        Text(
            text,
            color = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
            fontSize = 10.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun WelcomeChoice(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String?,
    iconTint: Color,
    filled: Boolean = false,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Row(
        verticalAlignment = if (subtitle != null) Alignment.Top else Alignment.CenterVertically,
        horizontalArrangement = if (subtitle != null) Arrangement.spacedBy(12.dp) else Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(if (filled) colors.accentStrong else colors.surface)
            .border(
                2.dp,
                if (filled) Color.Transparent else colors.borderSubtle,
                RoundedCornerShape(16.dp),
            )
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(21.dp))
        Column {
            Text(
                title,
                color = if (filled) Color.White else colors.textPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = if (filled) 16.sp else 14.sp,
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    color = if (filled) Color.White.copy(alpha = 0.85f) else colors.textMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

// ─── Step 1: Profil ──────────────────────────────────────────

@Composable
private fun ProfileStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            runCatching {
                val dataUrl = com.estundnzettl.app.ui.settings.uriToJpegDataUrl(context, uri)
                viewModel.onboardingUpdate { it.copy(photo = dataUrl) }
            }.onFailure {
                viewModel.showRawMessage(t.t("settings.profile.toastPhotoError"))
            }
        }
    }

    StepHeader(t.t("onboarding.profile.title"), t.t("onboarding.profile.subtitle"))

    // Grüne Privacy-Box mit Schloss — Port der Original-Hinweisbox
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (colors.isDark) colors.accent.copy(alpha = 0.12f) else Palette.Emerald50)
            .padding(12.dp),
    ) {
        Icon(
            Icons.Filled.Lock, contentDescription = null,
            tint = colors.accent, modifier = Modifier.size(18.dp),
        )
        PrivacyHintText(t.t("onboarding.profile.privacyHint"))
    }

    // Profilbild-Picker
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            modifier = Modifier
                .size(96.dp)
                .clip(CircleShape)
                .background(colors.surfaceVariant.copy(alpha = 0.6f))
                .dashedCircleBorder(colors.border)
                .clickable {
                    photoPicker.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            val photo = ob.photo
            val bitmap = if (photo != null) {
                remember(photo) { com.estundnzettl.app.ui.settings.dataUrlToBitmap(photo) }
            } else null
            if (bitmap != null) {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = t.t("onboarding.profile.photoAlt"),
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Icon(
                    Icons.Filled.PhotoCamera, contentDescription = t.t("onboarding.profile.photoLabel"),
                    tint = colors.textFaint, modifier = Modifier.size(28.dp),
                )
            }
        }
        Text(t.t("onboarding.profile.photoLabel"), color = colors.textMuted, fontSize = 13.sp)
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        WizardField(t.t("onboarding.profile.nameLabel"), ob.name, t.t("onboarding.profile.namePlaceholder")) { value ->
            viewModel.onboardingUpdate { it.copy(name = value) }
        }
        WizardField(t.t("onboarding.profile.companyLabel"), ob.company, t.t("onboarding.profile.companyPlaceholder")) { value ->
            viewModel.onboardingUpdate { it.copy(company = value) }
        }
        WizardField(t.t("onboarding.profile.roleLabel"), ob.role, t.t("onboarding.profile.rolePlaceholder")) { value ->
            viewModel.onboardingUpdate { it.copy(role = value) }
        }
    }

    WizardNav(viewModel)
}

/** Privacy-Text mit fettem <b>-Segment. */
@Composable
private fun PrivacyHintText(raw: String) {
    val colors = LocalAppColors.current
    val text = buildAnnotatedString {
        var rest = raw
        while (true) {
            val start = rest.indexOf("<b>")
            val end = rest.indexOf("</b>")
            if (start < 0 || end < start) {
                append(rest.replace("<b>", "").replace("</b>", ""))
                break
            }
            append(rest.substring(0, start))
            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                append(rest.substring(start + 3, end))
            }
            rest = rest.substring(end + 4)
        }
    }
    Text(
        text,
        color = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
        fontSize = 13.sp,
    )
}

/** Gestrichelte Kreis-Umrandung für den Foto-Platzhalter. */
private fun Modifier.dashedCircleBorder(color: Color): Modifier = drawBehind {
    drawCircle(
        color = color,
        style = Stroke(
            width = 2.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f)),
        ),
    )
}

@Composable
private fun WizardField(label: String, value: String, placeholder: String, onChange: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SettingsFieldLabel(label)
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            placeholder = { Text(placeholder) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

// ─── Step 2: Stundenberechnung (Locale / Eigener Plan) ───────

@Composable
private fun LocaleStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var regionSheet by remember { mutableStateOf<String?>(null) }

    StepHeader(t.t("onboarding.locale.title"), t.t("onboarding.locale.subtitle"))

    // Grüne Info-Box — Port der Original-Hinweisbox
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (colors.isDark) colors.accent.copy(alpha = 0.12f) else Palette.Emerald50)
            .padding(12.dp),
    ) {
        Icon(
            Icons.Filled.Info, contentDescription = null,
            tint = colors.accent, modifier = Modifier.size(18.dp),
        )
        Text(
            t.t("onboarding.locale.infoHint"),
            color = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
            fontSize = 13.sp,
        )
    }

    regionSheet?.let { country ->
        val ids = if (country == "de") GERMANY_LOCALE_IDS else SWITZERLAND_LOCALE_IDS
        OptionSheet(
            title = if (country == "de") t.t("onboarding.locale.stateDrawerTitle") else t.t("onboarding.locale.kantonDrawerTitle"),
            options = ids.map { id -> id to (getLocale(id).region ?: id) },
            selected = ob.localeId ?: "",
            onSelect = { id ->
                viewModel.onboardingUpdate {
                    it.copy(
                        localeId = id,
                        customCalc = false,
                        calcConfig = com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale(id), it.workDays),
                    )
                }
                regionSheet = null
            },
            onDismiss = { regionSheet = null },
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        LocaleChoice(
            t.t("onboarding.locale.neutralTitle"), t.t("onboarding.locale.neutralDescription"),
            selected = ob.localeId == "neutral" && !ob.customCalc,
        ) {
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = "neutral", customCalc = false,
                    calcConfig = com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale("neutral"), it.workDays),
                )
            }
        }
        LocaleChoice(
            t.t("onboarding.locale.austriaTitle"), t.t("onboarding.locale.austriaDescription"),
            selected = ob.localeId == "at" && !ob.customCalc,
        ) {
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = "at", customCalc = false,
                    calcConfig = com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale("at"), it.workDays),
                )
            }
        }
        LocaleChoice(
            t.t("onboarding.locale.germanyTitle"), t.t("onboarding.locale.germanyDescription"),
            selected = ob.localeId?.startsWith("de-") == true && !ob.customCalc,
            extra = if (ob.localeId?.startsWith("de-") == true) getLocale(ob.localeId).region else null,
        ) { regionSheet = "de" }
        LocaleChoice(
            t.t("onboarding.locale.switzerlandTitle"), t.t("onboarding.locale.switzerlandDescription"),
            selected = ob.localeId?.startsWith("ch-") == true && !ob.customCalc,
            extra = if (ob.localeId?.startsWith("ch-") == true) getLocale(ob.localeId).region else null,
        ) { regionSheet = "ch" }
        LocaleChoice(
            t.t("onboarding.locale.customTitle"), t.t("onboarding.locale.customDescription"),
            selected = ob.customCalc,
        ) {
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = "neutral", customCalc = true,
                    calcConfig = com.estundnzettl.core.calc.getBlankCalculationConfig(it.workDays),
                )
            }
        }
    }

    WizardNav(viewModel)
}

@Composable
private fun LocaleChoice(
    title: String,
    description: String,
    selected: Boolean,
    extra: String? = null,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) colors.accent.copy(alpha = 0.08f) else colors.surface)
            .border(2.dp, if (selected) colors.accent else colors.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Text(description, color = colors.textMuted, fontSize = 12.sp)
        if (extra != null) {
            Text(extra, color = colors.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
    }
}

// ─── Step 3: Arbeitszeitmodell ───────────────────────────────

@Composable
private fun WorkScheduleStep(viewModel: MainViewModel, ob: OnboardingUiState, language: String) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    StepHeader(t.t("onboarding.workSchedule.title"), t.t("onboarding.workSchedule.subtitle"))

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        WORK_MODELS.forEach { model ->
            val selected = ob.workDays == model.days ||
                (model.id == "custom" && WORK_MODELS.none { it.id != "custom" && it.days == ob.workDays })
            LocaleChoice(
                title = model.label,
                description = model.description,
                selected = selected,
            ) {
                viewModel.onboardingUpdate { it.copy(workDays = model.days) }
            }
        }

        // Custom-Tagesstunden (Mo..So) — nur relevante Feinanpassung
        Text(
            t.t("settings.data.workModel.weekHours", "hours" to formatHoursLocalized(ob.workDays.sum(), language).removeSuffix(" h")),
            color = colors.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("mon" to 1, "tue" to 2, "wed" to 3, "thu" to 4, "fri" to 5, "sat" to 6, "sun" to 0)
                .forEach { (key, dayIndex) ->
                    var text by remember(ob.workDays) {
                        mutableStateOf(
                            ob.workDays.getOrElse(dayIndex) { 0 }
                                .takeIf { it > 0 }
                                ?.let { String.format(java.util.Locale.GERMAN, "%.1f", it / 60.0) } ?: ""
                        )
                    }
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            t.t("settings.weekdays.$key").uppercase(),
                            color = if (dayIndex == 0 || dayIndex == 6) Palette.Red400 else colors.textMuted,
                            fontSize = 10.sp, fontWeight = FontWeight.Bold,
                        )
                        BasicTextField(
                            value = text,
                            onValueChange = { value ->
                                text = value
                                val hours = value.replace(",", ".").toDoubleOrNull() ?: 0.0
                                val days = ob.workDays.toMutableList()
                                days[dayIndex] = (hours * 60).toInt().coerceIn(0, 24 * 60)
                                viewModel.onboardingUpdate { it.copy(workDays = days) }
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            textStyle = androidx.compose.ui.text.TextStyle(
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center,
                                color = colors.textPrimary,
                            ),
                            cursorBrush = androidx.compose.ui.graphics.SolidColor(colors.accent),
                            decorationBox = { inner ->
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(colors.surfaceVariant.copy(alpha = 0.4f))
                                        .border(1.dp, colors.border, RoundedCornerShape(8.dp))
                                        .padding(vertical = 10.dp, horizontal = 2.dp),
                                    contentAlignment = Alignment.Center,
                                ) { inner() }
                            },
                        )
                    }
                }
        }
    }

    WizardNav(viewModel)
}

// ─── Step 4: Berechnung (nur Eigener Plan) ───────────────────

@Composable
private fun CalculationStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val config = ob.calcConfig ?: return
    var drawer by remember { mutableStateOf<String?>(null) }

    StepHeader(t.t("settings.calc.header"), t.t("settings.calc.subtitle"))

    when (drawer) {
        "overtime" -> OptionSheet(
            title = t.t("settings.calc.overtimeRule"),
            options = OvertimeMode.entries.map { it.wireName to t.t("settings.calc.overtimeOptions.${it.wireName}") },
            selected = config.overtimeMode.wireName,
            onSelect = { id ->
                val mode = OvertimeMode.fromWireOrNull(id)!!
                viewModel.onboardingUpdate {
                    it.copy(calcConfig = config.copy(
                        overtimeMode = mode,
                        overtimeThresholdMinutes = when (mode) {
                            OvertimeMode.SPLIT -> config.overtimeThresholdMinutes ?: 2400
                            OvertimeMode.NONE -> null
                            else -> config.overtimeThresholdMinutes
                        },
                    ))
                }
                drawer = null
            },
            onDismiss = { drawer = null },
        )

        "sick" -> OptionSheet(
            title = t.t("settings.calc.sickOnWorkDay"),
            options = listOf(
                SickOnWorkDayMode.CAP_TO_TARGET, SickOnWorkDayMode.ADDITIVE, SickOnWorkDayMode.IGNORE,
            ).map { it.wireName to t.t("settings.calc.sickOptions.${it.wireName}") },
            selected = config.sickOnWorkDayMode.wireName,
            onSelect = { id ->
                viewModel.onboardingUpdate {
                    it.copy(calcConfig = config.copy(sickOnWorkDayMode = SickOnWorkDayMode.fromWireOrNull(id)!!))
                }
                drawer = null
            },
            onDismiss = { drawer = null },
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        com.estundnzettl.app.ui.settings.SelectRow(
            t.t("settings.calc.overtimeRule"),
            t.t("settings.calc.overtimeOptions.${config.overtimeMode.wireName}"),
        ) { drawer = "overtime" }
        com.estundnzettl.app.ui.settings.SelectRow(
            t.t("settings.calc.sickOnWorkDay"),
            t.t("settings.calc.sickOptions.${config.sickOnWorkDayMode.wireName}"),
        ) { drawer = "sick" }
        Text(
            t.t("settings.calc.subtitle"),
            color = colors.textMuted, fontSize = 12.sp,
        )
    }

    WizardNav(viewModel)
}

// ─── Step 5: Tätigkeiten ─────────────────────────────────────

@Composable
private fun WorkCodesStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    StepHeader(t.t("onboarding.workCodes.title"), t.t("onboarding.workCodes.subtitle"))

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        LocaleChoice(
            t.t("onboarding.workCodes.basic.allgemeinTitle"),
            t.t("onboarding.workCodes.basic.allgemeinSubtitle"),
            selected = ob.workCodePresetId == "allgemein",
        ) { viewModel.onboardingUpdate { it.copy(workCodePresetId = "allgemein") } }
        LocaleChoice(
            t.t("onboarding.workCodes.basic.leerTitle"),
            t.t("onboarding.workCodes.basic.leerSubtitle"),
            selected = ob.workCodePresetId == "leer",
        ) { viewModel.onboardingUpdate { it.copy(workCodePresetId = "leer") } }

        SettingsFieldLabel(t.t("onboarding.workCodes.industryTitle"))
        WORK_CODE_PRESETS.filter { it.id != "allgemein" && it.id != "leer" }.forEach { preset ->
            LocaleChoice(
                preset.name,
                t.t("onboarding.workCodes.codeCount", "description" to preset.description, "count" to preset.codes.size),
                selected = ob.workCodePresetId == preset.id,
            ) { viewModel.onboardingUpdate { it.copy(workCodePresetId = preset.id) } }
        }

        Text(t.t("onboarding.workCodes.footerHint"), color = colors.textMuted, fontSize = 12.sp)
    }

    WizardNav(viewModel)
}

// ─── Step 6: Restore ─────────────────────────────────────────

@Composable
private fun RestoreStep(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    context.contentResolver.openInputStream(uri)?.use { it.bufferedReader().readText() }
                }.onSuccess { text ->
                    if (text != null) viewModel.onboardingRestoreFromText(text)
                }.onFailure {
                    viewModel.showRawMessage(t.t("settings.toast.fileReadError"))
                }
            }
        }
    }

    StepHeader(t.t("onboarding.backup.titleRestore"), t.t("onboarding.backup.subtitleRestore"))

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ActionButton(label = t.t("onboarding.backup.restoreFromFile"), tint = colors.accentStrong, filled = true) {
            importLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
        }
        Text(t.t("onboarding.backup.skipHint"), color = colors.textMuted, fontSize = 12.sp)
        ActionButton(label = t.t("onboarding.nav.back"), tint = colors.textMuted, outlined = true) {
            viewModel.onboardingBack()
        }
    }
}

// ─── Step 7: Fertig ──────────────────────────────────────────

@Composable
private fun SummaryStep(viewModel: MainViewModel, ob: OnboardingUiState, language: String) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Spacer(Modifier.height(24.dp))
        Box(
            modifier = Modifier
                .size(88.dp)
                .clip(CircleShape)
                .background(if (colors.isDark) colors.accent.copy(alpha = 0.15f) else Palette.Emerald100),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Filled.Check, contentDescription = null,
                tint = colors.accentStrong, modifier = Modifier.size(44.dp),
            )
        }
        Text(t.t("onboarding.summary.title"), color = colors.textPrimary, fontSize = 26.sp, fontWeight = FontWeight.Black)
        Text(
            if (ob.restoreData != null) t.t("onboarding.summary.bodyRestore") else t.t("onboarding.summary.bodyFresh"),
            color = colors.textSecondary, fontSize = 14.sp, textAlign = TextAlign.Center,
        )
        if (!ob.simpleMode && ob.restoreData == null) {
            Text(
                t.t("settings.data.workModel.weekHours", "hours" to formatHoursLocalized(ob.workDays.sum(), language).removeSuffix(" h")),
                color = colors.accent, fontSize = 13.sp, fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(16.dp))
    }

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(modifier = Modifier.weight(1f)) {
            ActionButton(label = t.t("onboarding.nav.back"), tint = colors.textMuted, outlined = true) {
                viewModel.onboardingBack()
            }
        }
        Box(modifier = Modifier.weight(2f)) {
            ActionButton(label = t.t("onboarding.summary.finishButton"), tint = colors.accentStrong, filled = true) {
                viewModel.onboardingFinish()
            }
        }
    }
}

// ─── Bausteine ───────────────────────────────────────────────

@Composable
private fun StepHeader(title: String, subtitle: String) {
    val colors = LocalAppColors.current
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, color = colors.textPrimary, fontSize = 24.sp, fontWeight = FontWeight.Black)
        Text(subtitle, color = colors.textMuted, fontSize = 14.sp)
    }
}
