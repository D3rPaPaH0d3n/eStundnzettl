package com.estundnzettl.app.ui.onboarding

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Calculate
import androidx.compose.material.icons.outlined.CloudSync
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Public
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Science
import androidx.compose.material.icons.outlined.Smartphone
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.UploadFile
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.WifiOff
import androidx.compose.material.icons.outlined.Work
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.OnboardingUiState
import com.estundnzettl.app.R
import com.estundnzettl.app.ui.settings.OptionSheet
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
 * Ersteinrichtungs-Wizard — Port des redesignten OnboardingWizard.tsx:
 * zentrierte Step-Header mit Icon-Box, scrollender Inhalt und Sticky-
 * Footer ("← Zurück" + schwarzer "Weiter →"-Pill).
 *
 * Step-Reihenfolge: 0 Welcome → 1 Profil → 2 Locale → 3 Arbeitszeit
 * → (nur Eigener Plan) 4 Berechnung → 5 Tätigkeiten → 6 Backup → 7 Fertig.
 */
@Composable
fun OnboardingScreen(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val ob = state.onboarding
    val colors = LocalAppColors.current
    val t = LocalI18n.current

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
                .shadow(24.dp, RoundedCornerShape(16.dp))
                .clip(RoundedCornerShape(16.dp))
                .background(colors.surface),
        ) {
            // Fortschrittsbalken (h-1.5, animierter emerald-Fill)
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
                        .background(if (colors.isDark) Palette.Zinc700 else Palette.Zinc100),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction)
                            .height(6.dp)
                            .background(Palette.Emerald500),
                    )
                }
            }

            // Scrollender Inhalt — Step-Wechsel gleiten wie AnimatePresence
            AnimatedContent(
                targetState = ob.step,
                transitionSpec = {
                    (slideInHorizontally { it / 12 } + fadeIn())
                        .togetherWith(slideOutHorizontally { -it / 12 } + fadeOut())
                },
                modifier = Modifier.weight(1f, fill = false),
                label = "onboardingStep",
            ) { step ->
                Column(
                    modifier = Modifier
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    when (step) {
                        0 -> WelcomeStep(viewModel)
                        1 -> ProfileStep(viewModel, ob)
                        2 -> LocaleStep(viewModel, ob)
                        3 -> WorkScheduleStep(viewModel, ob, state.language)
                        4 -> CalculationStep(viewModel, ob)
                        5 -> WorkCodesStep(viewModel, ob)
                        6 -> BackupStep(viewModel, ob)
                        7 -> SummaryStep(viewModel, ob)
                    }
                }
            }

            // Sticky-Footer (Steps 1..6): Zurück-Link + schwarzer Weiter-Pill
            if (ob.step in 1..6) {
                HorizontalDivider(color = colors.borderSubtle)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.background.copy(alpha = 0.5f))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { viewModel.onboardingBack() }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            tint = colors.textFaint,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            t.t("onboarding.nav.back"),
                            color = colors.textFaint,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                        )
                    }

                    if (!ob.isRestoreFlow) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier
                                .shadow(6.dp, RoundedCornerShape(12.dp))
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (colors.isDark) Color.White else Palette.Zinc900)
                                .clickable { viewModel.onboardingNext() }
                                .padding(horizontal = 24.dp, vertical = 10.dp),
                        ) {
                            Text(
                                if (ob.step == 6) t.t("onboarding.nav.finish") else t.t("onboarding.nav.next"),
                                color = if (colors.isDark) Palette.Zinc900 else Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                            )
                            Icon(
                                Icons.Filled.ChevronRight,
                                contentDescription = null,
                                tint = if (colors.isDark) Palette.Zinc900 else Color.White,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── Farbtöne der Step-Icons und Auswahl-Karten ──────────────

private data class Tone(
    val container: Color,
    val icon: Color,
    val border: Color,
    val selectedBg: Color,
)

@Composable
private fun tone(name: String): Tone {
    val dark = LocalAppColors.current.isDark
    return when (name) {
        "blue" -> if (dark) {
            Tone(Palette.Blue500.copy(alpha = 0.2f), Palette.Blue400, Palette.Blue500, Palette.Blue500.copy(alpha = 0.12f))
        } else {
            Tone(Palette.Blue100, Palette.Blue600, Palette.Blue500, Palette.Blue50)
        }
        "amber" -> if (dark) {
            Tone(Palette.Amber400.copy(alpha = 0.2f), Palette.Amber400, Palette.Amber400, Palette.Amber400.copy(alpha = 0.12f))
        } else {
            Tone(Palette.Amber100, Palette.Amber600, Palette.Amber400, Palette.Amber50)
        }
        "purple" -> if (dark) {
            Tone(Palette.Purple400.copy(alpha = 0.2f), Palette.Purple400, Palette.Purple400, Palette.Purple400.copy(alpha = 0.12f))
        } else {
            Tone(Palette.Purple100, Palette.Purple700, Palette.Purple400, Palette.Purple50)
        }
        "red" -> if (dark) {
            Tone(Palette.Red500.copy(alpha = 0.2f), Palette.Red400, Palette.Red500, Palette.Red500.copy(alpha = 0.12f))
        } else {
            Tone(Palette.Red100, Palette.Red600, Palette.Red500, Palette.Red50)
        }
        "green" -> if (dark) {
            Tone(Palette.Green500.copy(alpha = 0.2f), Palette.Green500, Palette.Green500, Palette.Green500.copy(alpha = 0.12f))
        } else {
            Tone(Palette.Green100, Palette.Green600, Palette.Green500, Palette.Green50)
        }
        "orange" -> if (dark) {
            Tone(Palette.Orange500.copy(alpha = 0.2f), Palette.Orange500, Palette.Orange500, Palette.Orange500.copy(alpha = 0.12f))
        } else {
            Tone(Palette.Orange100, Palette.Orange600, Palette.Orange500, Palette.Orange50)
        }
        else -> if (dark) {
            Tone(Palette.Emerald500.copy(alpha = 0.2f), Palette.Emerald400, Palette.Emerald500, Palette.Emerald500.copy(alpha = 0.12f))
        } else {
            Tone(Palette.Emerald100, Palette.Emerald600, Palette.Emerald500, Palette.Emerald50)
        }
    }
}

// ─── Gemeinsame Bausteine ────────────────────────────────────

/** Zentrierter Step-Header: 64dp-Icon-Box, Titel und Untertitel. */
@Composable
private fun StepHeader(icon: ImageVector, toneName: String, title: String, subtitle: String) {
    val colors = LocalAppColors.current
    val boxTone = tone(toneName)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(boxTone.container),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = boxTone.icon, modifier = Modifier.size(32.dp))
        }
        Text(
            title,
            color = colors.textPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Text(
            subtitle,
            color = colors.textMuted,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
        )
    }
}

