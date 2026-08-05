package com.estundnzettl.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.estundnzettl.app.ui.WorkCodeEditorDialog
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.core.calc.WorkCodeDraftResult
import com.estundnzettl.core.calc.nextAvailableWorkCodeId
import com.estundnzettl.core.calc.workCodeName
import com.estundnzettl.core.calc.workCodeNumber
import com.estundnzettl.core.model.WORK_CODE_PRESETS
import com.estundnzettl.core.model.WorkCode

/** Native, centered management flow for activity codes. */
@Composable
fun WorkCodeManagerDialog(
    workCodes: List<WorkCode>,
    onAdd: (String, String) -> WorkCodeDraftResult,
    onUpdate: (Int, String) -> WorkCodeDraftResult,
    onDelete: (Int) -> Unit,
    onLoadPreset: (String) -> Boolean,
    onClearAll: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current

    var addOpen by remember { mutableStateOf(false) }
    var editTarget by remember { mutableStateOf<WorkCode?>(null) }
    var showPresetDialog by remember { mutableStateOf(false) }
    var pendingPresetId by remember { mutableStateOf<String?>(null) }
    var showClearAllWarning by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.widthIn(max = 520.dp),
        title = { Text(t.t("workCodes.title"), fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(colors.accent.copy(alpha = 0.12f))
                        .clickable(role = Role.Button) { addOpen = true }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, tint = colors.accent)
                    Text(
                        t.t("workCodes.addTitle"),
                        color = colors.accent,
                        fontWeight = FontWeight.Bold,
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
                        items(workCodes.sortedBy { it.id }, key = { it.id }) { code ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 48.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(colors.surfaceVariant.copy(alpha = 0.5f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    modifier = Modifier
                                        .heightIn(min = 28.dp)
                                        .widthIn(min = 36.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(colors.accent.copy(alpha = 0.14f))
                                        .padding(horizontal = 7.dp, vertical = 4.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        workCodeNumber(code.id),
                                        color = colors.accent,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                    )
                                }
                                Text(
                                    workCodeName(code),
                                    color = colors.textPrimary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    maxLines = 2,
                                    modifier = Modifier.weight(1f),
                                )
                                IconButton(onClick = { editTarget = code }) {
                                    Icon(
                                        Icons.Filled.Edit,
                                        contentDescription = "${t.t("workCodes.editCode")}: " +
                                            "${workCodeNumber(code.id)} ${workCodeName(code)}",
                                        tint = colors.textFaint,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                                IconButton(onClick = { onDelete(code.id) }) {
                                    Icon(
                                        Icons.Filled.Delete,
                                        contentDescription = "${t.t("common.delete")}: " +
                                            "${workCodeNumber(code.id)} ${workCodeName(code)}",
                                        tint = colors.danger,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                            }
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        ActionButton(label = t.t("workCodes.loadPreset"), tint = colors.info) {
                            showPresetDialog = true
                        }
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        ActionButton(label = t.t("workCodes.deleteAll"), tint = colors.danger) {
                            showClearAllWarning = true
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(t.t("common.close"), color = colors.accent)
            }
        },
        containerColor = colors.surface,
    )

    if (addOpen) {
        WorkCodeEditorDialog(
            title = t.t("workCodes.addTitle"),
            initialNumber = nextAvailableWorkCodeId(workCodes).toString(),
            numberEditable = true,
            onSave = onAdd,
            onSaved = { addOpen = false },
            onDismiss = { addOpen = false },
        )
    }

    editTarget?.let { target ->
        WorkCodeEditorDialog(
            title = t.t("workCodes.editTitle"),
            initialNumber = target.id.toString(),
            initialName = workCodeName(target),
            numberEditable = false,
            onSave = { _, name -> onUpdate(target.id, name) },
            onSaved = { editTarget = null },
            onDismiss = { editTarget = null },
        )
    }

    if (showPresetDialog) {
        WorkCodePresetDialog(
            onSelect = { presetId ->
                showPresetDialog = false
                pendingPresetId = presetId
            },
            onDismiss = { showPresetDialog = false },
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
                }) {
                    Text(t.t("workCodes.presetReplaceWarning.confirm"), color = colors.danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingPresetId = null }) { Text(t.t("common.cancel")) }
            },
            containerColor = colors.surface,
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
                }) {
                    Text(t.t("workCodes.deleteAllWarning.confirm"), color = colors.danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearAllWarning = false }) { Text(t.t("common.cancel")) }
            },
            containerColor = colors.surface,
        )
    }
}

@Composable
private fun WorkCodePresetDialog(
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(t.t("workCodes.loadPreset"), fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(modifier = Modifier.heightIn(max = 360.dp)) {
                items(WORK_CODE_PRESETS, key = { it.id }) { preset ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp)
                            .clickable { onSelect(preset.id) }
                            .padding(horizontal = 8.dp, vertical = 10.dp),
                    ) {
                        Text(preset.name, color = colors.textPrimary, fontWeight = FontWeight.Bold)
                        Text(
                            t.t("workCodes.presetCodesCount", "count" to preset.codes.size),
                            color = colors.textMuted,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(t.t("common.cancel")) }
        },
        containerColor = colors.surface,
    )
}
