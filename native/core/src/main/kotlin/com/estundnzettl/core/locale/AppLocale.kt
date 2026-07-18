package com.estundnzettl.core.locale

/**
 * Country-Kategorie — für UI-Gruppierung und grobe Logik-Zweige.
 */
enum class LocaleCountry(val wireName: String) {
    NEUTRAL("neutral"),
    AT("at"),
    DE("de"),
    CH("ch"),
}

/**
 * Eine Locale beschreibt alle länder/regions-spezifischen Regeln, die die
 * Berechnungs- und Anzeige-Logik der App beeinflussen.
 * Port von src/locales/types.ts. ("AppLocale", damit kein Konflikt mit
 * java.util.Locale entsteht.)
 */
data class AppLocale(
    /** Eindeutige ID, z.B. "neutral", "at", "de-by", "ch-zh". */
    val id: String,

    /** Country-Gruppe — für Gruppierung im UI und grobe Switches. */
    val country: LocaleCountry,

    /** Optionaler Regions-Name (z.B. "Bayern"), nur für Regional-Varianten. */
    val region: String? = null,

    /** Anzeige-Name für das UI (z.B. "Österreich" oder "Deutschland (Bayern)"). */
    val name: String,

    /** Kurzbeschreibung für das UI (z.B. in Onboarding-Step). */
    val description: String,

    /**
     * Liefert alle gesetzlichen Feiertage für ein Jahr als Map
     * `YYYY-MM-DD` → Name. Neutral gibt eine leere Map zurück.
     */
    val getHolidays: (Int) -> Map<String, String>,

    /**
     * Datumssuffixe (`MM-DD`), die als Halbtage gelten (z.B. "12-24").
     * An diesen Tagen wird das Tagessoll halbiert. Leer bei Neutral.
     */
    val halfDays: List<String>,

    /** Ob die Mehrarbeit/Überstunden-Aufspaltung aktiv ist. */
    val enableOvertimeSplit: Boolean,

    /**
     * Wochengrenze in Minuten, ab der Überstunden beginnen (statt
     * Mehrarbeit). null für Neutral. 2400 = 40h für AT und DE.
     */
    val weeklyLimitMinutes: Int?,

    /**
     * Ob Krank-Einträge bei gemischten Tagen (Arbeit + Krank) automatisch
     * bis zum Tagessoll gekappt werden sollen.
     */
    val enableSickAdjustment: Boolean,

    /**
     * Default-Arbeitstage für einen neuen User dieser Locale.
     * 7-Element-Liste [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten.
     */
    val defaultWorkDays: List<Int>,
)
