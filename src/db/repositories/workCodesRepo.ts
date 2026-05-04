/**
 * workCodesRepo.js — CRUD für Tätigkeitscodes via SQLite
 *
 * Alle Methoden geben Promises zurück.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute, executeSet } from "../database";
import type { WorkCode } from "../../types";

interface WorkCodeRow extends Record<string, unknown> {
  id: number;
  label?: string | null;
}

/**
 * Alle WorkCodes laden, sortiert nach ID.
 * @returns {Promise<Array<{id: number, label: string}>>}
 */
export async function getAllWorkCodes(): Promise<WorkCode[]> {
  const rows = await query<WorkCodeRow>("SELECT id, label FROM work_codes ORDER BY id ASC");
  return rows.map(rowToWorkCode);
}

/**
 * Einzelnen WorkCode einfügen (upsert).
 * @param {{id: number, label: string}} code
 * @returns {Promise<void>}
 */
export async function insertWorkCode(code: WorkCode): Promise<void> {
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
export async function updateWorkCodeInDb(id: number, label: string): Promise<void> {
  await run("UPDATE work_codes SET label = ? WHERE id = ?", [label, id]);
}

/**
 * Einzelnen WorkCode löschen.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteWorkCodeFromDb(id: number): Promise<void> {
  await run("DELETE FROM work_codes WHERE id = ?", [id]);
}

/**
 * Alle WorkCodes löschen.
 * @returns {Promise<void>}
 */
export async function deleteAllWorkCodes(): Promise<void> {
  await execute("DELETE FROM work_codes;");
}

/**
 * Bulk-Replace: löscht alle und fügt neue ein (für Migration/Import/Preset-Load).
 * @param {Array<{id: number, label: string}>} codes
 * @returns {Promise<void>}
 */
export async function bulkReplaceWorkCodes(codes: WorkCode[]): Promise<void> {
  const set = [
    { statement: "DELETE FROM work_codes;", values: [] },
    ...(codes || []).map((c) => ({
      statement: "INSERT INTO work_codes (id, label) VALUES (?, ?)",
      values: [c.id, c.label || ""],
    })),
  ];

  await executeSet(set);
}

// ─── Helpers ─────────────────────────────────────────────────

function rowToWorkCode(row: WorkCodeRow): WorkCode {
  return {
    id: row.id,
    label: row.label || "",
  };
}
