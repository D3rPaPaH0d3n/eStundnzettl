import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Entry, UserData } from '../types';
import { uploadOrUpdateFile, getValidToken } from "../utils/googleDrive";
import { writeBackupFile } from "../utils/storageBackup";
import { uploadBackup as ncUploadBackup } from "../utils/nextcloudClient";
import { STORAGE_KEYS, BACKUP_CONFIG } from "./constants";
import { deobfuscate } from "../utils/obfuscate";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";
import { logger } from "../utils/logger";
import { getErrorMessage } from "../utils/errorUtils";

// ─── Dual-Write Helpers (SQLite + localStorage) ─────────────

/** Liest aus localStorage (sync, für Init-State). SQLite wird async nachgeladen. */
function readLSInt(key: string, fallback: number = 0): number {
  return parseInt(localStorage.getItem(key) || String(fallback), 10);
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
function isBackoffActive(key: string): boolean {
  const iso = localStorage.getItem(key);
  if (!iso) return false;
  const until = Date.parse(iso);
  if (Number.isNaN(until)) return false;
  return until > Date.now();
}

/** Dual-Write: localStorage + SQLite (mit Rollback bei Fehler). */
async function dualWrite(lsKey: string, sqlKey: string, value: string | number | boolean): Promise<void> {
  const prev = localStorage.getItem(lsKey);
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    try {
      await setSetting(sqlKey, value);
    } catch (e) {
      if (prev !== null) localStorage.setItem(lsKey, prev);
      else localStorage.removeItem(lsKey);
      logger.error(`[useAutoBackup] SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
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
 * `backupFailCount` wird sowohl in localStorage als auch SQLite
 * persistiert (dual-write). Nach 5 aufeinander folgenden Fehlern
 * zeigt der Hook einen persistenten Toast. Die UI
 * (`BackupSettings.tsx`) liest den State separat aus localStorage
 * und zeigt ab 3 Fehlern einen Retry-Button.
 *
 * @param entries — alle Einträge, werden Teil des Backup-Payloads
 * @param userData — User-Profil, wird Teil des Backup-Payloads
 * @param isEnabled — Master-Switch (wenn false UND kein Target
 *                    explizit aktiv ist, wird nichts gemacht)
 *
 * @returns
 * - `backupFailCount` — aktueller Cloud-Fail-Counter (für UI-Warnung)
 * - `triggerManualBackup()` — manueller Retry, ignoriert aktive
 *   Backoffs und überschreibt Hash-Skip
 */
export function useAutoBackup(entries: Entry[], userData: UserData, isEnabled: boolean) {
  const { t } = useTranslation();
  const latestDataRef = useRef<{ entries: Entry[]; userData: UserData }>({ entries, userData });
  const lastHash = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUploading = useRef<boolean>(false);
  const [backupFailCount, setBackupFailCount] = useState(
    () => readLSInt(STORAGE_KEYS.BACKUP_FAIL_COUNT)
  );

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
    latestDataRef.current = { entries, userData };
  }, [entries, userData]);

  const createHash = (data: { entries: Entry[]; userData: UserData }): string => {
    const str = JSON.stringify(data.userData) + JSON.stringify(data.entries);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return String(hash);
  };

  const clearCloudErrorState = async () => {
    await dualWrite(STORAGE_KEYS.BACKUP_FAIL_COUNT, "backup_fail_count", "0");
    await dualWrite(STORAGE_KEYS.BACKUP_LAST_ERROR, "backup_last_error", "");
    await dualWrite(STORAGE_KEYS.BACKUP_BACKOFF_UNTIL, "backup_backoff_until", "");
    setBackupFailCount(0);
  };

  const registerCloudFailure = async (error: unknown) => {
    const current = readLSInt(STORAGE_KEYS.BACKUP_FAIL_COUNT);
    const newCount = current + 1;
    const message = getErrorMessage(error, "Cloud-Backup fehlgeschlagen");
    const backoffUntilIso = new Date(Date.now() + calculateBackoffDelay(newCount)).toISOString();
    await dualWrite(STORAGE_KEYS.BACKUP_FAIL_COUNT, "backup_fail_count", String(newCount));
    await dualWrite(STORAGE_KEYS.BACKUP_LAST_ERROR, "backup_last_error", message);
    await dualWrite(STORAGE_KEYS.BACKUP_BACKOFF_UNTIL, "backup_backoff_until", backoffUntilIso);
    setBackupFailCount(newCount);
    if (newCount === 5) {
      toast.error(t("toasts.autoBackup.failed5x"), { duration: 8000 });
    }
    logger.warn("Cloud-Backup fehlgeschlagen:", error);
  };

  const clearNextcloudErrorState = async () => {
    await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT, "nextcloud_backup_fail_count", "0");
    await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR, "nextcloud_backup_last_error", "");
    await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKOFF_UNTIL, "nextcloud_backoff_until", "");
  };

  const registerNextcloudFailure = async (error: unknown) => {
    const current = readLSInt(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT);
    const newCount = current + 1;
    const message = getErrorMessage(error, "Nextcloud-Backup fehlgeschlagen");
    const backoffUntilIso = new Date(Date.now() + calculateBackoffDelay(newCount)).toISOString();
    await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT, "nextcloud_backup_fail_count", String(newCount));
    await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR, "nextcloud_backup_last_error", message);
    await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKOFF_UNTIL, "nextcloud_backoff_until", backoffUntilIso);
  };

  const performBackup = async (source: "Auto-Save" | "Background" | "Manual" = "Auto-Save") => {
    const { entries, userData } = latestDataRef.current;

    const cloudActive = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true";
    const localActive = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true";
    const ncActive = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_ENABLED) === "true";

    if (!isEnabled && !cloudActive && !localActive && !ncActive) return;
    if (!entries || entries.length === 0) return;
    if (isUploading.current) return;

    const currentHash = createHash({ entries, userData });
    if (currentHash === lastHash.current && source === "Auto-Save") return;

    // Manual-Retry ignoriert Backoff und Hash-Skip (falls wir oben durch Hash weg sind,
    // hätten wir schon returned; dieser Branch greift nur wenn sich Daten geändert haben).
    const ignoreBackoff = source === "Manual";

    const payload = {
      user: userData,
      entries,
      lastModified: new Date().toISOString(),
      note: "eStundnzettl Auto-Sync",
      version: "v6",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    isUploading.current = true;

    try {
      if (localActive) {
        try {
          await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
        } catch {
          // Silent fail for local backup
        }
      }

      if (cloudActive) {
        if (!ignoreBackoff && isBackoffActive(STORAGE_KEYS.BACKUP_BACKOFF_UNTIL)) {
          const until = localStorage.getItem(STORAGE_KEYS.BACKUP_BACKOFF_UNTIL);
          logger.warn(`[useAutoBackup] Cloud-Backup übersprungen, Backoff aktiv bis ${until}`);
        } else {
          try {
            const authResponse = await getValidToken();

            if (authResponse?.accessToken) {
              await uploadOrUpdateFile(authResponse.accessToken, BACKUP_CONFIG.FILENAME, payload);
              lastHash.current = currentHash;
              await dualWrite(STORAGE_KEYS.LAST_BACKUP, "last_backup", new Date().toISOString());
              await clearCloudErrorState();
            } else {
              throw new Error("AUTH_REQUIRED");
            }
          } catch (cloudErr) {
            await registerCloudFailure(cloudErr);
          }
        }
      }

      // Nextcloud Backup
      if (ncActive) {
        if (!ignoreBackoff && isBackoffActive(STORAGE_KEYS.NEXTCLOUD_BACKOFF_UNTIL)) {
          const until = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_BACKOFF_UNTIL);
          logger.warn(`[useAutoBackup] Nextcloud-Backup übersprungen, Backoff aktiv bis ${until}`);
        } else {
          try {
            const ncUrl = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL) || "";
            const ncUser = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || "";
            const ncPass = await deobfuscate(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || "");
            if (ncUrl && ncUser && ncPass) {
              await ncUploadBackup(ncUrl, ncUser, ncPass, payload);
              lastHash.current = currentHash;
              await dualWrite(STORAGE_KEYS.LAST_BACKUP, "last_backup", new Date().toISOString());
              await clearNextcloudErrorState();
            }
          } catch (ncErr) {
            await registerNextcloudFailure(ncErr);
            logger.warn("Nextcloud-Backup fehlgeschlagen:", ncErr);
          }
        }
      }

      if (localActive && !cloudActive && !ncActive) {
        lastHash.current = currentHash;
        // Dual-Write: LAST_BACKUP
        await dualWrite(STORAGE_KEYS.LAST_BACKUP, "last_backup", new Date().toISOString());
      }

      if (source === "Manual") {
        toast.success(t("toasts.autoBackup.completed"));
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
  }, [entries, userData, isEnabled]);

  const triggerManualBackup = () => performBackup("Manual");

  return { backupFailCount, triggerManualBackup };
}
