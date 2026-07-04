import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { STORAGE_KEYS, BACKUP_CONFIG } from "../hooks/constants";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth } from "./googleDrive";
import { uploadBackup as ncUploadBackup } from "./nextcloudClient";
import { getNextcloudAppPassword } from "./nextcloudSecret";
import { isSQLiteActive } from "../db/storageMode";
import { setSetting, deleteSetting, getSetting } from "../db/repositories/settingsRepo";
import { getAllEntries } from "../db/repositories/entriesRepo";
import { getAllWorkCodes } from "../db/repositories/workCodesRepo";
import { getAllAttachments, getAllLabelSuggestions } from "../db/repositories/attachmentsRepo";
import { replaceFullSnapshot, type ImportSnapshot } from "../db/snapshot";
import { LOCALES } from "../locales";
import { logger } from "./logger";
import { getErrorMessage } from "./errorUtils";
import type { BackupAnalysisResult, BackupAnalysisData, BackupPayload, CalculationConfig, UserData, Entry, WorkCode, Attachment } from "../types";

// =========================================================
// BACKUP ORDNER
// - Auto-Backup: Directory.Data (intern, zuverlässig)
// - Manueller Export: Directory.Documents (für User sichtbar)
// =========================================================

const BACKUP_FOLDER = 'eStundnzettl';

// ─── Backup-Integrität (SHA-256 Checksum) ──────────────────

const BACKUP_FORMAT_VERSION = 2;

/**
 * Liefert einen stabilen, kanonischen JSON-String für die Checksum-Berechnung.
 * Objekt-Keys werden sortiert, das Feld `checksum` wird ausgeschlossen.
 */
function canonicalJsonStringify(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v: unknown) => canonicalJsonStringify(v)).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => k !== "checksum").sort((a, b) => a.localeCompare(b));
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJsonStringify(obj[k])).join(",") + "}";
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await globalThis.crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Berechnet die SHA-256-Checksum eines Backup-Payloads (ohne das `checksum`-Feld).
 */
export async function computeBackupChecksum(payload: Record<string, unknown> | null): Promise<string | null> {
  if (!payload || typeof payload !== "object") return null;
  try {
    return await sha256Hex(canonicalJsonStringify(payload));
  } catch (err) {
    logger.error("[computeBackupChecksum] SHA-256 fehlgeschlagen:", err);
    return null;
  }
}

/**
 * Fügt einem Backup-Payload die Felder `formatVersion` und `checksum` hinzu.
 * Mutiert das Objekt und gibt es zur Verkettung zurück.
 */
export async function attachBackupChecksum<T extends BackupPayload | Record<string, unknown>>(
  payload: T | null
): Promise<T | null> {
  if (!payload || typeof payload !== "object") return payload;
  const mutable = payload as unknown as Record<string, unknown>;
  mutable.formatVersion = BACKUP_FORMAT_VERSION;
  const checksum = await computeBackupChecksum(mutable);
  if (checksum) mutable.checksum = checksum;
  return payload;
}

// ─── Zentraler Backup-Payload-Builder ───────────────────────
//
// Single Source of Truth für den Inhalt eines Backups. ALLE Backup-Wege
// (Auto-Backup, "Jetzt sichern", Settings-Export) bauen ihren Payload über
// `composeBackupPayload`, damit kein Pfad stillschweigend Sektionen
// vergisst (vor v7 fehlten z.B. workCodes im Auto-Backup komplett).

/** Payload-Version: v7 = vollständiger App-Zustand inkl. workCodes/locale/theme. */
export const BACKUP_PAYLOAD_VERSION = "v7";

export interface BackupDataSections {
  user: UserData | Record<string, unknown> | null;
  entries: Entry[];
  workCodes?: WorkCode[];
  attachments?: Attachment[];
  attachmentLabels?: string[];
  calculationConfig?: CalculationConfig | Record<string, unknown> | null;
  locale?: string | null;
  theme?: string | null;
}

/**
 * Baut aus den Daten-Sektionen einen vollständigen, checksummten
 * Backup-Payload. Reine Zusammenstellung — liest selbst nichts aus DB/State.
 */
