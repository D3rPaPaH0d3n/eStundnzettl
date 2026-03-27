/**
 * useSettings.js — Hook für App-Settings
 *
 * Welle 2: SQLite-primär mit Dual-Write auf localStorage als Sicherheitsnetz.
 * API für Consumer bleibt 100% identisch.
 *
 * Settings-Keys in SQLite (settings-Tabelle):
 *   "user"                → { name, position, photo, workDays }
 *   "theme"               → "system" | "dark" | "light"
 *   "cloud_sync_enabled"  → true | false
 *   "local_backup_enabled"→ true | false
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { STORAGE_KEYS, WORK_MODELS } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting, setSetting, deleteSetting } from "../db/repositories/settingsRepo";

// ─── localStorage Helper (identisch zum Original) ───────────

function loadUserDataFromLS() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        if (!Array.isArray(parsed.workDays) || parsed.workDays.length !== 7) {
          parsed.workDays = [...WORK_MODELS[0].days];
        }
        return parsed;
      }
    }
  } catch (e) { /* corrupt */ }
  return null;
}

function defaultUserData() {
  return {
    name: "",
    position: "",
    photo: null,
    workDays: [...WORK_MODELS[0].days],
  };
}

// ─── Hook ────────────────────────────────────────────────────

export function useSettings() {
  // --- Initialer State: immer sofort aus localStorage (kein async-Warten) ---
  const [userData, setUserData] = useState(() => loadUserDataFromLS() || defaultUserData());

  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEYS.THEME) || "system"
  );

  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true"
  );

  const [localBackupEnabled, setLocalBackupEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true"
  );

  // Nextcloud
  const [nextcloudEnabled, setNextcloudEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_ENABLED) === "true"
  );
  const [nextcloudUrl, setNextcloudUrl] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL) || ""
  );
  const [nextcloudUser, setNextcloudUser] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || ""
  );
  const [nextcloudPass, setNextcloudPass] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || ""
  );

  const sqliteReady = useRef(false);
  const initDone = useRef(false);

  // ─── SQLite-Init: Daten aus SQLite nachladen (wenn verfügbar) ───
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    if (!isSQLiteActive()) return;

    let cancelled = false;

    (async () => {
      try {
        sqliteReady.current = true;

        // Settings aus SQLite laden — nur überschreiben wenn vorhanden
        const [sqlUser, sqlTheme, sqlCloud, sqlLocal, sqlNcEnabled, sqlNcUrl, sqlNcUser, sqlNcPass] = await Promise.all([
          getSetting("user"),
          getSetting("theme"),
          getSetting("cloud_sync_enabled"),
          getSetting("local_backup_enabled"),
          getSetting("nextcloud_enabled"),
          getSetting("nextcloud_url"),
          getSetting("nextcloud_user"),
          getSetting("nextcloud_pass"),
        ]);

        if (cancelled) return;

        if (sqlUser && typeof sqlUser === "object") {
          if (!Array.isArray(sqlUser.workDays) || sqlUser.workDays.length !== 7) {
            sqlUser.workDays = [...WORK_MODELS[0].days];
          }
          setUserData(sqlUser);
        }
        if (sqlTheme) setTheme(sqlTheme);
        if (sqlCloud !== null) setCloudSyncEnabled(!!sqlCloud);
        if (sqlLocal !== null) setLocalBackupEnabled(!!sqlLocal);
        if (sqlNcEnabled !== null) setNextcloudEnabled(!!sqlNcEnabled);
        if (sqlNcUrl) setNextcloudUrl(sqlNcUrl);
        if (sqlNcUser) setNextcloudUser(sqlNcUser);
        if (sqlNcPass) setNextcloudPass(sqlNcPass);
      } catch (err) {
        console.error("[useSettings] SQLite-Load fehlgeschlagen, behalte localStorage-Daten:", err);
        sqliteReady.current = false;
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── SQLite-Write Helper (fire-and-forget) ───
  const sqliteWrite = useCallback(async (key, value) => {
    if (!sqliteReady.current) return;
    try {
      if (value === null || value === undefined) {
        await deleteSetting(key);
      } else {
        await setSetting(key, value);
      }
    } catch (err) {
      console.error(`[useSettings] SQLite-Write für "${key}" fehlgeschlagen:`, err);
    }
  }, []);

  // ─── Persistenz: Dual-Write (localStorage + SQLite) ───

  // User Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    sqliteWrite("user", userData);
  }, [userData, sqliteWrite]);

  // Theme (+ DOM-Klasse)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    sqliteWrite("theme", theme);

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
  }, [theme, sqliteWrite]);

  // Cloud Sync
  useEffect(() => {
    if (cloudSyncEnabled) {
      localStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
    }
    sqliteWrite("cloud_sync_enabled", cloudSyncEnabled);
  }, [cloudSyncEnabled, sqliteWrite]);

  // Local Backup
  useEffect(() => {
    if (localBackupEnabled) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
    }
    sqliteWrite("local_backup_enabled", localBackupEnabled);
  }, [localBackupEnabled, sqliteWrite]);

  // Nextcloud
  useEffect(() => {
    if (nextcloudEnabled) {
      localStorage.setItem(STORAGE_KEYS.NEXTCLOUD_ENABLED, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.NEXTCLOUD_ENABLED);
    }
    sqliteWrite("nextcloud_enabled", nextcloudEnabled);
  }, [nextcloudEnabled, sqliteWrite]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NEXTCLOUD_URL, nextcloudUrl);
    sqliteWrite("nextcloud_url", nextcloudUrl);
  }, [nextcloudUrl, sqliteWrite]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NEXTCLOUD_USER, nextcloudUser);
    sqliteWrite("nextcloud_user", nextcloudUser);
  }, [nextcloudUser, sqliteWrite]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NEXTCLOUD_PASS, nextcloudPass);
    sqliteWrite("nextcloud_pass", nextcloudPass);
  }, [nextcloudPass, sqliteWrite]);

  // ─── Return (API identisch zum Original) ───
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
    setLocalBackupEnabled,

    // Nextcloud
    nextcloudEnabled,
    setNextcloudEnabled,
    nextcloudUrl,
    setNextcloudUrl,
    nextcloudUser,
    setNextcloudUser,
    nextcloudPass,
    setNextcloudPass,
  };
}
