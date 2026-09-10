package com.estundnzettl.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.data.DiagnosticsReport
import com.estundnzettl.app.data.DriveProbe
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.app.ui.theme.Palette

/**
 * Diagnose-Karte im Hausmasta-Modus — bewusst zurückhaltend: sie erscheint
 * nur bei aktiviertem Expertenmodus, startet eingeklappt und in gedeckter
 * Farbe. Sie ist ausschließlich lesend; alle angezeigten Werte kommen aus
 * [com.estundnzettl.app.data.DiagnosticsCollector] und sind dort einzeln
 * freigegeben (Whitelist), damit keine Zugangsdaten auf dem Bildschirm
 * landen.
 */
@Composable
fun DiagnosticsSection(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    if (state.userData?.expertMode != true) return

    CollapsibleSettingsCard(
        title = t.t("settings.diagnostics.title"),
        subtitle = t.t("settings.diagnostics.subtitle"),
        icon = { SectionIconBadge(Icons.Outlined.BugReport, colors.textMuted) },
        defaultExpanded = false,
    ) {
        // Die Karte lädt erst, wenn sie tatsächlich aufgeklappt wird —
        // der Inhalt wird von CollapsibleSettingsCard nur dann komponiert.
        LaunchedEffect(Unit) {
            if (state.diagnostics.report == null) viewModel.loadDiagnostics()
        }

        val report = state.diagnostics.report
        if (report == null) {
            Text(
                t.t(if (state.diagnostics.loading) "common.loading" else "settings.diagnostics.empty"),
                color = colors.textMuted,
                fontSize = 12.sp,
            )
        } else {
            DiagnosticsBody(report)
        }

        DriveProbeBlock(viewModel, state.diagnostics.drive)

        Text(
            t.t("settings.diagnostics.privacyHint"),
            color = colors.textFaint,
            fontSize = 11.sp,
        )

        ActionButton(
            label = t.t("settings.diagnostics.refresh"),
            tint = colors.textMuted,
            outlined = true,
            small = true,
            enabled = !state.diagnostics.loading,
        ) {
            viewModel.loadDiagnostics()
        }
    }
}

@Composable
private fun DiagnosticsBody(report: DiagnosticsReport) {
    val t = LocalI18n.current

    fun flag(value: Boolean) = t.t(if (value) "settings.diagnostics.yes" else "settings.diagnostics.no")
    fun orDash(value: String?) = value?.takeIf { it.isNotBlank() } ?: "—"

    DiagnosticsGroup(t.t("settings.diagnostics.group.app")) {
        DiagnosticsRow(t.t("settings.diagnostics.app.version"), report.appVersion)
        DiagnosticsRow(t.t("settings.diagnostics.app.versionCode"), report.versionCode.toString())
        DiagnosticsRow(t.t("settings.diagnostics.app.dbSchema"), report.dbSchemaVersion.toString())
    }

    DiagnosticsGroup(t.t("settings.diagnostics.group.data")) {
        DiagnosticsRow(t.t("settings.diagnostics.data.entries"), report.entryCount.toString())
        DiagnosticsRow(
            t.t("settings.diagnostics.data.range"),
            if (report.oldestEntryDate == null) "—"
            else "${report.oldestEntryDate} … ${orDash(report.newestEntryDate)}",
        )
        DiagnosticsRow(t.t("settings.diagnostics.data.workCodes"), report.workCodeCount.toString())
        DiagnosticsRow(t.t("settings.diagnostics.data.attachments"), report.attachmentCount.toString())
    }

    DiagnosticsGroup(t.t("settings.diagnostics.group.backup")) {
        DiagnosticsRow(t.t("settings.diagnostics.backup.cloudSync"), flag(report.cloudSyncEnabled))
        DiagnosticsRow(t.t("settings.diagnostics.backup.cloudLast"), orDash(report.cloudLastSuccess))
        DiagnosticsRow(t.t("settings.diagnostics.backup.failCount"), report.cloudFailCount.toString())
        if (report.cloudBackoffUntil != null) {
            DiagnosticsRow(t.t("settings.diagnostics.backup.backoffUntil"), report.cloudBackoffUntil)
        }
        if (report.cloudReconnectRequired) {
            DiagnosticsRow(
                t.t("settings.diagnostics.backup.reconnect"),
                flag(true),
                warn = true,
            )
        }
        DiagnosticsRow(t.t("settings.diagnostics.backup.googleAccount"), orDash(report.googleAccount))
        DiagnosticsRow(t.t("settings.diagnostics.backup.localEnabled"), flag(report.localBackupEnabled))
        DiagnosticsRow(t.t("settings.diagnostics.backup.localLast"), orDash(report.localLastSuccess))
        DiagnosticsRow(t.t("settings.diagnostics.backup.nextcloudEnabled"), flag(report.nextcloudEnabled))
        DiagnosticsRow(t.t("settings.diagnostics.backup.nextcloudLast"), orDash(report.nextcloudLastSuccess))
        DiagnosticsRow(t.t("settings.diagnostics.backup.nextcloudUser"), orDash(report.nextcloudUser))
        DiagnosticsRow(t.t("settings.diagnostics.backup.secretSet"), flag(report.nextcloudSecretSet))
    }

    DiagnosticsGroup(t.t("settings.diagnostics.group.local")) {
        if (report.localBackupFiles.isEmpty()) {
            DiagnosticsRow(t.t("settings.diagnostics.local.none"), "—")
        } else {
            report.localBackupFiles.forEach { file ->
                DiagnosticsRow(file.name, "${file.modified} · ${formatBytes(file.sizeBytes)}")
            }
        }
    }
}