/** Hinweisbox mit Icon: bg tone-50, Border tone-100, Text tone-900. */
@Composable
private fun HintBox(icon: ImageVector, toneName: String, text: String) {
    val dark = LocalAppColors.current.isDark
    val bg: Color
    val borderColor: Color
    val iconTint: Color
    val textColor: Color
    when (toneName) {
        "amber" -> {
            bg = if (dark) Palette.Amber400.copy(alpha = 0.1f) else Palette.Amber50
            borderColor = if (dark) Palette.Amber400.copy(alpha = 0.3f) else Palette.Amber100
            iconTint = if (dark) Palette.Amber400 else Palette.Amber600
            textColor = if (dark) Palette.Amber100 else Palette.Amber900
        }
        "blue" -> {
            bg = if (dark) Palette.Blue500.copy(alpha = 0.12f) else Palette.Blue50
            borderColor = if (dark) Palette.Blue500.copy(alpha = 0.3f) else Palette.Blue100
            iconTint = if (dark) Palette.Blue400 else Palette.Blue600
            textColor = if (dark) Palette.Blue100 else Palette.Blue600
        }
        else -> {
            bg = if (dark) Palette.Emerald500.copy(alpha = 0.12f) else Palette.Emerald50
            borderColor = if (dark) Palette.Emerald500.copy(alpha = 0.3f) else Palette.Emerald100
            iconTint = if (dark) Palette.Emerald400 else Palette.Emerald600
            textColor = if (dark) Palette.Emerald100 else Palette.Emerald700
        }
    }
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .padding(12.dp),
    ) {
        Icon(
            icon, contentDescription = null, tint = iconTint,
            modifier = Modifier
                .padding(top = 2.dp)
                .size(14.dp),
        )
        BoldMarkupText(text, textColor)
    }
}

