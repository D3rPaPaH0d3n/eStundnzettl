/**
 * Zentrale Typ-Definitionen für eStundnzettl.
 *
 * Diese Typen werden aus den bestehenden Zod-Schemas und Datenstrukturen
 * abgeleitet. Sie beschreiben den Ist-Zustand — keine neuen Felder oder
 * Verhaltensänderungen.
 */

// ─── Entry Types ─────────────────────────────────────────────

export type EntryType = "work" | "vacation" | "sick" | "public_holiday" | "time_comp";

/**
 * Entry IDs are generated as numbers for new app data (`generateEntryId`).
 * The union stays intentional for legacy backups/localStorage-era imports and
 * repository boundaries: import code must not coerce an entry ID independently
 * from `Attachment.entryId`, otherwise existing attachment links can break.
 *
 * Do not migrate ID shapes opportunistically. If a future schema migration ever
 * changes IDs, migrate entries and attachments together with explicit tests.
 */
export type EntryId = number | string;

export interface Entry {
  id: EntryId;
  type: EntryType;
  date: string;             // YYYY-MM-DD
  start?: string | null;    // HH:MM
  end?: string | null;      // HH:MM
  pause: number;            // minutes
  project?: string | null;
  code?: number | null;
  netDuration: number;      // minutes
}

// ─── Work Codes ──────────────────────────────────────────────

export interface WorkCode {
  id: number;
  label: string;
}

export interface WorkCodePreset {
  id: string;
  name: string;
  description: string;
  codes: WorkCode[];
}

// ─── User Data ───────────────────────────────────────────────

export interface UserData {
  name: string;
  position: string;
  photo: string | null;
  workDays: number[];       // 7 elements, index 0=Sunday, values in minutes
  company?: string;         // shown in PDF header, optional profile field
  simpleMode?: boolean;     // nur Aufzeichnung, keine Soll/Ist-Berechnung
  expertMode?: boolean;     // Hausmasta-Modus: erweiterte Einstellungen sichtbar
  workModelId?: string;     // Onboarding work-model preset (e.g. "38.5-classic")
}

// ─── Calculation Config ──────────────────────────────────────
//
// Per-User-Übersteuerung der Rechenregeln. Wird aus den Locale-
// Defaults initialisiert und kann im Onboarding-Baukasten (für
// "Eigener Plan"-User) oder im Settings-Tab "Berechnung" angepasst
// werden. Siehe src/utils/calculationConfig.ts.

export type OvertimeMode = "none" | "split" | "ueberstunden_only";
export type SickOnWorkDayMode = "cap_to_target" | "additive" | "ignore";
export type HolidayOnWorkDayMode = "cap_to_target" | "additive" | "counts_as_overtime";
export type HolidaySetMode = "locale_default" | "custom";
export type HalfDayMode = "locale_default" | "none" | "custom";

/**
 * Anzeige-Toggles fuer das exportierte und in der Vorschau gerenderte
 * PDF. Alle Felder default `true` (siehe `getDefaultPdfDisplay`); der
 * User kann einzelne Bloecke gezielt ausblenden, ohne das Layout
 * grundlegend zu aendern. Sichtbar nur im Hausmasta-Modus.
 */
export interface PdfDisplayConfig {
  /** Komplette graue Zusammenfassungs-Box am Ende der Tabelle. */
  showSummary: boolean;
  /** "Sollzeit"-Zeile in der Summary. */
  showTargetTime: boolean;
  /** "Saldo"-Zeile (Bottom Line) und taegliche Saldo-Spalte. */
  showBalance: boolean;
  /** "Mehrarbeit"/"Ueberstunden"-Untergruppe in der Summary. */
  showOvertimeSplit: boolean;
  /** Urlaubsbilanz-Block am Ende der Summary. */
  showVacationBalance: boolean;
  /** Anhaenge-Liste pro Eintrag. */
  showAttachmentsList: boolean;
  /** "Code"-Spalte in der Tabelle. */
  showWorkCodeColumn: boolean;
  /** Notizen-Block am Ende des Reports. */
  showCustomNote: boolean;
}

