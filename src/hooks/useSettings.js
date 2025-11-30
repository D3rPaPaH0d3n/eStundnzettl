import { useState, useEffect } from "react";

export function useSettings() {
  // User Data
  const [userData, setUserData] = useState(() => 
    JSON.parse(localStorage.getItem("kogler_user") || '{"name":"Markus Mustermann"}')
  );

  // Theme
  const [theme, setTheme] = useState(() => 
    localStorage.getItem("kogler_theme") || "system"
  );

  // Auto Backup Toggle
  const [autoBackup, setAutoBackup] = useState(() => 
    localStorage.getItem("kogler_auto_backup") === "true"
  );

  // Persistenz
  useEffect(() => localStorage.setItem("kogler_user", JSON.stringify(userData)), [userData]);
  useEffect(() => localStorage.setItem("kogler_auto_backup", autoBackup), [autoBackup]);
  
  // Theme Logik
  useEffect(() => {
    localStorage.setItem("kogler_theme", theme);
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