/** Text mit fettem `<b>`-Segment (Trans-Komponente des Originals). */
@Composable
private fun BoldMarkupText(raw: String, color: Color, fontSize: androidx.compose.ui.unit.TextUnit = 13.sp) {
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
    Text(text, color = color, fontSize = fontSize)
}

/** Auswahl-Karte mit farbigem Selected-State + Check oben rechts. */
@Composable
private fun ChoiceCard(
    title: String,
    description: String?,
    selected: Boolean,
    toneName: String = "emerald",
    leadingIcon: ImageVector? = null,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    val cardTone = tone(toneName)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) cardTone.selectedBg else colors.surface)
            .border(2.dp, if (selected) cardTone.border else colors.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (leadingIcon != null) {
                    Icon(leadingIcon, contentDescription = null, tint = cardTone.icon, modifier = Modifier.size(16.dp))
                }
                Text(
                    title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp,
                    modifier = Modifier.padding(end = 24.dp),
                )
            }
            if (description != null) {
                Text(description, color = colors.textMuted, fontSize = 12.sp)
            }
        }
        if (selected) {
            Icon(
                Icons.Filled.Check,
                contentDescription = null,
                tint = cardTone.border,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(18.dp),
            )
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
            WelcomeBadge(Icons.Outlined.Smartphone, t.t("onboarding.welcome.badgeMobile"), Modifier.weight(1f))
            WelcomeBadge(Icons.Outlined.WifiOff, t.t("onboarding.welcome.badgeOffline"), Modifier.weight(1f))
            WelcomeBadge(Icons.Outlined.Lock, t.t("onboarding.welcome.badgePrivate"), Modifier.weight(1f))
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        WelcomeChoice(
            icon = Icons.AutoMirrored.Outlined.Assignment,
            title = t.t("onboarding.welcome.simpleStart"),
            subtitle = t.t("onboarding.welcome.simpleStartHint"),
            iconTint = Color.White,
            filled = true,
        ) { viewModel.onboardingStartSimple() }
        WelcomeChoice(
            icon = Icons.Outlined.Calculate,
            title = t.t("onboarding.welcome.calculatedStart"),
            subtitle = t.t("onboarding.welcome.calculatedStartHint"),
            iconTint = Palette.Blue600,
        ) { viewModel.onboardingStartNew() }
        WelcomeChoice(
            icon = Icons.Outlined.Refresh,
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
                Icons.Outlined.Science, contentDescription = null,
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
private fun WelcomeBadge(icon: ImageVector, text: String, modifier: Modifier = Modifier) {
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
    icon: ImageVector,
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

    StepHeader(Icons.Outlined.Person, "emerald", t.t("onboarding.profile.title"), t.t("onboarding.profile.subtitle"))

    HintBox(Icons.Outlined.Lock, "emerald", t.t("onboarding.profile.privacyHint"))

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
        WizardField(
            t.t("onboarding.profile.companyLabel"), ob.company, t.t("onboarding.profile.companyPlaceholder"),
            leadingIcon = Icons.Outlined.Apartment,
        ) { value ->
            viewModel.onboardingUpdate { it.copy(company = value) }
        }
        WizardField(t.t("onboarding.profile.roleLabel"), ob.role, t.t("onboarding.profile.rolePlaceholder")) { value ->
            viewModel.onboardingUpdate { it.copy(role = value) }
        }
    }
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
private fun WizardField(
    label: String,
    value: String,
    placeholder: String,
    leadingIcon: ImageVector? = null,
    onChange: (String) -> Unit,
) {
    val colors = LocalAppColors.current
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            label.uppercase(),
            color = colors.textMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 4.dp),
        )
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            placeholder = { Text(placeholder) },
            leadingIcon = leadingIcon?.let {
                { Icon(it, contentDescription = null, tint = colors.textFaint, modifier = Modifier.size(20.dp)) }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

// ─── Step 2: Stundenberechnung (Locale / Eigener Plan) ───────

@Composable
private fun LocaleStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val t = LocalI18n.current
    var regionSheet by remember { mutableStateOf<String?>(null) }

    StepHeader(Icons.Outlined.Public, "emerald", t.t("onboarding.locale.title"), t.t("onboarding.locale.subtitle"))

    HintBox(Icons.Outlined.Info, "emerald", t.t("onboarding.locale.infoHint"))

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

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ChoiceCard(
            t.t("onboarding.locale.neutralTitle"), t.t("onboarding.locale.neutralDescription"),
            selected = ob.localeId == "neutral" && !ob.customCalc,
            toneName = "emerald",
        ) {
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = "neutral", customCalc = false,
                    calcConfig = com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale("neutral"), it.workDays),
                )
            }
        }
        ChoiceCard(
            t.t("onboarding.locale.austriaTitle"), t.t("onboarding.locale.austriaDescription"),
            selected = ob.localeId == "at" && !ob.customCalc,
            toneName = "blue",
        ) {
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = "at", customCalc = false,
                    calcConfig = com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale("at"), it.workDays),
                )
            }
        }

        val deSelected = ob.localeId?.startsWith("de-") == true && !ob.customCalc
        ChoiceCard(
            t.t("onboarding.locale.germanyTitle"), t.t("onboarding.locale.germanyDescription"),
            selected = deSelected,
            toneName = "blue",
        ) {
            val id = ob.localeId?.takeIf { it.startsWith("de-") } ?: "de-by"
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = id, customCalc = false,
                    calcConfig = com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale(id), it.workDays),
                )
            }
        }
        if (deSelected) {
            RegionSubPicker(
                label = t.t("onboarding.locale.stateLabel"),
                value = getLocale(ob.localeId).region ?: "",
                lineColor = Palette.Blue300,
            ) { regionSheet = "de" }
        }

        val chSelected = ob.localeId?.startsWith("ch-") == true && !ob.customCalc
        ChoiceCard(
            t.t("onboarding.locale.switzerlandTitle"), t.t("onboarding.locale.switzerlandDescription"),
            selected = chSelected,
            toneName = "red",
        ) {
            val id = ob.localeId?.takeIf { it.startsWith("ch-") } ?: "ch-zh"
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = id, customCalc = false,
                    calcConfig = com.estundnzettl.core.calc.getDefaultCalculationConfig(getLocale(id), it.workDays),
                )
            }
        }
        if (chSelected) {
            RegionSubPicker(
                label = t.t("onboarding.locale.kantonLabel"),
                value = getLocale(ob.localeId).region ?: "",
                lineColor = Palette.Red300,
            ) { regionSheet = "ch" }
        }

        ChoiceCard(
            t.t("onboarding.locale.customTitle"), t.t("onboarding.locale.customDescription"),
            selected = ob.customCalc,
            toneName = "emerald",
            leadingIcon = Icons.Outlined.Tune,
        ) {
            viewModel.onboardingUpdate {
                it.copy(
                    localeId = "neutral", customCalc = true,
                    calcConfig = com.estundnzettl.core.calc.getBlankCalculationConfig(it.workDays),
                )
            }
        }
    }
}

