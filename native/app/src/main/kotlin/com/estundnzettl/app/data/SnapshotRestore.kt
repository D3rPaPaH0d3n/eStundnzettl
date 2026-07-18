package com.estundnzettl.app.data

import androidx.room.withTransaction
import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.app.data.db.AttachmentLabelRow
import com.estundnzettl.app.data.db.SettingRow
import com.estundnzettl.core.model.Attachment
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.WorkCode
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

/**
 * Atomare Backup-Restore-Operation — Port von replaceFullSnapshot aus
 * src/db/snapshot.ts. Felder, die null sind, werden NICHT angefasst (kein
 * implizites Löschen). Alles läuft in EINER Room-Transaktion: entweder
 * kommt das ganze Backup an oder gar nichts.
 */
data class ImportSnapshot(
    val entries: List<Entry>? = null,
    /** Roh-JSON für den Settings-Key "user". */
    val userData: JsonElement? = null,
    val workCodes: List<WorkCode>? = null,
    val attachments: List<Attachment>? = null,
    val attachmentLabels: List<String>? = null,
    /** Roh-JSON für den Settings-Key "calculationConfig". */
    val calculationConfig: JsonElement? = null,
    /** Validierte LocaleId (Settings-Key "locale"). */
    val locale: String? = null,
    /** Validiertes Theme (Settings-Key "theme"). */
    val theme: String? = null,
)

suspend fun AppDatabase.replaceFullSnapshot(snapshot: ImportSnapshot) {
    withTransaction {
        snapshot.entries?.let { entries ->
            entryDao().deleteAll()
            entryDao().insertAll(entries.map { it.toRow() })
        }

        snapshot.userData?.let { user ->
            settingsDao().put(SettingRow("user", user.toString()))
        }

        snapshot.workCodes?.let { codes ->
            workCodeDao().deleteAll()
            workCodeDao().insertAll(codes.map { it.toRow() })
        }

        snapshot.attachments?.let { attachments ->
            entryDao().deleteAllAttachments()
            attachmentDao().insertAll(attachments.map { it.toRow() })
        }

        snapshot.attachmentLabels?.let { labels ->
            attachmentLabelDao().deleteAll()
            attachmentLabelDao().insertAll(
                labels.mapIndexed { i, label -> AttachmentLabelRow(label = label, position = i) }
            )
        }

        snapshot.calculationConfig?.let { config ->
            settingsDao().put(SettingRow("calculationConfig", config.toString()))
        }

        snapshot.locale?.let { locale ->
            settingsDao().put(SettingRow("locale", JsonPrimitive(locale).toString()))
        }

        snapshot.theme?.let { theme ->
            settingsDao().put(SettingRow("theme", JsonPrimitive(theme).toString()))
        }
    }
}
