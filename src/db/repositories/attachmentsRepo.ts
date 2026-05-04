/**
 * attachmentsRepo.js — CRUD für Attachment-Metadaten via SQLite (Welle 3)
 *
 * Speichert nur Metadaten — die eigentlichen Dateien liegen im Capacitor Filesystem.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute, executeSet } from "../database";
import type { Attachment } from "../../types";

interface AttachmentRow extends Record<string, unknown> {
  id: string;
  entryId: Attachment["entryId"];
  label?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  storagePath?: string | null;
  fileSize?: number | null;
  createdAt?: string | null;
}

interface AttachmentLabelRow extends Record<string, unknown> {
  label: string;
}

// ─── Attachments ─────────────────────────────────────────────

/**
 * Alle Attachments laden, sortiert nach createdAt aufsteigend.
 * @returns {Promise<Array>}
 */
export async function getAllAttachments(): Promise<Attachment[]> {
  const rows = await query<AttachmentRow>("SELECT * FROM attachments ORDER BY createdAt ASC");
  return rows.map(rowToAttachment);
}

/**
 * Attachments für einen bestimmten Entry laden.
 * @param {number} entryId
 * @returns {Promise<Array>}
 */
export async function getAttachmentsByEntryId(entryId: number | string): Promise<Attachment[]> {
  const rows = await query<AttachmentRow>(
    "SELECT * FROM attachments WHERE entryId = ? ORDER BY createdAt ASC",
    [entryId]
  );
  return rows.map(rowToAttachment);
}

/**
 * Einzelnes Attachment einfügen.
 * @param {Object} att — { id, entryId, label, fileName, mimeType, storagePath, fileSize, createdAt }
 * @returns {Promise<void>}
 */
export async function insertAttachment(att: Attachment): Promise<void> {
  await run(
    `INSERT OR REPLACE INTO attachments (id, entryId, label, fileName, mimeType, storagePath, fileSize, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      att.id,
      att.entryId,
      att.label || "",
      att.fileName || "",
      att.mimeType || "",
      att.storagePath || "",
      att.fileSize ?? 0,
      att.createdAt || new Date().toISOString(),
    ]
  );
}

/**
 * Attachment löschen.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteAttachmentFromDb(id: string): Promise<void> {
  await run("DELETE FROM attachments WHERE id = ?", [id]);
}

/**
 * Alle Attachments eines Entries löschen.
 * @param {number} entryId
 * @returns {Promise<void>}
 */
export async function deleteAttachmentsByEntryId(entryId: number | string): Promise<void> {
  await run("DELETE FROM attachments WHERE entryId = ?", [entryId]);
}

/**
 * Bulk-Insert für Migration: alle bestehenden ersetzen.
 * @param {Array} attachments
 * @returns {Promise<void>}
 */
export async function bulkReplaceAttachments(attachments: Attachment[]): Promise<void> {
  const set = [
    { statement: "DELETE FROM attachments;", values: [] },
    ...(attachments || []).map((att) => ({
      statement: `INSERT OR REPLACE INTO attachments (id, entryId, label, fileName, mimeType, storagePath, fileSize, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        att.id,
        att.entryId,
        att.label || "",
        att.fileName || "",
        att.mimeType || "",
        att.storagePath || "",
        att.fileSize ?? 0,
        att.createdAt || "",
      ],
    })),
  ];

  await executeSet(set);
}

// ─── Label Suggestions ──────────────────────────────────────

/**
 * Alle Label-Suggestions laden (MRU-sortiert, position ASC = neueste zuerst).
 * @returns {Promise<Array<string>>}
 */
export async function getAllLabelSuggestions(): Promise<string[]> {
  const rows = await query<AttachmentLabelRow>(
    "SELECT label FROM attachment_labels ORDER BY position ASC"
  );
  return rows.map((r) => r.label);
}

/**
 * Label-Suggestions komplett ersetzen (für Migration).
 * @param {Array<string>} labels — MRU-sortiert (index 0 = neueste)
 * @returns {Promise<void>}
 */
export async function bulkReplaceLabelSuggestions(labels: string[]): Promise<void> {
  const set = [
    { statement: "DELETE FROM attachment_labels;", values: [] },
    ...(labels || []).map((label, i) => ({
      statement: "INSERT OR REPLACE INTO attachment_labels (label, position) VALUES (?, ?)",
      values: [label, i],
    })),
  ];

  await executeSet(set);
}

/**
 * Ein Label an Position 0 einfügen (MRU-Update).
 * Verschiebt bestehende Positionen und begrenzt auf 20 Einträge.
 * @param {string} label
 * @returns {Promise<void>}
 */
export async function pushLabelSuggestion(label: string): Promise<void> {
  const trimmed: string = (label || "").trim();
  if (!trimmed) return;

  // Altes Vorkommen entfernen
  await run("DELETE FROM attachment_labels WHERE label = ?", [trimmed]);

  // Alle Positionen um 1 nach hinten schieben
  await execute("UPDATE attachment_labels SET position = position + 1;");

  // Neues Label an Position 0
  await run(
    "INSERT INTO attachment_labels (label, position) VALUES (?, 0)",
    [trimmed]
  );

  // Auf 20 Labels begrenzen
  await execute(
    "DELETE FROM attachment_labels WHERE position >= 20;"
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    entryId: row.entryId,
    label: row.label || "",
    fileName: row.fileName || "",
    mimeType: row.mimeType || "",
    storagePath: row.storagePath || "",
    fileSize: row.fileSize ?? 0,
    createdAt: row.createdAt || "",
  };
}