/** Eingerückter Region-Picker (Bundesland/Kanton) mit linker Linie. */
@Composable
private fun RegionSubPicker(label: String, value: String, lineColor: Color, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Row(modifier = Modifier.padding(start = 8.dp)) {
        Box(
            modifier = Modifier
                .width(2.dp)
                .height(72.dp)
                .background(lineColor),
        )
        Column(
            modifier = Modifier
                .padding(start = 16.dp)
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                label.uppercase(),
                color = colors.textMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.surface)
                    .border(1.dp, colors.border, RoundedCornerShape(8.dp))
                    .clickable(onClick = onClick)
                    .padding(12.dp),
            ) {
                Text(
                    value,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    Icons.Filled.KeyboardArrowDown,
                    contentDescription = null,
                    tint = colors.textFaint,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

// ─── Step 3: Arbeitszeit (Modus + Tagesstunden-Slider) ───────

@Composable
private fun WorkScheduleStep(viewModel: MainViewModel, ob: OnboardingUiState, language: String) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    StepHeader(Icons.Outlined.Work, "blue", t.t("onboarding.workSchedule.title"), t.t("onboarding.workSchedule.subtitle"))

    // Modus-Karten: Soll/Ist vs. Einfach
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        ModeCard(
            icon = Icons.Outlined.Calculate,
            iconTint = Palette.Blue600,
            title = t.t("onboarding.workSchedule.modeTargetActual"),
            hint = t.t("onboarding.workSchedule.modeTargetActualHint"),
            selected = !ob.simpleMode,
            toneName = "blue",
            modifier = Modifier.weight(1f),
        ) {
            if (ob.simpleMode) viewModel.onboardingUpdate { it.copy(simpleMode = false) }
        }
        ModeCard(
            icon = Icons.AutoMirrored.Outlined.Assignment,
            iconTint = Palette.Emerald600,
            title = t.t("onboarding.workSchedule.modeSimple"),
            hint = t.t("onboarding.workSchedule.modeSimpleHint"),
            selected = ob.simpleMode,
            toneName = "emerald",
            modifier = Modifier.weight(1f),
        ) {
            if (!ob.simpleMode) viewModel.onboardingUpdate { it.copy(simpleMode = true) }
        }
    }

    if (ob.simpleMode) {
        HintBox(Icons.Outlined.Info, "emerald", t.t("onboarding.workSchedule.simpleInfo"))
    } else {
        HintBox(Icons.Outlined.Info, "blue", t.t("onboarding.workSchedule.customInfo"))

        // Tagesstunden-Slider (Mo..So; Array in JS-getDay-Reihenfolge)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(if (colors.isDark) Palette.Zinc800.copy(alpha = 0.5f) else Palette.Zinc50)
                .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                t.t("onboarding.workSchedule.dailyHoursTitle").uppercase(),
                color = colors.textFaint,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            listOf("mon" to 1, "tue" to 2, "wed" to 3, "thu" to 4, "fri" to 5, "sat" to 6, "sun" to 0)
                .forEach { (key, dayIndex) ->
                    val isWeekend = dayIndex == 0 || dayIndex == 6
                    val minutes = ob.workDays.getOrElse(dayIndex) { 0 }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(
                            t.t("settings.weekdays.$key"),
                            color = if (isWeekend) Palette.Red400 else colors.textMuted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.width(26.dp),
                        )
                        Slider(
                            value = minutes.toFloat(),
                            onValueChange = { value ->
                                val days = ob.workDays.toMutableList()
                                days[dayIndex] = value.toInt()
                                viewModel.onboardingUpdate { it.copy(workDays = days) }
                            },
                            valueRange = 0f..720f,
                            colors = SliderDefaults.colors(
                                thumbColor = Palette.Emerald500,
                                activeTrackColor = Palette.Emerald500,
                                inactiveTrackColor = if (colors.isDark) Palette.Zinc700 else Palette.Zinc200,
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(24.dp),
                        )
                        Text(
                            formatHoursLocalized(minutes, language),
                            color = colors.textPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            textAlign = TextAlign.End,
                            maxLines = 1,
                            modifier = Modifier.width(52.dp),
                        )
                    }
                }
            HorizontalDivider(color = colors.border, modifier = Modifier.padding(top = 8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    t.t("onboarding.workSchedule.weeklyHours"),
                    color = colors.textSecondary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    formatHoursLocalized(ob.workDays.sum(), language),
                    color = Palette.Emerald500,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        // Optionale Presets (überschreiben die Slider bei Auswahl)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                t.t("onboarding.workSchedule.presetsTitle").uppercase(),
                color = colors.textFaint,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 4.dp),
            )
            WORK_MODELS.filter { it.id != "custom" }.forEach { model ->
                ChoiceCard(
                    model.label,
                    model.description,
                    selected = ob.workDays == model.days,
                    toneName = "blue",
                ) {
                    viewModel.onboardingUpdate { it.copy(workDays = model.days) }
                }
            }
        }
    }
}

