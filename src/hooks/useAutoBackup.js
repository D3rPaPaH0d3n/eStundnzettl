import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
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

    // 🔍 DEBUG LOGS - Strings statt Objekte für Capacitor Logcat!
    console.log("[BACKUP] ════════════════════════════════════");
    console.log("[BACKUP] Trigger: " + source);
    console.log("[BACKUP] Cloud aktiv: " + cloudActive);
    console.log("[BACKUP] Lokal aktiv: " + localActive);
    console.log("[BACKUP] Einträge: " + (entries?.length || 0));
    console.log("[BACKUP] isEnabled prop: " + isEnabled);
    console.log("[BACKUP] ════════════════════════════════════");

    if (!isEnabled && !cloudActive && !localActive) {
        console.log("[BACKUP] SKIP: nichts aktiviert");
        return;
    }
    if (!entries || entries.length === 0) {
        console.log("[BACKUP] SKIP: keine Einträge");
        return;
    }
    if (isUploading.current) {
        console.log("[BACKUP] SKIP: Upload läuft bereits");
        return;
    }

    const currentHash = createHash({ entries, userData });
    if (currentHash === lastHash.current && source === "Auto-Save") {
        console.log("[BACKUP] SKIP: keine Änderungen (Hash: " + currentHash + ")");
        return;
    }

    const payload = {
      user: userData,
      entries,
      lastModified: new Date().toISOString(),
      note: "eStundnzettl Auto-Sync",
      version: "v6" 
    };

    isUploading.current = true;
    console.log("[BACKUP] START - Hash: " + currentHash);

    try {
        // -------------------------------------------------------
        // 1. LOKALES BACKUP
        // -------------------------------------------------------
        if (localActive) {
            try {
                console.log("[BACKUP] LOCAL: Starte...");
                await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
                console.log("[BACKUP] LOCAL: OK");
            } catch (locErr) {
                console.log("[BACKUP] LOCAL: FEHLER - " + (locErr?.message || String(locErr)));
            }
        }

        // -------------------------------------------------------
        // 2. CLOUD SPEICHERN
        // -------------------------------------------------------
        if (cloudActive) {
            try {
                console.log("[BACKUP] CLOUD: Starte...");
                await initGoogleAuth().catch(() => {}); 
                const authResponse = await getValidToken();
                
                if (authResponse?.accessToken) {
                    console.log("[BACKUP] CLOUD: Token vorhanden, uploade...");
                    await uploadOrUpdateFile(authResponse.accessToken, BACKUP_CONFIG.FILENAME, payload);
                    console.log("[BACKUP] CLOUD: OK");
                    lastHash.current = currentHash;
                } else {
                    console.log("[BACKUP] CLOUD: WARNUNG - Kein Token erhalten");
                }
            } catch (cloudErr) {
                console.log("[BACKUP] CLOUD: FEHLER - " + (cloudErr?.message || String(cloudErr)));
            }
        }

        // Hash auch bei nur lokalem Backup updaten
        if (localActive && !cloudActive) {
            lastHash.current = currentHash;
        }

    } catch (err) {
        console.log("[BACKUP] GLOBAL ERROR: " + (err?.message || String(err)));
    } finally {
        isUploading.current = false;
        console.log("[BACKUP] ENDE ════════════════════════════");
    }
  };

  useEffect(() => {
    const setupListener = async () => {
        await App.removeAllListeners();
        App.addListener('appStateChange', ({ isActive }) => {
            console.log("[BACKUP] appStateChange: isActive=" + isActive);
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