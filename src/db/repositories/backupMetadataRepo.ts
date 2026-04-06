/**
 * backupMetadataRepo.js — CRUD für Backup-Metadaten via SQLite
 *
 * Speichert Informationen über durchgeführte Backups.
 */

import { run, query } from "../database";
import type { BackupMetadata } from "../../types";

/**
 * Letzten Backup-Eintrag laden.
 * @returns {Promise<Object|null>} - { id, type, timestamp, size_bytes, location }
 */
export async function getLastBackupMetadata(): Promise<BackupMetadata | null> {
  const rows = await query(
    "SELECT * FROM backup_metadata ORDER BY timestamp DESC LIMIT 1"
  );
  return rows.length > 0 ? rowToBackupMetadata(rows[0]) : null;
}

/**
 * Backup-Metadaten speichern.
 * @param {Object} metadata - { type, timestamp?, size_bytes?, location? }
 * @returns {Promise<void>}
 */
export async function insertBackupMetadata(metadata: Partial<BackupMetadata> & { type: string }): Promise<void> {
  await run(
    `INSERT INTO backup_metadata (type, timestamp, size_bytes, location)
     VALUES (?, ?, ?, ?)`,
    [
      metadata.type || "manual",
      metadata.timestamp || new Date().toISOString(),
      metadata.size_bytes || null,
      metadata.location || null,
    ]
  );
}

/**
 * Alle Backup-Einträge laden (für Debug/History).
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getBackupHistory(limit: number = 10): Promise<BackupMetadata[]> {
  const rows = await query(
    "SELECT * FROM backup_metadata ORDER BY timestamp DESC LIMIT ?",
    [limit]
  );
  return rows.map(rowToBackupMetadata);
}

/**
 * Backup-Metadaten für Typ laden.
 * @param {string} type
 * @returns {Promise<Array>}
 */
export async function getBackupMetadataByType(type: string): Promise<BackupMetadata[]> {
  const rows = await query(
    "SELECT * FROM backup_metadata WHERE type = ? ORDER BY timestamp DESC",
    [type]
  );
  return rows.map(rowToBackupMetadata);
}

// ─── Helpers ─────────────────────────────────────────────

function rowToBackupMetadata(row: Record<string, any>): BackupMetadata {
  return {
    id: row.id,
    type: row.type,
    timestamp: row.timestamp,
    size_bytes: row.size_bytes,
    location: row.location,
  };
}
