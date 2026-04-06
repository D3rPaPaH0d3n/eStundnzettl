/**
 * Migration 001 — Initial Schema (Baseline)
 *
 * Entspricht dem bisher über `getInitSQL()` in schema.js ausgelieferten Stand:
 * entries, settings, work_codes, attachments (+ MRU-Labels), backup_metadata.
 *
 * Bestehende Installationen: Die Tabellen existieren bereits aus dem alten
 * `CREATE TABLE IF NOT EXISTS`-Flow. Die Migration ist idempotent (alle
 * Statements nutzen IF NOT EXISTS), der Runner markiert sie zusätzlich als
 * "bereits angewendet", um sie in Zukunft gar nicht erst auszuführen.
 */

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS entries (
    id            INTEGER PRIMARY KEY,
    type          TEXT    NOT NULL DEFAULT 'work',
    date          TEXT    NOT NULL,
    start         TEXT,
    end           TEXT,
    pause         INTEGER NOT NULL DEFAULT 0,
    project       TEXT,
    code          INTEGER,
    netDuration   INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);`,
  `CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS work_codes (
    id    INTEGER PRIMARY KEY,
    label TEXT    NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id          TEXT    PRIMARY KEY,
    entryId     INTEGER NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    fileName    TEXT    NOT NULL DEFAULT '',
    mimeType    TEXT    NOT NULL DEFAULT '',
    storagePath TEXT    NOT NULL DEFAULT '',
    fileSize    INTEGER NOT NULL DEFAULT 0,
    createdAt   TEXT    NOT NULL DEFAULT ''
  );`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_entry ON attachments (entryId);`,
  `CREATE TABLE IF NOT EXISTS attachment_labels (
    label    TEXT    PRIMARY KEY,
    position INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS backup_metadata (
    id          INTEGER PRIMARY KEY,
    type        TEXT,
    timestamp   TEXT,
    size_bytes  INTEGER,
    location    TEXT
  );`,
];

export const migration001InitialSchema = {
  version: 1,
  name: "initial_schema",
  up: async (execute) => {
    for (const sql of STATEMENTS) {
      await execute(sql);
    }
  },
};
