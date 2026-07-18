package com.estundnzettl.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.core.model.WORK_CODE_PRESETS
import com.estundnzettl.core.model.WorkCode

/**
 * Tätigkeitscode-Verwaltung — Port von WorkCodeManager.tsx: Liste mit
 * Bearbeiten/Löschen, neuen Code anlegen, Preset laden (mit Warnung),
 * alle löschen (mit Warnung).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkCodeManagerDialog(
    workCodes: List<WorkCode>,
    onAdd: (String) -> Boolean,
    onUpdate: (Int, String) -> Boolean,
    onDelete: (Int) -> Unit,
    onLoadPreset: (String) -> Boolean,
    onClearAll: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    var newCodeLabel by remember { mutableStateOf("") }
    var editTarget by remember { mutableStateOf<WorkCode?>(null) }
    var showPresetSheet by remember { mutableStateOf(false) }
    var pendingPresetId by remember { mutableStateOf<String?>(null) }
    var showClearAllWarning by remember { mutableStateOf(false) }

    // Code-Label bearbeiten
    editTarget?.let { target ->
        var editValue by remember(target) { mutableStateOf(target.label) }
        AlertDialog(
            onDismissRequest = { editTarget = null },
            title = { Text(target.label, maxLines = 1) },
            text = {
                OutlinedTextField(
                    value = editValue,
                    onValueChange = { editValue = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    onUpdate(target.id, editValue)
                    editTarget = null
                }) { Text(t.t("common.save"), color = colors.accent) }
            },
            dismissButton = {
                TextButton(onClick = { editTarget = null }) { Text(t.t("common.cancel")) }
            },
        )
    }

    if (showPresetSheet) {
        OptionSheet(
            title = t.t("workCodes.loadPreset"),
            options = WORK_CODE_PRESETS.map { preset ->
                preset.id to "${preset.name} — " +
                    t.t("workCodes.presetCodesCount", "count" to preset.codes.size)
            },
            selected = "",
            onSelect = { id ->
                showPresetSheet = false
                pendingPresetId = id
            },
            onDismiss = { showPresetSheet = false },
        )
    }

    pendingPresetId?.let { presetId ->
        AlertDialog(
            onDismissRequest = { pendingPresetId = null },
            title = { Text(t.t("workCodes.presetReplaceWarning.title")) },
            text = { Text(t.t("workCodes.presetReplaceWarning.message")) },
            confirmButton = {
                TextButton(onClick = {
                    onLoadPreset(presetId)
                    pendingPresetId = null
                }) { Text(t.t("workCodes.presetReplaceWarning.confirm"), color = colors.danger) }
            },
            dismissButton = {
                TextButton(onClick = { pendingPresetId = null }) { Text(t.t("common.cancel")) }
            },
        )
    }

    if (showClearAllWarning) {
        AlertDialog(
            onDismissRequest = { showClearAllWarning = false },
            title = { Text(t.t("workCodes.deleteAllWarning.title")) },
            text = { Text(t.t("workCodes.deleteAllWarning.message")) },
            confirmButton = {
                TextButton(onClick = {
                    onClearAll()
                    showClearAllWarning = false
                }) { Text(t.t("workCodes.deleteAllWarning.confirm"), color = colors.danger) }
            },
            dismissButton = {
                TextButton(onClick = { showClearAllWarning = false }) { Text(t.t("common.cancel")) }
            },
        )
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(t.t("workCodes.title"), fontWeight = FontWeight.Bold, fontSize = 17.sp)

            // Neuen Code anlegen
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newCodeLabel,
                    onValueChange = { newCodeLabel = it },
                    placeholder = { Text(t.t("workCodes.newCodePlaceholder")) },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    Icons.Filled.Add, contentDescription = t.t("common.save"), tint = Color.White,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(colors.accentStrong)
                        .clickable {
                            if (newCodeLabel.trim().isNotEmpty()) {
                                onAdd(newCodeLabel.trim())
                                newCodeLabel = ""
                            }
                        }
                        .padding(12.dp),
                )
            }

            if (workCodes.isEmpty()) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                ) {
                    Text(t.t("workCodes.empty"), color = colors.textMuted, fontWeight = FontWeight.Bold)
                    Text(t.t("workCodes.emptyHint"), color = colors.textFaint, fontSize = 12.sp)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 320.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    items(workCodes, key = { it.id }) { code ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(colors.surfaceVariant.copy(alpha = 0.5f))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                code.label,
                                color = colors.textPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                modifier = Modifier.weight(1f),
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(
                                    Icons.Filled.Edit, contentDescription = t.t("common.save"),
                                    tint = colors.textFaint,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .clickable { editTarget = code },
                                )
                                Icon(
                                    Icons.Filled.Delete, contentDescription = t.t("common.delete"),
                                    tint = colors.danger,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .clickable { onDelete(code.id) },
                                )
                            }
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 24.dp)) {
                androidx.compose.foundation.layout.Box(modifier = Modifier.weight(1f)) {
                    ActionButton(label = t.t("workCodes.loadPreset"), tint = colors.info) {
                        showPresetSheet = true
                    }
                }
                androidx.compose.foundation.layout.Box(modifier = Modifier.weight(1f)) {
                    ActionButton(label = t.t("workCodes.deleteAll"), tint = colors.danger) {
                        showClearAllWarning = true
                    }
                }
            }
        }
    }
}
