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

import type { Entry, UserData, WorkCode } from "../types";
import { run, transaction } from "./database";

export interface ImportSnapshot {
  entries?: Entry[];
  userData?: UserData;
  workCodes?: WorkCode[];
}

/**
 * Spielt den übergebenen Snapshot atomar ein. Felder, die nicht gesetzt sind,
 * werden NICHT angefasst (kein implizites Löschen).
 *
 * Bei Fehler in irgendeinem Schritt → ROLLBACK aller bereits gemachten Writes.
 * Throw wird an den Caller weitergereicht.
 */
export async function replaceFullSnapshot(snapshot: ImportSnapshot): Promise<void> {
  await transaction(async () => {
    if (snapshot.entries !== undefined) {
      await run("DELETE FROM entries");
      for (const e of snapshot.entries) {
        await run(
          "INSERT OR REPLACE INTO entries (id, type, date, start, end, pause, project, code, netDuration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            e.id,
            e.type || "work",
            e.date,
            e.start ?? null,
            e.end ?? null,
            e.pause ?? 0,
            e.project ?? null,
            e.code ?? null,
            e.netDuration ?? 0,
          ]
        );
      }
    }

    if (snapshot.userData !== undefined) {
      // UserData wird als ein einziger Settings-Key "user" persistiert
      // (siehe useSettings.ts → sqliteWrite("user", userData)).
      await run(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        ["user", JSON.stringify(snapshot.userData)]
      );
    }

    if (snapshot.workCodes !== undefined) {
      await run("DELETE FROM work_codes");
      for (const c of snapshot.workCodes) {
        await run(
          "INSERT INTO work_codes (id, label) VALUES (?, ?)",
          [c.id, c.label || ""]
        );
      }
    }
  });
}
