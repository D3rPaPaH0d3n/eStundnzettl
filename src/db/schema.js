/**
 * SQLite Schema für eStundnzettl — Welle 1+2+3: Entries, Settings, WorkCodes, Attachments
 *
 * Alle Schema-Versionen und Migrations-SQL zentral verwaltet.
 */

export const SCHEMA_VERSION = 3;

export const DB_NAME = "estundnzettl";

// ─── Welle 1: Entries ────────────────────────────────────────

/**
 * Entries-Tabelle (Welle 1)
 * Felder entsprechen 1:1 dem bestehenden Entry-Objekt.
 */
export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id            INTEGER PRIMARY KEY,
    type          TEXT    NOT NULL DEFAULT 'work',
    date          TEXT    NOT NULL,
    start         TEXT,
    end           TEXT,
    pause         INTEGER NOT NULL DEFAULT 0,
    project       TEXT,
    code          INTEGER,
    netDuration   INTEGER NOT NULL DEFAULT 0
  );
`;

/** Index für schnelle Monats-/Datums-Abfragen */
export const CREATE_DATE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);
`;

// ─── Welle 2: Settings ──────────────────────────────────────

/**
 * Settings-Tabelle (Welle 2) — Key-Value-Store
 *
 * Speichert alle App-Settings als Key/Value-Paare.
 * Values werden als JSON-Strings gespeichert (auch für primitive Werte).
 *
 * Keys entsprechen den bestehenden STORAGE_KEYS:
 *   - "user"                → JSON-Objekt { name, position, photo, workDays }
 *   - "theme"               → "system" | "dark" | "light"
 *   - "cloud_sync_enabled"  → "true" | "false"
 *   - "local_backup_enabled"→ "true" | "false"
 */
export const CREATE_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

// ─── Welle 2: Work Codes ────────────────────────────────────

/**
 * WorkCodes-Tabelle (Welle 2)
 * Speichert Tätigkeitscodes 1:1 zum bestehenden { id, label } Format.
 */
export const CREATE_WORK_CODES_TABLE = `
  CREATE TABLE IF NOT EXISTS work_codes (
    id    INTEGER PRIMARY KEY,
    label TEXT    NOT NULL
  );
`;

// ─── Welle 3: Attachments ───────────────────────────────────

/**
 * Attachments-Tabelle (Welle 3)
 *
 * Speichert Metadaten zu Dateianhängen. Die eigentlichen Dateien liegen
 * im Capacitor Filesystem (Directory.Data/attachments/). Hier nur Metadaten.
 *
 * entryId verweist logisch auf entries.id (kein FOREIGN KEY Constraint,
 * damit Attachments auch bei entry-unabhängigen Operationen stabil bleiben).
 */
export const CREATE_ATTACHMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS attachments (
    id          TEXT    PRIMARY KEY,
    entryId     INTEGER NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    fileName    TEXT    NOT NULL DEFAULT '',
    mimeType    TEXT    NOT NULL DEFAULT '',
    storagePath TEXT    NOT NULL DEFAULT '',
    fileSize    INTEGER NOT NULL DEFAULT 0,
    createdAt   TEXT    NOT NULL DEFAULT ''
  );
`;

/** Index für schnellen Lookup nach entryId */
export const CREATE_ATTACHMENTS_ENTRY_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_attachments_entry ON attachments (entryId);
`;

/**
 * Label-Suggestions-Tabelle (Welle 3)
 *
 * Speichert die letzten 20 verwendeten Attachment-Labels
 * als MRU-Liste (Most Recently Used).
 * position: 0 = neueste, aufsteigend.
 */
export const CREATE_ATTACHMENT_LABELS_TABLE = `
  CREATE TABLE IF NOT EXISTS attachment_labels (
    label    TEXT    PRIMARY KEY,
    position INTEGER NOT NULL DEFAULT 0
  );
`;

// ─── Welle 4: Backup-Metadaten ──────────────────────────────

/**
 * Backup-Metadaten-Tabelle (Welle 4)
 *
 * Speichert Informationen über durchgeführte Backups (Typ, Zeitpunkt, Größe, Ort).
 */
export const CREATE_BACKUP_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS backup_metadata (
    id          INTEGER PRIMARY KEY,
    type        TEXT,
    timestamp   TEXT,
    size_bytes  INTEGER,
    location    TEXT
  );
`;

/**
 * Gibt alle SQL-Statements zurück, die für die aktuelle Schema-Version nötig sind.
 * Alle Statements nutzen IF NOT EXISTS → idempotent & safe für bestehende DBs.
 */
export function getInitSQL() {
  return [
    // Welle 1
    CREATE_ENTRIES_TABLE,
    CREATE_DATE_INDEX,
    // Welle 2
    CREATE_SETTINGS_TABLE,
    CREATE_WORK_CODES_TABLE,
    // Welle 3
    CREATE_ATTACHMENTS_TABLE,
    CREATE_ATTACHMENTS_ENTRY_INDEX,
    CREATE_ATTACHMENT_LABELS_TABLE,
    // Welle 4
    CREATE_BACKUP_METADATA_TABLE,
  ];
}
