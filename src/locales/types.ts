// ============================================================
// LOCALE TYPES
// ============================================================
// Zentrale Typ-Definitionen für das Locale-System.
// Jede Locale kapselt die länderspezifische Berechnungslogik,
// damit die App neutral, österreichisch oder deutsch betrieben
// werden kann - ohne die Berechnungen in timeCalculations oder
// den UI-Code zu duplizieren.

/**
 * Eindeutige ID einer Locale.
 * - 'neutral' — keine Feiertage, keine Halbtage, kein MA/ÜS-Split
 * - 'at'      — Österreich (AZG, 38,5h/40h)
 * - 'de-{bundesland}' — Deutschland mit Bundesland-Varianten
 */
export type LocaleId =
  | 'neutral'
  | 'at'
  | 'de-bw' // Baden-Württemberg
  | 'de-by' // Bayern
  | 'de-be' // Berlin
  | 'de-bb' // Brandenburg
  | 'de-hb' // Bremen
  | 'de-hh' // Hamburg
  | 'de-he' // Hessen
  | 'de-mv' // Mecklenburg-Vorpommern
  | 'de-ni' // Niedersachsen
  | 'de-nw' // Nordrhein-Westfalen
  | 'de-rp' // Rheinland-Pfalz
  | 'de-sl' // Saarland
  | 'de-sn' // Sachsen
  | 'de-st' // Sachsen-Anhalt
  | 'de-sh' // Schleswig-Holstein
  | 'de-th'; // Thüringen

/**
 * Country-Kategorie — für UI-Gruppierung und grobe Logik-Zweige.
 */
export type LocaleCountry = 'neutral' | 'at' | 'de';

/**
 * Eine Locale beschreibt alle länder/regions-spezifischen Regeln,
 * die die Berechnungs- und Anzeige-Logik der App beeinflussen.
 */
export interface Locale {
  /** Eindeutige ID (siehe LocaleId). */
  id: LocaleId;

  /** Country-Gruppe — für Gruppierung im UI und grobe Switches. */
  country: LocaleCountry;

  /**
   * Optionaler Regions-Name (z.B. "Bayern").
   * Nur gesetzt für Bundesland-Varianten wie 'de-by'.
   */
  region?: string;

  /** Anzeige-Name für das UI (z.B. "Österreich" oder "Deutschland (Bayern)"). */
  name: string;

  /** Kurzbeschreibung für das UI (z.B. in Onboarding-Step). */
  description: string;

  /**
   * Liefert alle gesetzlichen Feiertage für ein Jahr als Map `YYYY-MM-DD` → Name.
   * Neutral gibt ein leeres Objekt zurück.
   */
  getHolidays: (year: number) => Record<string, string>;

  /**
   * Datumssuffixe (`MM-DD`), die als Halbtage gelten
   * (z.B. `"12-24"` für den 24.12.).
   * An diesen Tagen wird das Tagessoll halbiert. Leer bei Neutral.
   */
  halfDays: string[];

  /**
   * Ob die Mehrarbeit/Überstunden-Aufspaltung aktiv ist.
   * true  → calculateOvertimeSplit liefert { mehrarbeit, ueberstunden }
   * false → nur Saldo wird angezeigt (Neutral)
   */
  enableOvertimeSplit: boolean;

  /**
   * Wochengrenze in Minuten, ab der Überstunden beginnen (statt Mehrarbeit).
   * null für Neutral (keine Grenze, kein Split).
   * 2400 = 40h für AT und DE.
   */
  weeklyLimitMinutes: number | null;

  /**
   * Ob Krank-Einträge bei gemischten Tagen (Arbeit + Krank) automatisch
   * bis zum Tagessoll aufgefüllt werden sollen.
   * true  → adjustSickDuration greift (AT, DE)
   * false → Krankstunden bleiben 1:1 (Neutral)
   */
  enableSickAdjustment: boolean;

  /**
   * Default-Arbeitstage für einen neuen User dieser Locale.
   * 7-Element-Array [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten.
   * Wird im Onboarding als Startwert im WorkSchedule-Step verwendet.
   */
  defaultWorkDays: number[];
}
