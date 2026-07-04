/**
 * snapshot.ts — Atomare Backup-Restore-Operation.
 *
 * `replaceFullSnapshot` ersetzt Entries, UserData (Settings-Key "user") und
 * WorkCodes in einer einzigen SQLite-Transaktion. Entweder werden alle drei
 * Sektionen geschrieben oder keine — kein Mischzustand bei Crash, Throw oder
 * Plugin-Fehler.
 *
 * Wird von `useImport` (JSON-Import) und Cloud-Restore-Pfaden (Google Drive,
 * Nextcloud, Auto-Backup) genutzt. Die einzelnen `bulk*`-Repo-Funktionen
 * bleiben für andere Caller unverändert; diese Datei ist die Single Source of
 * Truth für "vollständigen Snapshot atomar einspielen".
 */

import type { Attachment, CalculationConfig, Entry, SqlValue, Theme, UserData, WorkCode } from "../types";
import type { LocaleId } from "../locales/types";
import { executeSet } from "./database";

export interface ImportSnapshot {
  entries?: Entry[];
  userData?: UserData;
  workCodes?: WorkCode[];
  attachments?: Attachment[];
  attachmentLabels?: string[];
  calculationConfig?: CalculationConfig;
  /** LocaleId aus dem Backup (Settings-Key "locale"). Producer validieren via `isLocaleId`. */
  locale?: LocaleId;
  /** Theme aus dem Backup (Settings-Key "theme"). Producer validieren via `isTheme`. */
  theme?: Theme;
}

type SnapshotStatement = { statement: string; values: SqlValue[] };

/**
 * Spielt den übergebenen Snapshot atomar ein. Felder, die nicht gesetzt sind,
 * werden NICHT angefasst (kein implizites Löschen).
 *
 * Bei Fehler in irgendeinem Schritt → ROLLBACK aller bereits gemachten Writes.
 * Throw wird an den Caller weitergereicht.
 */
export async function replaceFullSnapshot(snapshot: ImportSnapshot): Promise<void> {
  const set: SnapshotStatement[] = [];

  if (snapshot.entries !== undefined) {
    set.push({ statement: "DELETE FROM entries;", values: [] });
    set.push(
      ...snapshot.entries.map((e) => ({
        statement:
          "INSERT OR REPLACE INTO entries (id, type, date, start, end, pause, project, code, netDuration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        values: [
          e.id,
          e.type || "work",
          e.date,
          e.start ?? null,
          e.end ?? null,
          e.pause ?? 0,
          e.project ?? null,
          e.code ?? null,
          e.netDuration ?? 0,
        ],
      }))
    );
  }

  if (snapshot.userData !== undefined) {
    // UserData wird als ein einziger Settings-Key "user" persistiert
    // (siehe useSettings.ts → sqliteWrite("user", userData)).
    set.push({
      statement: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      values: ["user", JSON.stringify(snapshot.userData)],
    });
  }

  if (snapshot.workCodes !== undefined) {
    set.push({ statement: "DELETE FROM work_codes;", values: [] });
    set.push(
      ...snapshot.workCodes.map((c) => ({
        // OR REPLACE wie bei entries/attachments: doppelte IDs im Backup
        // kollabieren zur letzten Zeile statt die gesamte Restore-
        // Transaktion mit einem PRIMARY-KEY-Fehler abzubrechen.
        statement: "INSERT OR REPLACE INTO work_codes (id, label) VALUES (?, ?)",
        values: [c.id, c.label || ""],
      }))
    );
  }

  if (snapshot.attachments !== undefined) {
    set.push({ statement: "DELETE FROM attachments;", values: [] });
    set.push(
      ...snapshot.attachments.map((att) => ({
        statement:
          "INSERT OR REPLACE INTO attachments (id, entryId, label, fileName, mimeType, storagePath, fileSize, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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
      }))
    );
  }

  if (snapshot.attachmentLabels !== undefined) {
    set.push({ statement: "DELETE FROM attachment_labels;", values: [] });
    set.push(
      ...snapshot.attachmentLabels.map((label, i) => ({
        statement: "INSERT OR REPLACE INTO attachment_labels (label, position) VALUES (?, ?)",
        values: [label, i],
      }))
    );
  }

  if (snapshot.calculationConfig !== undefined) {
    set.push({
      statement: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      values: ["calculationConfig", JSON.stringify(snapshot.calculationConfig)],
    });
  }

  if (snapshot.locale !== undefined) {
    set.push({
      statement: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      values: ["locale", JSON.stringify(snapshot.locale)],
    });
  }

  if (snapshot.theme !== undefined) {
    set.push({
      statement: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      values: ["theme", JSON.stringify(snapshot.theme)],
    });
  }

  await executeSet(set, true);
}
