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
import type { UserData, Theme } from '../types';
import { STORAGE_KEYS, WORK_MODELS } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting, setSetting, deleteSetting } from "../db/repositories/settingsRepo";

import { obfuscate, deobfuscate, deobfuscateLegacySync } from "../utils/obfuscate";
import { logger } from "../utils/logger";

// ─── localStorage Helper (identisch zum Original) ───────────

function loadUserDataFromLS(): UserData | null {
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
  } catch { /* corrupt */ }
  return null;
}

function defaultUserData(): UserData {
  return {
    name: "",
    position: "",
    photo: null,
    workDays: [...WORK_MODELS[0].days],
  };
}

// ─── Hook ────────────────────────────────────────────────────

/**
 * useSettings — Zentrale App-Einstellungen mit Dual-Layer-Persistenz.
 *
 * Verwaltet alle persistierten User-Präferenzen in einem Hook:
 * Profil (userData), Theme, Backup-Targets (Google Drive, lokaler
 * Ordner, Nextcloud). Jede Änderung wird synchron in localStorage
 * geschrieben und asynchron zusätzlich in SQLite (`settingsRepo`),
 * mit Rollback bei SQLite-Fehler.
 *
 * ### Nextcloud-Sonderbehandlung
 * Das Passwort wird vor dem Speichern mit `obfuscate()` (XOR +
 * Base64) verschleiert — bewusst kein echtes Crypto, weil die App
 * nur als Local-First-Tool für self-hosted Nextcloud gedacht ist
 * und Nextcloud ohnehin App-Passwörter verwendet, die serverseitig
 * widerrufbar sind. Legacy-Werte ohne Obfuskierung werden beim
 * ersten Load synchron via `deobfuscateLegacySync()` migriert.
 *
 * ### Return
 * Der Return enthält State + Setter für alle Settings. Für
 * UI-Abwärtskompatibilität wird `cloudSyncEnabled` zusätzlich als
 * `autoBackup`/`setAutoBackup` gemappt (die alte Settings-Komponente
 * erwartet diesen Namen).
 *
 * - `userData` / `setUserData` — Profil (name, position, photo, workDays)
 * - `theme` / `setTheme` — "system" | "dark" | "light"
 * - `autoBackup` / `setAutoBackup` — Alias für cloudSyncEnabled
 * - `cloudSyncEnabled` / `setCloudSyncEnabled` — Google-Drive-Auto-Sync
 * - `localBackupEnabled` / `setLocalBackupEnabled` — lokaler Ordner
 * - `nextcloudEnabled` / `setNextcloudEnabled` — Nextcloud an/aus
 * - `nextcloudUrl` / `setNextcloudUrl` — WebDAV-URL
 * - `nextcloudUser` / `setNextcloudUser` — Nextcloud-Username
 * - `nextcloudPass` / `setNextcloudPass` — Klartext-Passwort (wird
 *   intern obfuskiert gespeichert, entschlüsselt zurückgegeben)
 *
 * @remarks
 * Dieser Hook wird in `App.tsx` genau einmal instanziiert. Andere
 * Hooks/Komponenten erhalten die Werte als Props durchgereicht.
 */
export function useSettings() {
  // --- Initialer State: immer sofort aus localStorage (kein async-Warten) ---
  const [userData, setUserData] = useState<UserData>(() => loadUserDataFromLS() || defaultUserData());

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || "system"
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
  // Sync-Init nur für Legacy-"obf:"-Werte. "enc:v1:"-Werte werden im SQLite-Load-Effekt
  // asynchron entschlüsselt und setzen den State dann korrekt.
  const [nextcloudPass, setNextcloudPass] = useState(
    () => deobfuscateLegacySync(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || "")
  );

  const sqliteReady = useRef<boolean>(false);
  const initDone = useRef<boolean>(false);

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
          const u = sqlUser as Record<string, unknown>;
          if (!Array.isArray(u.workDays) || (u.workDays as unknown[]).length !== 7) {
            (u as Record<string, unknown>).workDays = [...WORK_MODELS[0].days];
          }
          setUserData(u as unknown as UserData);
        }
        if (sqlTheme) setTheme(sqlTheme as Theme);
        if (sqlCloud !== null) setCloudSyncEnabled(!!sqlCloud);
        if (sqlLocal !== null) setLocalBackupEnabled(!!sqlLocal);
        if (sqlNcEnabled !== null) setNextcloudEnabled(!!sqlNcEnabled);
        if (sqlNcUrl) setNextcloudUrl(sqlNcUrl as string);
        if (sqlNcUser) setNextcloudUser(sqlNcUser as string);
        if (sqlNcPass) {
          try {
            const plain = await deobfuscate(sqlNcPass as string);
            if (!cancelled && plain) setNextcloudPass(plain);
          } catch (err) {
            logger.error("[useSettings] Nextcloud-Pass konnte nicht entschlüsselt werden:", err);
          }
        }
      } catch (err) {
        logger.error("[useSettings] SQLite-Load fehlgeschlagen, behalte localStorage-Daten:", err);
        sqliteReady.current = false;
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── SQLite-Write Helper (fire-and-forget) ───
  const sqliteWrite = useCallback(async (key: string, value: unknown) => {
    if (!sqliteReady.current) return;
    try {
      if (value === null || value === undefined) {
        await deleteSetting(key);
      } else {
        await setSetting(key, value);
      }
    } catch (err) {
      logger.error(`[useSettings] SQLite-Write für "${key}" fehlgeschlagen:`, err);
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
    let cancelled = false;
    (async () => {
      try {
        const encrypted = await obfuscate(nextcloudPass);
        if (cancelled) return;
        localStorage.setItem(STORAGE_KEYS.NEXTCLOUD_PASS, encrypted);
        sqliteWrite("nextcloud_pass", encrypted);
      } catch (err) {
        logger.error("[useSettings] Nextcloud-Pass konnte nicht verschlüsselt werden:", err);
      }
    })();
    return () => { cancelled = true; };
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
