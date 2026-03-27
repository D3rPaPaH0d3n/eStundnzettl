import { useEffect, useRef, useState, useCallback } from "react";
import { App } from "@capacitor/app";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth, backgroundTokenRefresh } from "../utils/googleDrive";
import { writeBackupFile } from "../utils/storageBackup";
import { STORAGE_KEYS, BACKUP_CONFIG } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";

// ─── Dual-Write Helpers (SQLite + localStorage) ─────────────

/** Liest aus localStorage (sync, für Init-State). SQLite wird async nachgeladen. */
function readLSInt(key, fallback = 0) {
  return parseInt(localStorage.getItem(key) || String(fallback), 10);
}

/** Dual-Write: localStorage + SQLite (fire & forget). */
async function dualWrite(lsKey, sqlKey, value) {
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    try { await setSetting(sqlKey, value); } catch (e) {
      console.error(`[useAutoBackup] SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}

// ─── Hook ────────────────────────────────────────────────────

export function useAutoBackup(entries, userData, isEnabled) {
  const latestDataRef = useRef({ entries, userData });
  const lastHash = useRef("");
  const debounceTimer = useRef(null);
  const isUploading = useRef(false);
  const [backupFailCount, setBackupFailCount] = useState(
    () => readLSInt(STORAGE_KEYS.BACKUP_FAIL_COUNT)
  );

  // SQLite-Nachladen + proaktiver Token-Refresh (einmalig, async)
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

      // Proaktiver Token-Refresh im Hintergrund beim App-Start
      const cloudActive = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true";
      if (cloudActive) {
        backgroundTokenRefresh().catch(() => {});
      }
    })();
  }, []);

  useEffect(() => {
    latestDataRef.current = { entries, userData };
  }, [entries, userData]);

  const createHash = (data) => {
    return JSON.stringify(data.userData).length + "-" + JSON.stringify(data.entries).length;
  };

  const performBackup = async (source) => {
    const { entries, userData } = latestDataRef.current;

    const cloudActive = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true";
    const localActive = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true";

    if (!isEnabled && !cloudActive && !localActive) return;
    if (!entries || entries.length === 0) return;
    if (isUploading.current) return;

    const currentHash = createHash({ entries, userData });
    if (currentHash === lastHash.current && source === "Auto-Save") return;

    const payload = {
      user: userData,
      entries,
      lastModified: new Date().toISOString(),
      note: "eStundnzettl Auto-Sync",
      version: "v6"
    };

    isUploading.current = true;

    try {
      if (localActive) {
        try {
          await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
        } catch (locErr) {
          // Silent fail for local backup
        }
      }

      if (cloudActive) {
        try {
          await initGoogleAuth().catch(() => {});
          const authResponse = await getValidToken();

          if (authResponse?.accessToken) {
            await uploadOrUpdateFile(authResponse.accessToken, BACKUP_CONFIG.FILENAME, payload);
            lastHash.current = currentHash;
            // Dual-Write: LAST_BACKUP
            await dualWrite(STORAGE_KEYS.LAST_BACKUP, "last_backup", new Date().toISOString());
            // Erfolg: Fehler-Counter zurücksetzen (Dual-Write)
            await dualWrite(STORAGE_KEYS.BACKUP_FAIL_COUNT, "backup_fail_count", "0");
            setBackupFailCount(0);
          }
        } catch (cloudErr) {
          // Fehler-Counter hochzählen (Dual-Write)
          const current = readLSInt(STORAGE_KEYS.BACKUP_FAIL_COUNT);
          const newCount = current + 1;
          await dualWrite(STORAGE_KEYS.BACKUP_FAIL_COUNT, "backup_fail_count", String(newCount));
          setBackupFailCount(newCount);
          console.warn("Cloud-Backup fehlgeschlagen:", cloudErr);
        }
      }

      if (localActive && !cloudActive) {
        lastHash.current = currentHash;
        // Dual-Write: LAST_BACKUP
        await dualWrite(STORAGE_KEYS.LAST_BACKUP, "last_backup", new Date().toISOString());
      }
    } catch (err) {
      // Silent fail
    } finally {
      isUploading.current = false;
    }
  };

  const listenerHandle = useRef(null);

  useEffect(() => {
    const setupListener = async () => {
      if (listenerHandle.current) {
        await listenerHandle.current.remove();
        listenerHandle.current = null;
      }
      listenerHandle.current = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) performBackup("Background");
      });
    };
    setupListener();

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performBackup("Auto-Save");
    }, 2000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (listenerHandle.current) {
        listenerHandle.current.remove();
        listenerHandle.current = null;
      }
    };
  }, [entries, userData, isEnabled]);

  return { backupFailCount };
}
