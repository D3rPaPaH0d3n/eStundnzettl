import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth } from "../utils/googleDrive";
import { writeBackupFile, hasBackupTarget } from "../utils/storageBackup";
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

    const jsonString = JSON.stringify(payload, null, 2);
    isUploading.current = true;

    try {
        // -------------------------------------------------------
        // 1. LOKALES BACKUP
        // -------------------------------------------------------
        if (localActive) {
            try {
                const hasTarget = hasBackupTarget();
                if (hasTarget) {
                    // SAF Methode (User hat Ordner gewählt)
                    await writeBackupFile(jsonString);
                } else {
                    // Fallback Methode (Documents/eStundnzettl)
                    
                    // Ordner sicherstellen
                    try {
                        await Filesystem.mkdir({
                            path: "eStundnzettl",
                            directory: Directory.Documents,
                            recursive: true
                        });
                    } catch (e) {}

                    // WICHTIG: Dateinamen explizit setzen
                    const fileNameStr = BACKUP_CONFIG.FILENAME || "estundnzettl_backup.json";
                    const fullPath = `eStundnzettl/${fileNameStr}`;
                    
                    // DEBUG LOG (nur falls es nochmal kracht, siehst du den Pfad)
                    // console.log("Writing local backup to:", fullPath);

                    await Filesystem.writeFile({
                        path: fullPath,
                        data: jsonString,
                        directory: Directory.Documents,
                        encoding: Encoding.UTF8
                    });
                }
            } catch (locErr) {
                console.warn("Lokales Backup fehlgeschlagen:", locErr);
            }
        }

        // -------------------------------------------------------
        // 2. CLOUD SPEICHERN
        // -------------------------------------------------------
        if (cloudActive) {
            try {
                await initGoogleAuth().catch(() => {}); 
                const authResponse = await getValidToken();
                
                if (authResponse?.accessToken) {
                    await uploadOrUpdateFile(authResponse.accessToken, BACKUP_CONFIG.FILENAME, payload);
                    console.log(`☁️ Cloud Sync OK (${source})`);
                    lastHash.current = currentHash;
                } else {
                    console.log("⏳ Cloud Sync: Token abgelaufen (Silent)");
                }
            } catch (cloudErr) {
                console.warn("Cloud Sync Fehler:", cloudErr);
            }
        }

    } catch (err) {
        console.error("Backup Error (Global):", err);
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