/**
 * SQLite Schema für eStundnzettl — Welle 1+2: Entries, Settings, WorkCodes
 *
 * Alle Schema-Versionen und Migrations-SQL zentral verwaltet.
 */

export const SCHEMA_VERSION = 2;

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
  ];
}
