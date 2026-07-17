package com.estundnzettl.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.estundnzettl.app.MainViewModel
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale as JavaLocale

/** "1,2 MB" / "34 KB" — Port von formatFileSize. */
fun formatFileSize(bytes: Long): String {
    if (bytes <= 0) return "0 KB"
    if (bytes < 1024 * 1024) return "${maxOf(1L, Math.round(bytes / 1024.0))} KB"
    return "%.1f MB".format(bytes / (1024.0 * 1024.0))
}

/**
 * Dokumente pro Eintrag — Port von AttachmentManager.tsx als
 * ModalBottomSheet: Datei wählen (SAF), Bezeichnung mit MRU-Vorschlägen,
 * Liste der vorhandenen Anhänge mit Löschen.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttachmentSheet(viewModel: MainViewModel) {
    val s by viewModel.state.collectAsState()
    val entry = s.attachmentEntry ?: return
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var pickedUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var pickedName by remember { mutableStateOf("") }
    var label by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }

    val entryAttachments = s.attachments
        .filter { it.entryId == entry.id }
        .sortedBy { it.createdAt }

    // MRU-Vorschläge, gefiltert wie getLabelSuggestions (max. 6)
    val suggestions = remember(label, s.labelSuggestions) {
        val q = label.trim().lowercase()
        if (q.isEmpty()) s.labelSuggestions.take(6)
        else s.labelSuggestions.filter { it.lowercase().contains(q) }.take(6)
    }

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri != null) {
            pickedUri = uri
            var name = ""
            context.contentResolver.query(uri, null, null, null, null)?.use { c ->
                val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (c.moveToFirst() && idx >= 0) name = c.getString(idx) ?: ""
            }
            pickedName = name
            if (label.isBlank() && name.isNotEmpty()) {
                label = name.substringBeforeLast('.')
            }
        }
    }

    fun toast(message: String) = viewModel.showRawMessage(message)

    val javaLocale = if (t.language == "en") JavaLocale.ENGLISH else JavaLocale.GERMAN
    val dateLabel = remember(entry.date, t.language) {
        val d = LocalDate.parse(entry.date)
        val weekday = d.dayOfWeek.getDisplayName(TextStyle.FULL, javaLocale)
        val pattern = if (t.language == "en") "MM/dd/yyyy" else "dd.MM.yyyy"
        "$weekday, ${d.format(DateTimeFormatter.ofPattern(pattern))}"
    }

    ModalBottomSheet(
        onDismissRequest = { viewModel.closeAttachments() },
        containerColor = colors.background,
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 32.dp),
        ) {
            item {
                Column {
                    Text(
                        t.t("attachments.title"),
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                    )
                    Text(dateLabel, color = colors.textMuted, fontSize = 12.sp)
                }
            }

            // ── Neues Dokument ──────────────────────────────────
            item {
                AppCard {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(
                            t.t("attachments.fieldDocument").uppercase(javaLocale),
                            color = colors.textMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.surfaceVariant)
                                .clickable {
                                    filePicker.launch(
                                        arrayOf("application/pdf", "image/jpeg", "image/png", "image/webp"),
                                    )
                                }
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Filled.UploadFile, contentDescription = null, tint = colors.accent)
                            Text(
                                if (pickedName.isEmpty()) "PDF / JPG / PNG / WEBP" else pickedName,
                                color = if (pickedName.isEmpty()) colors.textMuted else colors.textPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                            )
                        }

                        Text(
                            t.t("attachments.fieldLabel").uppercase(javaLocale),
                            color = colors.textMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        )
                        OutlinedTextField(
                            value = label,
                            onValueChange = { label = it },
                            placeholder = { Text(t.t("attachments.placeholder")) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        if (suggestions.isNotEmpty()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                suggestions.take(3).forEach { suggestion ->
                                    Text(
                                        suggestion,
                                        color = colors.textSecondary,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(50))
                                            .background(colors.surfaceVariant)
                                            .clickable { label = suggestion }
                                            .padding(horizontal = 12.dp, vertical = 6.dp),
                                    )
                                }
                            }
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.accentStrong)
                                .clickable(enabled = !saving) {
                                    val uri = pickedUri
                                    if (uri == null) {
                                        toast(t.t("attachments.toast.selectFile"))
                                        return@clickable
                                    }
                                    if (label.isBlank()) {
                                        toast(t.t("attachments.toast.labelRequired"))
                                        return@clickable
                                    }
                                    saving = true
                                    scope.launch {
                                        try {
                                            viewModel.addAttachment(entry.id, uri, label)
                                            Haptics.light(context)
                                            toast(t.t("attachments.toast.added"))
                                            pickedUri = null
                                            pickedName = ""
                                            label = ""
                                        } catch (e: com.estundnzettl.app.AttachmentValidationException) {
                                            toast(t.t(e.translationKey))
                                        } catch (_: Exception) {
                                            toast(t.t("attachments.toast.addError"))
                                        } finally {
                                            saving = false
                                        }
                                    }
                                }
                                .padding(vertical = 12.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Filled.Add, contentDescription = null,
                                tint = androidx.compose.ui.graphics.Color.White,
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                if (saving) t.t("attachments.saving") else t.t("attachments.addButton"),
                                color = androidx.compose.ui.graphics.Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                modifier = Modifier.padding(start = 6.dp),
                            )
                        }
                    }
                }
            }

            // ── Vorhandene Dokumente ────────────────────────────
            item {
                Text(
                    t.t("attachments.existingTitle").uppercase(javaLocale),
                    color = colors.textMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                )
            }

            if (entryAttachments.isEmpty()) {
                item {
                    AppCard {
                        Text(
                            t.t("attachments.empty"),
                            color = colors.textMuted, fontSize = 13.sp,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            } else {
                items(entryAttachments, key = { it.id }) { attachment ->
                    AppCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                if (attachment.mimeType.startsWith("image/")) Icons.Filled.Image else Icons.Filled.Description,
                                contentDescription = null,
                                tint = colors.accent,
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    attachment.label,
                                    color = colors.textPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp, maxLines = 1,
                                )
                                Text(attachment.fileName, color = colors.textMuted, fontSize = 12.sp, maxLines = 1)
                                Text(formatFileSize(attachment.fileSize), color = colors.textFaint, fontSize = 11.sp)
                            }
                            IconButton(onClick = {
                                scope.launch {
                                    try {
                                        viewModel.removeAttachment(attachment.id)
                                        Haptics.light(context)
                                        toast(t.t("attachments.toast.deleted"))
                                    } catch (_: Exception) {
                                        toast(t.t("attachments.toast.deleteError"))
                                    }
                                }
                            }) {
                                Icon(Icons.Filled.Delete, contentDescription = null, tint = colors.danger)
                            }
                        }
                    }
                }
            }
        }
    }
}