export interface AutoPauseRule {
  fromMinutes: number;    // Arbeitszeit-Schwelle in Minuten (z.B. 360 = 6h)
  pauseMinutes: number;   // abzuziehende Pausendauer in Minuten
}

export interface CalculationConfig {
  // --- SIMPLE (Onboarding) ---
  /** Wochensoll in Minuten, automatische Summe aus workDays (Readonly-Anzeige). */
  weeklyTargetMinutes: number;
  /** Wie werden Mehrarbeit und Überstunden unterschieden? */
  overtimeMode: OvertimeMode;
  /** Schwelle in Minuten/Woche, ab der Überstunden statt Mehrarbeit gezählt werden. */
  overtimeThresholdMinutes: number | null;
  /** Wie wird Krankenstand an einem Tag behandelt, an dem schon gearbeitet wurde? */
  sickOnWorkDayMode: SickOnWorkDayMode;

  // --- ADVANCED (Onboarding hinter "Erweitert") ---
  /** Feiertagsauswahl: Locale-Default oder individuelle Liste. */
  holidaySet: {
    mode: HolidaySetMode;
    /** MM-DD-Keys der deaktivierten Feiertage (bei mode="locale_default"). */
    disabledHolidayKeys: string[];
    /**
     * Nur bei mode="custom": frei zusammengestellte Feiertage als
     * MM-DD → Name. Ersetzt komplett die Locale-Liste. Leeres Objekt
     * bedeutet "keine Feiertage".
     */
    customHolidays?: Record<string, string>;
  };
  /** Halbtag-Regelung. */
  halfDayMode: {
    mode: HalfDayMode;
    /** MM-DD-Liste eigener Halbtage (bei mode="custom"). */
    customHalfDays: string[];
  };
  /** Wie wird ein Feiertag + Arbeit am selben Tag behandelt? */
  holidayOnWorkDayMode: HolidayOnWorkDayMode;

  // --- SETTINGS-ONLY ---
  /** Automatische Pausenabzüge ab X Arbeitsminuten. Leer = keine Auto-Pause. */
  autoPauseRules: AutoPauseRule[];
  /** Jährlicher Urlaubsanspruch in Tagen (gesetzlicher Default je nach Locale). */
  vacationAllowanceDays: number;
  /** Resturlaub (Übertrag vom Vorjahr oder aktueller Rest bei Ersteinrichtung). */
  vacationCarryoverDays: number;
  /** Optionale PDF-Anzeige-Toggles (Hausmasta). Wenn fehlt → alles AN. */
  pdfDisplay?: PdfDisplayConfig;

  // --- META ---
  configVersion: 1;
}

// ─── Timer State ─────────────────────────────────────────────

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: string | null;        // ISO string
  pauseStartTime: string | null;   // ISO string
  accumulatedPause: number;        // milliseconds
}

export interface AutoCheckoutData {
  start: Date;
  end: Date;
  pause: number;           // minutes
  isAutoCheckout: boolean;
  daysMissed: number;
}

// ─── Attachments ─────────────────────────────────────────────

export interface Attachment {
  id: string;
  /** Must match `Entry.id` exactly as imported/stored for legacy link safety. */
  entryId: EntryId;
  label: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSize: number;
  createdAt: string;        // ISO string
}

// ─── Backup ──────────────────────────────────────────────────

export interface BackupPayload {
  formatVersion?: number;
  checksum?: string;
  exportedAt?: string;
  timezone?: string;
  version?: string;
  note?: string;
  lastModified?: string;
  user?: UserData | Record<string, unknown> | null;
  entries: Entry[];
  workCodes: WorkCode[];
  attachments: Attachment[];
  attachmentLabels: string[];
  /** Per-User-Rechenkonfiguration (optional, seit v4.1). */
  calculationConfig?: CalculationConfig | null;
}

// ─── Nextcloud ───────────────────────────────────────────────

