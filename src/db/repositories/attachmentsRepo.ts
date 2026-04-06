/**
 * attachmentsRepo.ts — CRUD für Attachment-Metadaten via SQLite (Welle 3)
 *
 * Speichert nur Metadaten — die eigentlichen Dateien liegen im Capacitor Filesystem.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute, executeSet } from "../database";
import type { Attachment } from "../../types";

export interface AttachmentRow {
  id: string;
  entryId: string;
  label: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSize: number;
  createdAt: string;
}

export interface AttachmentInput {
  id: string;
  entryId: string;
  label?: string;
  fileName?: string;
  mimeType?: string;
  storagePath?: string;
  fileSize?: number;
  createdAt?: string;
}

// ─── Attachments ─────────────────────────────────────────────

/**
 * Alle Attachments laden, sortiert nach createdAt aufsteigend.
 */
export async function getAllAttachments(): Promise<Attachment[]> {
  const rows = await query("SELECT * FROM attachments ORDER BY createdAt ASC");
  return rows.map(rowToAttachment);
}

/**
 * Attachments für einen bestimmten Entry laden.
 */
export async function getAttachmentsByEntryId(entryId: string): Promise<Attachment[]> {
  const rows = await query(
    "SELECT * FROM attachments WHERE entryId = ? ORDER BY createdAt ASC",
    [entryId]
  );
  return rows.map(rowToAttachment);
}

/**
 * Einzelnes Attachment einfügen.
 */
export async function insertAttachment(att: AttachmentInput): Promise<void> {
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
 */
export async function deleteAttachmentFromDb(id: string): Promise<void> {
  await run("DELETE FROM attachments WHERE id = ?", [id]);
}

/**
 * Alle Attachments eines Entries löschen.
 */
export async function deleteAttachmentsByEntryId(entryId: string): Promise<void> {
  await run("DELETE FROM attachments WHERE entryId = ?", [entryId]);
}

/**
 * Bulk-Insert für Migration: alle bestehenden ersetzen.
 */
export async function bulkReplaceAttachments(attachments: AttachmentInput[]): Promise<void> {
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
 */
export async function getAllLabelSuggestions(): Promise<string[]> {
  const rows = await query(
    "SELECT label FROM attachment_labels ORDER BY position ASC"
  );
  return rows.map((r) => r.label);
}

/**
 * Label-Suggestions komplett ersetzen (für Migration).
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
 */
export async function pushLabelSuggestion(label: string): Promise<void> {
  const trimmed = (label || "").trim();
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
    entryId: parseInt(row.entryId, 10),
    filename: row.fileName || "",
    mimeType: row.mimeType || "",
    size: row.fileSize ?? 0,
    storagePath: row.storagePath || "",
    label: row.label || "",
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

export function attachmentToInput(attachment: Attachment): AttachmentInput {
  return {
    id: attachment.id,
    entryId: attachment.entryId.toString(),
    label: attachment.label || "",
    fileName: attachment.filename,
    mimeType: attachment.mimeType,
    storagePath: attachment.storagePath || "",
    fileSize: attachment.size,
    createdAt: attachment.createdAt.toISOString(),
  };
}

