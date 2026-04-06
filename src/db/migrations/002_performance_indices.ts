/**
 * Migration 002 — Performance Indices
 *
 * Ergänzende Indizes für die häufigsten Query-Muster, die sich erst nach
 * Welle 2 im echten Nutzungsprofil als Hotspots gezeigt haben.
 *
 * Deckt folgende Queries ab:
 *   - entries:            ORDER BY date DESC, id DESC   (getAllEntries)
 *   - attachments:        WHERE entryId = ? ORDER BY createdAt ASC
 *                         (getAttachmentsByEntryId — pro Entry-Anzeige)
 *   - attachment_labels:  ORDER BY position ASC         (MRU-Labels)
 *   - backup_metadata:    ORDER BY timestamp DESC LIMIT 1
 *                         WHERE type = ? ORDER BY timestamp DESC
 *
 * Alle Statements sind idempotent (CREATE INDEX IF NOT EXISTS) — sicher bei
 * re-run. SQLite wählt bei ORDER BY automatisch Index-Scan vs. Temp-Sort;
 * die zusätzlichen Indizes eliminieren die Temp-Sort-Pfade bei wachsender
 * Entry-Anzahl (relevanter ab ~1000 Einträgen, unschädlich darunter).
 */

import type { Migration } from "./001_initial_schema";

const STATEMENTS: string[] = [
  // entries: Composite-Index für den häufigsten Sort (Dashboard-Listing).
  // SQLite nutzt ihn auch beim Filter-by-date dank des führenden date-Key.
  `CREATE INDEX IF NOT EXISTS idx_entries_date_id
     ON entries (date DESC, id DESC);`,

  // attachments: Composite für "alle Attachments eines Entries, zeitlich sortiert".
  // Ersetzt nicht idx_attachments_entry (bleibt für reine WHERE-Suchen),
  // sondern ergänzt ihn für den Join mit sort.
  `CREATE INDEX IF NOT EXISTS idx_attachments_entry_created
     ON attachments (entryId, createdAt ASC);`,

  // attachment_labels: MRU-Sort.
  `CREATE INDEX IF NOT EXISTS idx_attachment_labels_position
     ON attachment_labels (position ASC);`,

  // backup_metadata: getLastBackupMetadata + getBackupHistory(type).
  `CREATE INDEX IF NOT EXISTS idx_backup_metadata_timestamp
     ON backup_metadata (timestamp DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_backup_metadata_type_timestamp
     ON backup_metadata (type, timestamp DESC);`,
];

export const migration002PerformanceIndices: Migration = {
  version: 2,
  name: "performance_indices",
  up: async (execute: (sql: string) => Promise<unknown>): Promise<void> => {
    for (const sql of STATEMENTS) {
      await execute(sql);
    }
  },
};