@Composable
private fun ModeCard(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    hint: String,
    selected: Boolean,
    toneName: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    val cardTone = tone(toneName)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) cardTone.selectedBg else colors.surface)
            .border(2.dp, if (selected) cardTone.border else colors.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
        Text(
            title, color = colors.textPrimary, fontWeight = FontWeight.Bold,
            fontSize = 14.sp, textAlign = TextAlign.Center,
        )
        Text(
            hint, color = colors.textMuted, fontSize = 10.sp, textAlign = TextAlign.Center,
        )
    }
}

// ─── Step 4: Berechnung (nur Eigener Plan) ───────────────────

@Composable
private fun CalculationStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val config = ob.calcConfig ?: return
    var drawer by remember { mutableStateOf<String?>(null) }

    StepHeader(Icons.Outlined.Tune, "emerald", t.t("settings.calc.header"), t.t("settings.calc.subtitle"))

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
}

// ─── Step 5: Tätigkeiten ─────────────────────────────────────

@Composable
private fun WorkCodesStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var showAdvanced by remember { mutableStateOf(false) }

    StepHeader(
        Icons.AutoMirrored.Outlined.Assignment, "amber",
        t.t("onboarding.workCodes.title"), t.t("onboarding.workCodes.subtitle"),
    )

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ChoiceCard(
            t.t("onboarding.workCodes.basic.allgemeinTitle"),
            t.t("onboarding.workCodes.basic.allgemeinSubtitle"),
            selected = ob.workCodePresetId == "allgemein",
        ) { viewModel.onboardingUpdate { it.copy(workCodePresetId = "allgemein") } }
        ChoiceCard(
            t.t("onboarding.workCodes.basic.leerTitle"),
            t.t("onboarding.workCodes.basic.leerSubtitle"),
            selected = ob.workCodePresetId == "leer",
        ) { viewModel.onboardingUpdate { it.copy(workCodePresetId = "leer") } }

        // Branchen-Presets hinter Collapsible (wie das Original)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .clickable { showAdvanced = !showAdvanced }
                .padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Text(
                t.t("onboarding.workCodes.industryTitle").uppercase(),
                color = colors.textMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
            )
            Icon(
                if (showAdvanced) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = colors.textMuted,
                modifier = Modifier.size(16.dp),
            )
        }
        if (showAdvanced) {
            Row {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(76.dp)
                        .background(colors.border),
                )
                Column(
                    modifier = Modifier
                        .padding(start = 8.dp)
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    WORK_CODE_PRESETS.filter { it.id != "allgemein" && it.id != "leer" }.forEach { preset ->
                        ChoiceCard(
                            preset.name,
                            t.t("onboarding.workCodes.codeCount", "description" to preset.description, "count" to preset.codes.size),
                            selected = ob.workCodePresetId == preset.id,
                            toneName = "blue",
                        ) { viewModel.onboardingUpdate { it.copy(workCodePresetId = preset.id) } }
                    }
                }
            }
        }

        Text(
            t.t("onboarding.workCodes.footerHint"),
            color = colors.textFaint,
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

// ─── Step 6: Backup ("Sicher ist sicher") / Restore ──────────

@Composable
private fun BackupStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val t = LocalI18n.current

    StepHeader(
        Icons.Outlined.VerifiedUser, "purple",
        if (ob.isRestoreFlow) t.t("onboarding.backup.titleRestore") else t.t("onboarding.backup.titleSetup"),
        if (ob.isRestoreFlow) t.t("onboarding.backup.subtitleRestore") else t.t("onboarding.backup.subtitleSetup"),
    )

    if (ob.isRestoreFlow) {
        RestoreOptions(viewModel)
    } else {
        BackupSetupOptions(viewModel, ob)
    }
}