export const composeBackupPayload = async (
  sections: BackupDataSections,
  note: string
): Promise<BackupPayload> => {
  const payload: BackupPayload = {
    user: sections.user ?? null,
    entries: sections.entries || [],
    workCodes: sections.workCodes || [],
    attachments: sections.attachments || [],
    attachmentLabels: sections.attachmentLabels || [],
    calculationConfig: (sections.calculationConfig as CalculationConfig | null) ?? null,
    locale: sections.locale ?? null,
    theme: sections.theme ?? null,
    lastModified: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    note,
    version: BACKUP_PAYLOAD_VERSION,
  };
  await attachBackupChecksum(payload);
  return payload;
};

/**
 * Liest alle Backup-Sektionen aus SQLite (Source of Truth). Einzelne
 * fehlgeschlagene Sektionen werden geloggt und leer/null belassen, damit
 * ein Backup nicht an einer Nebensektion scheitert.
 */
export const collectBackupSections = async (): Promise<BackupDataSections> => {
  const sections: BackupDataSections = { user: null, entries: [] };
  if (!isSQLiteActive()) return sections;

  try { sections.user = (await getSetting("user")) as BackupDataSections["user"]; }
  catch (e) { logger.warn("[collectBackupSections] user-Read fehlgeschlagen:", e); }

  try { sections.entries = await getAllEntries(); }
  catch (e) { logger.warn("[collectBackupSections] entries-Read fehlgeschlagen:", e); }

  try { sections.workCodes = await getAllWorkCodes(); }
  catch (e) { logger.warn("[collectBackupSections] workCodes-Read fehlgeschlagen:", e); }

  try { sections.attachments = await getAllAttachments(); }
  catch (e) { logger.warn("[collectBackupSections] attachments-Read fehlgeschlagen:", e); }

  try { sections.attachmentLabels = await getAllLabelSuggestions(); }
  catch (e) { logger.warn("[collectBackupSections] attachmentLabels-Read fehlgeschlagen:", e); }

  try { sections.calculationConfig = (await getSetting("calculationConfig")) as BackupDataSections["calculationConfig"]; }
  catch (e) { logger.warn("[collectBackupSections] calculationConfig-Read fehlgeschlagen:", e); }

  try {
    const locale = await getSetting("locale");
    if (typeof locale === "string" && locale in LOCALES) sections.locale = locale;
  } catch (e) { logger.warn("[collectBackupSections] locale-Read fehlgeschlagen:", e); }

  try {
    const theme = await getSetting("theme");
    if (theme === "system" || theme === "dark" || theme === "light") sections.theme = theme;
  } catch (e) { logger.warn("[collectBackupSections] theme-Read fehlgeschlagen:", e); }

  return sections;
};

function redactBackupErrorMessage(error: unknown, fallback: string): string {
  const message = getErrorMessage(error, fallback);
  if (message === "AUTH_REQUIRED") return "Google Drive Anmeldung erforderlich";
  return message
    .replace(/("(?:access[_-]?token|refresh[_-]?token|token|password|pass|appPassword)"\s*:\s*")([^"]+)(")/gi, "$1[redacted]$3")
    .replace(/(access[_-]?token|refresh[_-]?token|token|password|pass|appPassword)=([^\s&]+)/gi, "$1=[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]")
    .replace(/(Basic\s+)[A-Za-z0-9+/=-]+/gi, "$1[redacted]");
}

/**
 * Verifiziert die Integrität eines gespeicherten Backup-Payloads.
 * Rückgabe:
 *  - "verified":   Checksum vorhanden und korrekt
 *  - "mismatch":   Checksum vorhanden, aber inkorrekt (möglicher Tampering)
 *  - "unverified": Kein Checksum-Feld (Legacy-Backup)
 */
export async function verifyBackupIntegrity(payload: unknown): Promise<"verified" | "mismatch" | "unverified"> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "unverified";
  const obj = payload as Record<string, unknown>;
  if (typeof obj.checksum !== "string" || obj.checksum.length === 0) {
    return "unverified";
  }
  const expected = obj.checksum;
  const actual = await computeBackupChecksum(obj);
  if (!actual) return "unverified";
  return actual === expected ? "verified" : "mismatch";
}

// ─── Settings Helper ────────────────────────────────────────

const BACKUP_SETTING_LOCAL_KEYS: Record<string, string> = {
  backup_target: STORAGE_KEYS.BACKUP_TARGET,
  last_backup: STORAGE_KEYS.LAST_BACKUP,
  backup_fail_count: STORAGE_KEYS.BACKUP_FAIL_COUNT,
  backup_last_error: STORAGE_KEYS.BACKUP_LAST_ERROR,
  nextcloud_backup_fail_count: STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT,
  nextcloud_backup_last_error: STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR,
};

