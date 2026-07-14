package com.estundnzettl.app.ui.settings

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.data.AutoBackupManager
import com.estundnzettl.app.data.SettingsRepository
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Cloud-Backup-Bereich innerhalb der "Backup & Export"-Karte —
 * Port des Nextcloud-/Local-/Status-Teils von BackupSettings.tsx.
 * Google Drive erscheint als Platzhalter, bis die OAuth-Anbindung
 * der nativen App eingerichtet ist.
 */
@Composable
fun CloudBackupContent(viewModel: MainViewModel) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val state by viewModel.state.collectAsState()
    val nc = state.nextcloud

    var serverUrl by remember { mutableStateOf("") }
    var localEnabled by remember { mutableStateOf(false) }
    var lastBackup by remember { mutableStateOf("") }
    var ncLastError by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var refreshTick by remember { mutableStateOf(0) }

    fun toast(message: String) = viewModel.showRawMessage(message)

    LaunchedEffect(refreshTick, nc.connected) {
        localEnabled = viewModel.settings.getBoolean(SettingsRepository.Keys.LOCAL_BACKUP_ENABLED)
        lastBackup = viewModel.settings.getString(AutoBackupManager.KEY_LAST_BACKUP) ?: ""
        ncLastError = viewModel.settings.getString(AutoBackupManager.KEY_NC_LAST_ERROR) ?: ""
    }

    fun formatLastBackup(): String {
        if (lastBackup.isEmpty()) return t.t("settings.backup.last.never")
        return try {
            val time = Instant.parse(lastBackup).atZone(ZoneId.systemDefault())
            val pattern = if (t.language == "en") "MM/dd/yyyy HH:mm" else "dd.MM.yyyy HH:mm"
            t.t("settings.backup.last.lastAt", "time" to time.format(DateTimeFormatter.ofPattern(pattern)))
        } catch (_: Exception) {
            lastBackup
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {

        // ── Google Drive ────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                if (state.googleDrive.backupConnected) Icons.Filled.CloudDone else Icons.Filled.Cloud,
                contentDescription = null,
                tint = if (state.googleDrive.backupConnected) colors.positive else colors.textFaint,
            )
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Google Drive", color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                if (state.googleDrive.backupConnected) {
                    Text(
                        t.t("settings.backup.gdrive.connectedAs", "label" to state.googleDrive.backupEmail),
                        color = colors.positive, fontSize = 12.sp,
                    )
                    Text(
                        t.t("settings.backup.gdrive.activeAppData"),
                        color = colors.textMuted, fontSize = 12.sp,
                    )
                    ActionButton(label = t.t("settings.backup.gdrive.disconnect"), tint = colors.danger) {
                        viewModel.disconnectGoogleDrive(forPdfArchive = false)
                        refreshTick++
                    }
                } else {
                    Text(
                        t.t("settings.backup.gdrive.notConnected"),
                        color = colors.textMuted, fontSize = 12.sp,
                    )
                    ActionButton(label = t.t("settings.backup.gdrive.connect"), tint = colors.accent) {
                        viewModel.connectGoogleDrive(forPdfArchive = false)
                    }
                }
            }
        }

        // ── Nextcloud ───────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                if (nc.connected) Icons.Filled.CloudDone else Icons.Filled.Cloud,
                contentDescription = null,
                tint = if (nc.connected) colors.positive else colors.textFaint,
            )
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Nextcloud", color = colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)

                when {
                    nc.connected -> {
                        Text(
                            t.t("settings.backup.nextcloud.connectedAs", "user" to nc.user),
                            color = colors.positive, fontSize = 12.sp,
                        )
                        if (ncLastError.isNotEmpty()) {
                            Text(
                                t.t("settings.backup.warning.nextcloudWithError", "error" to ncLastError),
                                color = colors.danger, fontSize = 12.sp,
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.weight(1f)) {
                                ActionButton(label = t.t("settings.backup.nextcloud.testConnection"), tint = colors.info) {
                                    viewModel.testNextcloud()
                                }
                            }
                            Box(modifier = Modifier.weight(1f)) {
                                ActionButton(label = t.t("settings.backup.nextcloud.disconnect"), tint = colors.danger) {
                                    viewModel.disconnectNextcloud()
                                    refreshTick++
                                }
                            }
                        }
                    }

                    nc.connecting -> {
                        Text(
                            t.t("settings.backup.nextcloud.pollingTitle"),
                            color = colors.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                        )
                        Text(
                            t.t("settings.backup.nextcloud.pollingHint"),
                            color = colors.textMuted, fontSize = 12.sp,
                        )
                        ActionButton(label = t.t("common.cancel"), tint = colors.textPrimary) {
                            viewModel.cancelNextcloudConnect()
                        }
                    }

                    else -> {
                        Text(
                            t.t("settings.backup.nextcloud.notConfigured"),
                            color = colors.textMuted, fontSize = 12.sp,
                        )
                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = { serverUrl = it },
                            label = { Text(t.t("settings.backup.nextcloud.serverUrlLabel")) },
                            placeholder = { Text(t.t("settings.backup.nextcloud.serverUrlPlaceholder")) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        ActionButton(label = t.t("settings.backup.nextcloud.connectButton"), tint = colors.accent) {
                            if (serverUrl.isBlank()) {
                                toast(t.t("settings.backup.toast.ncEnterUrl"))
                                return@ActionButton
                            }
                            scope.launch {
                                try {
                                    val loginUrl = viewModel.nextcloudInitiate(serverUrl)
                                    CustomTabsIntent.Builder().build()
                                        .launchUrl(context, Uri.parse(loginUrl))
                                } catch (e: Exception) {
                                    toast(
                                        t.t(
                                            "settings.backup.toast.nextcloudLoginFailedWith",
                                            "message" to (e.message ?: ""),
                                        ),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── Lokales Backup ──────────────────────────────────────
        SettingsToggleRow(
            title = t.t("settings.backup.local.title"),
            subtitle = if (localEnabled) t.t("settings.backup.local.activeDaily") else t.t("settings.backup.local.notConfigured"),
            checked = localEnabled,
            accent = colors.accentStrong,
            icon = { Icon(Icons.Filled.Folder, contentDescription = null, tint = if (localEnabled) colors.positive else colors.textFaint) },
        ) { next ->
            localEnabled = next
            viewModel.setLocalBackupEnabled(next)
        }

        // ── Status + Jetzt sichern ──────────────────────────────
        Text(formatLastBackup(), color = colors.textMuted, fontSize = 12.sp)
        ActionButton(
            label = if (saving) t.t("settings.backup.manual.saving") else t.t("settings.backup.manual.saveNow"),
            tint = colors.accentStrong,
        ) {
            if (saving) return@ActionButton
            saving = true
            scope.launch {
                try {
                    val outcome = viewModel.manualBackup()
                    if (outcome.anySucceeded) {
                        toast(t.t("toasts.autoBackup.completed"))
                    } else {
                        toast(t.t("toasts.autoBackup.failed"))
                    }
                } catch (e: Exception) {
                    toast(e.message ?: t.t("toasts.autoBackup.failed"))
                } finally {
                    saving = false
                    refreshTick++
                }
            }
        }
    }
}
