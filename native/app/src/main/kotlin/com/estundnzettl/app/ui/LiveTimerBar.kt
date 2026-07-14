package com.estundnzettl.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitLongPressOrCancellation
import androidx.compose.foundation.gestures.drag
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.TimerUiState
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import kotlinx.coroutines.delay
import java.time.Instant

/**
 * FAB + Live-Timer — Port von LiveTimerOverlay.tsx inkl. Original-Geste:
 * - Tap: neuer Eintrag
 * - Lang drücken (FAB wird grün, Pfeil + Hinweis-Pille) und nach oben
 *   wischen: Timer startet (mit Haptik wie im Original)
 * - Laufender Timer: Tap stoppt; Status-Pille mit Fortschrittsfarbe,
 *   daneben animierter Pause/Fortsetzen-Button.
 */
@Composable
fun LiveTimerBar(
    timer: TimerUiState,
    targetMinutes: Int,
    onCreateEntry: () -> Unit,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onPause: () -> Unit,
    onResume: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current

    var swipeReady by remember { mutableStateOf(false) }
    var pressed by remember { mutableStateOf(false) }

    // Anzeige alle 30s aktualisieren (wie das Original-Intervall)
    var nowMillis by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(timer.isRunning, timer.isPaused) {
        while (timer.isRunning) {
            nowMillis = System.currentTimeMillis()
            delay(30_000)
        }
    }

    val statusText: String
    val statusTone: Color
    if (timer.isRunning && timer.startTime != null) {
        val start = Instant.parse(timer.startTime).toEpochMilli()
        var pauseMs = timer.accumulatedPause
        if (timer.isPaused && timer.pauseStartTime != null) {
            pauseMs += nowMillis - Instant.parse(timer.pauseStartTime).toEpochMilli()
        }
        val workedMinutes = ((nowMillis - start - pauseMs) / 1000.0 / 60.0)
        val rounded = maxOf(0, workedMinutes.toInt())
        statusText = "${rounded / 60}:${(rounded % 60).toString().padStart(2, '0')} ${t.t("liveTimer.hours")}"
        val progress = if (targetMinutes > 0) workedMinutes / targetMinutes else 0.6
        statusTone = when {
            progress >= 1 -> Palette.Emerald500
            progress >= 0.6 -> Palette.Blue500
            else -> Palette.Red500
        }
    } else {
        statusText = ""
        statusTone = Palette.Emerald500
    }

    // whileTap-Scale wie framer-motion (0.92)
    val fabScale by animateFloatAsState(
        targetValue = if (pressed) 0.92f else 1f,
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 600f),
        label = "fabScale",
    )

    Column(
        modifier = modifier
            .navigationBarsPadding()
            .padding(end = 24.dp, bottom = 56.dp),
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Status-Pille (auch als Swipe-Hinweis beim langen Drücken)
        AnimatedVisibility(
            visible = timer.isRunning || swipeReady,
            enter = fadeIn() + slideInVertically { it / 2 } + scaleIn(initialScale = 0.8f),
            exit = fadeOut() + slideOutVertically { it / 2 } + scaleOut(targetScale = 0.8f),
        ) {
            Text(
                text = when {
                    !timer.isRunning -> t.t("liveTimer.swipeHint")
                    timer.isPaused -> t.t("liveTimer.paused")
                    else -> statusText
                },
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        (if (timer.isRunning) statusTone else Palette.Emerald500).copy(alpha = 0.92f),
                    )
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Pause/Fortsetzen — federt wie das Original herein
            AnimatedVisibility(
                visible = timer.isRunning,
                enter = fadeIn() + scaleIn(initialScale = 0f) + slideInHorizontally { it / 2 },
                exit = fadeOut() + scaleOut(targetScale = 0f) + slideOutHorizontally { it / 2 },
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(
                            if (timer.isPaused) Palette.Emerald100 else colors.surface,
                        )
                        .border(
                            1.dp,
                            if (timer.isPaused) Palette.Emerald400 else colors.border,
                            CircleShape,
                        )
                        .clickable {
                            Haptics.light(context)
                            if (timer.isPaused) onResume() else onPause()
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (timer.isPaused) Icons.Filled.PlayArrow else Icons.Filled.Pause,
                        contentDescription = if (timer.isPaused) t.t("timer.resume") else t.t("timer.pause"),
                        tint = if (timer.isPaused) Palette.Emerald600 else colors.textFaint,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            // Haupt-FAB mit Long-Press+Hochwisch-Geste (Port der Pointer-Logik)
            Column(
                modifier = Modifier
                    .size(56.dp)
                    .graphicsLayer {
                        scaleX = fabScale
                        scaleY = fabScale
                    }
                    .clip(CircleShape)
                    .background(
                        when {
                            timer.isRunning -> colors.surface
                            swipeReady -> Palette.Emerald600
                            colors.isDark -> Palette.Emerald600
                            else -> Palette.Zinc900
                        },
                    )
                    .border(
                        2.dp,
                        when {
                            timer.isRunning -> Palette.Red500
                            swipeReady -> Palette.Emerald400
                            else -> Color.Transparent
                        },
                        CircleShape,
                    )
                    .pointerInput(timer.isRunning) {
                        val swipeThreshold = 28.dp.toPx()
                        awaitEachGesture {
                            val down = awaitFirstDown()
                            pressed = true
                            if (timer.isRunning) {
                                // Laufender Timer: einfacher Tap stoppt
                                val longPress = awaitLongPressOrCancellation(down.id)
                                pressed = false
                                if (longPress == null) {
                                    Haptics.medium(context)
                                    onStop()
                                }
                                return@awaitEachGesture
                            }

                            val longPress = awaitLongPressOrCancellation(down.id)
                            if (longPress == null) {
                                // kurzer Tap → neuer Eintrag
                                pressed = false
                                onCreateEntry()
                                return@awaitEachGesture
                            }

                            // Lang gedrückt → Swipe-Modus wie im Original
                            swipeReady = true
                            Haptics.light(context)
                            var totalDy = 0f
                            var triggered = false
                            drag(longPress.id) { change ->
                                totalDy += change.positionChange().y
                                if (!triggered && -totalDy >= swipeThreshold) {
                                    triggered = true
                                    Haptics.medium(context)
                                    onStart()
                                }
                                change.consume()
                            }
                            swipeReady = false
                            pressed = false
                        }
                    },
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                when {
                    timer.isRunning -> {
                        Icon(
                            Icons.Filled.Stop,
                            contentDescription = t.t("timer.stop"),
                            tint = Palette.Red500,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            t.t("liveTimer.fabOff"),
                            color = Palette.Red500,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                        )
                    }
                    swipeReady -> {
                        Icon(
                            Icons.Filled.ArrowUpward,
                            contentDescription = t.t("timer.start"),
                            tint = Color.White,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            t.t("liveTimer.fabTimer"),
                            color = Color.White,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                        )
                    }
                    else -> {
                        Icon(
                            Icons.Filled.Add,
                            contentDescription = t.t("timer.start"),
                            tint = Color.White,
                            modifier = Modifier.size(28.dp),
                        )
                    }
                }
            }
        }
    }
}
