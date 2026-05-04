/**
 * settingsRepo.js — CRUD für Settings via SQLite (Key-Value-Store)
 *
 * Values werden als JSON-Strings gespeichert.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, executeSet } from "../database";

interface SettingsRow extends Record<string, unknown> {
  key: string;
  value: string;
}

interface SettingValueRow extends Record<string, unknown> {
  value: string;
}

/**
 * Einzelnen Setting-Wert lesen.
 * @param {string} key
 * @returns {Promise<*>} — geparstes JSON oder null wenn nicht gefunden
 */
export async function getSetting(key: string): Promise<unknown> {
  const rows = await query<SettingValueRow>("SELECT value FROM settings WHERE key = ?", [key]);
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
export async function setSetting(key: string, value: unknown): Promise<void> {
  const jsonVal: string = JSON.stringify(value);
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
export async function deleteSetting(key: string): Promise<void> {
  await run("DELETE FROM settings WHERE key = ?", [key]);
}

/**
 * Alle Settings lesen (als Object).
 * @returns {Promise<Object>} — { key: value, ... }
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await query<SettingsRow>("SELECT key, value FROM settings");
  const result: Record<string, unknown> = {};
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
export async function bulkWriteSettings(settings: Record<string, unknown>): Promise<void> {
  if (!settings || Object.keys(settings).length === 0) return;

  const set = Object.entries(settings).map(([key, value]) => ({
    statement: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    values: [key, JSON.stringify(value)],
  }));

  await executeSet(set);
}
