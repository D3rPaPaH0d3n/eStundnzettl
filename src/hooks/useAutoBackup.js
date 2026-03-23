import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth } from "../utils/googleDrive";
import { writeBackupFile } from "../utils/storageBackup";
import { STORAGE_KEYS, BACKUP_CONFIG } from "./constants";

export function useAutoBackup(entries, userData, isEnabled) {
  const latestDataRef = useRef({ entries, userData });
  const lastHash = useRef("");
  const debounceTimer = useRef(null);
  const isUploading = useRef(false);

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
            localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
          }
        } catch (cloudErr) {
          // Silent fail for cloud backup
        }
      }

      if (localActive && !cloudActive) {
        lastHash.current = currentHash;
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
      }
    } catch (err) {
      // Silent fail
    } finally {
      isUploading.current = false;
    }
  };

  useEffect(() => {
    const setupListener = async () => {
      await App.removeAllListeners();
      App.addListener('appStateChange', ({ isActive }) => {
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
    };
  }, [entries, userData, isEnabled]);
}
