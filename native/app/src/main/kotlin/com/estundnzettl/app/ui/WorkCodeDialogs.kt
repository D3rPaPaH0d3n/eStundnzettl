package com.estundnzettl.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import com.estundnzettl.app.ui.theme.LocalAppColors
import com.estundnzettl.app.ui.theme.LocalI18n
import com.estundnzettl.core.calc.WorkCodeDraftError
import com.estundnzettl.core.calc.WorkCodeDraftResult
import com.estundnzettl.core.calc.canonicalWorkCodeLabel
import com.estundnzettl.core.calc.selectableWorkCodes
import com.estundnzettl.core.calc.shouldShowWorkCodeSearch
import com.estundnzettl.core.calc.workCodeName
import com.estundnzettl.core.calc.workCodeNumber
import com.estundnzettl.core.model.WorkCode

@Composable
fun WorkCodeSelectionDialog(
    workCodes: List<WorkCode>,
    selectedId: Int,
    onSelect: (Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var query by remember { mutableStateOf("") }
    val showSearch = remember(workCodes) { shouldShowWorkCodeSearch(workCodes) }
    val visibleCodes = remember(workCodes, query) { selectableWorkCodes(workCodes, query) }
    val listState = rememberLazyListState()

    LaunchedEffect(selectedId, query, visibleCodes) {
        if (visibleCodes.isEmpty()) return@LaunchedEffect
        val target = if (query.isBlank()) {
            visibleCodes.indexOfFirst { it.id == selectedId }.coerceAtLeast(0)
        } else {
            0
        }
        listState.scrollToItem(target)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.widthIn(max = 420.dp),
        title = {
            Text(t.t("entryForm.selectActivity"), fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (showSearch) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        placeholder = {
                            Text(
                                t.t("workCodes.searchPlaceholder"),
                                maxLines = 1,
                            )
                        },
                        leadingIcon = {
                            Icon(Icons.Filled.Search, contentDescription = null)
                        },
                        trailingIcon = if (query.isNotEmpty()) {
                            {
                                IconButton(onClick = { query = "" }) {
                                    Icon(
                                        Icons.Filled.Clear,
                                        contentDescription = t.t("workCodes.clearSearch"),
                                    )
                                }
                            }
                        } else {
                            null
                        },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 56.dp),
                    )
                }

                if (visibleCodes.isEmpty()) {
                    Text(
                        t.t("workCodes.noSearchResults"),
                        color = colors.textMuted,
                        modifier = Modifier.padding(vertical = 16.dp),
                    )
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 360.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        items(visibleCodes, key = { it.id }) { code ->
                            val selected = code.id == selectedId
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 48.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(
                                        if (selected) colors.accent.copy(alpha = 0.12f)
                                        else colors.surfaceVariant.copy(alpha = 0.45f),
                                    )
                                    .then(
                                        if (selected) Modifier.border(
                                            1.dp,
                                            colors.accent,
                                            RoundedCornerShape(10.dp),
                                        ) else Modifier,
                                    )
                                    .selectable(
                                        selected = selected,
                                        role = Role.RadioButton,
                                        onClick = { onSelect(code.id) },
                                    )
                                    .semantics(mergeDescendants = true) {
                                        stateDescription = t.t(
                                            if (selected) "workCodes.selected" else "workCodes.notSelected",
                                        )
                                    }
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .heightIn(min = 28.dp)
                                        .widthIn(min = 36.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(
                                            if (selected) colors.accent.copy(alpha = 0.2f)
                                            else colors.surfaceVariant,
                                        )
                                        .padding(horizontal = 7.dp, vertical = 4.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        workCodeNumber(code.id),
                                        color = if (selected) colors.accent else colors.textSecondary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                    )
                                }
                                Text(
                                    workCodeName(code),
                                    color = if (selected) colors.accent else colors.textPrimary,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                    fontSize = 14.sp,
                                    maxLines = 2,
                                    modifier = Modifier.weight(1f),
                                )
                                if (selected) {
                                    Icon(
                                        Icons.Filled.Check,
                                        contentDescription = null,
                                        tint = colors.accent,
                                        modifier = Modifier
                                            .size(20.dp)
                                            .clearAndSetSemantics { },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(t.t("common.cancel"), color = colors.accent)
            }
        },
        containerColor = colors.surface,
    )
}

@Composable
fun WorkCodeEditorDialog(
    title: String,
    initialNumber: String,
    initialName: String = "",
    numberEditable: Boolean,
    onSave: (number: String, name: String) -> WorkCodeDraftResult,
    onSaved: (WorkCode) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalAppColors.current
    val t = LocalI18n.current
    var number by remember(initialNumber) { mutableStateOf(initialNumber) }
    var name by remember(initialName) { mutableStateOf(initialName) }
    var error by remember { mutableStateOf<WorkCodeDraftError?>(null) }

    fun save() {
        val result = onSave(number, name)
        error = result.error
        result.code?.let(onSaved)
    }

    val errorText = when (error) {
        WorkCodeDraftError.INVALID_NUMBER -> t.t("workCodes.errors.invalidNumber")
        WorkCodeDraftError.RESERVED_NUMBER -> t.t("workCodes.errors.reservedNumber")
        WorkCodeDraftError.DUPLICATE_NUMBER -> t.t("workCodes.errors.duplicateNumber")
        WorkCodeDraftError.EMPTY_NAME -> t.t("workCodes.errors.emptyName")
        null -> null
    }
    val numberErrorText = errorText.takeIf {
        error == WorkCodeDraftError.INVALID_NUMBER ||
            error == WorkCodeDraftError.RESERVED_NUMBER ||
            error == WorkCodeDraftError.DUPLICATE_NUMBER
    }
    val nameErrorText = errorText.takeIf { error == WorkCodeDraftError.EMPTY_NAME }
    val preview = number.toIntOrNull()?.takeIf { it > 0 }?.let { id ->
        name.trim().takeIf { it.isNotEmpty() }?.let { canonicalWorkCodeLabel(id, it) }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.widthIn(max = 420.dp),
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = number,
                    onValueChange = {
                        if (numberEditable) number = it.filter { character -> character.isDigit() }
                    },
                    label = { Text(t.t("workCodes.codeNumber")) },
                    readOnly = !numberEditable,
                    isError = error == WorkCodeDraftError.INVALID_NUMBER ||
                        error == WorkCodeDraftError.RESERVED_NUMBER ||
                        error == WorkCodeDraftError.DUPLICATE_NUMBER,
                    supportingText = numberErrorText?.let { message ->
                        { Text(message) }
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Next,
                    ),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t.t("workCodes.activityName")) },
                    isError = error == WorkCodeDraftError.EMPTY_NAME,
                    supportingText = nameErrorText?.let { message ->
                        { Text(message) }
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { save() }),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                preview?.let {
                    Text(
                        t.t("workCodes.preview", "value" to it),
                        color = colors.textMuted,
                        fontSize = 12.sp,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { save() }) {
                Text(t.t("common.save"), color = colors.accent, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(t.t("common.cancel")) }
        },
        containerColor = colors.surface,
    )
}
