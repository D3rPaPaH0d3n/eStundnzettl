/**
 * settingsRepo.js — CRUD für Settings via SQLite (Key-Value-Store)
 *
 * Values werden als JSON-Strings gespeichert.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute } from "../database";

/**
 * Einzelnen Setting-Wert lesen.
 * @param {string} key
 * @returns {Promise<*>} — geparstes JSON oder null wenn nicht gefunden
 */
export async function getSetting(key) {
  const rows = await query("SELECT value FROM settings WHERE key = ?", [key]);
  if (rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return rows[0].value;
  }
}

/**
 * Einzelnen Setting-Wert schreiben (upsert).
 * @param {string} key
 * @param {*} value — wird als JSON serialisiert
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  const jsonVal = JSON.stringify(value);
  await run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, jsonVal]
  );
}

/**
 * Einzelnen Setting-Wert löschen.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function deleteSetting(key) {
  await run("DELETE FROM settings WHERE key = ?", [key]);
}

/**
 * Alle Settings lesen (als Object).
 * @returns {Promise<Object>} — { key: value, ... }
 */
export async function getAllSettings() {
  const rows = await query("SELECT key, value FROM settings");
  const result = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result;
}

/**
 * Bulk-Write für Settings (für Migration).
 * Schreibt alle Key-Value-Paare in einer Transaktion.
 *
 * @param {Object} settings — { key: value, ... }
 * @returns {Promise<void>}
 */
export async function bulkWriteSettings(settings) {
  if (!settings || Object.keys(settings).length === 0) return;

  let sql = "BEGIN TRANSACTION;\n";
  for (const [key, value] of Object.entries(settings)) {
    const jsonVal = esc(JSON.stringify(value));
    sql += `INSERT OR REPLACE INTO settings (key, value) VALUES (${esc(key)}, ${jsonVal});\n`;
  }
  sql += "COMMIT;\n";
  await execute(sql);
}

// ─── Helpers ─────────────────────────────────────────────────

function esc(val) {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}
