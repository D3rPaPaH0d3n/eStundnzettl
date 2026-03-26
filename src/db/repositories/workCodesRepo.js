/**
 * workCodesRepo.js — CRUD für Tätigkeitscodes via SQLite
 *
 * Alle Methoden geben Promises zurück.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute } from "../database";

/**
 * Alle WorkCodes laden, sortiert nach ID.
 * @returns {Promise<Array<{id: number, label: string}>>}
 */
export async function getAllWorkCodes() {
  const rows = await query("SELECT id, label FROM work_codes ORDER BY id ASC");
  return rows.map(rowToWorkCode);
}

/**
 * Einzelnen WorkCode einfügen (upsert).
 * @param {{id: number, label: string}} code
 * @returns {Promise<void>}
 */
export async function insertWorkCode(code) {
  await run(
    "INSERT OR REPLACE INTO work_codes (id, label) VALUES (?, ?)",
    [code.id, code.label]
  );
}

/**
 * WorkCode aktualisieren.
 * @param {number} id
 * @param {string} label
 * @returns {Promise<void>}
 */
export async function updateWorkCodeInDb(id, label) {
  await run("UPDATE work_codes SET label = ? WHERE id = ?", [label, id]);
}

/**
 * Einzelnen WorkCode löschen.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteWorkCodeFromDb(id) {
  await run("DELETE FROM work_codes WHERE id = ?", [id]);
}

/**
 * Alle WorkCodes löschen.
 * @returns {Promise<void>}
 */
export async function deleteAllWorkCodes() {
  await execute("DELETE FROM work_codes;");
}

/**
 * Bulk-Replace: löscht alle und fügt neue ein (für Migration/Import/Preset-Load).
 * @param {Array<{id: number, label: string}>} codes
 * @returns {Promise<void>}
 */
export async function bulkReplaceWorkCodes(codes) {
  let sql = "DELETE FROM work_codes;\n";

  if (codes && codes.length > 0) {
    for (const c of codes) {
      const label = esc(c.label);
      sql += `INSERT INTO work_codes (id, label) VALUES (${c.id}, ${label});\n`;
    }
  }

  await execute(sql);
}

// ─── Helpers ─────────────────────────────────────────────────

function rowToWorkCode(row) {
  return {
    id: row.id,
    label: row.label || "",
  };
}

function esc(val) {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}
