package com.estundnzettl.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * iOS-artige Wheel-Picker — Port von TimePickerDrawer.tsx und
 * DecimalDurationPicker.tsx: 5 sichtbare Zeilen, Snap mit Schwung,
 * Skalierung/Transparenz nach Abstand zur Mitte, Haptik-Tick beim
 * Überstreichen eines Werts, Highlight-Band, X-/✓-Kopfzeile.
 */

private val ITEM_H = 56.dp
private const val VISIBLE = 5

/** Eine Wheel-Spalte über einer Ganzzahlen-Liste. */
@Composable
private fun WheelColumn(
    items: List<Int>,
    initial: Int,
    accentSelected: Boolean,
    modifier: Modifier = Modifier,
    format: (Int) -> String = { it.toString().padStart(2, '0') },
    onCentered: (Int) -> Unit,
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val initialIndex = items.indexOf(initial).coerceAtLeast(0)
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = initialIndex)
    val itemHeightPx = with(androidx.compose.ui.platform.LocalDensity.current) { ITEM_H.toPx() }

    // Index des Elements in der Mitte (contentPadding zentriert Element 0)
    val centeredIndex by remember {
        derivedStateOf {
            val raw = listState.firstVisibleItemIndex +
                (listState.firstVisibleItemScrollOffset / itemHeightPx).roundToInt()
            raw.coerceIn(0, items.lastIndex)
        }
    }

    var lastEmitted by remember { mutableIntStateOf(items.getOrElse(initialIndex) { 0 }) }
    LaunchedEffect(centeredIndex) {
        val value = items[centeredIndex]
        if (value != lastEmitted) {
            lastEmitted = value
            Haptics.light(context)
        }
        onCentered(value)
    }

    LazyColumn(
        state = listState,
        flingBehavior = rememberSnapFlingBehavior(listState),
        contentPadding = PaddingValues(vertical = ITEM_H * ((VISIBLE - 1) / 2)),
        modifier = modifier.height(ITEM_H * VISIBLE),
    ) {
        items(items.size) { index ->
            val value = items[index]
            val isSelected = index == centeredIndex
            Box(
                modifier = Modifier
                    .height(ITEM_H)
                    .fillMaxWidth()
                    .graphicsLayer {
                        // Abstand zur Mitte → Skalierung + Transparenz wie das Original
                        val scrollPx = listState.firstVisibleItemIndex * itemHeightPx +
                            listState.firstVisibleItemScrollOffset
                        val dist = abs(index * itemHeightPx - scrollPx)
                        val norm = dist / (itemHeightPx * VISIBLE)
                        scaleX = (1f - norm / 0.6f).coerceAtLeast(0.65f)
                        scaleY = scaleX
                        alpha = (1f - norm / 0.45f).coerceAtLeast(0.2f)
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = format(value),
                    fontSize = if (isSelected) 30.sp else 20.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = when {
                        isSelected && accentSelected -> colors.accent
                        isSelected -> colors.textPrimary
                        else -> colors.textFaint
                    },
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

/** Kopfzeile mit rotem X (Abbrechen) und grünem ✓ (Bestätigen). */
@Composable
private fun WheelSheetHeader(title: String, onCancel: () -> Unit, onConfirm: () -> Unit) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Palette.Red500.copy(alpha = 0.12f))
                .clickable(onClick = onCancel),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Close, contentDescription = t.t("common.cancel"), tint = Palette.Red500)
        }
        Text(
            title,
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            modifier = Modifier.padding(horizontal = 12.dp),
        )
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Palette.Emerald500.copy(alpha = 0.15f))
                .clickable {
                    Haptics.medium(context)
                    onConfirm()
                },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Check, contentDescription = null, tint = Palette.Emerald600)
        }
    }
}

/** Highlight-Band hinter der mittleren Zeile. */
@Composable
private fun WheelHighlightBand(content: @Composable () -> Unit) {
    val colors = LocalAppColors.current
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(ITEM_H)
                .clip(RoundedCornerShape(12.dp))
                .background(colors.surfaceVariant),
        )
        content()
    }
}

/**
 * Uhrzeit-Wheel (Stunden : Minuten) als Bottom-Sheet —
 * Port von TimePickerDrawer.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimeWheelSheet(
    title: String,
    initial: String,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val parts = initial.split(":")
    var hour by remember { mutableIntStateOf(parts.getOrNull(0)?.toIntOrNull() ?: 6) }
    var minute by remember { mutableIntStateOf(parts.getOrNull(1)?.toIntOrNull() ?: 0) }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = colors.surface) {
        Column(modifier = Modifier.navigationBarsPadding().padding(bottom = 16.dp)) {
            WheelSheetHeader(
                title = title,
                onCancel = onDismiss,
                onConfirm = { onConfirm("%02d:%02d".format(hour, minute)) },
            )
            WheelHighlightBand {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    WheelColumn(
                        items = (0..23).toList(),
                        initial = hour,
                        accentSelected = true,
                        modifier = Modifier.width(90.dp),
                    ) { hour = it }
                    Text(
                        ":",
                        color = colors.textFaint,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 4.dp),
                    )
                    WheelColumn(
                        items = (0..59).toList(),
                        initial = minute,
                        accentSelected = false,
                        modifier = Modifier.width(90.dp),
                    ) { minute = it }
                }
            }
        }
    }
}

/**
 * Dauer-Wheel (Stunden + Minuten) als Bottom-Sheet —
 * Port von DecimalDurationPicker (1-Minuten-Auflösung).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DurationWheelSheet(
    title: String,
    initialMinutes: Int,
    maxHours: Int = 24,
    onConfirm: (Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var hour by remember { mutableIntStateOf((initialMinutes / 60).coerceIn(0, maxHours)) }
    var minute by remember { mutableIntStateOf(initialMinutes % 60) }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = colors.surface) {
        Column(modifier = Modifier.navigationBarsPadding().padding(bottom = 16.dp)) {
            WheelSheetHeader(
                title = title,
                onCancel = onDismiss,
                onConfirm = { onConfirm(hour * 60 + minute) },
            )
            WheelHighlightBand {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    WheelColumn(
                        items = (0..maxHours).toList(),
                        initial = hour,
                        accentSelected = true,
                        modifier = Modifier.width(90.dp),
                        format = { it.toString() },
                    ) { hour = it }
                    Text(
                        "h",
                        color = colors.textFaint,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 4.dp),
                    )
                    WheelColumn(
                        items = (0..59).toList(),
                        initial = minute,
                        accentSelected = false,
                        modifier = Modifier.width(90.dp),
                    ) { minute = it }
                    Text(
                        "min",
                        color = colors.textFaint,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
            }
        }
    }
}
