/**
 * entriesRepo.js — CRUD-Operationen für Entries via SQLite
 *
 * Alle Methoden geben Promises zurück.
 * Bei SQLite-Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute, executeSet } from "../database";
import type { TimeEntry } from "../../types";

export interface EntryRow {
  id: number;
  type: string;
  date: string;
  start: string | null;
  end: string | null;
  pause: number;
  project: string | null;
  code: number | null;
  netDuration: number;
}

export interface EntryInput {
  id: number;
  type?: string;
  date: string;
  start?: string | null;
  end?: string | null;
  pause?: number;
  project?: string | null;
  code?: number | null;
  netDuration?: number;
}

/**
 * Alle Entries laden, sortiert nach Datum absteigend (neueste zuerst).
 */
export async function getAllEntries(): Promise<TimeEntry[]> {
  const rows = await query("SELECT * FROM entries ORDER BY date DESC, id DESC");
  return rows.map(rowToEntry);
}

/**
 * Einzelnen Entry per ID laden.
 */
export async function getEntryById(id: number): Promise<TimeEntry | null> {
  const rows = await query("SELECT * FROM entries WHERE id = ?", [id]);
  return rows.length > 0 ? rowToEntry(rows[0]) : null;
}

/**
 * Neuen Entry einfügen.
 */
export async function insertEntry(entry: EntryInput): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO entries (id, type, date, start, end, pause, project, code, netDuration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.type || "work",
      entry.date,
      entry.start ?? null,
      entry.end ?? null,
      entry.pause ?? 0,
      entry.project ?? null,
      entry.code ?? null,
      entry.netDuration ?? 0,
    ]
  );
}

/**
 * Bestehenden Entry aktualisieren.
 */
export async function updateEntryInDb(entry: EntryInput): Promise<void> {
  await run(
    `UPDATE entries SET type=?, date=?, start=?, end=?, pause=?, project=?, code=?, netDuration=?
     WHERE id=?`,
    [
      entry.type || "work",
      entry.date,
      entry.start ?? null,
      entry.end ?? null,
      entry.pause ?? 0,
      entry.project ?? null,
      entry.code ?? null,
      entry.netDuration ?? 0,
      entry.id,
    ]
  );
}

/**
 * Entry löschen.
 */
export async function deleteEntryFromDb(id: number): Promise<void> {
  await run("DELETE FROM entries WHERE id = ?", [id]);
}

/**
 * Alle Entries löschen.
 */
export async function deleteAllEntriesFromDb(): Promise<void> {
  await execute("DELETE FROM entries;");
}

/**
 * Bulk-Insert (für Migration) — ersetzt alle bestehenden Entries.
 * Läuft in einer Transaktion für Konsistenz.
 */
export async function bulkInsertEntries(entries: EntryInput[]): Promise<void> {
  if (!entries || entries.length === 0) {
    return;
  }

  const set = entries.map((entry) => ({
    statement: `INSERT OR REPLACE INTO entries (id, type, date, start, end, pause, project, code, netDuration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values: [
      entry.id,
      entry.type || "work",
      entry.date,
      entry.start ?? null,
      entry.end ?? null,
      entry.pause ?? 0,
      entry.project ?? null,
      entry.code ?? null,
      entry.netDuration ?? 0,
    ],
  }));

  await executeSet(set, true);
}

/**
 * Konvertiert eine SQLite-Zeile in ein Entry-Objekt.
 */
function rowToEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    date: new Date(row.date),
    start: row.start ? new Date(row.start) : new Date(),
    end: row.end ? new Date(row.end) : new Date(),
    pauseMinutes: row.pause,
    workCodeId: row.code ? row.code.toString() : null,
    description: row.project || "",
    attachments: [], // Wird separat geladen
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function timeEntryToInput(entry: TimeEntry): EntryInput {
  return {
    id: entry.id,
    type: "work", // Default type
    date: entry.date.toISOString().split('T')[0], // YYYY-MM-DD format
    start: entry.start ? entry.start.toISOString() : null,
    end: entry.end ? entry.end.toISOString() : null,
    pause: entry.pauseMinutes,
    project: entry.description || null,
    code: entry.workCodeId ? parseInt(entry.workCodeId, 10) : null,
    netDuration: 0, // Default value
  };
}
