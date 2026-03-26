/**
 * useSettings.js — Hook für Settings mit SQLite-Persistenz
 *
 * Settings werden in SQLite gespeichert (settings-Tabelle als Key-Value).
 * Bei Web/Dev: fällt auf localStorage zurück.
 */

import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS, WORK_MODELS } from "./constants";
import { getDb } from "../db/database";
import { setStorageMode } from "../db/storageMode";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";

// ─── Migration: localStorage → SQLite (einmalig) ───
const SETTINGS_MIGRATION_FLAG = "estundnzettl_settings_migrated";

function isSettingsMigrationDone() {
  return localStorage.getItem(SETTINGS_MIGRATION_FLAG) === "true";
}

async function migrateSettingsToSQLite() {
  if (isSettingsMigrationDone()) return;

  try {
    // User Data
    const userStored = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStored && userStored !== "undefined") {
      try {
        const userData = JSON.parse(userStored);
        if (userData && typeof userData === "object") {
          await setSetting("userData", userData);
        }
      } catch {}
    }

    // Theme
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (theme) {
      await setSetting("theme", theme);
    }

    // Cloud Sync
    const cloudSync = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
    if (cloudSync === "true") {
      await setSetting("cloudSyncEnabled", true);
    }

    // Local Backup
    const localBackup = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
    if (localBackup === "true") {
      await setSetting("localBackupEnabled", true);
    }

    localStorage.setItem(SETTINGS_MIGRATION_FLAG, "true");
    console.info("[useSettings] Migration nach SQLite abgeschlossen");
  } catch (err) {
    console.error("[useSettings] Migration fehlgeschlagen:", err);
  }
}

// ─── Default User Data ───
const DEFAULT_USER = {
  name: "",
  position: "",
  photo: null,
  workDays: [...WORK_MODELS[0].days],
};

export function useSettings() {
  const [userData, setUserDataState] = useState(DEFAULT_USER);
  const [theme, setThemeState] = useState("system");
  const [cloudSyncEnabled, setCloudSyncState] = useState(false);
  const [localBackupEnabled, setLocalBackupState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── Initial Load ───
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();

        if (!db) {
          // Web/Dev → nur localStorage
          setStorageMode("localStorage");
          if (!cancelled) {
            // Load from localStorage
            try {
              const stored = localStorage.getItem(STORAGE_KEYS.USER);
              if (stored && stored !== "undefined") {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === "object") {
                  if (!Array.isArray(parsed.workDays) || parsed.workDays.length !== 7) {
                    parsed.workDays = [...WORK_MODELS[0].days];
                  }
                  setUserDataState(parsed);
                }
              }
            } catch {}

            const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
            if (storedTheme) setThemeState(storedTheme);

            const storedCloud = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
            setCloudSyncState(storedCloud === "true");

            const storedLocal = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
            setLocalBackupState(storedLocal === "true");
          }
        } else {
          // SQLite verfügbar → Migration + Load
          setStorageMode("sqlite");
          await migrateSettingsToSQLite();

          if (!cancelled) {
            try {
              const dbUser = await getSetting("userData", null);
              if (dbUser && typeof dbUser === "object") {
                if (!Array.isArray(dbUser.workDays) || dbUser.workDays.length !== 7) {
                  dbUser.workDays = [...WORK_MODELS[0].days];
                }
                setUserDataState(dbUser);
              }
            } catch {}

            const dbTheme = await getSetting("theme", "system");
            setThemeState(dbTheme);

            const dbCloud = await getSetting("cloudSyncEnabled", false);
            setCloudSyncState(dbCloud);

            const dbLocal = await getSetting("localBackupEnabled", false);
            setLocalBackupState(dbLocal);
          }
        }
      } catch (err) {
        console.error("[useSettings] Init fehlgeschlagen:", err);
        // Fallback auf localStorage
        setStorageMode("localStorage");
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.USER);
          if (stored && stored !== "undefined") {
            setUserDataState(JSON.parse(stored));
          }
        } catch {}
      }

      if (!cancelled) setIsLoaded(true);
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── Theme Apply Effect ───
  useEffect(() => {
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

  // ─── Setters mit SQLite-Persistenz ───
  const setUserData = useCallback((newData) => {
    setUserDataState(newData);
    // Persist async
    getDb().then((db) => {
      if (db) {
        setSetting("userData", newData).catch(console.error);
      }
      // localStorage für Web/Dev und Backup-Kompatibilität
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newData));
    });
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    getDb().then((db) => {
      if (db) {
        setSetting("theme", newTheme).catch(console.error);
      }
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    });
  }, []);

  const setCloudSyncEnabled = useCallback((enabled) => {
    setCloudSyncState(enabled);
    getDb().then((db) => {
      if (db) {
        setSetting("cloudSyncEnabled", enabled).catch(console.error);
      }
      if (enabled) {
        localStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, "true");
      } else {
        localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
      }
    });
  }, []);

  const setLocalBackupEnabled = useCallback((enabled) => {
    setLocalBackupState(enabled);
    getDb().then((db) => {
      if (db) {
        setSetting("localBackupEnabled", enabled).catch(console.error);
      }
      if (enabled) {
        localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED, "true");
      } else {
        localStorage.removeItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
      }
    });
  }, []);

  // Legacy alias
  const setAutoBackup = setCloudSyncEnabled;

  return {
    userData,
    setUserData,
    theme,
    setTheme,
    autoBackup: cloudSyncEnabled,
    setAutoBackup,
    cloudSyncEnabled,
    setCloudSyncEnabled,
    localBackupEnabled,
    setLocalBackupEnabled,
    isLoaded,
  };
}
