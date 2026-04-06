/**
 * workCodesRepo.ts — CRUD für Tätigkeitscodes via SQLite
 *
 * Alle Methoden geben Promises zurück.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute, executeSet } from "../database";
import type { WorkCode } from "../../types";

export interface WorkCodeRow {
  id: number;
  label: string;
}

export interface WorkCodeInput {
  id: number;
  label: string;
}

/**
 * Alle WorkCodes laden, sortiert nach ID.
 */
export async function getAllWorkCodes(): Promise<WorkCode[]> {
  const rows = await query("SELECT id, label FROM work_codes ORDER BY id ASC");
  return rows.map(rowToWorkCode);
}

/**
 * Einzelnen WorkCode einfügen (upsert).
 */
export async function insertWorkCode(code: WorkCodeInput): Promise<void> {
  await run(
    "INSERT OR REPLACE INTO work_codes (id, label) VALUES (?, ?)",
    [code.id, code.label]
  );
}

/**
 * WorkCode aktualisieren.
 */
export async function updateWorkCodeInDb(id: number, label: string): Promise<void> {
  await run("UPDATE work_codes SET label = ? WHERE id = ?", [label, id]);
}

/**
 * Einzelnen WorkCode löschen.
 */
export async function deleteWorkCodeFromDb(id: number): Promise<void> {
  await run("DELETE FROM work_codes WHERE id = ?", [id]);
}

/**
 * Alle WorkCodes löschen.
 */
export async function deleteAllWorkCodes(): Promise<void> {
  await execute("DELETE FROM work_codes;");
}

/**
 * Bulk-Replace: löscht alle und fügt neue ein (für Migration/Import/Preset-Load).
 */
export async function bulkReplaceWorkCodes(codes: WorkCodeInput[]): Promise<void> {
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
    id: row.id.toString(),
    code: row.id.toString(), // code ist string representation von id
    description: row.label || "",
    color: "#3b82f6", // Default color
    order: row.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
