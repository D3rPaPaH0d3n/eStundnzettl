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

    // 🔍 DEBUG LOGS
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔄 Backup Trigger: ${source}`);
    console.log(`   Cloud aktiv: ${cloudActive}`);
    console.log(`   Lokal aktiv: ${localActive}`);
    console.log(`   Einträge: ${entries?.length || 0}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (!isEnabled && !cloudActive && !localActive) {
        console.log("⏭️ Backup übersprungen (nichts aktiviert)");
        return;
    }
    if (!entries || entries.length === 0) {
        console.log("⏭️ Backup übersprungen (keine Einträge)");
        return;
    }
    if (isUploading.current) {
        console.log("⏭️ Backup übersprungen (Upload läuft bereits)");
        return;
    }

    const currentHash = createHash({ entries, userData });
    if (currentHash === lastHash.current && source === "Auto-Save") {
        console.log("⏭️ Backup übersprungen (keine Änderungen)");
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

    try {
        // -------------------------------------------------------
        // 1. LOKALES BACKUP
        // -------------------------------------------------------
        if (localActive) {
            try {
                console.log("📁 Starte lokales Backup...");
                await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
                console.log("📁 ✅ Lokales Backup OK!");
            } catch (locErr) {
                console.error("📁 ❌ Lokales Backup FEHLER:", locErr?.message || locErr);
            }
        }

        // -------------------------------------------------------
        // 2. CLOUD SPEICHERN
        // -------------------------------------------------------
        if (cloudActive) {
            try {
                console.log("☁️ Starte Cloud Sync...");
                await initGoogleAuth().catch(() => {}); 
                const authResponse = await getValidToken();
                
                if (authResponse?.accessToken) {
                    await uploadOrUpdateFile(authResponse.accessToken, BACKUP_CONFIG.FILENAME, payload);
                    console.log("☁️ ✅ Cloud Sync OK!");
                    lastHash.current = currentHash;
                } else {
                    console.log("☁️ ⚠️ Kein gültiges Token");
                }
            } catch (cloudErr) {
                console.error("☁️ ❌ Cloud Sync FEHLER:", cloudErr?.message || cloudErr);
            }
        }

    } catch (err) {
        console.error("❌ Backup GLOBAL Error:", err?.message || err);
    } finally {
        isUploading.current = false;
        console.log("━━━━━━━━━ BACKUP ENDE ━━━━━━━━━");
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