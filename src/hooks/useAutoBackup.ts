import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Attachment, CalculationConfig, Entry, UserData, WorkCode } from '../types';
import { uploadOrUpdateFile, getValidToken } from "../utils/googleDrive";
import { writeBackupFile, composeBackupPayload, type BackupDataSections } from "../utils/storageBackup";
import { uploadBackup as ncUploadBackup } from "../utils/nextcloudClient";
import { BACKUP_CONFIG } from "./constants";
import { getNextcloudAppPassword } from "../utils/nextcloudSecret";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";
import { logger } from "../utils/logger";
import { getErrorMessage } from "../utils/errorUtils";

// ─── SQLite Settings Helpers ────────────────────────────────

async function readSettingBool(key: string): Promise<boolean> {
  if (!isSQLiteActive()) {
    const lsKey = {
      cloud_sync_enabled: "estundnzettl_cloud_sync_enabled",
      local_backup_enabled: "estundnzettl_local_backup_enabled",
      nextcloud_enabled: "estundnzettl_nextcloud_enabled",
    }[key];
    return lsKey ? localStorage.getItem(lsKey) === "true" : false;
  }
  return await getSetting(key) === true;
}

async function readSettingString(key: string): Promise<string> {
  if (!isSQLiteActive()) {
    const lsKey = {
      backup_backoff_until: "estundnzettl_backup_backoff_until",
      nextcloud_backoff_until: "estundnzettl_nextcloud_backoff_until",
      nextcloud_url: "estundnzettl_nextcloud_url",
      nextcloud_user: "estundnzettl_nextcloud_user",
    }[key];
    return lsKey ? localStorage.getItem(lsKey) || "" : "";
  }
  return String(await getSetting(key) || "");
}

