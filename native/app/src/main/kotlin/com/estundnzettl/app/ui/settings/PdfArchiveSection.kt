package com.estundnzettl.app.ui.settings

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.data.PdfArchiveManager
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Automatisches PDF-Archiv — Port von PdfArchiveSettings.tsx.
 * Nextcloud/Google Drive erscheinen als Ziele, lassen sich aber erst
 * nach der Cloud-Anbindung (Phase 5) aktivieren — Tippen zeigt den
 * gleichen Hinweis-Toast wie die Web-App im nicht-verbundenen Zustand.
 */
@Composable
fun PdfArchiveSection(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var enabled by remember { mutableStateOf(false) }
    var localTarget by remember { mutableStateOf(false) }
    var lastRun by remember { mutableStateOf("") }
    var lastError by remember { mutableStateOf("") }
    var isRunning by remember { mutableStateOf(false) }

    fun toast(message: String) = Toast.makeText(context, message, Toast.LENGTH_SHORT).show()

    suspend fun reloadStatus() {
        lastRun = viewModel.settings.getString(PdfArchiveManager.KEY_LAST_RUN) ?: ""
        lastError = viewModel.settings.getString(PdfArchiveManager.KEY_LAST_ERROR) ?: ""
    }

    LaunchedEffect(Unit) {
        enabled = viewModel.settings.getBoolean(PdfArchiveManager.KEY_ENABLED)
        localTarget = viewModel.settings.getBoolean(PdfArchiveManager.KEY_LOCAL)
        reloadStatus()
    }

    fun formatLastRun(dateStr: String): String {
        if (dateStr.isEmpty()) return t.t("settings.pdfArchive.lastRunNever")
        return try {
            val pattern = if (t.language == "en") "MM/dd/yyyy" else "dd.MM.yyyy"
            LocalDate.parse(dateStr).format(DateTimeFormatter.ofPattern(pattern))
        } catch (_: Exception) {
            dateStr
        }
    }

    CollapsibleSettingsCard(
        title = t.t("settings.pdfArchive.header"),
        subtitle = t.t("settings.pdfArchive.subtitle"),
        icon = { SectionIconBadge(Icons.Filled.PictureAsPdf, colors.special) },
        defaultExpanded = false,
    ) {
        SettingsToggleRow(
            title = t.t("settings.pdfArchive.header"),
            subtitle = t.t("settings.pdfArchive.subtitle"),
            checked = enabled,
            accent = colors.special,
        ) { next ->
            enabled = next
            scope.launch {
                viewModel.settings.setBoolean(PdfArchiveManager.KEY_ENABLED, next)
                // Default: Lokal auto-aktivieren, damit beim ersten
                // Einschalten gleich etwas passiert (wie die Web-App)
                if (next && !localTarget) {
                    localTarget = true
                    viewModel.settings.setBoolean(PdfArchiveManager.KEY_LOCAL, true)
                }
            }
        }

        if (enabled) {
            // ── Ziel: Lokaler Ordner ────────────────────────────
            TargetRow(
                icon = { Icon(Icons.Filled.Storage, contentDescription = null, tint = if (localTarget) colors.positive else colors.textFaint) },
            ) {
                SettingsToggleRow(
                    title = t.t("settings.pdfArchive.local.title"),
                    subtitle = t.t("settings.pdfArchive.local.path"),
                    checked = localTarget,
                    accent = colors.special,
                ) { next ->
                    localTarget = next
                    scope.launch { viewModel.settings.setBoolean(PdfArchiveManager.KEY_LOCAL, next) }
                }
            }

            // ── Ziel: Nextcloud (erst nach Phase 5 verbindbar) ──
            TargetRow(
                icon = { Icon(Icons.Filled.Cloud, contentDescription = null, tint = colors.textFaint) },
            ) {
                SettingsToggleRow(
                    title = t.t("settings.pdfArchive.nextcloud.title"),
                    subtitle = t.t("settings.pdfArchive.nextcloud.requiresConnect"),
                    checked = false,
                    accent = colors.special,
                ) {
                    toast(t.t("settings.pdfArchive.toast.ncNotConnected"))
                }
            }

            // ── Ziel: Google Drive (erst nach Phase 5 verbindbar) ──
            TargetRow(
                icon = { Icon(Icons.Filled.Cloud, contentDescription = null, tint = colors.textFaint) },
            ) {
                SettingsToggleRow(
                    title = t.t("settings.pdfArchive.gdrive.title"),
                    subtitle = t.t("settings.pdfArchive.gdrive.info"),
                    checked = false,
                    accent = colors.special,
                ) {
                    toast(t.t("settings.pdfArchive.toast.gdriveConnectFirst"))
                }
            }

            // ── Status + manueller Lauf ─────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "✓ " + t.t("settings.pdfArchive.lastRun", "date" to formatLastRun(lastRun)),
                        color = colors.textMuted,
                        fontSize = 12.sp,
                    )
                    if (lastError.isNotEmpty()) {
                        Text(
                            text = "⚠ $lastError",
                            color = colors.danger,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                }
            }
            ActionButton(
                label = if (isRunning) "…" else t.t("settings.pdfArchive.runNow"),
                tint = colors.special,
            ) {
                if (isRunning) return@ActionButton
                if (!enabled) {
                    toast(t.t("settings.pdfArchive.toast.archiveDisabled"))
                    return@ActionButton
                }
                if (!localTarget) {
                    toast(t.t("settings.pdfArchive.toast.pickTarget"))
                    return@ActionButton
                }
                isRunning = true
                toast(t.t("settings.pdfArchive.toast.generating"))
                scope.launch {
                    try {
                        val res = viewModel.runPdfArchiveNow()
                        when {
                            !res.ok -> toast(
                                t.t(
                                    "settings.pdfArchive.toast.notRun",
                                    "reason" to (res.reason ?: res.error
                                        ?: t.t("settings.pdfArchive.toast.unknownReason")),
                                ),
                            )
                            res.anyFailure -> toast(t.t("settings.pdfArchive.toast.partiallyFailed"))
                            res.anyRealUpload -> toast(t.t("settings.pdfArchive.toast.updated"))
                            else -> toast(t.t("settings.pdfArchive.toast.upToDate"))
                        }
                    } catch (e: Exception) {
                        toast(t.t("settings.pdfArchive.toast.genericError", "message" to (e.message ?: "")))
                    } finally {
                        reloadStatus()
                        isRunning = false
                    }
                }
            }
        }
    }
}

/** Grauer Ziel-Container (Pendant zu den bg-zinc-100-Zeilen). */
@Composable
private fun TargetRow(
    icon: @Composable () -> Unit,
    content: @Composable () -> Unit,
) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surfaceVariant)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(modifier = Modifier.padding(top = 2.dp)) { icon() }
        Box(modifier = Modifier.weight(1f)) { content() }
    }
}
