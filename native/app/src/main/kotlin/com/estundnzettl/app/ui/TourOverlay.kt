package com.estundnzettl.app.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Backup
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Calculate
import androidx.compose.material.icons.outlined.FrontHand
import androidx.compose.material.icons.outlined.Palette as PaletteIcon
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.Work
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.i18n.I18n
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

// ─────────────────────────────────────────────────────────────────
// Tour-Ziel-Registry — Ersatz für die data-tour="..."-DOM-Attribute:
// Bedienelemente melden ihre Bounding-Box, die Tour zeichnet Spotlight
// und Ping-Ring exakt darüber (Port von AppTour.tsx/useTargetRect).
// ─────────────────────────────────────────────────────────────────

class TourTargetRegistry {
    val rects = mutableStateMapOf<String, Rect>()

    /** Scroll-Hook des Settings-Screens (animateScrollBy in px). */
    var settingsScroll: (suspend (Float) -> Unit)? = null

    /** true → Settings-Tour zeigt gerade einen Schritt ohne Ziel (Blur). */
    val settingsTourBlur = mutableStateOf(false)
}

val LocalTourTargets = staticCompositionLocalOf { TourTargetRegistry() }

/** Registriert das Element unter [key] (Bounding-Box in Root-Koordinaten). */
fun Modifier.tourTarget(registry: TourTargetRegistry, key: String): Modifier =
    onGloballyPositioned { registry.rects[key] = it.boundsInRoot() }

// ─────────────────────────────────────────────────────────────────
// App-Tour als Vollbild-Overlay mit Spotlight (Port von AppTour.tsx)
// ─────────────────────────────────────────────────────────────────

private data class AppTourStep(
    val key: String,
    val target: String?,
    val tone: String = "emerald",
    val hasHint: Boolean = false,
)

private val APP_TOUR_STEPS = listOf(
    AppTourStep("welcome", target = null),
    AppTourStep("dashboard", target = null),
    AppTourStep("fabTap", target = "fab"),
    AppTourStep("fabTimer", target = "fab", hasHint = true),
    AppTourStep("report", target = "report"),
    AppTourStep("settings", target = "settings", tone = "zinc"),
    AppTourStep("done", target = null),
)

/** true wenn der Schritt ein markiertes Ziel hat (dann kein Backdrop-Blur). */
fun appTourStepHasTarget(index: Int): Boolean =
    APP_TOUR_STEPS.getOrNull(index)?.target != null

