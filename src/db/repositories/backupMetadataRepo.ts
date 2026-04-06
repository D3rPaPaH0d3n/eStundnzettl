/**
 * backupMetadataRepo.ts — CRUD für Backup-Metadaten via SQLite
 *
 * Speichert Informationen über durchgeführte Backups.
 */

import { run, query } from "../database";
import type { BackupMetadata } from "../../types";

export interface BackupMetadataRow {
  id: number;
  type: string;
  timestamp: string;
  size_bytes: number | null;
  location: string | null;
}

export interface BackupMetadataInput {
  type: 'google-drive' | 'nextcloud' | 'local' | 'manual';
  timestamp?: string;
  size_bytes?: number | null;
  location?: string | null;
}

/**
 * Letzten Backup-Eintrag laden.
 */
export async function getLastBackupMetadata(): Promise<BackupMetadata | null> {
  const rows = await query(
    "SELECT * FROM backup_metadata ORDER BY timestamp DESC LIMIT 1"
  );
  return rows.length > 0 ? rowToBackupMetadata(rows[0]) : null;
}

/**
 * Backup-Metadaten speichern.
 */
export async function insertBackupMetadata(metadata: BackupMetadataInput): Promise<void> {
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
 */
export async function getBackupHistory(limit = 10): Promise<BackupMetadata[]> {
  const rows = await query(
    "SELECT * FROM backup_metadata ORDER BY timestamp DESC LIMIT ?",
    [limit]
  );
  return rows.map(rowToBackupMetadata);
}

/**
 * Backup-Metadaten für Typ laden.
 */
export async function getBackupMetadataByType(type: string): Promise<BackupMetadata[]> {
  const rows = await query(
    "SELECT * FROM backup_metadata WHERE type = ? ORDER BY timestamp DESC",
    [type]
  );
  return rows.map(rowToBackupMetadata);
}

// ─── Helpers ─────────────────────────────────────────────

function rowToBackupMetadata(row: BackupMetadataRow): BackupMetadata {
  return {
    id: row.id.toString(),
    type: row.type as 'google-drive' | 'nextcloud' | 'local',
    timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
    size: row.size_bytes ?? 0,
    entryCount: 0, // Wird nicht in der Datenbank gespeichert
    successful: true, // Annahme: wenn gespeichert, dann erfolgreich
  };
}
