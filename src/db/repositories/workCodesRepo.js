/**
 * workCodesRepo.js — CRUD-Operationen für Work Codes via SQLite
 */

import { run, query, execute } from "../database";

/**
 * Alle Work Codes laden.
 * @returns {Promise<Array>}
 */
export async function getAllWorkCodes() {
  const rows = await query("SELECT * FROM work_codes ORDER BY order_index ASC, id ASC");
  return rows.map(rowToWorkCode);
}

/**
 * Einzelnen Work Code laden.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getWorkCodeById(id) {
  const rows = await query("SELECT * FROM work_codes WHERE id = ?", [id]);
  return rows.length > 0 ? rowToWorkCode(rows[0]) : null;
}

/**
 * Work Code einfügen oder aktualisieren.
 * @param {Object} code - { id, label, code, color, order_index }
 * @returns {Promise<void>}
 */
export async function upsertWorkCode(code) {
  await run(
    `INSERT OR REPLACE INTO work_codes (id, name, code, color, order_index)
     VALUES (?, ?, ?, ?, ?)`,
    [
      code.id,
      code.label || "",
      code.code ?? code.id,
      code.color || null,
      code.order_index ?? code.id,
    ]
  );
}

/**
 * Bulk-Insert (für Import).
 * @param {Array} codes
 * @returns {Promise<void>}
 */
export async function bulkUpsertWorkCodes(codes) {
  if (!codes || codes.length === 0) {
    await execute("DELETE FROM work_codes;");
    return;
  }
  let sql = "DELETE FROM work_codes;\n";
  for (const c of codes) {
    sql += `INSERT OR REPLACE INTO work_codes (id, name, code, color, order_index) VALUES (${c.id}, ${esc(c.label || "")}, ${c.code ?? c.id}, ${c.color ? esc(c.color) : "NULL"}, ${c.order_index ?? c.id});\n`;
  }
  await execute(sql);
}

/**
 * Work Code löschen.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteWorkCode(id) {
  await run("DELETE FROM work_codes WHERE id = ?", [id]);
}

/**
 * Alle Work Codes löschen.
 * @returns {Promise<void>}
 */
export async function deleteAllWorkCodes() {
  await execute("DELETE FROM work_codes;");
}

// ─── Helpers ─────────────────────────────────────────────

function rowToWorkCode(row) {
  return {
    id: row.id,
    label: row.name || "",
    code: row.code ?? row.id,
    color: row.color || null,
    order_index: row.order_index ?? row.id,
  };
}

function esc(val) {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}
