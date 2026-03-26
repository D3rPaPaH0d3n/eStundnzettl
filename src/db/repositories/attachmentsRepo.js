/**
 * attachmentsRepo.js — CRUD für Attachment-Metadaten via SQLite (Welle 3)
 *
 * Speichert nur Metadaten — die eigentlichen Dateien liegen im Capacitor Filesystem.
 * Bei Fehler wird eine Exception geworfen → Caller entscheidet über Fallback.
 */

import { run, query, execute } from "../database";

// ─── Attachments ─────────────────────────────────────────────

/**
 * Alle Attachments laden, sortiert nach createdAt aufsteigend.
 * @returns {Promise<Array>}
 */
export async function getAllAttachments() {
  const rows = await query("SELECT * FROM attachments ORDER BY createdAt ASC");
  return rows.map(rowToAttachment);
}

/**
 * Attachments für einen bestimmten Entry laden.
 * @param {number} entryId
 * @returns {Promise<Array>}
 */
export async function getAttachmentsByEntryId(entryId) {
  const rows = await query(
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
export async function insertAttachment(att) {
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
export async function deleteAttachmentFromDb(id) {
  await run("DELETE FROM attachments WHERE id = ?", [id]);
}

/**
 * Alle Attachments eines Entries löschen.
 * @param {number} entryId
 * @returns {Promise<void>}
 */
export async function deleteAttachmentsByEntryId(entryId) {
  await run("DELETE FROM attachments WHERE entryId = ?", [entryId]);
}

/**
 * Bulk-Insert für Migration: alle bestehenden ersetzen.
 * @param {Array} attachments
 * @returns {Promise<void>}
 */
export async function bulkReplaceAttachments(attachments) {
  let sql = "DELETE FROM attachments;\n";

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      sql += `INSERT OR REPLACE INTO attachments (id, entryId, label, fileName, mimeType, storagePath, fileSize, createdAt) VALUES (${esc(att.id)}, ${att.entryId}, ${esc(att.label || "")}, ${esc(att.fileName || "")}, ${esc(att.mimeType || "")}, ${esc(att.storagePath || "")}, ${att.fileSize ?? 0}, ${esc(att.createdAt || "")});\n`;
    }
  }

  await execute(sql);
}

// ─── Label Suggestions ──────────────────────────────────────

/**
 * Alle Label-Suggestions laden (MRU-sortiert, position ASC = neueste zuerst).
 * @returns {Promise<Array<string>>}
 */
export async function getAllLabelSuggestions() {
  const rows = await query(
    "SELECT label FROM attachment_labels ORDER BY position ASC"
  );
  return rows.map((r) => r.label);
}

/**
 * Label-Suggestions komplett ersetzen (für Migration).
 * @param {Array<string>} labels — MRU-sortiert (index 0 = neueste)
 * @returns {Promise<void>}
 */
export async function bulkReplaceLabelSuggestions(labels) {
  let sql = "DELETE FROM attachment_labels;\n";

  if (labels && labels.length > 0) {
    for (let i = 0; i < labels.length; i++) {
      sql += `INSERT OR REPLACE INTO attachment_labels (label, position) VALUES (${esc(labels[i])}, ${i});\n`;
    }
  }

  await execute(sql);
}

/**
 * Ein Label an Position 0 einfügen (MRU-Update).
 * Verschiebt bestehende Positionen und begrenzt auf 20 Einträge.
 * @param {string} label
 * @returns {Promise<void>}
 */
export async function pushLabelSuggestion(label) {
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

function rowToAttachment(row) {
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

function esc(val) {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}