@Composable
fun AppTourOverlay(
    i18n: I18n,
    index: Int,
    onIndexChange: (Int) -> Unit,
    onClose: () -> Unit,
) {
    val colors = LocalAppColors.current
    val registry = LocalTourTargets.current
    val step = APP_TOUR_STEPS[index]
    val isLast = index == APP_TOUR_STEPS.lastIndex

    val stepIcon = when (step.key) {
        "welcome" -> Icons.Outlined.AutoAwesome
        "dashboard" -> Icons.Outlined.BarChart
        "fabTap" -> Icons.Filled.Add
        "fabTimer" -> Icons.Filled.ArrowUpward
        "report" -> fileBarChartIcon()
        "settings" -> Icons.Outlined.Settings
        else -> Icons.Filled.Check
    }

    TourOverlay(
        stepCount = APP_TOUR_STEPS.size,
        index = index,
        title = i18n.t("appTour.steps.${step.key}.title"),
        body = i18n.t("appTour.steps.${step.key}.body"),
        icon = stepIcon,
        iconTone = step.tone,
        targetRect = step.target?.let { registry.rects[it] },
        pillHighlight = true,
        onBack = { if (index > 0) onIndexChange(index - 1) },
        onNext = { if (isLast) onClose() else onIndexChange(index + 1) },
        onClose = onClose,
        extra = if (step.hasHint) {
            {
                // Hinweis-Chip (Hand + Text) wie der hint-Badge des Originals
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (colors.isDark) Palette.Emerald500.copy(alpha = 0.2f) else Palette.Emerald50,
                        )
                        .border(
                            1.dp,
                            if (colors.isDark) Palette.Emerald700 else Palette.Emerald100,
                            RoundedCornerShape(8.dp),
                        )
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    Icon(
                        Icons.Outlined.FrontHand,
                        contentDescription = null,
                        tint = if (colors.isDark) Palette.Emerald400 else Palette.Emerald600,
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        i18n.t("appTour.steps.fabTimer.hint"),
                        color = if (colors.isDark) Palette.Emerald400 else Palette.Emerald700,
                        fontSize = 11.sp,
                        lineHeight = 15.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        } else {
            null
        },
    )
}

// ─────────────────────────────────────────────────────────────────
// Generisches Tour-Overlay: Spotlight-Backdrop, Ping-Ring und Karte
// über/unter dem Ziel (gemeinsamer Kern von AppTour + SettingsTour).
// ─────────────────────────────────────────────────────────────────

private val SPOTLIGHT_PADDING = 10.dp
private val CARD_GAP = 18.dp
private val ESTIMATED_CARD_HEIGHT = 236.dp
private val SAFE_MARGIN = 24.dp

@Composable
fun TourOverlay(
    stepCount: Int,
    index: Int,
    title: String,
    body: String,
    icon: ImageVector?,
    iconTone: String,
    targetRect: Rect?,
    pillHighlight: Boolean,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onClose: () -> Unit,
    extra: (@Composable () -> Unit)? = null,
) {
    val density = LocalDensity.current

    // Overlay-Ursprung abziehen, damit Root-Koordinaten der Ziele auch
    // bei gepolstertem Overlay stimmen.
    var overlayOrigin by remember { mutableStateOf(Offset.Zero) }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .onGloballyPositioned { overlayOrigin = it.boundsInRoot().topLeft },
    ) {
        val viewportHeight = constraints.maxHeight.toFloat()
        val paddingPx = with(density) { SPOTLIGHT_PADDING.toPx() }
        val highlight = targetRect?.translate(-overlayOrigin)?.inflate(paddingPx)
        val cornerPx = if (highlight != null) {
            if (pillHighlight) highlight.height / 2f else with(density) { 20.dp.toPx() }
        } else {
            0f
        }
        val ringColor = when (iconTone) {
            "blue" -> Palette.Blue400
            "amber" -> Palette.Amber400
            "violet" -> Color(0xFFA78BFA)
            "zinc" -> Palette.Zinc400
            else -> Palette.Emerald400
        }

        // Backdrop — mit Spotlight-Loch, wenn ein Ziel markiert ist.
        // Tap überall (auch im Loch) blättert weiter, ohne die echte
        // App-Aktion auszulösen.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)
                .drawBehind {
                    drawRect(Color.Black.copy(alpha = 0.6f))
                    if (highlight != null) {
                        drawRoundRect(
                            color = Color.Black,
                            topLeft = highlight.topLeft,
                            size = highlight.size,
                            cornerRadius = CornerRadius(cornerPx, cornerPx),
                            blendMode = BlendMode.Clear,
                        )
                    }
                }
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onNext,
                ),
        )

        // Ping-Ring exakt über dem Ziel (ring-4 + animate-ping)
        if (highlight != null) {
            val ringShape: Shape =
                if (pillHighlight) CircleShape else RoundedCornerShape(20.dp)
            val ping = rememberInfiniteTransition(label = "tourPing")
            val pingScale by ping.animateFloat(
                initialValue = 1f,
                targetValue = 1.5f,
                animationSpec = infiniteRepeatable(
                    tween(1000, easing = CubicBezierEasing(0f, 0f, 0.2f, 1f)),
                    RepeatMode.Restart,
                ),
                label = "pingScale",
            )
            val pingAlpha by ping.animateFloat(
                initialValue = 0.6f,
                targetValue = 0f,
                animationSpec = infiniteRepeatable(
                    tween(1000, easing = CubicBezierEasing(0f, 0f, 0.2f, 1f)),
                    RepeatMode.Restart,
                ),
                label = "pingAlpha",
            )

            key(index) {
                // Federnder Einstieg wie die framer-motion-Spring des Originals
                var entered by remember { mutableStateOf(false) }
                androidx.compose.runtime.LaunchedEffect(Unit) { entered = true }
                val enterScale by animateFloatAsState(
                    targetValue = if (entered) 1f else 0.6f,
                    animationSpec = spring(dampingRatio = 0.65f, stiffness = 260f),
                    label = "ringEnter",
                )
                val enterAlpha by animateFloatAsState(
                    targetValue = if (entered) 1f else 0f,
                    animationSpec = tween(180),
                    label = "ringEnterAlpha",
                )

                Box(
                    modifier = Modifier
                        .offset {
                            IntOffset(highlight.left.roundToInt(), highlight.top.roundToInt())
                        }
                        .size(
                            with(density) { highlight.width.toDp() },
                            with(density) { highlight.height.toDp() },
                        )
                        .graphicsLayer {
                            scaleX = enterScale
                            scaleY = enterScale
                            alpha = enterAlpha
                        },
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                scaleX = pingScale
                                scaleY = pingScale
                                alpha = pingAlpha
                            }
                            .border(4.dp, ringColor, ringShape),
                    )
                    Box(modifier = Modifier.fillMaxSize().border(4.dp, ringColor, ringShape))
                }
            }
        }

        // Karten-Position: unter dem Ziel wenn Platz, sonst darüber;
        // ohne Ziel vertikal zentriert (Port der cardContainerStyle-Logik).
        val cardModifier = if (highlight == null) {
            Modifier.align(Alignment.Center)
        } else {
            val gapPx = with(density) { CARD_GAP.toPx() }
            val safePx = with(density) { SAFE_MARGIN.toPx() }
            val estimatePx = with(density) { ESTIMATED_CARD_HEIGHT.toPx() }
            val spaceAbove = highlight.top - gapPx - safePx
            val spaceBelow = viewportHeight - highlight.bottom - gapPx - safePx
            if (spaceBelow >= estimatePx || spaceBelow >= spaceAbove) {
                val top = minOf(highlight.bottom + gapPx, viewportHeight - estimatePx - safePx)
                Modifier
                    .align(Alignment.TopCenter)
                    .offset { IntOffset(0, top.roundToInt()) }
            } else {
                val bottom = minOf(
                    viewportHeight - highlight.top + gapPx,
                    viewportHeight - estimatePx - safePx,
                )
                Modifier
                    .align(Alignment.BottomCenter)
                    .offset { IntOffset(0, -bottom.roundToInt()) }
            }
        }

        Box(modifier = cardModifier.padding(horizontal = 16.dp)) {
            TourCard(
                stepCount = stepCount,
                index = index,
                title = title,
                body = body,
                icon = icon,
                iconTone = iconTone,
                onBack = onBack,
                onNext = onNext,
                onClose = onClose,
                extra = extra,
            )
        }
    }
}

