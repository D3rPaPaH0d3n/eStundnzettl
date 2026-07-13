package com.estundnzettl.app.ui.onboarding

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .safeDrawingPadding()
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
        Text("⏱️", fontSize = 56.sp)
        Text(t.t("onboarding.welcome.hello"), color = colors.textPrimary, fontSize = 28.sp, fontWeight = FontWeight.Black)
        Text(t.t("onboarding.welcome.glad"), color = colors.textSecondary, fontSize = 16.sp)
        Text(
            t.t("onboarding.welcome.intro").replace("<brand>", "").replace("</brand>", ""),
            color = colors.textMuted, fontSize = 14.sp, textAlign = TextAlign.Center,
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(vertical = 8.dp),
        ) {
            WelcomeBadge(t.t("onboarding.welcome.badgeMobile"))
            WelcomeBadge(t.t("onboarding.welcome.badgeOffline"))
            WelcomeBadge(t.t("onboarding.welcome.badgePrivate"))
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        WelcomeChoice(
            title = t.t("onboarding.welcome.startNew"),
            subtitle = null,
            tint = colors.accentStrong,
            filled = true,
        ) { viewModel.onboardingStartNew() }
        WelcomeChoice(
            title = t.t("onboarding.welcome.simpleStart"),
            subtitle = t.t("onboarding.welcome.simpleStartHint"),
            tint = colors.info,
        ) { viewModel.onboardingStartSimple() }
        WelcomeChoice(
            title = t.t("onboarding.welcome.restore"),
            subtitle = null,
            tint = colors.textSecondary,
        ) { viewModel.onboardingStartRestore() }
    }
}

@Composable
private fun WelcomeBadge(text: String) {
    val colors = LocalAppColors.current
    Text(
        text,
        color = colors.textMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(colors.surfaceVariant)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
private fun WelcomeChoice(
    title: String,
    subtitle: String?,
    tint: Color,
    filled: Boolean = false,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (filled) tint else colors.surface)
            .border(1.dp, if (filled) Color.Transparent else colors.border, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Text(
            title,
            color = if (filled) Color.White else tint,
            fontWeight = FontWeight.Bold, fontSize = 15.sp, textAlign = TextAlign.Center,
        )
        if (subtitle != null) {
            Text(subtitle, color = if (filled) Color.White.copy(alpha = 0.8f) else colors.textMuted, fontSize = 12.sp)
        }
    }
}

// ─── Step 1: Profil ──────────────────────────────────────────

@Composable
private fun ProfileStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    StepHeader(t.t("onboarding.profile.title"), t.t("onboarding.profile.subtitle"))

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
        Text(
            t.t("onboarding.profile.privacyHint").replace("<b>", "").replace("</b>", ""),
            color = colors.textMuted, fontSize = 12.sp,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(colors.surfaceVariant.copy(alpha = 0.5f))
                .padding(10.dp),
        )
    }

    WizardNav(viewModel)
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
                    Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            t.t("settings.weekdays.$key").uppercase(),
                            color = if (dayIndex == 0 || dayIndex == 6) Palette.Red400 else colors.textMuted,
                            fontSize = 10.sp, fontWeight = FontWeight.Bold,
                        )
                        OutlinedTextField(
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
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp, textAlign = TextAlign.Center),
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
        Text("🎉", fontSize = 56.sp)
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
