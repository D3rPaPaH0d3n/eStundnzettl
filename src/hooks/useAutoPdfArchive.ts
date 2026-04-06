/**
 * useAutoPdfArchive — Automatisches monatliches PDF-Archiv.
 *
 * Strategie:
 * - Beim App-Start (Mount) und bei jedem Resume pruefen, ob heute schon
 *   ein Lauf stattgefunden hat. Falls nein → PDF des aktuellen Monats
 *   (bis heute) generieren und an aktive Ziele verteilen.
 * - Bei Monats-Uebergang: zuerst das vergangene Monat final exportieren,
 *   dann das neue Monat.
 * - Content-Hash-Skip: wenn sich gegenueber dem letzten Lauf nichts
 *   geaendert hat, wird der Generate-/Upload-Pfad komplett uebersprungen.
 * - Zielt NICHT auf Google Drive — das JSON-Backup-Verhalten in
 *   useAutoBackup bleibt komplett unberuehrt.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { App } from "@capacitor/app";
import type { Entry, UserData, WorkCode } from '../types';
import { STORAGE_KEYS } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { setSetting } from "../db/repositories/settingsRepo";
import { logger } from "../utils/logger";
import {
  generateMonthlyPdfBlob,
  filterEntriesForMonth,
  hashMonthContent,
  buildArchiveFilename,
} from "../utils/pdfArchive";
import { blobToBase64 } from "../utils";
import { writeLocalArchive, uploadNextcloudArchive, uploadGDriveArchive } from "../utils/pdfArchiveTargets";

const log = logger.scope("PdfArchive");

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const monthStr = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Dual-Write: localStorage + (wenn verfuegbar) SQLite. */
async function dualWrite(lsKey: string, sqlKey: string, value: string | number | boolean): Promise<void> {
  const prev = localStorage.getItem(lsKey);
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    try {
      await setSetting(sqlKey, value);
    } catch (e) {
      if (prev !== null) localStorage.setItem(lsKey, prev);
      else localStorage.removeItem(lsKey);
      log.warn(`SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}

/** Prueft, ob der letzte Lauf vor heute 00:00 liegt. */
function isDueToday(): boolean {
  const last = localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_LAST_RUN) || "";
  return last !== todayStr();
}

/**
 * Fuehrt einen Lauf fuer einen bestimmten Monat durch.
 * Gibt das Ergebnis zurueck ({ skipped, ok, errors }), damit der
 * manuelle Trigger Toasts anzeigen kann.
 */
interface PdfArchiveTargets {
  local: boolean;
  nextcloud: boolean;
  gdrive: boolean;
}

async function runForMonth({ entries, userData, workCodes, year, month, targets }: { entries: Entry[]; userData: UserData; workCodes: WorkCode[]; year: number; month: number; targets: PdfArchiveTargets }) {
  const filename = buildArchiveFilename({ year, month, userData });
  const newHash = hashMonthContent({ entries, userData, year, month });
  const lastHashKey = `${STORAGE_KEYS.PDF_ARCHIVE_LAST_HASH}_${year}-${String(month).padStart(2, "0")}`;
  const prevHash = localStorage.getItem(lastHashKey);

  if (prevHash === newHash) {
    log.info(`Hash unveraendert fuer ${year}-${month} — kein Upload.`);
    return { skipped: true, filename };
  }

  const monthEntries = filterEntriesForMonth(entries, year, month);
  if (monthEntries.length === 0 && prevHash == null) {
    // Nichts zu exportieren und auch nichts vorher — komplett ueberspringen
    return { skipped: true, filename, empty: true };
  }

  const blob = await generateMonthlyPdfBlob({ year, month, entries, userData, workCodes });
  const base64 = await blobToBase64(blob);

  const results = [];
  if (targets.local) {
    results.push(await writeLocalArchive(filename, base64, blob));
  }
  if (targets.nextcloud) {
    results.push(await uploadNextcloudArchive(filename, base64));
  }
  if (targets.gdrive) {
    results.push(await uploadGDriveArchive(filename, base64, blob));
  }

  const anyOk = results.some((r) => r.ok);
  const errors = results.filter((r) => !r.ok);

  if (anyOk) {
    localStorage.setItem(lastHashKey, newHash);
  }

  return { skipped: false, filename, results, anyOk, errors };
}

export function useAutoPdfArchive(entries: Entry[], userData: UserData, workCodes: WorkCode[]) {
  const latestDataRef = useRef<{ entries: Entry[]; userData: UserData; workCodes: WorkCode[] }>({ entries, userData, workCodes });
  const isRunning = useRef<boolean>(false);
  const [lastRun, setLastRun] = useState(
    () => localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_LAST_RUN) || ""
  );
  const [lastError, setLastError] = useState(
    () => localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_LAST_ERROR) || ""
  );

  useEffect(() => {
    latestDataRef.current = { entries, userData, workCodes };
  }, [entries, userData, workCodes]);

  const getActiveTargets = (): PdfArchiveTargets | null => {
    const masterOn = localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_ENABLED) === "true";
    if (!masterOn) return null;
    const targets = {
      local: localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_LOCAL) === "true",
      nextcloud: localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_NEXTCLOUD) === "true",
      gdrive: localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_GDRIVE) === "true",
    };
    if (!targets.local && !targets.nextcloud && !targets.gdrive) return null;
    return targets;
  };

  /**
   * Fuehrt den kompletten Lauf aus: bei Monatswechsel erst Vormonat
   * finalisieren, dann aktuelles Monat.
   */
  const performRun = useCallback(async ({ source = "auto", force = false } = {}) => {
    if (isRunning.current) {
      log.info(`performRun (${source}) — bereits laufend, skip.`);
      return { ok: false, reason: "already-running" };
    }

    const targets = getActiveTargets();
    if (!targets) {
      log.info(`performRun (${source}) — nicht aktiv, skip.`);
      return { ok: false, reason: "disabled" };
    }

    if (!force && !isDueToday()) {
      log.info(`performRun (${source}) — heute bereits gelaufen, skip.`);
      return { ok: false, reason: "already-today" };
    }

    isRunning.current = true;
    try {
      const { entries, userData, workCodes } = latestDataRef.current;
      if (!entries || !userData) {
        return { ok: false, reason: "no-data" };
      }

      const now = new Date();
      const currentYM = monthStr(now);
      const lastYM = localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_LAST_MONTH) || "";

      const results = [];

      // Monats-Uebergang: Vormonat finalisieren (letzter Tag war also im Vormonat)
      if (lastYM && lastYM !== currentYM) {
        const [py, pm] = lastYM.split("-").map(Number);
        if (py && pm) {
          log.info(`Monats-Uebergang erkannt: finalisiere ${lastYM}`);
          const prevRes = await runForMonth({
            entries, userData, workCodes,
            year: py, month: pm, targets,
          });
          results.push({ month: lastYM, ...prevRes });
        }
      }

      // Aktuelles Monat
      const curRes = await runForMonth({
        entries, userData, workCodes,
        year: now.getFullYear(), month: now.getMonth() + 1, targets,
      });
      results.push({ month: currentYM, ...curRes });

      // Status-Update
      const today = todayStr();
      const anyRealUpload = results.some((r) => !r.skipped && r.anyOk);
      const anyFailure = results.some((r) => !r.skipped && r.errors && r.errors.length > 0);

      await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_LAST_RUN, "pdf_archive_last_run", today);
      await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_LAST_MONTH, "pdf_archive_last_month", currentYM);
      setLastRun(today);

      if (anyFailure) {
        const current = parseInt(localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_FAIL_COUNT) || "0", 10);
        const msg = results.flatMap((r) => (r.errors || []).map((e) => `${e.target}: ${e.error}`)).join(" · ");
        await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_FAIL_COUNT, "pdf_archive_fail_count", String(current + 1));
        await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_LAST_ERROR, "pdf_archive_last_error", msg);
        setLastError(msg);
      } else if (anyRealUpload) {
        await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_FAIL_COUNT, "pdf_archive_fail_count", "0");
        await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_LAST_ERROR, "pdf_archive_last_error", "");
        setLastError("");
      }

      return { ok: true, results, anyRealUpload, anyFailure };
    } catch (err) {
      log.error("performRun failed:", err);
      const msg = String(err?.message || err);
      await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_LAST_ERROR, "pdf_archive_last_error", msg);
      setLastError(msg);
      return { ok: false, error: msg };
    } finally {
      isRunning.current = false;
    }
  }, []);

  // Startup-Check (einmalig beim Mount, verzoegert damit DB-/Settings-Loads
  // abgeschlossen sind)
  useEffect(() => {
    // Selbstheilung: falls ein frueherer Lauf durch einen Hang (z.B. alte
    // Buggy-Version der PDF-Generierung) den Running-Flag blockiert hat,
    // hier explizit zuruecksetzen. Kostet nichts, schuetzt vor stuck state.
    isRunning.current = false;
    const timer = setTimeout(() => {
      performRun({ source: "startup" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [performRun]);

  // Resume-Check (App-Wechsel von Background → Foreground)
  useEffect(() => {
    let handle = null;
    (async () => {
      handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          performRun({ source: "resume" });
        }
      });
    })();
    return () => {
      if (handle) handle.remove();
    };
  }, [performRun]);

  return { lastRun, lastError, performRun };
}
