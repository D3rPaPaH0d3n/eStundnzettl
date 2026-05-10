/**
 * useAutoPdfArchive — Automatisches monatliches PDF-Archiv.
 *
 * Generiert periodisch einen PDF-Report des aktuellen Monats und
 * verteilt ihn an alle konfigurierten Ziele (lokal, Nextcloud,
 * Google Drive). Im Gegensatz zu `useAutoBackup` (das JSON
 * synchronisiert) erzeugt dieser Hook eine "fertige" PDF, die auch
 * ohne App lesbar ist.
 *
 * ### Strategie
 * - **Mount + App-Resume**: prüft ob heute schon ein Lauf
 *   stattgefunden hat (`PDF_ARCHIVE_LAST_RUN`). Falls nein →
 *   PDF des aktuellen Monats (bis heute) generieren und verteilen.
 * - **Monats-Übergang**: zuerst das vergangene Monat final
 *   exportieren, dann das neue Monat.
 * - **Content-Hash-Skip**: wenn sich gegenüber dem letzten Lauf
 *   nichts geändert hat (`PDF_ARCHIVE_LAST_HASH`), wird der
 *   Generate-/Upload-Pfad komplett übersprungen.
 * - **Unabhängig von useAutoBackup**: das JSON-Backup-Verhalten
 *   bleibt komplett unberührt.
 *
 * @param entries — alle Einträge (werden pro Lauf auf den
 *                  jeweiligen Monat gefiltert)
 * @param userData — User-Profil für Report-Header und Soll-Zeit
 * @param workCodes — Tätigkeitscodes für die Label-Auflösung im PDF
 *
 * @returns
 * - `lastRun` — ISO-Date des letzten erfolgreichen Laufs ("YYYY-MM-DD")
 *   oder null
 * - `lastError` — kurze Fehlermeldung des letzten fehlgeschlagenen
 *   Laufs oder null
 * - `performRun(opts?)` — Manueller Trigger mit Optionen
 *   `{ month?, year?, force? }`. `force: true` ignoriert Hash-Skip
 *   und "already-today"-Checks.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { App } from "@capacitor/app";
import type { Entry, UserData, WorkCode, CalculationConfig } from '../types';
import type { Locale } from '../locales/types';
import { STORAGE_KEYS } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";
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

const PDF_ARCHIVE_SETTING_KEYS: Record<string, string> = {
  pdf_archive_enabled: STORAGE_KEYS.PDF_ARCHIVE_ENABLED,
  pdf_archive_local: STORAGE_KEYS.PDF_ARCHIVE_LOCAL,
  pdf_archive_nextcloud: STORAGE_KEYS.PDF_ARCHIVE_NEXTCLOUD,
  pdf_archive_gdrive: STORAGE_KEYS.PDF_ARCHIVE_GDRIVE,
  pdf_archive_last_run: STORAGE_KEYS.PDF_ARCHIVE_LAST_RUN,
  pdf_archive_last_month: STORAGE_KEYS.PDF_ARCHIVE_LAST_MONTH,
  pdf_archive_fail_count: STORAGE_KEYS.PDF_ARCHIVE_FAIL_COUNT,
  pdf_archive_last_error: STORAGE_KEYS.PDF_ARCHIVE_LAST_ERROR,
};

function localStorageKeyForSetting(sqlKey: string): string | undefined {
  if (sqlKey.startsWith(`${STORAGE_KEYS.PDF_ARCHIVE_LAST_HASH}_`)) return sqlKey;
  return PDF_ARCHIVE_SETTING_KEYS[sqlKey];
}

async function writeSetting(sqlKey: string, value: string | number | boolean): Promise<void> {
  if (isSQLiteActive()) {
    try {
      await setSetting(sqlKey, value);
    } catch (e) {
      log.warn(`SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
    return;
  }

  const lsKey = localStorageKeyForSetting(sqlKey);
  if (lsKey) localStorage.setItem(lsKey, String(value));
}

async function readSettingString(sqlKey: string): Promise<string> {
  if (!isSQLiteActive()) {
    const lsKey = localStorageKeyForSetting(sqlKey);
    return lsKey ? localStorage.getItem(lsKey) || "" : "";
  }
  return String(await getSetting(sqlKey) || "");
}

async function readSettingBool(sqlKey: string): Promise<boolean> {
  if (!isSQLiteActive()) {
    const lsKey = localStorageKeyForSetting(sqlKey);
    return lsKey ? localStorage.getItem(lsKey) === "true" : false;
  }
  const value = await getSetting(sqlKey);
  return value === true || value === "true";
}

/** Prueft, ob der letzte Lauf vor heute 00:00 liegt. */
async function isDueToday(): Promise<boolean> {
  const last = await readSettingString("pdf_archive_last_run");
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

async function runForMonth({ entries, userData, workCodes, year, month, targets, locale, calculationConfig }: { entries: Entry[]; userData: UserData; workCodes: WorkCode[]; year: number; month: number; targets: PdfArchiveTargets; locale?: Locale; calculationConfig?: CalculationConfig | null }) {
  const filename = buildArchiveFilename({ year, month, userData });
  const currentDate = new Date();
  const newHash = hashMonthContent({ entries, userData, year, month, locale, calculationConfig, currentDate });
  const lastHashKey = `${STORAGE_KEYS.PDF_ARCHIVE_LAST_HASH}_${year}-${String(month).padStart(2, "0")}`;
  const prevHash = await readSettingString(lastHashKey);

  if (prevHash === newHash) {
    log.info(`Hash unveraendert fuer ${year}-${month} — kein Upload.`);
    return { skipped: true, filename };
  }

  const monthEntries = filterEntriesForMonth(entries, year, month);
  if (monthEntries.length === 0 && prevHash == null) {
    // Nichts zu exportieren und auch nichts vorher — komplett ueberspringen
    return { skipped: true, filename, empty: true };
  }

  const blob = await generateMonthlyPdfBlob({ year, month, entries, userData, workCodes, locale, calculationConfig, currentDate });
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
    await writeSetting(lastHashKey, newHash);
  }

  return { skipped: false, filename, results, anyOk, errors };
}

