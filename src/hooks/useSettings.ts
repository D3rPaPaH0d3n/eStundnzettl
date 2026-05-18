/**
 * useSettings.js — Hook für App-Settings
 *
 * SQLite ist die Source of Truth fuer Domain-Settings.
 * API für Consumer bleibt 100% identisch.
 *
 * Settings-Keys in SQLite (settings-Tabelle):
 *   "user"                → { name, position, photo, workDays }
 *   "theme"               → "system" | "dark" | "light"
 *   "material_you_enabled"→ true | false
 *   "cloud_sync_enabled"  → true | false
 *   "local_backup_enabled"→ true | false
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { UserData, Theme } from '../types';
import { STORAGE_KEYS, WORK_MODELS } from "./constants";
import { isSQLiteActive, subscribeStorageMode } from "../db/storageMode";
import { getSetting, setSetting, deleteSetting } from "../db/repositories/settingsRepo";
import type { LocaleId } from "../locales/types";
import { LOCALES } from "../locales";

import { deobfuscateLegacySync } from "../utils/obfuscate";
import { logger } from "../utils/logger";
import {
  loadOrMigrateNextcloudAppPassword,
  storeNextcloudAppPassword,
  type NextcloudSecretStatus,
} from "../utils/nextcloudSecret";

export type SettingsStorageStatus = "fallback" | "loading" | "ready" | "failed";

function loadUserDataFromLS(): UserData | null {
  if (isSQLiteActive()) return null;
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
 * useSettings — Zentrale App-Einstellungen mit SQLite-Persistenz.
 *
 * Verwaltet alle persistierten User-Präferenzen in einem Hook:
 * Profil (userData), Theme, Backup-Targets (Google Drive, lokaler
 * Ordner, Nextcloud). Domain-Settings werden in SQLite (`settingsRepo`)
 * gespeichert. localStorage bleibt nur fuer UI-/Legacy-Caches wie Theme-
 * Prepaint oder alte Nextcloud-Secret-Migrationen relevant.
 *
 * ### Nextcloud-Sonderbehandlung
 * Neue Nextcloud-App-Passwörter werden in nativer Secure Storage
 * abgelegt. Bestehende Legacy-Werte (`obf:`, `enc:v1:` oder Klartext)
 * werden gelesen und erst nach erfolgreichem Secure-Write + Verify aus
 * localStorage/SQLite entfernt. Ist Secure Storage nicht verfügbar, bleibt
 * der Legacy-Wert als Fallback erhalten und es wird kein neuer Secret-Wert
 * unsicher in localStorage/SQLite geschrieben.
 *
 * ### Return
 * Der Return enthält State + Setter für alle Settings. Für
 * UI-Abwärtskompatibilität wird `cloudSyncEnabled` zusätzlich als
 * `autoBackup`/`setAutoBackup` gemappt (die alte Settings-Komponente
 * erwartet diesen Namen).
 *
 * - `userData` / `setUserData` — Profil (name, position, photo, workDays)
 * - `theme` / `setTheme` — "system" | "dark" | "light"
 * - `materialYouEnabled` / `setMaterialYouEnabled` — optionale Android-Systemfarben
 * - `autoBackup` / `setAutoBackup` — Alias für cloudSyncEnabled
 * - `cloudSyncEnabled` / `setCloudSyncEnabled` — Google-Drive-Auto-Sync
 * - `localBackupEnabled` / `setLocalBackupEnabled` — lokaler Ordner
 * - `nextcloudEnabled` / `setNextcloudEnabled` — Nextcloud an/aus
 * - `nextcloudUrl` / `setNextcloudUrl` — WebDAV-URL
 * - `nextcloudUser` / `setNextcloudUser` — Nextcloud-Username
 * - `nextcloudPass` / `setNextcloudPass` — Klartext-Passwort im State;
 *   persistiert wird es über native Secure Storage
 *
 * @remarks
 * Dieser Hook wird in `App.tsx` genau einmal instanziiert. Andere
 * Hooks/Komponenten erhalten die Werte als Props durchgereicht.
 */
