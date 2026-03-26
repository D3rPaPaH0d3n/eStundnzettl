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
        // SQLite ist immer verfügbar (reine Android-App)
        const db = await getDb();
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
      } catch (err) {
        console.error("[useSettings] Init fehlgeschlagen:", err);
        // Kein Fallback mehr — SQLite ist Pflicht
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
    // Persist in SQLite
    setSetting("userData", newData).catch(console.error);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    setSetting("theme", newTheme).catch(console.error);
  }, []);

  const setCloudSyncEnabled = useCallback((enabled) => {
    setCloudSyncState(enabled);
    setSetting("cloudSyncEnabled", enabled).catch(console.error);
  }, []);

  const setLocalBackupEnabled = useCallback((enabled) => {
    setLocalBackupState(enabled);
    setSetting("localBackupEnabled", enabled).catch(console.error);
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
