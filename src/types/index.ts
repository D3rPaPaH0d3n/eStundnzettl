/**
 * Zentrale Typ-Definitionen für eStundnzettl.
 *
 * Diese Typen werden aus den bestehenden Zod-Schemas und Datenstrukturen
 * abgeleitet. Sie beschreiben den Ist-Zustand — keine neuen Felder oder
 * Verhaltensänderungen.
 */

// ─── Entry Types ─────────────────────────────────────────────

export type EntryType = "work" | "vacation" | "sick" | "public_holiday" | "time_comp";

export interface Entry {
  id: number | string;
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
  simpleMode?: boolean;     // nur Aufzeichnung, keine Soll/Ist-Berechnung
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
  entryId: number | string;
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
  type: string;
  timestamp: string;
  size_bytes: number;
  location: string;
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
}

// ─── Backup Analysis ────────────────────────────────────────

export interface BackupAnalysisResult {
  integrity: "ok" | "mismatch" | "missing";
  entries: Entry[];
  workCodes: WorkCode[];
  attachments: Attachment[];
  attachmentLabels: string[];
  settings: Record<string, unknown> | null;
  timestamp: string | null;
  newEntries: number;
  updatedEntries: number;
  unchangedEntries: number;
  newCodes: number;
  newAttachments: number;
  conflicts: Entry[];
}

// ─── PDF Archive ────────────────────────────────────────────

export interface PdfArchiveRunOptions {
  month?: number;
  year?: number;
  force?: boolean;
}

// ─── html2pdf Options ───────────────────────────────────────

export interface Html2PdfOptions {
  margin?: number | number[];
  filename?: string;
  image?: { type: string; quality: number };
  html2canvas?: {
    scale?: number;
    useCORS?: boolean;
    logging?: boolean;
    windowWidth?: number;
    windowHeight?: number;
    [key: string]: unknown;
  };
  jsPDF?: {
    unit?: string;
    format?: string;
    orientation?: string;
    compress?: boolean;
    [key: string]: unknown;
  };
  pagebreak?: { mode?: string | string[] };
}

// ─── SQL Types ──────────────────────────────────────────────

export type SqlValue = string | number | boolean | null;

// ─── Globals ─────────────────────────────────────────────────

declare global {
  const __APP_VERSION__: string;
  const __SENTRY_DSN__: string;
}
