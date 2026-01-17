import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { uploadOrUpdateFile, refreshGoogleToken } from "../utils/googleDrive";
import { writeBackupFile, hasBackupTarget } from "../utils/storageBackup";
import { STORAGE_KEYS } from "./constants";

const BACKUP_FILENAME = "estundnzettl_backup.json";

export function useAutoBackup(entries, userData, isEnabled) {
  const latestDataRef = useRef({ entries, userData });
  const lastHash = useRef("");
  const debounceTimer = useRef(null);
  const isUploading = useRef(false);

  // Daten-Referenz aktuell halten
  useEffect(() => {
    latestDataRef.current = { entries, userData };
  }, [entries, userData]);

  // Hash erstellen
  const createHash = (data) => JSON.stringify(data).length + "-" + (data.entries?.length || 0);

  const performBackup = async (source) => {
    const { entries, userData } = latestDataRef.current;

    if (!isEnabled || !entries || entries.length === 0) return;
    if (isUploading.current) return;

    const payload = {
      user: userData,
      entries,
      lastModified: new Date().toISOString(),
      note: "eStundnzettl Auto-Sync"
    };

    const currentHash = createHash(payload);
    if (currentHash === lastHash.current) return;

    isUploading.current = true;
    console.log(`💾 Sync Start (${source})...`);

    try {
        // 1. LOKAL SPEICHERN
        if (Capacitor.isNativePlatform()) {
            let savedLocally = false;

            // A) Versuche den vom User gewählten Ordner (SAF / Scoped Storage)
            if (hasBackupTarget()) {
                try {
                    await writeBackupFile(BACKUP_FILENAME, payload);
                    console.log("✅ Lokal gespeichert (SAF/Benutzer-Ordner).");
                    savedLocally = true;
                } catch (safError) {
                    console.warn("⚠️ SAF Backup fehlgeschlagen, versuche Fallback:", safError);
                }
            }

            // B) Fallback: Wenn kein Ordner gewählt wurde oder SAF fehlschlug
            if (!savedLocally) {
                const fallbackDirectory = Capacitor.getPlatform() === 'ios'
                    ? Directory.Documents
                    : Directory.External;

                await Filesystem.writeFile({
                    path: BACKUP_FILENAME,
                    data: JSON.stringify(payload),
                    directory: fallbackDirectory,
                    encoding: Encoding.UTF8
                });
                console.log(`✅ Lokal gespeichert (Fallback: ${fallbackDirectory}).`);
            }
        }

        // 2. CLOUD SPEICHERN
        const isCloudEnabled = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC) === "true";
        if (isCloudEnabled) {
            const authResponse = await refreshGoogleToken();
            if (authResponse?.accessToken) {
                await uploadOrUpdateFile(authResponse.accessToken, BACKUP_FILENAME, payload);
                console.log(`☁️ Cloud Sync OK (${source})`);
                lastHash.current = currentHash;
            } else {
                console.log("⏳ Cloud Sync übersprungen - bitte neu einloggen.");
            }
        }
    } catch (err) {
        console.error("Backup Error:", err);
    } finally {
        isUploading.current = false;
    }
  };

  useEffect(() => {
    // A) App-State Listener
    const setupListener = async () => {
        await App.removeAllListeners();
        App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) performBackup("Background");
        });
    };
    setupListener();

    // B) Debounce Timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
        performBackup("Auto-Save");
    }, 2000);

    return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, userData, isEnabled]);
}