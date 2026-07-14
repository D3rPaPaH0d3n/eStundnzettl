package com.estundnzettl.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
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
 * Einmalige Einstellungen-Tour — Port von SettingsTourPopup.tsx
 * (8 Schritte aus settingsTour.steps.*).
 */
private val SETTINGS_TOUR_STEPS = listOf(
    "overview", "profile", "recording", "codes", "calculation", "backup", "appearanceHelp", "done",
)

@Composable
fun SettingsTourPopup(viewModel: MainViewModel, storageKey: String = "estundnzettl_settings_tour_seen_v2") {
    val colors = LocalAppColors.current
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

    Dialog(onDismissRequest = ::close) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(colors.surface)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                t.t("settingsTour.steps.$step.title"),
                color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 17.sp,
            )
            Text(
                t.t("settingsTour.steps.$step.body"),
                color = colors.textSecondary, fontSize = 14.sp,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    SETTINGS_TOUR_STEPS.indices.forEach { i ->
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(if (i == index) colors.accentStrong else colors.surfaceVariant),
                        )
                    }
                }
                Row {
                    TextButton(onClick = ::close) {
                        Text(t.t("appTour.skipAria"), color = colors.textMuted, fontSize = 13.sp)
                    }
                    TextButton(onClick = { if (isLast) close() else index++ }) {
                        Text(
                            if (isLast) t.t("appTour.finish") else t.t("appTour.next"),
                            color = colors.accentStrong, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                        )
                    }
                }
            }
        }
    }
}