export interface NextcloudConfig {
  enabled: boolean;
  url: string;
  user: string;
  pass: string;
}

// ─── Settings ────────────────────────────────────────────────

export type Theme = "system" | "dark" | "light";

// ─── Work Models ─────────────────────────────────────────────

export interface WorkModel {
  id: string;
  label: string;
  description: string;
  days: number[];           // 7 elements
}

// ─── Period Stats ────────────────────────────────────────────

export interface PeriodStats {
  totalMinutes: number;
  targetMinutes: number;
  workDays: number;
  vacationDays: number;
  sickDays: number;
  holidayDays: number;
  timeCompDays: number;
  entries: Entry[];
}

// ─── Backup Metadata ─────────────────────────────────────────

export interface BackupMetadata {
  id: number;
  type: string | null;
  timestamp: string | null;
  size_bytes: number | null;
  location: string | null;
}

// ─── Delete Target ───────────────────────────────────────────

export interface DeleteTarget {
  type: "single" | "all";
  id?: number | string;
}

// ─── Form State (return type of useFormState) ───────────────

export interface FormState {
  formDate: string;
  setFormDate: (d: string) => void;
  entryType: string;
  setEntryType: (t: string) => void;
  startTime: string;
  setStartTime: (t: string) => void;
  endTime: string;
  setEndTime: (t: string) => void;
  pauseDuration: number;
  setPauseDuration: (n: number | ((p: number) => number)) => void;
  project: string;
  setProject: (p: string) => void;
  code: number;
  setCode: (c: number) => void;
  editingEntry: Entry | null;
  setEditingEntry: (e: Entry | null) => void;
  isLiveEntry: boolean;
  setIsLiveEntry: (b: boolean) => void;
  specialManualMode: boolean;
  setSpecialManualMode: (b: boolean) => void;
  resetForm: () => void;
  startEdit: (entry: Entry) => void;
}

// ─── Google Auth ─────────────────────────────────────────────

export interface GoogleAuthStatus {
  hasToken?: boolean;
  connected?: boolean;
  reauthRequired?: boolean;
  email?: string;
}

export interface GoogleSignInResult {
  authentication?: {
    accessToken?: string;
  };
  email?: string;
  givenName?: string;       // optional display label from native Google sign-in
}

// ─── Backup Analysis ────────────────────────────────────────

/**
 * Concrete shape produced by `analyzeBackupData` for a valid backup.
 * `applyBackup` consumes exactly this shape.
 */
export interface BackupAnalysisData {
  valid: true;
  entryCount: number;
  hasSettings: boolean;
  hasWorkCodes: boolean;
  hasAttachments: boolean;
  hasCalculationConfig: boolean;
  entries: Entry[];
  settings: Record<string, unknown> | null;
  workCodes: WorkCode[];
  attachments: Attachment[];
  attachmentLabels: string[];
  calculationConfig: Record<string, unknown> | null;
  timestamp: string | null;
  integrity: string; // "verified" | "unverified" | "mismatch" | "ok" | "missing"
}

/**
 * Discriminated return type of `analyzeBackupData`.
 * Use `if (result.isValid)` to narrow to the data-bearing branch.
 * The valid branch carries the data both flattened (legacy) and as `data`.
 */
export type BackupAnalysisResult =
  | { valid: false; isValid: false }
  | (BackupAnalysisData & { isValid: true; data: BackupAnalysisData });

// ─── PDF Archive ────────────────────────────────────────────

export interface PdfArchiveRunOptions {
  month?: number;
  year?: number;
  force?: boolean;
  /** Telemetry tag identifying which lifecycle hook triggered the run. */
  source?: "manual" | "startup" | "resume" | "auto";
}

// ─── SQL Types ──────────────────────────────────────────────

export type SqlValue = string | number | boolean | null;

// ─── Globals ─────────────────────────────────────────────────

declare global {
  const __APP_VERSION__: string;
  const __SENTRY_DSN__: string;
}
