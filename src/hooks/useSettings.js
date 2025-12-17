import { useState, useEffect } from "react";
import { STORAGE_KEYS, WORK_MODELS } from "./constants";

export function useSettings() {
  // User Data
  // WICHTIG: Default erweitert für v4.4.0 (Position & WorkDays)
  // Name ist leer, damit der Onboarding-Check in App.jsx greift!
  const [userData, setUserData] = useState(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || {
      name: "", 
      position: "",
      photo: null,
      // Wir nehmen das erste Modell (38.5-classic) als Standard-Referenz
      workDays: [...WORK_MODELS[0].days] 
    }
  );

  // Theme
  const [theme, setTheme] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.THEME) || "system"
  );

  // Auto Backup Toggle
  const [autoBackup, setAutoBackup] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.AUTO_BACKUP) === "true"
  );

  // Persistenz
  useEffect(() => localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData)), [userData]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, autoBackup), [autoBackup]);
  
  // Theme Logik
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
    
    if (theme === "system") {
      systemQuery.addEventListener("change", applyTheme);
      return () => systemQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  return {
    userData,
    setUserData,
    theme,
    setTheme,
    autoBackup,
    setAutoBackup
  };
}