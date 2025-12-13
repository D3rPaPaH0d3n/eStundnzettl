import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { uploadToGoogleDrive } from "../utils/googleDrive";
import toast from "react-hot-toast";

export function useAutoBackup(entries, userData, isEnabled) {
  useEffect(() => {
    const performAutoBackup = async () => {
      // 1. Grund-Bedingungen prüfen (Ist Backup an? Gibt es Einträge?)
      if (!isEnabled || entries.length === 0) return;
      
      const today = new Date().toISOString().split("T")[0];
      const lastBackup = localStorage.getItem("kogler_last_backup_date");
      
      // Abbruch, wenn heute schon ein Backup gemacht wurde
      if (lastBackup === today) return;

      // Datenpaket schnüren
      const payload = { 
        user: userData, 
        entries, 
        exportedAt: new Date().toISOString(), 
        note: "Auto-Backup" 
      };
      
      const fileName = `kogler_backup_${today}.json`;

      // 2. LOKALES BACKUP (Sicherheitshalber immer im Documents Ordner speichern)
      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.writeFile({ 
            path: fileName, 
            data: JSON.stringify(payload), 
            directory: Directory.Documents, 
            encoding: Encoding.UTF8 
          });
          console.log("Lokal gespeichert:", fileName);
        } catch (err) { 
          console.error("Lokales Backup fehlgeschlagen", err); 
        }
      }

      // 3. CLOUD UPLOAD (Nur wenn der User sich verbunden hat)
      const isCloudEnabled = localStorage.getItem("kogler_cloud_sync") === "true";
      
      if (isCloudEnabled) {
        try {
          // Versuchen, das Token im Hintergrund zu erneuern
          const authResponse = await GoogleAuth.refresh().catch(() => null);
          
          if (authResponse && authResponse.accessToken) {
            // Upload starten
            await uploadToGoogleDrive(authResponse.accessToken, fileName, payload);
            console.log("Cloud Upload erfolgreich");
            toast.success("☁️ Backup in Google Drive erstellt", { duration: 4000 });
          } else {
            console.log("Cloud Backup übersprungen: Kein gültiges Token (User evtl. ausgeloggt)");
          }
        } catch (err) {
          console.error("Cloud Backup Error:", err);
          // Wir zeigen hier keinen Fehler-Toast an, um den User nicht zu nerven, 
          // falls er gerade einfach nur kein Internet hat.
        }
      }

      // Datum setzen, damit es heute nicht nochmal läuft
      localStorage.setItem("kogler_last_backup_date", today);
    };

    // Kleiner Delay (5 Sekunden) nach App-Start, damit alles geladen ist
    const timer = setTimeout(performAutoBackup, 5000);
    return () => clearTimeout(timer);
  }, [entries, userData, isEnabled]);
}