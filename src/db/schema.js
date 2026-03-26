/**
 * SQLite Schema für eStundnzettl — Welle 1: nur Entries
 *
 * Alle Schema-Versionen und Migrations-SQL zentral verwaltet.
 */

export const SCHEMA_VERSION = 1;

export const DB_NAME = "estundnzettl";

/**
 * Initiales Schema (Version 1) — Entries-Tabelle
 *
 * Felder entsprechen 1:1 dem bestehenden Entry-Objekt:
 *   { id, type, date, start, end, pause, project, code, netDuration }
 *
 * id ist INTEGER PRIMARY KEY (der bestehende Date.now()-basierte id-Wert).
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

/**
 * Gibt alle SQL-Statements zurück, die für eine frische DB (Version 1) nötig sind.
 */
export function getInitSQL() {
  return [CREATE_ENTRIES_TABLE, CREATE_DATE_INDEX];
}
