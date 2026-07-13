package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.AttachmentRow
import com.estundnzettl.app.data.db.EntryRow
import com.estundnzettl.app.data.db.WorkCodeRow
import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.EntryType
import com.estundnzettl.core.model.WorkCode

/**
 * Mapping zwischen Room-Rows und den Domain-Modellen des Core-Moduls.
 * Normalisierung entspricht rowToEntry in entriesRepo.ts (leere Strings
 * werden zu null, fehlender Typ wird zu "work").
 */

fun EntryRow.toDomain(): Entry = Entry(
    id = EntryId.of(id),
    type = EntryType.fromWire(type),
    date = date,
    start = start?.takeIf { it.isNotEmpty() },
    end = end?.takeIf { it.isNotEmpty() },
    pause = pause,
    project = project?.takeIf { it.isNotEmpty() },
    code = code,
    netDuration = netDuration,
)

fun Entry.toRow(): EntryRow = EntryRow(
    id = when (val entryId = id) {
        is EntryId.Numeric -> entryId.value
        // Legacy-String-IDs aus alten Backups sind numerische Strings; die
        // INTEGER-PRIMARY-KEY-Spalte der Alt-App erzwingt das bereits.
        is EntryId.Text -> entryId.value.toLong()
    },
    type = type.wireName,
    date = date,
    start = start,
    end = end,
    pause = pause,
    project = project,
    code = code,
    netDuration = netDuration,
)

fun WorkCodeRow.toDomain(): WorkCode = WorkCode(id = id.toInt(), label = label)

fun WorkCode.toRow(): WorkCodeRow = WorkCodeRow(id = id.toLong(), label = label)

/**
 * entryId ist in der Alt-DB eine INTEGER-Spalte — String-IDs aus
 * Legacy-Backups sind dort zwangsläufig numerisch (SQLite koerziert bzw.
 * lehnt ab). Nicht-numerische IDs werfen hier wie beim TS-Insert.
 */
private fun EntryId.toLongId(): Long = when (this) {
    is EntryId.Numeric -> value
    is EntryId.Text -> value.toLong()
}

fun AttachmentRow.toDomain(): Attachment = Attachment(
    id = id,
    entryId = EntryId.of(entryId),
    label = label,
    fileName = fileName,
    mimeType = mimeType,
    storagePath = storagePath,
    fileSize = fileSize,
    createdAt = createdAt,
)

fun Attachment.toRow(): AttachmentRow = AttachmentRow(
    id = id,
    entryId = entryId.toLongId(),
    label = label,
    fileName = fileName,
    mimeType = mimeType,
    storagePath = storagePath,
    fileSize = fileSize,
    createdAt = createdAt,
)
