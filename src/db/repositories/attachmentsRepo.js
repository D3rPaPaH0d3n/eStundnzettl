/**
 * attachmentsRepo.js — CRUD-Operationen für Attachments via SQLite
 *
 * Attachments werden nur als Metadaten in SQLite gespeichert.
 * Die eigentlichen Dateien liegen im Filesystem (Directory.Data).
 */

import { run, query } from "../database";

/**
 * Alle Attachments laden.
 * @returns {Promise<Array>}
 */
export async function getAllAttachments() {
  const rows = await query("SELECT * FROM attachments ORDER BY created_at DESC");
  return rows.map(rowToAttachment);
}

/**
 * Attachments für einen Entry laden.
 * @param {number} entryId
 * @returns {Promise<Array>}
 */
export async function getAttachmentsForEntry(entryId) {
  const rows = await query(
    "SELECT * FROM attachments WHERE entry_id = ? ORDER BY created_at ASC",
    [entryId]
  );
  return rows.map(rowToAttachment);
}

/**
 * Attachment einfügen oder aktualisieren.
 * @param {Object} att - { id, entryId, type, uri, thumbnail, createdAt }
 * @returns {Promise<void>}
 */
export async function upsertAttachment(att) {
  await run(
    `INSERT OR REPLACE INTO attachments (id, entry_id, type, uri, thumbnail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      att.id,
      att.entryId,
      att.type || "file",
      att.uri || "",
      att.thumbnail || null,
      att.createdAt || new Date().toISOString(),
    ]
  );
}

/**
 * Bulk-Upsert für Attachments (Import).
 * @param {Array} attachments
 * @returns {Promise<void>}
 */
export async function bulkUpsertAttachments(attachments) {
  if (!attachments || attachments.length === 0) return;
  for (const att of attachments) {
    await upsertAttachment(att);
  }
}

/**
 * Attachment löschen.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteAttachment(id) {
  await run("DELETE FROM attachments WHERE id = ?", [id]);
}

/**
 * Alle Attachments für einen Entry löschen.
 * @param {number} entryId
 * @returns {Promise<void>}
 */
export async function deleteAttachmentsForEntry(entryId) {
  await run("DELETE FROM attachments WHERE entry_id = ?", [entryId]);
}

// ─── Helpers ─────────────────────────────────────────────

function rowToAttachment(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    type: row.type || "file",
    uri: row.uri || "",
    thumbnail: row.thumbnail || null,
    createdAt: row.created_at,
  };
}
