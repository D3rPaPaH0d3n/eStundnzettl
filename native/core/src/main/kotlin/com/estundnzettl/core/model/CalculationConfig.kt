package com.estundnzettl.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class OvertimeMode(val wireName: String) {
    @SerialName("none") NONE("none"),
    @SerialName("split") SPLIT("split"),
    @SerialName("ueberstunden_only") UEBERSTUNDEN_ONLY("ueberstunden_only");

    companion object {
        fun fromWireOrNull(value: String?): OvertimeMode? =
            entries.firstOrNull { it.wireName == value }
    }
}

@Serializable
enum class SickOnWorkDayMode(val wireName: String) {
    @SerialName("cap_to_target") CAP_TO_TARGET("cap_to_target"),
    @SerialName("additive") ADDITIVE("additive"),
    @SerialName("ignore") IGNORE("ignore");

    companion object {
        fun fromWireOrNull(value: String?): SickOnWorkDayMode? =
            entries.firstOrNull { it.wireName == value }
    }
}

@Serializable
enum class HolidayOnWorkDayMode(val wireName: String) {
    @SerialName("cap_to_target") CAP_TO_TARGET("cap_to_target"),
    @SerialName("additive") ADDITIVE("additive"),
    @SerialName("counts_as_overtime") COUNTS_AS_OVERTIME("counts_as_overtime");

    companion object {
        fun fromWireOrNull(value: String?): HolidayOnWorkDayMode? =
            entries.firstOrNull { it.wireName == value }
    }
}

@Serializable
enum class HolidaySetMode(val wireName: String) {
    @SerialName("locale_default") LOCALE_DEFAULT("locale_default"),
    @SerialName("custom") CUSTOM("custom");

    companion object {
        fun fromWireOrNull(value: String?): HolidaySetMode? =
            entries.firstOrNull { it.wireName == value }
    }
}

@Serializable
enum class HalfDayMode(val wireName: String) {
    @SerialName("locale_default") LOCALE_DEFAULT("locale_default"),
    @SerialName("none") NONE("none"),
    @SerialName("custom") CUSTOM("custom");

    companion object {
        fun fromWireOrNull(value: String?): HalfDayMode? =
            entries.firstOrNull { it.wireName == value }
    }
}

/**
 * Anzeige-Toggles fuer das exportierte und in der Vorschau gerenderte PDF.
 * Alle Felder default `true`; der User kann einzelne Bloecke gezielt
 * ausblenden. Sichtbar nur im Hausmasta-Modus.
 */
@Serializable
data class PdfDisplayConfig(
    /** Komplette graue Zusammenfassungs-Box am Ende der Tabelle. */
    val showSummary: Boolean = true,
    /** "Sollzeit"-Zeile in der Summary. */
    val showTargetTime: Boolean = true,
    /** "Saldo"-Zeile (Bottom Line) und taegliche Saldo-Spalte. */
    val showBalance: Boolean = true,
    /** "Mehrarbeit"/"Ueberstunden"-Untergruppe in der Summary. */
    val showOvertimeSplit: Boolean = true,
    /** Urlaubsbilanz-Block am Ende der Summary. */
    val showVacationBalance: Boolean = true,
    /** Anhaenge-Liste pro Eintrag. */
    val showAttachmentsList: Boolean = true,
    /** "Code"-Spalte in der Tabelle. */
    val showWorkCodeColumn: Boolean = true,
    /** Notizen-Block am Ende des Reports. */
    val showCustomNote: Boolean = true,
)

@Serializable
data class AutoPauseRule(
    /** Arbeitszeit-Schwelle in Minuten (z.B. 360 = 6h) */
    val fromMinutes: Int,
    /** abzuziehende Pausendauer in Minuten */
    val pauseMinutes: Int,
)

@Serializable
data class HolidaySetConfig(
    val mode: HolidaySetMode = HolidaySetMode.LOCALE_DEFAULT,
    /** MM-DD-Keys der deaktivierten Feiertage (bei mode=LOCALE_DEFAULT). */
    val disabledHolidayKeys: List<String> = emptyList(),
    /**
     * Nur bei mode=CUSTOM: frei zusammengestellte Feiertage als MM-DD → Name.
     * Ersetzt komplett die Locale-Liste. Leere Map bedeutet "keine Feiertage".
     */
    val customHolidays: Map<String, String>? = null,
)

@Serializable
data class HalfDayConfig(
    val mode: HalfDayMode = HalfDayMode.LOCALE_DEFAULT,
    /** MM-DD-Liste eigener Halbtage (bei mode=CUSTOM). */
    val customHalfDays: List<String> = emptyList(),
)

/**
 * Per-User-Übersteuerung der Rechenregeln. Wird aus den Locale-Defaults
 * initialisiert und kann im Onboarding-Baukasten oder im Settings-Tab
 * "Berechnung" angepasst werden.
 */
@Serializable
data class CalculationConfig(
    // --- SIMPLE (Onboarding) ---
    /** Wochensoll in Minuten, automatische Summe aus workDays (Readonly-Anzeige). */
    val weeklyTargetMinutes: Int,
    /** Wie werden Mehrarbeit und Überstunden unterschieden? */
    val overtimeMode: OvertimeMode,
    /** Schwelle in Minuten/Woche, ab der Überstunden statt Mehrarbeit gezählt werden. */
    val overtimeThresholdMinutes: Int?,
    /** Wie wird Krankenstand an einem Tag behandelt, an dem schon gearbeitet wurde? */
    val sickOnWorkDayMode: SickOnWorkDayMode,

    // --- ADVANCED (Onboarding hinter "Erweitert") ---
    val holidaySet: HolidaySetConfig,
    val halfDayMode: HalfDayConfig,
    /** Wie wird ein Feiertag + Arbeit am selben Tag behandelt? */
    val holidayOnWorkDayMode: HolidayOnWorkDayMode,

    // --- SETTINGS-ONLY ---
    /** Automatische Pausenabzüge ab X Arbeitsminuten. Leer = keine Auto-Pause. */
    val autoPauseRules: List<AutoPauseRule> = emptyList(),
    /** Jährlicher Urlaubsanspruch in Tagen (gesetzlicher Default je nach Locale). */
    val vacationAllowanceDays: Int,
    /** Resturlaub (Übertrag vom Vorjahr oder aktueller Rest bei Ersteinrichtung). */
    val vacationCarryoverDays: Int = 0,
    /** Optionale PDF-Anzeige-Toggles (Hausmasta). Wenn fehlt → alles AN. */
    val pdfDisplay: PdfDisplayConfig? = null,

    // --- META ---
    val configVersion: Int = 1,
)