async function readSettingInt(key: string, fallback: number = 0): Promise<number> {
  if (!isSQLiteActive()) {
    const lsKey = {
      backup_fail_count: "estundnzettl_backup_fail_count",
      nextcloud_backup_fail_count: "estundnzettl_nextcloud_backup_fail_count",
    }[key];
    return parseInt((lsKey && localStorage.getItem(lsKey)) || String(fallback), 10);
  }
  const value = parseInt(String(await getSetting(key) || String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Exponential Backoff: berechnet wie lange der nächste Versuch nach N Fehlern
 * hinausgezögert werden soll. Hält die Auto-Backup-Logik ruhig, wenn z.B. das
 * Netzwerk dauerhaft weg ist oder ein Auth-Token abgelaufen ist, und spart
 * Akku sowie vermeidet Error-Spam.
 *
 *  - 0 Fehler → 0 ms (kein Backoff)
 *  - 1 Fehler → 2 min
 *  - 2 Fehler → 4 min
 *  - 3 Fehler → 8 min
 *  - 4 Fehler → 16 min
 *  - ≥5 Fehler → 30 min (Cap)
 *
 * Ein manueller Retry (performBackup("Manual")) ignoriert den Backoff.
 */
function calculateBackoffDelay(failCount: number): number {
  if (failCount <= 0) return 0;
  const MAX_MS = 30 * 60_000;
  const ms = Math.pow(2, failCount) * 60_000;
  return Math.min(ms, MAX_MS);
}

/** True wenn der gespeicherte Backoff-Timestamp in der Zukunft liegt. */
async function isBackoffActive(key: string): Promise<boolean> {
  const iso = await readSettingString(key);
  if (!iso) return false;
  const until = Date.parse(iso);
  if (Number.isNaN(until)) return false;
  return until > Date.now();
}

function redactBackupErrorMessage(message: string): string {
  return message
    .replace(/("(?:access[_-]?token|refresh[_-]?token|token|password|pass|appPassword)"\s*:\s*")([^"]+)(")/gi, "$1[redacted]$3")
    .replace(/(access[_-]?token|refresh[_-]?token|token|password|pass|appPassword)=([^\s&]+)/gi, "$1=[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]")
    .replace(/(Basic\s+)[A-Za-z0-9+/=-]+/gi, "$1[redacted]");
}

function backupErrorMessage(error: unknown, fallback: string): string {
  const message = getErrorMessage(error, fallback);
  if (message === "AUTH_REQUIRED") return "Google Drive Anmeldung erforderlich";
  return redactBackupErrorMessage(message);
}

async function writeSetting(key: string, value: string | number | boolean): Promise<void> {
  if (!isSQLiteActive()) {
    const lsKey = {
      backup_fail_count: "estundnzettl_backup_fail_count",
      backup_last_error: "estundnzettl_backup_last_error",
      backup_backoff_until: "estundnzettl_backup_backoff_until",
      nextcloud_backup_fail_count: "estundnzettl_nextcloud_backup_fail_count",
      nextcloud_backup_last_error: "estundnzettl_nextcloud_backup_last_error",
      nextcloud_backoff_until: "estundnzettl_nextcloud_backoff_until",
      last_backup: "estundnzettl_last_backup_date",
    }[key];
    if (lsKey) localStorage.setItem(lsKey, String(value));
    return;
  }
  if (isSQLiteActive()) {
    try {
      await setSetting(key, value);
    } catch (e) {
      logger.error(`[useAutoBackup] SQLite-Write "${key}" fehlgeschlagen:`, e);
    }
  }
}

// ─── Hook ────────────────────────────────────────────────────

/**
 * useAutoBackup — Automatischer Hintergrund-Sync auf Google Drive,
 * Nextcloud und/oder lokalen Ordner.
 *
 * Wird in `App.tsx` einmal mit den aktuellen `entries` und `userData`
 * instanziiert. Triggert ein Backup in folgenden Situationen:
 *
 * 1. **2 s nach Datenänderung** (debounced)
 * 2. **Beim App-State-Change auf Background** — über
 *    `App.addListener("appStateChange")`
 * 3. **Manuell** über den zurückgegebenen `triggerManualBackup()` —
 *    ignoriert aktive Backoff-Fenster
 *
 * ### Hash-Skip
 * Wenn sich die serialisierte Payload (userData + entries) seit dem
 * letzten Erfolg nicht verändert hat, wird der Auto-Save übersprungen.
 * Background- und Manual-Trigger ignorieren den Hash.
 *
 * ### Exponential Backoff
 * Bei Fehlern wird pro Target ein `backoff_until`-Timestamp gesetzt
 * (2/4/8/16/30 min). Während der Backoff aktiv ist, wird das
 * betreffende Target beim nächsten Auto-Trigger übersprungen.
 * Siehe {@link calculateBackoffDelay}.
 *
 * ### Fail-State
 * `backupFailCount` wird in SQLite persistiert. Nach 5 aufeinander
 * folgenden Fehlern zeigt der Hook einen persistenten Toast.
 *
 * @param entries — alle Einträge, werden Teil des Backup-Payloads
 * @param userData — User-Profil, wird Teil des Backup-Payloads
 * @param isEnabled — Master-Switch (wenn false UND kein Target
 *                    explizit aktiv ist, wird nichts gemacht)
 * @param extras — weitere Backup-Sektionen (workCodes, calculationConfig,
 *                 locale, theme, attachments, attachmentLabels), damit das
 *                 Backup den VOLLSTÄNDIGEN App-Zustand enthält
 *
 * @returns
 * - `backupFailCount` — aktueller Cloud-Fail-Counter (für UI-Warnung)
 * - `triggerManualBackup()` — manueller Retry, ignoriert aktive
 *   Backoffs und überschreibt Hash-Skip
 */
export interface AutoBackupExtras {
  workCodes?: WorkCode[];
  calculationConfig?: CalculationConfig | null;
  locale?: string | null;
  theme?: string | null;
  attachments?: Attachment[];
  attachmentLabels?: string[];
}

export function useAutoBackup(entries: Entry[], userData: UserData, isEnabled: boolean, extras?: AutoBackupExtras) {
  const { t } = useTranslation();
  const latestDataRef = useRef<{ entries: Entry[]; userData: UserData; extras?: AutoBackupExtras }>({ entries, userData, extras });
  const lastHash = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUploading = useRef<boolean>(false);
  const [backupFailCount, setBackupFailCount] = useState(() => {
    if (isSQLiteActive()) return 0;
    return parseInt(localStorage.getItem("estundnzettl_backup_fail_count") || "0", 10);
  });

  // SQLite-Nachladen (einmalig, async)
  const sqliteInitDone = useRef(false);
  useEffect(() => {
    if (sqliteInitDone.current || !isSQLiteActive()) return;
    sqliteInitDone.current = true;
    (async () => {
      try {
        const sqlFail = await getSetting("backup_fail_count");
        if (sqlFail !== null && typeof sqlFail === "number") {
          setBackupFailCount(sqlFail);
        }
      } catch { /* keep localStorage value */ }
    })();
  }, []);

  useEffect(() => {
    latestDataRef.current = { entries, userData, extras };
  }, [entries, userData, extras]);

  const createHash = (sections: BackupDataSections): string => {
    // lastModified/timezone/note absichtlich NICHT im Hash — nur der
    // eigentliche Dateninhalt entscheidet über den Auto-Save-Skip.
    const str = JSON.stringify(sections);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return String(hash);
  };

  const clearCloudErrorState = async () => {
    await writeSetting("backup_fail_count", "0");
    await writeSetting("backup_last_error", "");
    await writeSetting("backup_backoff_until", "");
    setBackupFailCount(0);
  };

  const registerCloudFailure = async (error: unknown) => {
    const current = await readSettingInt("backup_fail_count");
    const newCount = current + 1;
    const message = backupErrorMessage(error, "Cloud-Backup fehlgeschlagen");
    const backoffUntilIso = new Date(Date.now() + calculateBackoffDelay(newCount)).toISOString();
    await writeSetting("backup_fail_count", String(newCount));
    await writeSetting("backup_last_error", message);
    await writeSetting("backup_backoff_until", backoffUntilIso);
    setBackupFailCount(newCount);
    if (newCount === 5) {
      toast.error(t("toasts.autoBackup.failed5x"), { duration: 8000 });
    }
    logger.warn("Cloud-Backup fehlgeschlagen:", message);
  };

  const clearNextcloudErrorState = async () => {
    await writeSetting("nextcloud_backup_fail_count", "0");
    await writeSetting("nextcloud_backup_last_error", "");
    await writeSetting("nextcloud_backoff_until", "");
  };

  const registerNextcloudFailure = async (error: unknown) => {
    const current = await readSettingInt("nextcloud_backup_fail_count");
    const newCount = current + 1;
    const message = backupErrorMessage(error, "Nextcloud-Backup fehlgeschlagen");
    const backoffUntilIso = new Date(Date.now() + calculateBackoffDelay(newCount)).toISOString();
    await writeSetting("nextcloud_backup_fail_count", String(newCount));
    await writeSetting("nextcloud_backup_last_error", message);
    await writeSetting("nextcloud_backoff_until", backoffUntilIso);
  };

  const performBackup = async (source: "Auto-Save" | "Background" | "Manual" = "Auto-Save") => {
    const { entries, userData, extras } = latestDataRef.current;

    const cloudActive = await readSettingBool("cloud_sync_enabled");
    const localActive = await readSettingBool("local_backup_enabled");
    const ncActive = await readSettingBool("nextcloud_enabled");

    if (!isEnabled && !cloudActive && !localActive && !ncActive) return;
    if (!entries || entries.length === 0) return;
    if (isUploading.current) return;

    const sections: BackupDataSections = {
      user: userData,
      entries,
      workCodes: extras?.workCodes,
      calculationConfig: extras?.calculationConfig,
      locale: extras?.locale,
      theme: extras?.theme,
      attachments: extras?.attachments,
      attachmentLabels: extras?.attachmentLabels,
    };

    const currentHash = createHash(sections);
    if (currentHash === lastHash.current && source === "Auto-Save") return;

    // Manual-Retry ignoriert Backoff und den Auto-Save-Hash-Skip.
    const ignoreBackoff = source === "Manual";

    const payload = await composeBackupPayload(sections, "eStundnzettl Auto-Sync");

    isUploading.current = true;

    try {
      let anyBackupSucceeded = false;
      let allActiveTargetsSatisfied = true;

      if (localActive) {
        try {
          await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
          anyBackupSucceeded = true;
        } catch (localErr) {
          allActiveTargetsSatisfied = false;
          logger.warn("[useAutoBackup] Lokales Backup fehlgeschlagen:", backupErrorMessage(localErr, "Lokales Backup fehlgeschlagen"));
        }
      }

      if (cloudActive) {
        if (!ignoreBackoff && await isBackoffActive("backup_backoff_until")) {
          const until = await readSettingString("backup_backoff_until");
          logger.warn(`[useAutoBackup] Cloud-Backup übersprungen, Backoff aktiv bis ${until}`);
          allActiveTargetsSatisfied = false;
        } else {
          try {
            const authResponse = await getValidToken();

            if (authResponse?.accessToken) {
              await uploadOrUpdateFile(authResponse.accessToken, BACKUP_CONFIG.FILENAME, payload);
              anyBackupSucceeded = true;
              await clearCloudErrorState();
            } else {
              throw new Error("AUTH_REQUIRED");
            }
          } catch (cloudErr) {
            allActiveTargetsSatisfied = false;
            await registerCloudFailure(cloudErr);
          }
        }
      }

      // Nextcloud Backup
      if (ncActive) {
        if (!ignoreBackoff && await isBackoffActive("nextcloud_backoff_until")) {
          const until = await readSettingString("nextcloud_backoff_until");
          logger.warn(`[useAutoBackup] Nextcloud-Backup übersprungen, Backoff aktiv bis ${until}`);
          allActiveTargetsSatisfied = false;
        } else {
          try {
            const ncUrl = await readSettingString("nextcloud_url");
            const ncUser = await readSettingString("nextcloud_user");
            const ncPass = await getNextcloudAppPassword();
            if (ncUrl && ncUser && ncPass) {
              await ncUploadBackup(ncUrl, ncUser, ncPass, payload);
              anyBackupSucceeded = true;
              await clearNextcloudErrorState();
            } else {
              allActiveTargetsSatisfied = false;
            }
          } catch (ncErr) {
            allActiveTargetsSatisfied = false;
            await registerNextcloudFailure(ncErr);
            logger.warn("Nextcloud-Backup fehlgeschlagen:", backupErrorMessage(ncErr, "Nextcloud-Backup fehlgeschlagen"));
          }
        }
      }

      if (anyBackupSucceeded) {
        await writeSetting("last_backup", new Date().toISOString());
      }

      if (anyBackupSucceeded && allActiveTargetsSatisfied) {
        lastHash.current = currentHash;
      }

      if (source === "Manual") {
        if (anyBackupSucceeded) {
          toast.success(t("toasts.autoBackup.completed"));
        } else {
          toast.error(t("toasts.autoBackup.failed"));
        }
      }
    } catch {
      // Silent fail
    } finally {
      isUploading.current = false;
    }
  };

  const listenerHandle = useRef<{ remove: () => void } | null>(null);

  // Listener nur einmal registrieren (Mount/Unmount)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      listenerHandle.current = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && !cancelled) {
          performBackup("Background");
        }
      });
    })();

    return () => {
      cancelled = true;
      if (listenerHandle.current) {
        listenerHandle.current.remove();
        listenerHandle.current = null;
      }
    };
    // Mount-only registration. performBackup reads latestDataRef.current
    // internally, so the closure captured at mount stays correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced Auto-Save bei Datenänderungen
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performBackup("Auto-Save");
    }, 2000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // performBackup is recreated each render but reads fresh data via
    // latestDataRef. Adding it as a dep would reset the 2s debounce on
    // every render and break the "wait until edits stop" behaviour.
    // `extras` sollte vom Caller memoisiert sein (App.tsx: useMemo), damit
    // der Debounce nicht bei jedem Render neu startet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, userData, isEnabled, extras]);

  const triggerManualBackup = () => performBackup("Manual");

  return { backupFailCount, triggerManualBackup };
}
