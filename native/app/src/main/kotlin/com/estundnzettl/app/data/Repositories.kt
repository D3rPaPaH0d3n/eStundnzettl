package com.estundnzettl.app.data

import com.estundnzettl.app.data.db.AppDatabase
import com.estundnzettl.core.calc.computeExpectedNetDuration
import com.estundnzettl.core.locale.AppLocale
import com.estundnzettl.core.model.CalculationConfig
import com.estundnzettl.core.model.Entry
import com.estundnzettl.core.model.EntryId
import com.estundnzettl.core.model.UserData
import com.estundnzettl.core.model.WorkCode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Domain-Repositories über den Room-DAOs — API-Semantik entspricht den
 * Repositories der TS-App (src/db/repositories/).
 */

class EntriesRepository(private val db: AppDatabase) {

    /** Alle Entries, sortiert nach Datum absteigend (neueste zuerst). */
    fun observeAll(): Flow<List<Entry>> =
        db.entryDao().observeAll().map { rows -> rows.map { it.toDomain() } }

    suspend fun getAll(): List<Entry> = db.entryDao().getAll().map { it.toDomain() }

    suspend fun getById(id: Long): Entry? = db.entryDao().getById(id)?.toDomain()

    suspend fun upsert(entry: Entry) = db.entryDao().upsert(entry.toRow())

    /** Entry + zugehörige Attachments atomar löschen. */
    suspend fun delete(id: Long) = db.entryDao().deleteWithAttachments(id)

    suspend fun deleteAll() = db.entryDao().deleteAllWithAttachments()

    /**
     * Neuberechnung aller Entries — Port von recalculateAllEntries aus
     * timeCalculations.ts. Aktualisiert nur Einträge mit Abweichung.
     */
    suspend fun recalculateAll(
        userData: UserData?,
        locale: AppLocale? = null,
        config: CalculationConfig? = null,
    ): RecalculationResult {
        val entries = getAll()
        var fixed = 0
        for (entry in entries) {
            val expected = computeExpectedNetDuration(entry, userData, locale, config) ?: continue
            if (expected != entry.netDuration) {
                upsert(entry.copy(netDuration = expected))
                fixed++
            }
        }
        return RecalculationResult(total = entries.size, fixed = fixed)
    }

    data class RecalculationResult(val total: Int, val fixed: Int)
}

class WorkCodesRepository(private val db: AppDatabase) {

    fun observeAll(): Flow<List<WorkCode>> =
        db.workCodeDao().observeAll().map { rows -> rows.map { it.toDomain() } }

    suspend fun getAll(): List<WorkCode> = db.workCodeDao().getAll().map { it.toDomain() }

    suspend fun upsert(code: WorkCode) = db.workCodeDao().upsert(code.toRow())

    suspend fun delete(id: Int) = db.workCodeDao().deleteById(id.toLong())

    suspend fun replaceAll(codes: List<WorkCode>) =
        db.workCodeDao().replaceAll(codes.map { it.toRow() })
}

class AttachmentsRepository(private val db: AppDatabase) {

    suspend fun getAll() = db.attachmentDao().getAll().map { it.toDomain() }

    suspend fun getForEntry(entryId: EntryId) = when (entryId) {
        is EntryId.Numeric -> db.attachmentDao().getForEntry(entryId.value)
        is EntryId.Text -> db.attachmentDao().getForEntry(entryId.value.toLong())
    }.map { it.toDomain() }

    suspend fun upsert(attachment: com.estundnzettl.core.model.Attachment) =
        db.attachmentDao().upsert(attachment.toRow())

    suspend fun delete(id: String) = db.attachmentDao().deleteById(id)

    /** MRU-Liste der letzten 20 Labels (position ASC = neueste zuerst). */
    suspend fun getLabelSuggestions(): List<String> =
        db.attachmentLabelDao().getAll().map { it.label }

    /** Label an Position 0 einreihen (leere Labels werden ignoriert). */
    suspend fun pushLabelSuggestion(label: String) {
        val trimmed = label.trim()
        if (trimmed.isEmpty()) return
        db.attachmentLabelDao().pushLabel(trimmed)
    }
}
