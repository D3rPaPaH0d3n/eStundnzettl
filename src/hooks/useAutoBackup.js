import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

export function useAutoBackup(entries, userData, isEnabled) {
  useEffect(() => {
    const performAutoBackup = async () => {
      // Bedingungen prüfen
      if (!isEnabled || !Capacitor.isNativePlatform() || entries.length === 0) return;
      
      const today = new Date().toISOString().split("T")[0];
      
      // Prüfen ob heute schon gemacht
      if (localStorage.getItem("kogler_last_backup_date") === today) return;
      
      try {
        const payload = { 
          user: userData, 
          entries, 
          exportedAt: new Date().toISOString(), 
          note: "Auto" 
        };
        
        const fileName = `kogler_autobackup_${today}.json`;
        
        await Filesystem.writeFile({ 
          path: fileName, 
          data: JSON.stringify(payload), 
          directory: Directory.Documents, 
          encoding: Encoding.UTF8 
        });
        
        localStorage.setItem("kogler_last_backup_date", today);
        console.log("Auto-Backup erfolgreich:", fileName);
      } catch (err) { 
        console.error("Backup failed", err); 
      }
    };

    // Kleiner Delay beim Start
    const timer = setTimeout(performAutoBackup, 2000);
    return () => clearTimeout(timer);
  }, [entries, userData, isEnabled]);
}