@Composable
private fun BackupSetupOptions(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val state by viewModel.state.collectAsState()
    val nextcloud = state.nextcloud
    var ncPanelOpen by remember { mutableStateOf(false) }
    var ncUrl by remember { mutableStateOf("") }

    // Erfolgreiche Google-Anmeldung aktiviert das Drive-Backup
    LaunchedEffect(state.googleDrive.backupConnected) {
        if (state.googleDrive.backupConnected && !ob.autoBackup) {
            viewModel.onboardingUpdate { it.copy(autoBackup = true) }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        HintBox(Icons.Outlined.Info, "amber", t.t("onboarding.backup.optionalHint"))
        HintBox(Icons.Outlined.Description, "emerald", t.t("onboarding.backup.bonusHint"))
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        BackupOptionCard(
            icon = Icons.Outlined.CloudSync,
            title = t.t("onboarding.backup.gdrive.title"),
            subtitle = t.t("onboarding.backup.gdrive.subtitle"),
            active = ob.autoBackup,
            toneName = "blue",
        ) {
            if (ob.autoBackup) {
                viewModel.onboardingUpdate { it.copy(autoBackup = false) }
            } else {
                viewModel.connectGoogleDrive()
            }
        }

        BackupOptionCard(
            icon = Icons.Outlined.Folder,
            title = t.t("onboarding.backup.local.title"),
            subtitle = t.t("onboarding.backup.local.subtitle"),
            active = ob.localBackupEnabled,
            toneName = "green",
        ) {
            viewModel.onboardingUpdate { it.copy(localBackupEnabled = !it.localBackupEnabled) }
        }

        BackupOptionCard(
            icon = Icons.Outlined.Dns,
            title = t.t("onboarding.backup.nextcloud.title"),
            subtitle = if (nextcloud.connected) {
                t.t("onboarding.backup.nextcloud.connectedAs", "user" to nextcloud.user)
            } else {
                t.t("onboarding.backup.nextcloud.subtitle")
            },
            active = nextcloud.connected,
            toneName = "orange",
        ) {
            if (nextcloud.connected) {
                viewModel.disconnectNextcloud()
            } else {
                ncPanelOpen = !ncPanelOpen
            }
        }

        if (ncPanelOpen && !nextcloud.connected) {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (colors.isDark) Palette.Orange500.copy(alpha = 0.08f) else Palette.Orange50.copy(alpha = 0.5f))
                    .border(
                        1.dp,
                        if (colors.isDark) Palette.Orange500.copy(alpha = 0.4f) else Palette.Orange100,
                        RoundedCornerShape(12.dp),
                    )
                    .padding(12.dp),
            ) {
                if (nextcloud.connecting) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                    ) {
                        CircularProgressIndicator(
                            color = Palette.Orange500,
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                        )
                        Text(
                            t.t("onboarding.backup.nextcloud.awaiting"),
                            color = colors.textSecondary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            t.t("common.cancel"),
                            color = colors.textSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, colors.border, RoundedCornerShape(8.dp))
                                .clickable { viewModel.cancelNextcloudConnect() }
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                        )
                    }
                } else {
                    OutlinedTextField(
                        value = ncUrl,
                        onValueChange = { ncUrl = it },
                        placeholder = { Text(t.t("onboarding.backup.nextcloud.urlPlaceholder"), fontSize = 13.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        t.t("onboarding.backup.nextcloud.connectButton"),
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Palette.Orange500)
                            .clickable {
                                val serverUrl = ncUrl.trim()
                                if (serverUrl.isNotEmpty()) {
                                    scope.launch {
                                        try {
                                            val loginUrl = viewModel.nextcloudInitiate(serverUrl)
                                            CustomTabsIntent.Builder().build()
                                                .launchUrl(context, Uri.parse(loginUrl))
                                        } catch (e: Exception) {
                                            viewModel.showRawMessage(
                                                t.t(
                                                    "settings.backup.toast.nextcloudLoginFailedWith",
                                                    "message" to (e.message ?: ""),
                                                ),
                                            )
                                        }
                                    }
                                }
                            }
                            .padding(vertical = 8.dp),
                    )
                }
            }
        }

        if (!ob.autoBackup && !ob.localBackupEnabled && !nextcloud.connected) {
            Text(
                t.t("onboarding.backup.skipHint"),
                color = colors.textFaint,
                fontSize = 12.sp,
                fontStyle = FontStyle.Italic,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
            )
        }
    }
}

