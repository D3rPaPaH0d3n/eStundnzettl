import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { uploadOrUpdateFile } from "../utils/googleDrive"; // Neue Funktion importieren!

const BACKUP_FILENAME = "kogler_backup.json"; // IMMER DER GLEICHE NAME

export function useAutoBackup(entries, userData, isEnabled) {
  const latestDataRef = useRef({ entries, userData });
  const lastHash = useRef(""); 
  const debounceTimer = useRef(null);
  const isUploading = useRef(false);

  // Daten-Referenz aktuell halten
  useEffect(() => {
    latestDataRef.current = { entries, userData };
  }, [entries, userData]);

  // Hash erstellen (um unnötige Uploads beim App-Start zu vermeiden)
  const createHash = (data) => JSON.stringify(data).length + "-" + (data.entries?.length || 0);

  const performBackup = async (source) => {
    const { entries, userData } = latestDataRef.current;
    
    // Bedingungen prüfen
    if (!isEnabled || !entries || entries.length === 0) return;
    if (isUploading.current) return;

    const payload = { 
      user: userData, 
      entries, 
      lastModified: new Date().toISOString(), // Wichtig für Versionierung
      note: "Kogler Zeit Auto-Sync" 
    };

    const currentHash = createHash(payload);
    // Wenn Daten exakt gleich wie beim letzten erfolgreichen Backup -> Abbruch
    if (currentHash === lastHash.current) return;

    isUploading.current = true;
    console.log(`💾 Sync Start (${source})...`);

    try {
        // 1. LOKAL ÜBERSCHREIBEN (Geht schnell)
        if (Capacitor.isNativePlatform()) {
            await Filesystem.writeFile({ 
                path: BACKUP_FILENAME, 
                data: JSON.stringify(payload), 
                directory: Directory.Documents, 
                encoding: Encoding.UTF8 
            });
            console.log("✅ Lokal überschrieben.");
        }

        // 2. CLOUD ÜBERSCHREIBEN (Smart Update)
        const isCloudEnabled = localStorage.getItem("kogler_cloud_sync") === "true";
        if (isCloudEnabled) {
             const authResponse = await GoogleAuth.refresh().catch(() => null);
             if (authResponse?.accessToken) {
                 // Hier rufen wir jetzt die "Smart Update" Funktion auf
                 await uploadOrUpdateFile(authResponse.accessToken, BACKUP_FILENAME, payload);
                 console.log(`☁️ Cloud Sync OK (${source})`);
                 lastHash.current = currentHash;
             }
        }
    } catch (err) {
        console.error("Backup Error:", err);
    } finally {
        isUploading.current = false;
    }
  };

  useEffect(() => {
    // A) Listener: Wenn App in Hintergrund geht (Home Button) -> Sofort speichern
    const setupListener = async () => {
        await App.removeAllListeners();
        App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) performBackup("Background");
        });
    };
    setupListener();

    // B) Debounce: Wenn sich 'entries' ändert (durch Speichern Button), warte 2s und lade dann hoch
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    // Dieser Timer startet NUR neu, wenn sich 'entries' oder 'userData' geändert haben
    debounceTimer.current = setTimeout(() => {
        performBackup("Auto-Save");
    }, 2000);

    return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, userData, isEnabled]); 
}