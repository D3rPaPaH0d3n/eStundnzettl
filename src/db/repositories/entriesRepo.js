/**
 * entriesRepo.js — CRUD-Operationen für Entries via SQLite
 *
 * Alle Methoden geben Promises zurück.
 * Bei SQLite-Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute } from "../database";

/**
 * Alle Entries laden, sortiert nach Datum absteigend (neueste zuerst).
 * @returns {Promise<Array>} — Array von Entry-Objekten
 */
export async function getAllEntries() {
  const rows = await query("SELECT * FROM entries ORDER BY date DESC, id DESC");
  return rows.map(rowToEntry);
}

/**
 * Einzelnen Entry per ID laden.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getEntryById(id) {
  const rows = await query("SELECT * FROM entries WHERE id = ?", [id]);
  return rows.length > 0 ? rowToEntry(rows[0]) : null;
}

/**
 * Neuen Entry einfügen.
 * @param {Object} entry — muss mindestens { id, type, date, netDuration } haben
 * @returns {Promise<void>}
 */
export async function insertEntry(entry) {
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
 * @param {Object} entry — muss { id } enthalten
 * @returns {Promise<void>}
 */
export async function updateEntryInDb(entry) {
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
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteEntryFromDb(id) {
  await run("DELETE FROM entries WHERE id = ?", [id]);
}

/**
 * Alle Entries löschen.
 * @returns {Promise<void>}
 */
export async function deleteAllEntriesFromDb() {
  await execute("DELETE FROM entries;");
}

/**
 * Bulk-Insert (für Migration) — ersetzt alle bestehenden Entries.
 * Läuft in einer Transaktion für Konsistenz.
 *
 * @param {Array} entries
 * @returns {Promise<void>}
 */
export async function bulkInsertEntries(entries) {
  if (!entries || entries.length === 0) {
    await execute("DELETE FROM entries;");
    return;
  }

  // Alles in einem execute-Block als Transaktion
  let sql = "DELETE FROM entries;\n";
  for (const e of entries) {
    const type = esc(e.type || "work");
    const date = esc(e.date);
    const start = e.start ? esc(e.start) : "NULL";
    const end = e.end ? esc(e.end) : "NULL";
    const pause = e.pause ?? 0;
    const project = e.project ? esc(e.project) : "NULL";
    const code = e.code ?? "NULL";
    const netDuration = e.netDuration ?? 0;

    sql += `INSERT OR REPLACE INTO entries (id, type, date, start, end, pause, project, code, netDuration) VALUES (${e.id}, ${type}, ${date}, ${start}, ${end}, ${pause}, ${project}, ${code}, ${netDuration});\n`;
  }

  await execute(sql);
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * SQLite-Row (Objekt) → normalisiertes Entry-Objekt.
 * Stellt sicher, dass null-Werte korrekt behandelt werden.
 */
function rowToEntry(row) {
  return {
    id: row.id,
    type: row.type || "work",
    date: row.date,
    start: row.start || null,
    end: row.end || null,
    pause: row.pause ?? 0,
    project: row.project || null,
    code: row.code ?? null,
    netDuration: row.netDuration ?? 0,
  };
}

/**
 * Escape für SQL-String-Literale (einfache Anführungszeichen verdoppeln).
 * Gibt 'wert' zurück.
 */
function esc(val) {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}
