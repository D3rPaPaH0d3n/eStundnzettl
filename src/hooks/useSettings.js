import { useState, useEffect } from "react";
import { STORAGE_KEYS, WORK_MODELS } from "./constants";

export function useSettings() {
  // --- USER DATA ---
  // Lädt Benutzerdaten oder Fallback auf Standardwerte
  const [userData, setUserData] = useState(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || {
      name: "", 
      position: "", 
      photo: null,
      // Default: 38.5h Standard Modell
      workDays: [...WORK_MODELS[0].days] 
    }
  );

  // --- THEME ---
  const [theme, setTheme] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.THEME) || "system"
  );

  // --- BACKUP SETTINGS (Single Source of Truth Fix) ---
  
  // 1. Google Drive (ehemals 'autoBackup')
  // Liest jetzt vom neuen standardisierten Key
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true"
  );

  // 2. Lokales Backup (Neu)
  const [localBackupEnabled, setLocalBackupEnabled] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true"
  );

  // --- PERSISTENZ EFFECTS ---

  // User Data speichern
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
  }, [userData]);
  
  // Theme Logik & Speichern
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    const root = document.documentElement;
    const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const applyTheme = () => {
      if (theme === "dark") root.classList.add("dark");
      else if (theme === "light") root.classList.remove("dark");
      else if (theme === "system") {
        if (systemQuery.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };
    
    applyTheme();
    
    // Listener für System-Änderungen (nur wenn 'system' aktiv)
    if (theme === "system") {
      systemQuery.addEventListener("change", applyTheme);
      return () => systemQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  // Cloud Sync Status speichern (Sauberes Setzen/Löschen)
  useEffect(() => {
    if (cloudSyncEnabled) {
      localStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
    }
  }, [cloudSyncEnabled]);

  // Local Backup Status speichern
  useEffect(() => {
    if (localBackupEnabled) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
    }
  }, [localBackupEnabled]);

  return {
    userData,
    setUserData,
    theme,
    setTheme,
    
    // Mapping für UI-Kompatibilität (Settings.jsx erwartet 'autoBackup')
    autoBackup: cloudSyncEnabled, 
    setAutoBackup: setCloudSyncEnabled,
    
    // Explizite neue Exports
    cloudSyncEnabled,
    setCloudSyncEnabled,
    localBackupEnabled,
    setLocalBackupEnabled
  };
}