/** Backup-Ziel-Karte mit Icon-Box und Radio-Check rechts. */
@Composable
private fun BackupOptionCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    active: Boolean,
    toneName: String,
    onClick: () -> Unit,
) {
    val colors = LocalAppColors.current
    val cardTone = tone(toneName)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (active) cardTone.selectedBg else colors.surface)
            .border(2.dp, if (active) cardTone.border else colors.border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f),
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (active) cardTone.container else colors.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    icon, contentDescription = null,
                    tint = if (active) cardTone.icon else colors.textFaint,
                    modifier = Modifier.size(20.dp),
                )
            }
            Column {
                Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(subtitle, color = colors.textMuted, fontSize = 12.sp)
            }
        }
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(if (active) cardTone.border else Color.Transparent)
                .border(2.dp, if (active) cardTone.border else colors.border, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (active) {
                Icon(
                    Icons.Filled.Check, contentDescription = null,
                    tint = Color.White, modifier = Modifier.size(14.dp),
                )
            }
        }
    }
}

/** Restore-Quellen im Wiederherstellungs-Flow. */
@Composable
private fun RestoreOptions(viewModel: MainViewModel) {
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

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, colors.border, RoundedCornerShape(12.dp))
            .clickable { importLauncher.launch(arrayOf("application/json", "text/plain", "*/*")) }
            .padding(12.dp),
    ) {
        Box(
            modifier = Modifier
                .shadow(2.dp, RoundedCornerShape(8.dp))
                .clip(RoundedCornerShape(8.dp))
                .background(colors.surface)
                .padding(8.dp),
        ) {
            Icon(
                Icons.Outlined.UploadFile, contentDescription = null,
                tint = Palette.Purple400, modifier = Modifier.size(18.dp),
            )
        }
        Text(
            t.t("onboarding.backup.restoreFromFile"),
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
        )
    }
}