@Composable
private fun DriveProbeBlock(viewModel: MainViewModel, probe: DriveProbe) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    DiagnosticsGroup(t.t("settings.diagnostics.group.drive")) {
        when (probe) {
            DriveProbe.Idle -> ActionButton(
                label = t.t("settings.diagnostics.drive.check"),
                tint = colors.textMuted,
                outlined = true,
                small = true,
            ) {
                viewModel.probeGoogleDriveFiles()
            }

            DriveProbe.Loading -> Text(
                t.t("settings.diagnostics.drive.checking"),
                color = colors.textMuted,
                fontSize = 12.sp,
            )

            is DriveProbe.Failed -> Text(
                t.t(probe.message),
                color = colors.danger,
                fontSize = 12.sp,
            )

            is DriveProbe.Loaded -> {
                if (probe.files.isEmpty()) {
                    DiagnosticsRow(t.t("settings.diagnostics.drive.none"), "—")
                } else {
                    probe.files.forEach { file ->
                        DiagnosticsRow(
                            file.name,
                            listOfNotNull(
                                com.estundnzettl.app.data.formatTimestamp(file.modifiedTime),
                                file.sizeBytes?.let { formatBytes(it) },
                            ).joinToString(" · ").ifEmpty { "—" },
                        )
                    }
                }
                // Der eigentliche Zweck dieser Abfrage: Drive erlaubt
                // mehrere Dateien gleichen Namens. Genau dann zeigen
                // Backup und Restore auf verschiedene Stände.
                probe.duplicates.forEach { (name, count) ->
                    Text(
                        t.t(
                            "settings.diagnostics.drive.duplicateWarning",
                            "name" to name,
                            "count" to count,
                        ),
                        color = Palette.Amber600,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun DiagnosticsGroup(title: String, content: @Composable () -> Unit) {
    val colors = LocalAppColors.current
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            title.uppercase(),
            color = colors.textFaint,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(colors.surfaceVariant.copy(alpha = 0.5f))
                .border(1.dp, colors.borderSubtle, RoundedCornerShape(10.dp))
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            content()
        }
    }
}

@Composable
private fun DiagnosticsRow(label: String, value: String, warn: Boolean = false) {
    val colors = LocalAppColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            label,
            color = colors.textMuted,
            fontSize = 11.sp,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            color = if (warn) Palette.Amber600 else colors.textSecondary,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
        )
    }
}

private fun formatBytes(bytes: Long): String = when {
    bytes >= 1024 * 1024 -> "%.1f MB".format(bytes / (1024.0 * 1024.0))
    bytes >= 1024 -> "%.1f kB".format(bytes / 1024.0)
    else -> "$bytes B"
}