export function useAutoPdfArchive(entries: Entry[], userData: UserData, workCodes: WorkCode[], locale?: Locale, calculationConfig?: CalculationConfig | null) {
  const latestDataRef = useRef<{ entries: Entry[]; userData: UserData; workCodes: WorkCode[] }>({ entries, userData, workCodes });
  const isRunning = useRef<boolean>(false);
  const [lastRun, setLastRun] = useState(
    () => ""
  );
  const [lastError, setLastError] = useState(
    () => ""
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [run, error] = await Promise.all([
          readSettingString("pdf_archive_last_run"),
          readSettingString("pdf_archive_last_error"),
        ]);
        if (cancelled) return;
        setLastRun(run);
        setLastError(error);
      } catch (err) {
        log.warn("PDF archive status load failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    latestDataRef.current = { entries, userData, workCodes };
  }, [entries, userData, workCodes]);

  const getActiveTargets = async (): Promise<PdfArchiveTargets | null> => {
    const masterOn = await readSettingBool("pdf_archive_enabled");
    if (!masterOn) return null;
    const targets = {
      local: await readSettingBool("pdf_archive_local"),
      nextcloud: await readSettingBool("pdf_archive_nextcloud"),
      gdrive: await readSettingBool("pdf_archive_gdrive"),
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

    const targets = await getActiveTargets();
    if (!targets) {
      log.info(`performRun (${source}) — nicht aktiv, skip.`);
      return { ok: false, reason: "disabled" };
    }

    if (!force && !(await isDueToday())) {
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
      const lastYM = await readSettingString("pdf_archive_last_month");

      const results = [];

      // Monats-Uebergang: Vormonat finalisieren (letzter Tag war also im Vormonat)
      if (lastYM && lastYM !== currentYM) {
        const [py, pm] = lastYM.split("-").map(Number);
        if (py && pm) {
          log.info(`Monats-Uebergang erkannt: finalisiere ${lastYM}`);
          const prevRes = await runForMonth({
            entries, userData, workCodes,
            year: py, month: pm, targets, locale, calculationConfig,
          });
          results.push({ month: lastYM, ...prevRes });
        }
      }

      // Aktuelles Monat
      const curRes = await runForMonth({
        entries, userData, workCodes,
        year: now.getFullYear(), month: now.getMonth() + 1, targets, locale, calculationConfig,
      });
      results.push({ month: currentYM, ...curRes });

      // Status-Update
      const today = todayStr();
      const anyRealUpload = results.some((r) => !r.skipped && r.anyOk);
      const anyFailure = results.some((r) => !r.skipped && r.errors && r.errors.length > 0);

      await writeSetting("pdf_archive_last_run", today);
      await writeSetting("pdf_archive_last_month", currentYM);
      setLastRun(today);

      if (anyFailure) {
        const current = parseInt(await readSettingString("pdf_archive_fail_count") || "0", 10);
        const msg = results.flatMap((r) => (r.errors || []).map((e) => `${e.target}: ${e.error}`)).join(" · ");
        await writeSetting("pdf_archive_fail_count", String(current + 1));
        await writeSetting("pdf_archive_last_error", msg);
        setLastError(msg);
      } else if (anyRealUpload) {
        await writeSetting("pdf_archive_fail_count", "0");
        await writeSetting("pdf_archive_last_error", "");
        setLastError("");
      }

      return { ok: true, results, anyRealUpload, anyFailure };
    } catch (err) {
      log.error("performRun failed:", err);
      const msg = String((err as Error)?.message || err);
      await writeSetting("pdf_archive_last_error", msg);
      setLastError(msg);
      return { ok: false, error: msg };
    } finally {
      isRunning.current = false;
    }
  }, [locale, calculationConfig]);

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
    let handle: { remove: () => void } | null = null;
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
