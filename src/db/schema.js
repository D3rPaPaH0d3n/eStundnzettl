/**
 * SQLite Schema für eStundnzettl — Vollständiges Schema
 *
 * Alle Schema-Versionen und Migrations-SQL zentral verwaltet.
 */

export const SCHEMA_VERSION = 2;

export const DB_NAME = "estundnzettl";

/**
 * Schema Version 1 — nur Entries (ursprünglich)
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

export const CREATE_DATE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);
`;

/**
 * Schema Version 2 — alle Tabellen
 */
export const CREATE_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS settings (
    key           TEXT PRIMARY KEY,
    value         TEXT
  );
`;

export const CREATE_WORK_CODES_TABLE = `
  CREATE TABLE IF NOT EXISTS work_codes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    code          INTEGER NOT NULL,
    color         TEXT,
    order_index   INTEGER DEFAULT 0
  );
`;

export const CREATE_ATTACHMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS attachments (
    id            TEXT PRIMARY KEY,
    entry_id      INTEGER NOT NULL,
    type          TEXT NOT NULL,
    uri           TEXT NOT NULL,
    thumbnail     TEXT,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES entries (id) ON DELETE CASCADE
  );
`;

export const CREATE_LABEL_SUGGESTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS label_suggestions (
    label         TEXT PRIMARY KEY,
    count         INTEGER DEFAULT 1,
    last_used     TEXT
  );
`;

export const CREATE_BACKUP_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS backup_metadata (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type          TEXT NOT NULL,
    timestamp     TEXT NOT NULL,
    size_bytes    INTEGER,
    location      TEXT
  );
`;

/**
 * Migration von Version 1 auf 2
 */
export const MIGRATION_V1_TO_V2 = [
  CREATE_SETTINGS_TABLE,
  CREATE_WORK_CODES_TABLE,
  CREATE_ATTACHMENTS_TABLE,
  CREATE_LABEL_SUGGESTIONS_TABLE,
  CREATE_BACKUP_METADATA_TABLE,
];

/**
 * Gibt alle SQL-Statements zurück, die für eine frische DB (aktuelle Version) nötig sind.
 */
export function getInitSQL() {
  return [
    CREATE_ENTRIES_TABLE,
    CREATE_DATE_INDEX,
    CREATE_SETTINGS_TABLE,
    CREATE_WORK_CODES_TABLE,
    CREATE_ATTACHMENTS_TABLE,
    CREATE_LABEL_SUGGESTIONS_TABLE,
    CREATE_BACKUP_METADATA_TABLE,
  ];
}