/**
 * Tour-Karte: Fortschritts-Segmente + X, animierter Schritt-Inhalt und
 * feste Fußzeile — die Buttons bleiben über alle Schritte an derselben
 * Stelle (Inhalt hat Mindesthöhe, nur der Text wird ausgetauscht).
 */
@Composable
private fun TourCard(
    stepCount: Int,
    index: Int,
    title: String,
    body: String,
    icon: ImageVector?,
    iconTone: String,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onClose: () -> Unit,
    extra: (@Composable () -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val isFirst = index == 0
    val isLast = index == stepCount - 1
    val (toneBg, toneFg) = tourToneColors(iconTone, colors.isDark)
    val buttonColor = if (iconTone == "zinc") {
        if (colors.isDark) Palette.Zinc200 else Palette.Zinc800
    } else {
        colors.accentStrong
    }
    val buttonTextColor = if (iconTone == "zinc" && colors.isDark) Palette.Zinc900 else Color.White

    Column(
        modifier = Modifier
            .widthIn(max = 384.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(colors.surface),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                repeat(stepCount) { i ->
                    val width by animateDpAsState(if (i == index) 24.dp else 6.dp, label = "tourDot")
                    Box(
                        modifier = Modifier
                            .size(width = width, height = 6.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    i == index -> colors.accentStrong
                                    i < index -> colors.accent.copy(alpha = 0.45f)
                                    else -> colors.surfaceVariant
                                },
                            ),
                    )
                }
            }
            IconButton(onClick = onClose) {
                Icon(
                    Icons.Filled.Close,
                    contentDescription = t.t("appTour.skipAria"),
                    tint = colors.textFaint,
                    modifier = Modifier.size(18.dp),
                )
            }
        }

        // Schritt-Inhalt mit Übergang (AnimatePresence mode="wait");
        // Mindesthöhe hält die Fußzeile still, egal wie lang der Text ist.
        AnimatedContent(
            targetState = Triple(index, title, body),
            transitionSpec = {
                (fadeIn(tween(250)) + slideInVertically(tween(250)) { it / 8 })
                    .togetherWith(fadeOut(tween(160)) + slideOutVertically(tween(160)) { -it / 16 })
            },
            label = "tourStepContent",
        ) { (_, stepTitle, stepBody) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 124.dp)
                    .padding(horizontal = 20.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (icon != null) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(toneBg),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(icon, contentDescription = null, tint = toneFg, modifier = Modifier.size(22.dp))
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        stepTitle,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        lineHeight = 21.sp,
                    )
                    Text(stepBody, color = colors.textSecondary, fontSize = 14.sp, lineHeight = 21.sp)
                    extra?.invoke()
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .background(colors.surfaceVariant.copy(alpha = if (colors.isDark) 0.3f else 0.5f))
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onBack, enabled = !isFirst) {
                Text(
                    "← " + t.t("common.back"),
                    color = colors.textMuted.copy(alpha = if (isFirst) 0.35f else 1f),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                )
            }
            Text(
                "${index + 1} / $stepCount",
                color = colors.textFaint,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
            )
            Button(
                onClick = onNext,
                colors = ButtonDefaults.buttonColors(containerColor = buttonColor),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp),
            ) {
                Text(
                    if (isLast) "✓ " + t.t("appTour.finish") else t.t("appTour.next") + " →",
                    color = buttonTextColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    maxLines = 1,
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// Einstellungen-Tour als Overlay — Port von SettingsTourPopup.tsx:
// scrollt die Ziel-Sektion mittig ins Bild und markiert sie mit
// Spotlight + Ring (rounded-rect statt Pille).
// ─────────────────────────────────────────────────────────────────

private data class SettingsTourStepDef(
    val key: String,
    val tone: String,
    val target: String?,
)

private val SETTINGS_TOUR_STEP_DEFS = listOf(
    SettingsTourStepDef("overview", "emerald", null),
    SettingsTourStepDef("profile", "blue", "settings:profile"),
    SettingsTourStepDef("recording", "emerald", "settings:recording"),
    SettingsTourStepDef("codes", "amber", "settings:codes"),
    SettingsTourStepDef("calculation", "violet", "settings:calculation"),
    SettingsTourStepDef("backup", "blue", "settings:backup"),
    SettingsTourStepDef("appearanceHelp", "zinc", "settings:appearanceHelp"),
    SettingsTourStepDef("done", "emerald", "settings:help-card"),
)

@Composable
fun SettingsTourOverlay(
    viewModel: com.estundnzettl.app.MainViewModel,
    storageKey: String = "estundnzettl_settings_tour_seen_v2",
) {
    val t = LocalI18n.current
    val registry = LocalTourTargets.current
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    var visible by remember { mutableStateOf(false) }
    var index by remember { androidx.compose.runtime.mutableIntStateOf(0) }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        visible = viewModel.settings.getString(storageKey) != "1"
    }

    val step = SETTINGS_TOUR_STEP_DEFS[index]

    // Blur-Flag für Schritte ohne Ziel; beim Verlassen zurücksetzen
    androidx.compose.runtime.DisposableEffect(visible, step.target) {
        registry.settingsTourBlur.value = visible && step.target == null
        onDispose { registry.settingsTourBlur.value = false }
    }

    if (!visible) return

    fun close() {
        visible = false
        registry.settingsTourBlur.value = false
        scope.launch { viewModel.settings.setString(storageKey, "1") }
    }

    val density = LocalDensity.current
    val viewportHeightPx = with(density) {
        androidx.compose.ui.platform.LocalConfiguration.current.screenHeightDp.dp.toPx()
    }

    // Ziel-Sektion mittig scrollen (scrollIntoView block:"center")
    androidx.compose.runtime.LaunchedEffect(index) {
        val key = step.target ?: return@LaunchedEffect
        kotlinx.coroutines.delay(60)
        val rect = registry.rects[key] ?: return@LaunchedEffect
        val delta = rect.center.y - viewportHeightPx / 2f
        registry.settingsScroll?.invoke(delta)
    }

    val stepIcon = when (step.key) {
        "overview" -> Icons.Outlined.Tune
        "profile" -> Icons.Outlined.Person
        "recording" -> Icons.Outlined.Work
        "codes" -> Icons.Outlined.Work
        "calculation" -> Icons.Outlined.Calculate
        "backup" -> Icons.Outlined.Backup
        "appearanceHelp" -> Icons.Outlined.PaletteIcon
        else -> Icons.AutoMirrored.Outlined.HelpOutline
    }
    val isLast = index == SETTINGS_TOUR_STEP_DEFS.lastIndex

    TourOverlay(
        stepCount = SETTINGS_TOUR_STEP_DEFS.size,
        index = index,
        title = t.t("settingsTour.steps.${step.key}.title"),
        body = t.t("settingsTour.steps.${step.key}.body"),
        icon = stepIcon,
        iconTone = step.tone,
        targetRect = step.target?.let { registry.rects[it] },
        pillHighlight = false,
        onBack = { if (index > 0) index-- },
        onNext = { if (isLast) close() else index++ },
        onClose = ::close,
    )
}