export function useSettings() {
  const [userData, setUserData] = useState<UserData>(() => loadUserDataFromLS() || defaultUserData());

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || "system"
  );

  const [materialYouEnabled, setMaterialYouEnabled] = useState(
    () => !isSQLiteActive() && localStorage.getItem(STORAGE_KEYS.MATERIAL_YOU_ENABLED) === "true"
  );

  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(
    () => !isSQLiteActive() && localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true"
  );

  const [localBackupEnabled, setLocalBackupEnabled] = useState(
    () => !isSQLiteActive() && localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true"
  );

  // Locale (länder-/regions-spezifische Berechnung)
  // `null` = noch nicht gewählt → LocaleMigrationModal wird für bestehende
  // User eingeblendet, Onboarding-Wizard setzt ihn für neue User.
  const [locale, setLocaleState] = useState<LocaleId | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);
    if (stored && stored in LOCALES) return stored as LocaleId;
    return null;
  });

  // Nextcloud
  const [nextcloudEnabled, setNextcloudEnabled] = useState(
    () => !isSQLiteActive() && localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_ENABLED) === "true"
  );
  const [nextcloudUrl, setNextcloudUrl] = useState(
    () => (!isSQLiteActive() && localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL)) || ""
  );
  const [nextcloudUser, setNextcloudUser] = useState(
    () => (!isSQLiteActive() && localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER)) || ""
  );
  // Sync-Init nur für Legacy-"obf:"-Werte. "enc:v1:"-Werte werden im SQLite-Load-Effekt
  // asynchron entschlüsselt und setzen den State dann korrekt.
  const [nextcloudPass, setNextcloudPassState] = useState(
    () => deobfuscateLegacySync(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || "")
  );

  const [sqliteReady, setSqliteReady] = useState<boolean>(false);
  const sqliteLoadStarted = useRef<boolean>(false);
  const nextcloudPassUserWrite = useRef<boolean>(false);
  const nextcloudPassTouched = useRef<boolean>(false);
  const [settingsStorageStatus, setSettingsStorageStatus] = useState<SettingsStorageStatus>(() => (
    isSQLiteActive() ? "loading" : "fallback"
  ));
  const [settingsStorageError, setSettingsStorageError] = useState<string | null>(null);
  const [nextcloudSecretStatus, setNextcloudSecretStatus] = useState<NextcloudSecretStatus>("missing");
  const [nextcloudSecretError, setNextcloudSecretError] = useState<string | null>(null);

  const setNextcloudPass = useCallback((pass: string) => {
    nextcloudPassUserWrite.current = true;
    nextcloudPassTouched.current = true;
    setNextcloudPassState(pass);
  }, []);

  // ─── SQLite-Init: Daten aus SQLite nachladen (wenn verfügbar) ───
  useEffect(() => {
    let cancelled = false;

    const loadFromSQLite = async () => {
      if (cancelled || sqliteLoadStarted.current || !isSQLiteActive()) return;
      sqliteLoadStarted.current = true;
      setSettingsStorageStatus("loading");
      setSettingsStorageError(null);

      try {
        // Settings aus SQLite laden — nur überschreiben wenn vorhanden
        const [sqlUser, sqlTheme, sqlMaterialYou, sqlCloud, sqlLocal, sqlLocale, sqlNcEnabled, sqlNcUrl, sqlNcUser, sqlNcPass] = await Promise.all([
          getSetting("user"),
          getSetting("theme"),
          getSetting("material_you_enabled"),
          getSetting("cloud_sync_enabled"),
          getSetting("local_backup_enabled"),
          getSetting("locale"),
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
        if (sqlMaterialYou !== null) setMaterialYouEnabled(!!sqlMaterialYou);
        if (sqlCloud !== null) setCloudSyncEnabled(!!sqlCloud);
        if (sqlLocal !== null) setLocalBackupEnabled(!!sqlLocal);
        if (typeof sqlLocale === "string" && sqlLocale in LOCALES) {
          setLocaleState(sqlLocale as LocaleId);
        }
        if (sqlNcEnabled !== null) setNextcloudEnabled(!!sqlNcEnabled);
        if (sqlNcUrl) setNextcloudUrl(sqlNcUrl as string);
        if (sqlNcUser) setNextcloudUser(sqlNcUser as string);
        if (sqlNcPass) {
          const secretResult = await loadOrMigrateNextcloudAppPassword(sqlNcPass);
          if (!cancelled) {
            setNextcloudSecretStatus(secretResult.status);
            setNextcloudSecretError(secretResult.message || null);
            if (secretResult.password) setNextcloudPassState(secretResult.password);
          }
        }
        setSqliteReady(true);
        setSettingsStorageStatus("ready");
      } catch (err) {
        if (cancelled) return;
        logger.error("[useSettings] SQLite-Load fehlgeschlagen:", err);
        setSqliteReady(false);
        setSettingsStorageStatus("failed");
        setSettingsStorageError(err instanceof Error ? err.message : String(err));
      }
    };

    void loadFromSQLite();

    const unsubscribe = subscribeStorageMode(() => {
      void loadFromSQLite();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // ─── SQLite-Write Helper (fire-and-forget) ───
  const sqliteWrite = useCallback(async (key: string, value: unknown) => {
    if (!sqliteReady) return;
    try {
      if (value === null || value === undefined) {
        await deleteSetting(key);
      } else {
        await setSetting(key, value);
      }
    } catch (err) {
      logger.error(`[useSettings] SQLite-Write für "${key}" fehlgeschlagen:`, err);
    }
  }, [sqliteReady]);

  const localFallbackWrite = useCallback((key: string, value: string | null) => {
    if (isSQLiteActive()) return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }, []);

  // ─── Persistenz: Domain-Settings nach SQLite ───

  // User Data
  useEffect(() => {
    localFallbackWrite(STORAGE_KEYS.USER, JSON.stringify(userData));
    sqliteWrite("user", userData);
  }, [userData, sqliteWrite, localFallbackWrite]);

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

  // Material You / Dynamic Color (default: aus)
  useEffect(() => {
    localFallbackWrite(STORAGE_KEYS.MATERIAL_YOU_ENABLED, materialYouEnabled ? "true" : null);
    sqliteWrite("material_you_enabled", materialYouEnabled);
  }, [materialYouEnabled, sqliteWrite, localFallbackWrite]);

  // Cloud Sync
  useEffect(() => {
    localFallbackWrite(
      STORAGE_KEYS.CLOUD_SYNC_ENABLED,
      cloudSyncEnabled ? "true" : null,
    );
    sqliteWrite("cloud_sync_enabled", cloudSyncEnabled);
  }, [cloudSyncEnabled, sqliteWrite, localFallbackWrite]);

  // Local Backup
  useEffect(() => {
    localFallbackWrite(
      STORAGE_KEYS.LOCAL_BACKUP_ENABLED,
      localBackupEnabled ? "true" : null,
    );
    sqliteWrite("local_backup_enabled", localBackupEnabled);
  }, [localBackupEnabled, sqliteWrite, localFallbackWrite]);

  // Locale (null = noch nicht gesetzt; skip initialen null-Write)
  useEffect(() => {
    if (locale === null) return;
    localFallbackWrite(STORAGE_KEYS.LOCALE, locale);
    sqliteWrite("locale", locale);
  }, [locale, sqliteWrite, localFallbackWrite]);

  const setLocale = useCallback((id: LocaleId) => {
    if (!(id in LOCALES)) {
      logger.error(`[useSettings] Unbekannte LocaleId: ${id}`);
      return;
    }
    setLocaleState(id);
  }, []);

  // Nextcloud
  useEffect(() => {
    localFallbackWrite(
      STORAGE_KEYS.NEXTCLOUD_ENABLED,
      nextcloudEnabled ? "true" : null,
    );
    sqliteWrite("nextcloud_enabled", nextcloudEnabled);
  }, [nextcloudEnabled, sqliteWrite, localFallbackWrite]);

  useEffect(() => {
    localFallbackWrite(STORAGE_KEYS.NEXTCLOUD_URL, nextcloudUrl);
    sqliteWrite("nextcloud_url", nextcloudUrl);
  }, [nextcloudUrl, sqliteWrite, localFallbackWrite]);

  useEffect(() => {
    localFallbackWrite(STORAGE_KEYS.NEXTCLOUD_USER, nextcloudUser);
    sqliteWrite("nextcloud_user", nextcloudUser);
  }, [nextcloudUser, sqliteWrite, localFallbackWrite]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const secretResult = await loadOrMigrateNextcloudAppPassword();
      if (cancelled || nextcloudPassTouched.current) return;
      setNextcloudSecretStatus(secretResult.status);
      setNextcloudSecretError(secretResult.message || null);
      if (secretResult.password) setNextcloudPassState(secretResult.password);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!nextcloudPassUserWrite.current) return;
    nextcloudPassUserWrite.current = false;
    let cancelled = false;
    (async () => {
      const secretResult = await storeNextcloudAppPassword(nextcloudPass);
      if (cancelled) return;
      setNextcloudSecretStatus(secretResult.status);
      setNextcloudSecretError(secretResult.message || null);
      if (secretResult.status !== "ready" && secretResult.status !== "migrated") {
        logger.warn("[useSettings] Nextcloud password is kept in memory because secure storage is unavailable.");
      }
    })();
    return () => { cancelled = true; };
  }, [nextcloudPass]);

  // ─── Return (API identisch zum Original + locale) ───
  return {
    userData,
    setUserData,
    theme,
    setTheme,
    materialYouEnabled,
    setMaterialYouEnabled,

    // Locale (länderspezifische Berechnung)
    locale,
    setLocale,

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

    // Diagnose/Startup-Status: additive API, bestehende Consumer bleiben kompatibel
    sqliteReady,
    settingsStorageStatus,
    settingsStorageError,
    nextcloudSecretStatus,
    nextcloudSecretError,
  };
}
