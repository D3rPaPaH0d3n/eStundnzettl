package com.estundnzettl.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Entry IDs are numeric for new app data (see [generateEntryId] semantics of
 * the TS app), but legacy backups from the localStorage era may carry string
 * IDs. The sealed type keeps both shapes intact so attachment links from
 * imported backups never break — the same invariant as `EntryId = number |
 * string` in the TS codebase.
 */
sealed class EntryId {
    data class Numeric(val value: Long) : EntryId() {
        override fun toString(): String = value.toString()
    }

    data class Text(val value: String) : EntryId() {
        override fun toString(): String = value
    }

    companion object {
        fun of(value: Long): EntryId = Numeric(value)
        fun of(value: String): EntryId = Text(value)
    }
}

@Serializable
enum class EntryType(val wireName: String) {
    @SerialName("work") WORK("work"),
    @SerialName("vacation") VACATION("vacation"),
    @SerialName("sick") SICK("sick"),
    @SerialName("public_holiday") PUBLIC_HOLIDAY("public_holiday"),
    @SerialName("time_comp") TIME_COMP("time_comp");

    companion object {
        /** Unknown/empty values fall back to WORK, matching `row.type || "work"`. */
        fun fromWire(value: String?): EntryType =
            entries.firstOrNull { it.wireName == value } ?: WORK
    }
}

data class Entry(
    val id: EntryId,
    val type: EntryType = EntryType.WORK,
    /** YYYY-MM-DD */
    val date: String,
    /** HH:MM */
    val start: String? = null,
    /** HH:MM */
    val end: String? = null,
    /** minutes */
    val pause: Int = 0,
    val project: String? = null,
    val code: Int? = null,
    /** minutes */
    val netDuration: Int = 0,
)

data class WorkCode(val id: Int, val label: String)

data class WorkCodePreset(
    val id: String,
    val name: String,
    val description: String,
    val codes: List<WorkCode>,
)

data class UserData(
    val name: String = "",
    val position: String = "",
    val photo: String? = null,
    /** 7 elements, index 0=Sunday, values in minutes. */
    val workDays: List<Int>? = null,
    /** shown in PDF header, optional profile field */
    val company: String? = null,
    /** nur Aufzeichnung, keine Soll/Ist-Berechnung */
    val simpleMode: Boolean = false,
    /** Optionales wiederkehrendes Monatsziel in Minuten, nur im einfachen Modus aktiv. */
    val monthlyTargetMinutes: Int? = null,
    /** Hausmasta-Modus: erweiterte Einstellungen sichtbar */
    val expertMode: Boolean = false,
    /** Onboarding work-model preset (e.g. "38.5-classic") */
    val workModelId: String? = null,
)

data class WorkModel(
    val id: String,
    val label: String,
    val description: String,
    /** 7 elements, index 0=Sunday */
    val days: List<Int>,
)

data class Attachment(
    val id: String,
    /** Must match [Entry.id] exactly as imported/stored for legacy link safety. */
    val entryId: EntryId,
    val label: String,
    val fileName: String,
    val mimeType: String,
    val storagePath: String,
    val fileSize: Long,
    /** ISO string */
    val createdAt: String,
)