// ─── Step 7: Fertig ──────────────────────────────────────────

@Composable
private fun SummaryStep(viewModel: MainViewModel, ob: OnboardingUiState) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
    ) {
        Box(
            modifier = Modifier
                .shadow(12.dp, CircleShape, spotColor = Palette.Green500)
                .size(80.dp)
                .clip(CircleShape)
                .background(if (colors.isDark) Palette.Green500.copy(alpha = 0.2f) else Palette.Green100),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Filled.Check, contentDescription = null,
                tint = Palette.Green600, modifier = Modifier.size(40.dp),
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(t.t("onboarding.summary.title"), color = colors.textPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
        Text(
            if (ob.restoreData != null) t.t("onboarding.summary.bodyRestore") else t.t("onboarding.summary.bodyFresh"),
            color = colors.textMuted, fontSize = 15.sp, textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(Modifier.height(4.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                Icons.Outlined.AutoAwesome, contentDescription = null,
                tint = colors.accent, modifier = Modifier.size(14.dp),
            )
            Text(
                t.t("onboarding.summary.tourHint"),
                color = colors.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            )
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (ob.simpleMode && !ob.isRestoreFlow) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { viewModel.onboardingBack() }
                    .padding(vertical = 12.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null,
                    tint = colors.textMuted, modifier = Modifier.size(18.dp),
                )
                Text(
                    t.t("onboarding.nav.back"),
                    color = colors.textMuted, fontWeight = FontWeight.Bold, fontSize = 15.sp,
                )
            }
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
            modifier = Modifier
                .fillMaxWidth()
                .shadow(10.dp, RoundedCornerShape(16.dp))
                .clip(RoundedCornerShape(16.dp))
                .background(if (colors.isDark) Color.White else Palette.Zinc900)
                .clickable { viewModel.onboardingFinish() }
                .padding(vertical = 16.dp),
        ) {
            Text(
                t.t("onboarding.summary.finishButton"),
                color = if (colors.isDark) Palette.Zinc900 else Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
            )
            Icon(
                Icons.Filled.PlayArrow, contentDescription = null,
                tint = if (colors.isDark) Palette.Zinc900 else Color.White,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
