/**
 * settingsRepo.ts — CRUD für Settings via SQLite (Key-Value-Store)
 *
 * Values werden als JSON-Strings gespeichert.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, executeSet } from "../database";

export interface SettingsRow {
  key: string;
  value: string;
  updatedAt: string;
}

/**
 * Einzelnen Setting-Wert lesen.
 */
export async function getSetting<T = any>(key: string): Promise<T | null> {
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
 */
export async function setSetting(key: string, value: any): Promise<void> {
  const jsonVal = JSON.stringify(value);
  await run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, jsonVal]
  );
}

/**
 * Einzelnen Setting-Wert löschen.
 */
export async function deleteSetting(key: string): Promise<void> {
  await run("DELETE FROM settings WHERE key = ?", [key]);
}

/**
 * Alle Settings lesen (als Object).
 */
export async function getAllSettings(): Promise<Record<string, any>> {
  const rows = await query("SELECT key, value FROM settings");
  const result: Record<string, any> = {};
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
 */
export async function bulkWriteSettings(settings: Record<string, any>): Promise<void> {
  if (!settings || Object.keys(settings).length === 0) return;

  const set = Object.entries(settings).map(([key, value]) => ({
    statement: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    values: [key, JSON.stringify(value)],
  }));

  await executeSet(set);
}
