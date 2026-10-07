package com.estundnzettl.app.ui.settings

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Business
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.pdf.decodeLogoDataUrl
import com.estundnzettl.app.pdf.uriToLogoDataUrl
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette
import com.estundnzettl.core.calc.limitReportFooterEdit
import com.estundnzettl.core.model.REPORT_FOOTER_MAX_LINES
import com.estundnzettl.core.model.ReportBranding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Optionaler Firmen-Briefkopf fürs PDF: Logo in der Kopfzeile und eine
 * Fußzeile auf jeder Seite. Standardmäßig aus — ohne Aktivierung bleibt
 * der Bericht exakt wie bisher.
 */
@Composable
fun CompanyBrandingSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val branding = state.userData?.reportBranding ?: ReportBranding()

    fun patch(transform: (ReportBranding) -> ReportBranding) {
        viewModel.setUserData { it.copy(reportBranding = transform(it.reportBranding ?: ReportBranding())) }
    }

    val logoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                // Dekodieren + Komprimieren nicht im UI-Thread
                withContext(Dispatchers.Default) { runCatching { uriToLogoDataUrl(context, uri) } }
                    .onSuccess { dataUrl ->
                        patch { it.copy(logo = dataUrl) }
                        viewModel.showRawMessage(t.t("settings.branding.toastLogoUpdated"))
                    }
                    .onFailure { viewModel.showRawMessage(t.t("settings.branding.toastLogoError")) }
            }
        }
    }

    CollapsibleSettingsCard(
        title = t.t("settings.branding.title"),
        subtitle = t.t("settings.branding.subtitle"),
        icon = { SectionIconBadge(Icons.Filled.Business, colors.info) },
        defaultExpanded = false,
    ) {
        SettingsToggleRow(
            title = t.t("settings.branding.enable"),
            subtitle = t.t("settings.branding.enableHint"),
            checked = branding.enabled,
            accent = colors.accentStrong,
        ) { enabled -> patch { it.copy(enabled = enabled) } }

        if (branding.enabled) {
            // ── Logo ────────────────────────────────────────────
            SettingsFieldLabel(t.t("settings.branding.logo"))
            val logoBitmap = remember(branding.logo) { decodeLogoDataUrl(branding.logo) }
            // Weißer Grund wie auf dem Papier
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(72.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White)
                    .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                    .padding(10.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (logoBitmap != null) {
                    Image(
                        bitmap = logoBitmap.asImageBitmap(),
                        contentDescription = t.t("settings.branding.logoAlt"),
                        contentScale = ContentScale.Fit,
                        alignment = Alignment.CenterStart,
                        modifier = Modifier.fillMaxHeight(),
                    )
                } else {
                    Text(t.t("settings.branding.noLogo"), color = Palette.Zinc500, fontSize = 13.sp)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f)) {
                    ActionButton(
                        label = t.t(if (logoBitmap != null) "settings.branding.changeLogo" else "settings.branding.chooseLogo"),
                        tint = colors.accent,
                        small = true,
                    ) {
                        logoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    }
                }
                if (branding.logo != null) {
                    Box(Modifier.weight(1f)) {
                        ActionButton(label = t.t("settings.branding.removeLogo"), tint = colors.danger, small = true) {
                            patch { it.copy(logo = null) }
                        }
                    }
                }
            }
            Text(t.t("settings.branding.logoHint"), color = colors.textMuted, fontSize = 12.sp)

            // ── Fußzeile ────────────────────────────────────────
            // Nach einer Tipp-Pause wird der Entwurf still gespeichert (State +
            // DB, ohne Backup-/Archiv-Planung); abgeschlossen samt Planung wird
            // beim Verlassen des Felds, im Hintergrund und beim Verlassen der Seite.
            var footerValue by rememberSaveable(stateSaver = TextFieldValue.Saver) {
                mutableStateOf(TextFieldValue(branding.footer))
            }
            var syncedFooter by rememberSaveable { mutableStateOf(branding.footer) }
            var unsaved by rememberSaveable { mutableStateOf(false) }
            var truncated by remember { mutableStateOf(false) }

            fun currentFooter() = viewModel.state.value.userData?.reportBranding?.footer.orEmpty()

            // false = Profil wurde inzwischen ersetzt (Restore, Löschen, Demo) → nichts zurückschreiben
            fun pushDraft(): Boolean {
                if (currentFooter() != syncedFooter) return false
                val text = footerValue.text
                if (text != syncedFooter) {
                    syncedFooter = text
                    unsaved = true
                    viewModel.saveUserDataQuietly {
                        it.copy(reportBranding = (it.reportBranding ?: ReportBranding()).copy(footer = text))
                    }
                }
                return true
            }

            fun commitFooter() {
                if (!pushDraft()) {
                    unsaved = false
                    return
                }
                if (unsaved) {
                    unsaved = false
                    patch { it } // schließt ab: Neuberechnung + Backup-/Archiv-Planung
                }
            }

            // Externe Änderung übernehmen statt den Entwurf drüberzuschreiben
            LaunchedEffect(branding.footer) {
                if (branding.footer != syncedFooter) {
                    footerValue = TextFieldValue(branding.footer)
                    syncedFooter = branding.footer
                    unsaved = false
                }
            }
            LaunchedEffect(footerValue.text) {
                delay(300)
                pushDraft()
            }
            val lifecycleOwner = LocalLifecycleOwner.current
            DisposableEffect(lifecycleOwner) {
                val observer = LifecycleEventObserver { _, event ->
                    if (event == Lifecycle.Event.ON_STOP) commitFooter()
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose {
                    lifecycleOwner.lifecycle.removeObserver(observer)
                    commitFooter()
                }
            }

            OutlinedTextField(
                value = footerValue,
                // Gekürzt wird nur der eingefügte Teil, nie bestehender Text
                onValueChange = { value ->
                    val edit = limitReportFooterEdit(footerValue.text, value.text)
                    val cursor = edit.cursor
                    truncated = edit.truncated
                    footerValue = if (cursor == null) value else TextFieldValue(edit.text, TextRange(cursor))
                },
                label = { Text(t.t("settings.branding.footer")) },
                placeholder = { Text(t.t("settings.branding.footerPlaceholder")) },
                supportingText = {
                    Text(t.t(if (truncated) "settings.branding.footerTruncated" else "settings.branding.footerHint"))
                },
                isError = truncated,
                minLines = 2,
                maxLines = REPORT_FOOTER_MAX_LINES,
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { focus -> if (!focus.isFocused) commitFooter() },
            )
        }
    }
}
