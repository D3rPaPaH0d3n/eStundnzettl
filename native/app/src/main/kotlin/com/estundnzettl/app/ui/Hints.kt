package com.estundnzettl.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import kotlinx.coroutines.launch

/**
 * Einmalige Hinweis-Box — Port von FirstOpenHint.tsx. Erscheint, bis
 * der Nutzer sie mit "Verstanden" wegklickt (persistiert unter
 * [storageKey] in den Settings).
 */
@Composable
fun FirstOpenHint(
    viewModel: MainViewModel,
    storageKey: String,
    title: String,
    body: String,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val scope = rememberCoroutineScope()
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(storageKey) {
        visible = viewModel.settings.getString(storageKey) != "1"
    }

    AnimatedVisibility(
        visible = visible,
        enter = expandVertically() + fadeIn(),
        exit = shrinkVertically() + fadeOut(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(colors.info.copy(alpha = if (colors.isDark) 0.15f else 0.08f))
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(title, color = colors.info, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(body, color = colors.textSecondary, fontSize = 12.sp)
            Text(
                t.t("hints.gotIt"),
                color = colors.info,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                modifier = Modifier
                    .align(Alignment.End)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable {
                        visible = false
                        scope.launch { viewModel.settings.setString(storageKey, "1") }
                    }
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            )
        }
    }
}

/**
 * "Gefällt dir eStundnzettl?" — Port von SupportPromptModal.tsx.
 * Erscheint frühestens 5 Tage nach der ersten Nutzung, einmalig.
 */
@Composable
fun SupportPromptDialog(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current

    fun open(url: String) {
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
        }
        viewModel.dismissSupportPrompt()
    }

    AlertDialog(
        onDismissRequest = { viewModel.dismissSupportPrompt() },
        title = { Text(t.t("supportPrompt.title")) },
        text = { Text(t.t("supportPrompt.body")) },
        confirmButton = {
            Row {
                TextButton(onClick = { open("https://play.google.com/store/apps/details?id=com.estundnzettl.app") }) {
                    Text(t.t("supportPrompt.rate"), color = colors.accent, fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = { open("https://revolut.me/mkainer/pocket/QAt1Q0Ntsb") }) {
                    Text("☕ " + t.t("supportPrompt.coffee"), color = colors.special, fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.dismissSupportPrompt() }) {
                Text(t.t("supportPrompt.noThanks"), color = colors.textMuted)
            }
        },
    )
}

/**
 * Gemeinsame Tour-Karte — Layout-Port der Tour-Popups aus AppTour.tsx /
 * SettingsTourPopup.tsx: Fortschritts-Segmente + X oben, Titel/Body,
 * Fußzeile mit Zurück, Schrittzähler und gefülltem Weiter-Button.
 */
@Composable
fun TourPopupCard(
    stepCount: Int,
    index: Int,
    title: String,
    body: String,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onClose: () -> Unit,
    extra: (@Composable () -> Unit)? = null,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val isFirst = index == 0
    val isLast = index == stepCount - 1

    Dialog(onDismissRequest = onClose) {
        Column(
            modifier = Modifier
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
            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(title, color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                Text(body, color = colors.textSecondary, fontSize = 14.sp)
                extra?.invoke()
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
                    colors = ButtonDefaults.buttonColors(containerColor = colors.accentStrong),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp),
                ) {
                    Text(
                        if (isLast) "✓ " + t.t("appTour.finish") else t.t("appTour.next") + " →",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

/**
 * Einmalige Einstellungen-Tour — Port von SettingsTourPopup.tsx
 * (8 Schritte aus settingsTour.steps.*).
 */
private val SETTINGS_TOUR_STEPS = listOf(
    "overview", "profile", "recording", "codes", "calculation", "backup", "appearanceHelp", "done",
)

@Composable
fun SettingsTourPopup(viewModel: MainViewModel, storageKey: String = "estundnzettl_settings_tour_seen_v2") {
    val t = LocalI18n.current
    val scope = rememberCoroutineScope()
    var visible by remember { mutableStateOf(false) }
    var index by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        visible = viewModel.settings.getString(storageKey) != "1"
    }
    if (!visible) return

    fun close() {
        visible = false
        scope.launch { viewModel.settings.setString(storageKey, "1") }
    }

    val step = SETTINGS_TOUR_STEPS[index]
    val isLast = index == SETTINGS_TOUR_STEPS.lastIndex

    TourPopupCard(
        stepCount = SETTINGS_TOUR_STEPS.size,
        index = index,
        title = t.t("settingsTour.steps.$step.title"),
        body = t.t("settingsTour.steps.$step.body"),
        onBack = { if (index > 0) index-- },
        onNext = { if (isLast) close() else index++ },
        onClose = ::close,
    )
}