async function readSetting(sqlKey: string): Promise<unknown> {
  if (isSQLiteActive()) {
    try { return await getSetting(sqlKey); } catch (e) {
      logger.error(`[storageBackup] SQLite-Read "${sqlKey}" fehlgeschlagen:`, e);
      return null;
    }
  }

  const lsKey = BACKUP_SETTING_LOCAL_KEYS[sqlKey];
  return lsKey ? localStorage.getItem(lsKey) : null;
}

async function writeSetting(sqlKey: string, value: unknown): Promise<void> {
  if (isSQLiteActive()) {
    try { await setSetting(sqlKey, value); } catch (e) {
      logger.error(`[storageBackup] SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
    return;
  }

  const lsKey = BACKUP_SETTING_LOCAL_KEYS[sqlKey];
  if (!lsKey) return;
  if (value === null || value === undefined || value === "") localStorage.removeItem(lsKey);
  else localStorage.setItem(lsKey, String(value));
}

async function removeSetting(sqlKey: string): Promise<void> {
  if (isSQLiteActive()) {
    try { await deleteSetting(sqlKey); } catch (e) {
      logger.error(`[storageBackup] SQLite-Delete "${sqlKey}" fehlgeschlagen:`, e);
    }
    return;
  }

  const lsKey = BACKUP_SETTING_LOCAL_KEYS[sqlKey];
  if (lsKey) localStorage.removeItem(lsKey);
}

// Ordner erstellen falls nicht vorhanden (für Documents - manueller Export)
const ensureBackupFolder = async (): Promise<void> => {
  try {
    await Filesystem.mkdir({
      path: BACKUP_FOLDER,
      directory: Directory.Documents,
      recursive: true
    });
  } catch {
    // Ordner existiert bereits - ignorieren
  }
};

// Ordner erstellen für internen Speicher (Auto-Backup)
const ensureInternalBackupFolder = async (): Promise<void> => {
  try {
    await Filesystem.mkdir({
      path: BACKUP_FOLDER,
      directory: Directory.Data,
      recursive: true
    });
  } catch {
    // Ordner existiert bereits - ignorieren
  }
};

// =========================================================
// TEIL 1: BACKUP FUNKTIONEN
// =========================================================

// 1. Backup-Ordner "aktivieren" (erstellt den Ordner)
export const selectBackupFolder = async (): Promise<boolean> => {
  try {
    await ensureInternalBackupFolder();
    await writeSetting("backup_target", "documents");
    return true;
  } catch (err) {
    logger.error("Backup-Ordner konnte nicht erstellt werden:", err);
    throw err;
  }
};

// 2. Zugriff prüfen (sync UI-Hint; SQLite wird in Settings/Backup-Flows async geladen)
export const hasBackupTarget = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.BACKUP_TARGET) === 'documents';
};

// 3. Backup schreiben (AUTO-BACKUP - intern, keine Permission-Probleme)
export const writeBackupFile = async (fileName: string, dataObj: unknown): Promise<boolean> => {
  await ensureInternalBackupFolder();
  
  const content = typeof dataObj === 'string' 
    ? dataObj 
    : JSON.stringify(dataObj, null, 2);

  const filePath = `${BACKUP_FOLDER}/${fileName}`;

  // Directory.Data braucht kein delete vorher - App hat volle Kontrolle
  await Filesystem.writeFile({
    path: filePath,
    data: content,
    directory: Directory.Data,
    encoding: Encoding.UTF8
  });
  
  return true;
};

// 4. Zugriff entfernen
export const clearBackupTarget = async (): Promise<void> => {
  await removeSetting("backup_target");
};

// 5. Einmaliger Export (JSON) - in Documents für User sichtbar
export const exportToSelectedFolder = async (fileName: string, dataObj: unknown): Promise<boolean> => {
  try {
    await ensureBackupFolder();
    const content = JSON.stringify(dataObj, null, 2);
    const filePath = `${BACKUP_FOLDER}/${fileName}`;
    
    // Versuche alte Datei zu löschen (falls vorhanden und wir Rechte haben)
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Documents
      });
    } catch {
      // Ignorieren - Datei existiert nicht oder keine Rechte
    }
    
    await Filesystem.writeFile({
      path: filePath,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    
    return true;
  } catch (err) {
    logger.error("Export Fehler:", err);
    throw err;
  }
};

// 6. PDF Export (Base64)
export const exportPdfToFolder = async (fileName: string, base64Data: string): Promise<boolean> => {
  try {
    await ensureBackupFolder();
    const filePath = `${BACKUP_FOLDER}/${fileName}`;
    
    // Versuche alte Datei zu löschen
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Documents
      });
    } catch {
      // Ignorieren
    }
    
    await Filesystem.writeFile({
      path: filePath,
      data: base64Data,
      directory: Directory.Documents
      // Kein encoding für Base64/Binary
    });
    
    return true;
  } catch (err) {
    logger.error("PDF Export Fehler:", err);
    throw err;
  }
};

// 7. Backup aus internem Ordner lesen (für Import im Wizard)
export const readBackupFromFolder = async (): Promise<unknown> => {
  try {
    const result = await Filesystem.readFile({
      path: `${BACKUP_FOLDER}/estundnzettl_backup.json`,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
    
    return JSON.parse(result.data as string);
  } catch (err) {
    logger.warn("Kein internes Backup gefunden:", err);
    return null;
  }
};

// =========================================================
// TEIL 2: IMPORT LOGIK & ANALYSE
// =========================================================

// Hilfsfunktion zum Einlesen einer JSON-Datei (für lokalen Import)
export const readJsonFile = (file: File): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const result = e.target?.result;
        if (typeof result !== "string") {
          reject(new Error("FileReader result is not a string"));
          return;
        }
        const json = JSON.parse(result);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const isValidEntry = (entry: unknown): boolean => {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  if (e.id === undefined || e.id === null) return false;
  if (!e.date || typeof e.date !== "string") return false;
  if (!e.type || typeof e.type !== "string") return false;
  return true;
};

const normalizeEntries = (value: unknown): Entry[] => {
  const v = value as Record<string, unknown> | undefined;
  let raw: unknown[] = [];
  if (Array.isArray(value)) raw = value;
  else if (Array.isArray(v?.entries)) raw = v.entries as unknown[];
  else if (v?.data && typeof v.data === "object" && Array.isArray((v.data as Record<string, unknown>)?.entries)) raw = (v.data as Record<string, unknown>).entries as unknown[];
  else if (Array.isArray(v?.items)) raw = v.items as unknown[];
  return raw.filter(isValidEntry) as Entry[];
};

const normalizeSettings = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  return (v.user || v.settings || v.profile || v.userData || v.employee || null) as Record<string, unknown> | null;
};

const normalizeWorkCodes = (value: unknown): WorkCode[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const v = value as Record<string, unknown>;
  const raw = v.workCodes || v.codes || v.workcodes || [];
  return (Array.isArray(raw) ? raw : []) as WorkCode[];
};

const normalizeAttachments = (value: unknown): Attachment[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const v = value as Record<string, unknown>;
  const raw = v.attachments || v.files || [];
  return (Array.isArray(raw) ? raw : []) as Attachment[];
};

const normalizeAttachmentLabels = (value: unknown): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const v = value as Record<string, unknown>;
  const raw = v.attachmentLabels || v.labels || v.attachment_labels || [];
  return Array.isArray(raw) ? raw : [];
};

const normalizeTimestamp = (value: unknown): string => {
  const v = value as Record<string, unknown> | undefined;
  return (v?.backupDate || v?.exportedAt || v?.lastModified || v?.timestamp || new Date().toISOString()) as string;
};

const normalizeCalculationConfig = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const raw = v.calculationConfig;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
};

const normalizeLocaleId = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, unknown>).locale;
  return typeof raw === "string" && raw in LOCALES ? raw : null;
};

const normalizeTheme = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, unknown>).theme;
  return raw === "system" || raw === "dark" || raw === "light" ? raw : null;
};

// 1. ANALYSE - Schaut in die Daten, OHNE zu speichern.
// Async, weil die Integritätsprüfung via SHA-256 (Web Crypto) asynchron ist.
export const analyzeBackupData = async (data: unknown): Promise<BackupAnalysisResult> => {
  if (!data) return { valid: false, isValid: false };

  const entries = normalizeEntries(data);
  const settings = normalizeSettings(data);
  const workCodes = normalizeWorkCodes(data);
  const attachments = normalizeAttachments(data);
  const attachmentLabels = normalizeAttachmentLabels(data);
  const calculationConfig = normalizeCalculationConfig(data);
  const locale = normalizeLocaleId(data);
  const theme = normalizeTheme(data);

  const hasUsefulData = entries.length > 0 || !!settings || workCodes.length > 0 || attachments.length > 0 || attachmentLabels.length > 0;
  if (!hasUsefulData) return { valid: false, isValid: false };

  // Integrität prüfen (nicht blockierend — Mismatch ist eine Warnung, kein Fehler)
  let integrity: string = "unverified";
  try {
    integrity = await verifyBackupIntegrity(data);
  } catch (err) {
    logger.warn("[analyzeBackupData] Integritätsprüfung fehlgeschlagen:", err);
  }

  const analysisResult: BackupAnalysisData = {
    valid: true,
    entryCount: entries.length,
    hasSettings: !!settings,
    hasWorkCodes: workCodes.length > 0,
    hasAttachments: attachments.length > 0,
    hasCalculationConfig: !!calculationConfig,
    entries,
    settings,
    workCodes,
    attachments,
    attachmentLabels,
    calculationConfig,
    locale,
    theme,
    timestamp: normalizeTimestamp(data),
    integrity,
  };

  return {
    isValid: true,
    data: analysisResult,
    ...analysisResult,
  };
};

// 2. ANWENDEN - Speichert die Daten basierend auf der Entscheidung
//
// Schreibt Entries, UserData, WorkCodes, Attachments + Labels und
// optional CalculationConfig in einer einzigen SQLite-Transaktion via
// `replaceFullSnapshot`. Vor dem Refactor lief jede Sektion in ihrer
// eigenen Mini-Transaktion → bei Fehler in Schritt 3 von 6 blieben die
// ersten beiden persistiert. Mit dem Snapshot-Approach kommt jetzt
// entweder das ganze Backup an oder gar nichts.
export const applyBackup = async (analyzedData: BackupAnalysisData, mode: string = 'ALL'): Promise<boolean> => {
  if (!analyzedData || !analyzedData.valid) return false;

  try {
    if (isSQLiteActive()) {
      const snapshot: ImportSnapshot = {
        entries: analyzedData.entries || [],
      };

      if (mode === 'ALL' && analyzedData.hasSettings && analyzedData.settings) {
        snapshot.userData = analyzedData.settings as unknown as UserData;
      }
      if (analyzedData.hasWorkCodes) {
        snapshot.workCodes = analyzedData.workCodes;
      }
      if (analyzedData.hasAttachments) {
        snapshot.attachments = analyzedData.attachments;
      }
      if (analyzedData.attachmentLabels?.length) {
        snapshot.attachmentLabels = analyzedData.attachmentLabels;
      }

      // CalculationConfig aus Backup übernehmen (wenn mode=ALL).
      // analyzeBackupData liefert das Feld als Record<string, unknown> ohne
      // strukturelle Validierung — replaceFullSnapshot erwartet CalculationConfig.
      // Doppel-Cast macht das fehlende Schema-Verifying explizit.
      if (mode === 'ALL' && analyzedData.calculationConfig) {
        snapshot.calculationConfig = analyzedData.calculationConfig as unknown as CalculationConfig;
      }

      // Locale/Theme (bereits in analyzeBackupData validiert)
      if (mode === 'ALL' && analyzedData.locale) {
        snapshot.locale = analyzedData.locale;
      }
      if (mode === 'ALL' && analyzedData.theme) {
        snapshot.theme = analyzedData.theme;
      }

      await replaceFullSnapshot(snapshot);

      // localStorage-Mirrors für Werte, die beim App-Start VOR der
      // SQLite-Hydration gelesen werden (Theme-Prepaint, Locale-Init).
      if (mode === 'ALL' && analyzedData.locale) {
        try { localStorage.setItem(STORAGE_KEYS.LOCALE, analyzedData.locale); } catch { /* noop */ }
      }
      if (mode === 'ALL' && analyzedData.theme) {
        try { localStorage.setItem(STORAGE_KEYS.THEME, analyzedData.theme); } catch { /* noop */ }
      }
    }

    return true;
  } catch (error) {
    logger.error("Fehler beim Anwenden des Backups:", error);
    return false;
  }
};

// 6. MANUELLER BACKUP (für "Jetzt sichern"-Button)
export const triggerManualBackup = async (): Promise<Record<string, unknown>> => {
  try {
    // Vollständigen App-Zustand aus SQLite einsammeln (Single Source of
    // Truth — gleicher Payload-Inhalt wie Auto-Backup und Settings-Export).
    const sections = await collectBackupSections();
    if (!isSQLiteActive()) {
      try { sections.user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'); } catch { /* corrupt */ }
      try { sections.entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES) || '[]'); } catch { sections.entries = []; }
    }
    const entries = sections.entries;

    // Cloud-Status: Nur das aktivierte Flag ist relevant.
    // Das eigentliche Zugriffstoken wird nativ still erneuert.
    const cloudFlag = isSQLiteActive()
      ? await getSetting("cloud_sync_enabled") === true
      : localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true";
    const cloudActive = cloudFlag;
    const localActive = isSQLiteActive()
      ? await getSetting("local_backup_enabled") === true
      : localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true";
    const ncActive = isSQLiteActive()
      ? await getSetting("nextcloud_enabled") === true
      : localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_ENABLED) === "true";

    if (!entries || entries.length === 0) {
      return { success: false, message: "Keine Daten zum Sichern" };
    }

    const payload = await composeBackupPayload(sections, "eStundnzettl Manueller Backup");

    // null = nicht aktiv, true = erfolgreich, false = fehlgeschlagen
    let gdriveOk: boolean | null = cloudActive ? false : null;
    let localOk: boolean | null = localActive ? false : null;
    let nextcloudOk: boolean | null = ncActive ? false : null;
    let nextcloudError: string | null = null;

    if (cloudActive) {
      try {
        await initGoogleAuth().catch(() => {});
        const auth = await getValidToken();
        if (auth?.accessToken) {
          await uploadOrUpdateFile(auth.accessToken, BACKUP_CONFIG.FILENAME, payload);
          gdriveOk = true;
        }
      } catch (e) {
        logger.error("[triggerManualBackup] Google Drive fehlgeschlagen:", redactBackupErrorMessage(e, "Google Drive fehlgeschlagen"));
      }
    }

    if (localActive) {
      try {
        await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
        localOk = true;
      } catch (e) {
        logger.error("[triggerManualBackup] Lokales Backup fehlgeschlagen:", redactBackupErrorMessage(e, "Lokales Backup fehlgeschlagen"));
      }
    }

    if (ncActive) {
      try {
        const ncUrl = isSQLiteActive()
          ? String(await getSetting("nextcloud_url") || "")
          : localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL) || "";
        const ncUser = isSQLiteActive()
          ? String(await getSetting("nextcloud_user") || "")
          : localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || "";
        const ncPass = await getNextcloudAppPassword();
        if (ncUrl && ncUser && ncPass) {
          await ncUploadBackup(ncUrl, ncUser, ncPass, payload);
          nextcloudOk = true;
          await writeSetting("nextcloud_backup_fail_count", "0");
          await writeSetting("nextcloud_backup_last_error", "");
        } else {
          nextcloudError = "Nextcloud-Anmeldedaten unvollständig";
        }
      } catch (e) {
        nextcloudError = redactBackupErrorMessage(e, "Nextcloud-Upload fehlgeschlagen");
      }
    }

    const anySuccess = gdriveOk === true || localOk === true || nextcloudOk === true;
    const anyConfigured = gdriveOk !== null || localOk !== null || nextcloudOk !== null;

    if (!anyConfigured) {
      return { success: false, message: "Kein Backup-Ziel konfiguriert" };
    }

    if (anySuccess) {
      await writeSetting("last_backup", new Date().toISOString());
    }

    if (nextcloudOk === false && nextcloudError) {
      const currentNcFailCount = parseInt(String(await readSetting("nextcloud_backup_fail_count") || "0"), 10);
      await writeSetting("nextcloud_backup_fail_count", String(currentNcFailCount + 1));
      await writeSetting("nextcloud_backup_last_error", nextcloudError);
    }

    return {
      success: anySuccess,
      gdrive: gdriveOk,
      local: localOk,
      nextcloud: nextcloudOk,
      nextcloudError,
      message: anySuccess ? undefined : (nextcloudError || "Alle Backup-Ziele fehlgeschlagen")
    };
  } catch {
    return { success: false, message: "Backup fehlgeschlagen" };
  }
};
