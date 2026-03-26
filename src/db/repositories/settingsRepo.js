/**
 * settingsRepo.js — CRUD-Operationen für Settings via SQLite
 *
 * Settings werden als Key-Value Paare gespeichert.
 * Unterstützte Keys:
 *   - userData: JSON serialisiertes Benutzerobjekt
 *   - theme: "light" | "dark" | "system"
 *   - cloudSyncEnabled: "true" | "false"
 *   - localBackupEnabled: "true" | "false"
 */

import { run, query } from "../database";

/**
 * Setting laden.
 * @param {string} key
 * @param {*} fallback - Default-Wert wenn nicht vorhanden
 * @returns {Promise<*>}
 */
export async function getSetting(key, fallback = null) {
  const rows = await query("SELECT value FROM settings WHERE key = ?", [key]);
  if (rows.length === 0) return fallback;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return rows[0].value;
  }
}

/**
 * Setting speichern (upsert).
 * @param {string} key
 * @param {*} value - Wird JSON.stringify't
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  const serialized = JSON.stringify(value);
  await run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, serialized]
  );
}

/**
 * Setting löschen.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function deleteSetting(key) {
  await run("DELETE FROM settings WHERE key = ?", [key]);
}

/**
 * Alle Settings laden (für Export).
 * @returns {Promise<Object>} - { key: value, ... }
 */
export async function getAllSettings() {
  const rows = await query("SELECT * FROM settings");
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
