import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth } from "../utils/googleDrive";
import { writeBackupFile } from "../utils/storageBackup";
import { STORAGE_KEYS, BACKUP_CONFIG } from "./constants";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";
import { insertBackupMetadata } from "../db/repositories/backupMetadataRepo";

const BACKUP_FAIL_KEY = "estundnzettl_backup_fail_count";

export function useAutoBackup(entries, userData, isEnabled) {
  const latestDataRef = useRef({ entries, userData });
  const lastHash = useRef("");
  const debounceTimer = useRef(null);
  const isUploading = useRef(false);
  const [backupFailCount, setBackupFailCount] = useState(0);

  useEffect(() => {
    latestDataRef.current = { entries, userData };
  }, [entries, userData]);

  const createHash = (data) => {
    return JSON.stringify(data.userData).length + "-" + JSON.stringify(data.entries).length;
  };

  const performBackup = async (source) => {
    const { entries, userData } = latestDataRef.current;

    const cloudActive = await getSetting("cloudSyncEnabled", false).catch(() => localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true");
    const localActive = await getSetting("localBackupEnabled", false).catch(() => localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true");

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
            const timestamp = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);
            await setSetting("lastBackup", timestamp).catch(() => {});
            await insertBackupMetadata({ type: "auto", timestamp }).catch(() => {});
            await setSetting(BACKUP_FAIL_KEY, 0).catch(() => {});
            localStorage.setItem(BACKUP_FAIL_KEY, "0");
            setBackupFailCount(0);
          }
        } catch (cloudErr) {
          // Fehler-Counter hochzählen
          const current = await getSetting(BACKUP_FAIL_KEY, 0).catch(() => parseInt(localStorage.getItem(BACKUP_FAIL_KEY) || "0", 10));
          const newCount = current + 1;
          await setSetting(BACKUP_FAIL_KEY, newCount).catch(() => {});
          localStorage.setItem(BACKUP_FAIL_KEY, String(newCount));
          setBackupFailCount(newCount);
          console.warn("Cloud-Backup fehlgeschlagen:", cloudErr);
        }
      }

      if (localActive && !cloudActive) {
        lastHash.current = currentHash;
        const timestamp = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);
        await setSetting("lastBackup", timestamp).catch(() => {});
        await insertBackupMetadata({ type: "auto", timestamp }).catch(() => {});
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
      // Nur eigenen Listener entfernen, nicht alle App-Listener!
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
