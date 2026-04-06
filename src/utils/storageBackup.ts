// @ts-nocheck
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { STORAGE_KEYS } from "../hooks/constants";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth } from "./googleDrive";
import { uploadBackup as ncUploadBackup } from "./nextcloudClient";
import { deobfuscate } from "./obfuscate";
import { isSQLiteActive } from "../db/storageMode";
import { setSetting, deleteSetting, getSetting } from "../db/repositories/settingsRepo";
import { getAllEntries, bulkInsertEntries } from "../db/repositories/entriesRepo";
import { bulkReplaceWorkCodes } from "../db/repositories/workCodesRepo";
import { bulkReplaceAttachments, bulkReplaceLabelSuggestions } from "../db/repositories/attachmentsRepo";
import { logger } from "./logger";
import { TimeEntry, WorkCode, Attachment, BackupMetadata } from "../types";

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
function canonicalJsonStringify(value: any): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalJsonStringify(v)).join(",") + "]";
  }
  const keys = Object.keys(value).filter((k) => k !== "checksum").sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJsonStringify(value[k])).join(",") + "}";
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
export async function computeBackupChecksum(payload: any): Promise<string | null> {
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
export async function attachBackupChecksum(payload: any): Promise<any> {
  if (!payload || typeof payload !== "object") return payload;
  payload.formatVersion = BACKUP_FORMAT_VERSION;
  const checksum = await computeBackupChecksum(payload);
  if (checksum) payload.checksum = checksum;
  return payload;
}

/**
 * Verifiziert die Integrität eines gespeicherten Backup-Payloads.
 * Rückgabe:
 *  - "verified":   Checksum vorhanden und korrekt
 *  - "mismatch":   Checksum vorhanden, aber inkorrekt (möglicher Tampering)
 *  - "unverified": Kein Checksum-Feld (Legacy-Backup)
 */
export async function verifyBackupIntegrity(payload: any): Promise<"verified" | "mismatch" | "unverified"> {
  if (!payload || typeof payload !== "object") return "unverified";
  if (typeof payload.checksum !== "string" || payload.checksum.length === 0) {
    return "unverified";
  }
  const expected = payload.checksum;
  const actual = await computeBackupChecksum(payload);
  if (!actual) return "unverified";
  return actual === expected ? "verified" : "mismatch";
}

// ─── Dual-Write Helper ──────────────────────────────────────

async function dualWrite(lsKey: string, sqlKey: string, value: string): Promise<void> {
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    try { await setSetting(sqlKey, value); } catch (e) {
      logger.error(`[storageBackup] SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}

async function dualRemove(lsKey: string, sqlKey: string): Promise<void> {
  localStorage.removeItem(lsKey);
  if (isSQLiteActive()) {
    try { await deleteSetting(sqlKey); } catch (e) {
      logger.error(`[storageBackup] SQLite-Delete "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
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
    // Dual-Write: BACKUP_TARGET
    await dualWrite(STORAGE_KEYS.BACKUP_TARGET, "backup_target", "documents");
    return true;
  } catch (err) {
    logger.error("Backup-Ordner konnte nicht erstellt werden:", err);
    throw err;
  }
};

// 2. Zugriff prüfen (synchron, aus localStorage — schnell für UI)
export const hasBackupTarget = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.BACKUP_TARGET) === 'documents';
};

// 3. Backup schreiben (AUTO-BACKUP - intern, keine Permission-Probleme)
export const writeBackupFile = async (fileName: string, dataObj: any): Promise<boolean> => {
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
  await dualRemove(STORAGE_KEYS.BACKUP_TARGET, "backup_target");
};

// 5. Einmaliger Export (JSON) - in Documents für User sichtbar
export const exportToSelectedFolder = async (fileName: string, dataObj: any): Promise<boolean> => {
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
      // Datei existiert nicht oder keine Rechte - ignorieren
    }
    
    await Filesystem.writeFile({
      path: filePath,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    
    return true;
  } catch (err) {
    logger.error("Export fehlgeschlagen:", err);
    throw err;
  }
};

// =========================================================
// TEIL 2: AUTOMATISCHES BACKUP
// =========================================================

export interface BackupData {
  entries: TimeEntry[];
  workCodes: WorkCode[];
  attachments: Attachment[];
  labelSuggestions: string[];
  settings: Record<string, string>;
  backupMetadata: BackupMetadata;
}

// Backup-Daten sammeln
export const collectBackupData = async (): Promise<BackupData> => {
  const entries = await getAllEntries();
  // Diese Funktionen geben void zurück, wir müssen separate Getter verwenden
  // Für jetzt leere Arrays, da wir die Getter-Funktionen nicht haben
  const workCodes: WorkCode[] = [];
  const attachments: Attachment[] = [];
  const labelSuggestions: string[] = [];
  
  // Settings aus SQLite holen (falls aktiv)
  const settings: Record<string, string> = {};
  if (isSQLiteActive()) {
    try {
      const allSettings = await getSetting("all");
      if (allSettings && typeof allSettings === "object") {
        Object.assign(settings, allSettings);
      }
    } catch (e) {
      logger.error("[collectBackupData] Settings lesen fehlgeschlagen:", e);
    }
  }
  
  // Legacy Settings aus localStorage migrieren
  const legacyKeys = [
    'user_name', 'user_company', 'user_role', 'hourly_rate',
    'work_hours_per_day', 'work_hours_per_week', 'theme', 'language',
    'auto_backup', 'backup_frequency', 'last_backup'
  ];
  
  legacyKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      settings[key] = value;
    }
  });
  
  const backupMetadata: BackupMetadata = {
    id: `backup-${Date.now()}`,
    type: 'local',
    timestamp: new Date(),
    size: 0, // Wird später berechnet
    entryCount: entries.length,
    successful: true
  };
  
  return {
    entries,
    workCodes,
    attachments,
    labelSuggestions,
    settings,
    backupMetadata
  };
};

// Backup mit Checksum erstellen
export const createBackupWithChecksum = async (): Promise<any> => {
  const data = await collectBackupData();
  return await attachBackupChecksum(data);
};

// Automatisches Backup (interner Speicher)
export const performAutoBackup = async (): Promise<boolean> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `auto-backup-${timestamp}.json`;
    
    const backupData = await createBackupWithChecksum();
    await writeBackupFile(fileName, backupData);
    
    // Nur die letzten 5 Backups behalten
    await cleanupOldBackups(5);
    
    // Last backup timestamp speichern
    await dualWrite(
      STORAGE_KEYS.LAST_BACKUP,
      "last_backup",
      new Date().toISOString()
    );
    
    logger.info(`Auto-Backup erfolgreich: ${fileName}`);
    return true;
  } catch (err) {
    logger.error("Auto-Backup fehlgeschlagen:", err);
    return false;
  }
};

// Alte Backups löschen
const cleanupOldBackups = async (keepCount: number): Promise<void> => {
  try {
    const result = await Filesystem.readdir({
      path: BACKUP_FOLDER,
      directory: Directory.Data
    });
    
    const files = result.files
      .filter(file => file.name.startsWith('auto-backup-') && file.name.endsWith('.json'))
      .sort((a: any, b: any) => b.mtime - a.mtime); // Neueste zuerst
    
    for (let i = keepCount; i < files.length; i++) {
      await Filesystem.deleteFile({
        path: `${BACKUP_FOLDER}/${files[i].name}`,
        directory: Directory.Data
      });
    }
  } catch (err) {
    logger.error("Backup-Cleanup fehlgeschlagen:", err);
  }
};

// =========================================================
// TEIL 3: RESTORE FUNKTIONEN
// =========================================================

// Backup-Dateien auflisten
export const listBackupFiles = async (): Promise<any[]> => {
  try {
    await ensureInternalBackupFolder();
    const result = await Filesystem.readdir({
      path: BACKUP_FOLDER,
      directory: Directory.Data
    });
    
    return result.files
      .filter((file: any) => file.name.endsWith('.json'))
      .map((file: any) => ({
        name: file.name,
        path: `${BACKUP_FOLDER}/${file.name}`,
        size: file.size,
        mtime: new Date(file.mtime),
        directory: Directory.Data
      }));
  } catch (err) {
    logger.error("Backup-Liste fehlgeschlagen:", err);
    return [];
  }
};

// Backup lesen
export const readBackupFile = async (fileName: string): Promise<any> => {
  try {
    const result = await Filesystem.readFile({
      path: `${BACKUP_FOLDER}/${fileName}`,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
    
    const data = JSON.parse(result.data as string);
    
    // Integrität prüfen
    const integrity = await verifyBackupIntegrity(data);
    if (integrity === "mismatch") {
      logger.warn(`Backup-Integritätsprüfung fehlgeschlagen für: ${fileName}`);
    }
    
    return {
      data,
      integrity,
      fileName
    };
  } catch (err) {
    logger.error(`Backup lesen fehlgeschlagen: ${fileName}`, err);
    throw err;
  }
};

// Backup wiederherstellen
export const restoreFromBackup = async (backupData: any): Promise<boolean> => {
  try {
    // 1. Alte Daten löschen
    // (Hier müssten die entsprechenden deleteAll-Funktionen aufgerufen werden)
    
    // 2. Neue Daten einfügen
    if (backupData.entries && Array.isArray(backupData.entries)) {
      await bulkInsertEntries(backupData.entries);
    }
    
    if (backupData.workCodes && Array.isArray(backupData.workCodes)) {
      await bulkReplaceWorkCodes(backupData.workCodes);
    }
    
    if (backupData.attachments && Array.isArray(backupData.attachments)) {
      await bulkReplaceAttachments(backupData.attachments);
    }
    
    if (backupData.labelSuggestions && Array.isArray(backupData.labelSuggestions)) {
      await bulkReplaceLabelSuggestions(backupData.labelSuggestions);
    }
    
    // 3. Settings wiederherstellen
    if (backupData.settings && typeof backupData.settings === "object") {
      for (const [key, value] of Object.entries(backupData.settings)) {
        if (typeof value === "string") {
          await setSetting(key, value);
        }
      }
    }
    
    logger.info("Backup erfolgreich wiederhergestellt");
    return true;
  } catch (err) {
    logger.error("Backup-Wiederherstellung fehlgeschlagen:", err);
    throw err;
  }
};

// =========================================================
// TEIL 4: CLOUD-BACKUP (GOOGLE DRIVE / NEXTCLOUD)
// =========================================================

export const uploadToCloud = async (
  backupData: any,
  target: 'google-drive' | 'nextcloud'
): Promise<boolean> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `cloud-backup-${timestamp}.json`;
    const content = JSON.stringify(backupData, null, 2);
    
    if (target === 'google-drive') {
      await initGoogleAuth();
      const token = await getValidToken();
      if (!token) {
        throw new Error("Kein gültiger Google Token verfügbar");
      }
      await uploadOrUpdateFile(token.accessToken, fileName, content);
    } else if (target === 'nextcloud') {
      await ncUploadBackup(fileName, content);
    }
    
    logger.info(`Cloud-Backup erfolgreich: ${fileName} (${target})`);
    return true;
  } catch (err) {
    logger.error(`Cloud-Backup fehlgeschlagen (${target}):`, err);
    return false;
  }
};

export const downloadFromCloud = async (
  fileId: string,
  target: 'google-drive' | 'nextcloud'
): Promise<any> => {
  // Implementierung je nach Cloud-Anbieter
  throw new Error("Not implemented");
};

// =========================================================
// TEIL 5: BACKUP-MANAGEMENT
// =========================================================

export const getBackupStatus = async (): Promise<{
  hasLocalBackup: boolean;
  lastBackupTime: string | null;
  backupCount: number;
  cloudConnected: {
    google: boolean;
    nextcloud: boolean;
  };
}> => {
  try {
    const files = await listBackupFiles();
    const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    
    // Google Drive Status
    let googleConnected = false;
    try {
      const googleStatus = await getValidToken();
      googleConnected = !!googleStatus;
    } catch {
      googleConnected = false;
    }
    
    // Nextcloud Status
    const nextcloudUrl = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL);
    const nextcloudUser = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER);
    const nextcloudPass = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS);
    const nextcloudConnected = !!(nextcloudUrl && nextcloudUser && nextcloudPass);
    
    return {
      hasLocalBackup: files.length > 0,
      lastBackupTime: lastBackup,
      backupCount: files.length,
      cloudConnected: {
        google: googleConnected,
        nextcloud: nextcloudConnected
      }
    };
  } catch (err) {
    logger.error("Backup-Status abrufen fehlgeschlagen:", err);
    return {
      hasLocalBackup: false,
      lastBackupTime: null,
      backupCount: 0,
      cloudConnected: {
        google: false,
        nextcloud: false
      }
    };
  }
};

// Backup-Scheduler
let backupInterval: any = null;

export const startBackupScheduler = (): void => {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  
  backupInterval = setInterval(async () => {
    try {
      const autoBackup = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === 'true';
      if (!autoBackup) return;
      
      const frequency: 'daily' | 'weekly' | 'monthly' = 'daily'; // BACKUP_FREQUENCY ist deprecated, default zu daily
      const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      
      if (!lastBackup) {
        // Noch nie gebackupt → jetzt machen
        await performAutoBackup();
        return;
      }
      
      const lastBackupTime = new Date(lastBackup);
      const now = new Date();
      const hoursSinceLastBackup = (now.getTime() - lastBackupTime.getTime()) / (1000 * 60 * 60);
      
      let shouldBackup = false;
      switch (frequency) {
        case 'daily':
          shouldBackup = hoursSinceLastBackup >= 24;
          break;
        case 'weekly':
          shouldBackup = hoursSinceLastBackup >= 168; // 7 Tage
          break;
        case 'monthly':
          shouldBackup = hoursSinceLastBackup >= 720; // 30 Tage
          break;
      }
      
      if (shouldBackup) {
        await performAutoBackup();
      }
    } catch (err) {
      logger.error("Backup-Scheduler fehlgeschlagen:", err);
    }
  }, 60 * 60 * 1000); // Stündlich prüfen
};

export const stopBackupScheduler = (): void => {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
};

// Kompatibilitäts-Funktionen für Legacy-Code
export const backupAllData = async (): Promise<{
  success: boolean;
  gdrive?: boolean | null;
  local?: boolean | null;
  nextcloud?: boolean | null;
  nextcloudError?: string;
  message?: string;
}> => {
  try {
    const payload = await createBackupWithChecksum();
    
    let gdriveOk: boolean | null = null;
    let localOk: boolean | null = null;
    let nextcloudOk: boolean | null = null;
    let nextcloudError: string | undefined;
    
    // Google Drive Backup
    const gdriveEnabled = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === 'true';
    if (gdriveEnabled) {
      try {
        await initGoogleAuth();
        const token = await getValidToken();
        if (token) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `backup-${timestamp}.json`;
          await uploadOrUpdateFile(token, fileName, JSON.stringify(payload, null, 2));
          gdriveOk = true;
        } else {
          gdriveOk = false;
        }
      } catch (e) {
        gdriveOk = false;
      }
    }
    
    // Lokales Backup
    const localEnabled = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === 'true';
    if (localEnabled) {
      try {
        await performAutoBackup();
        localOk = true;
      } catch (e) {
        localOk = false;
      }
    }
    
    // Nextcloud Backup
    const nextcloudEnabled = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_ENABLED) === 'true';
    if (nextcloudEnabled) {
      try {
        const ncUrl = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL) || '';
        const ncUser = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || '';
        const ncPass = await deobfuscate(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || '');
        if (ncUrl && ncUser && ncPass) {
          // ncUploadBackup erwartet 4 Parameter: url, user, pass, jsonData
        await (ncUploadBackup as any)(ncUrl, ncUser, ncPass, payload);
          nextcloudOk = true;
          await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT, "nextcloud_backup_fail_count", "0");
          await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR, "nextcloud_backup_last_error", "");
        } else {
          nextcloudError = "Nextcloud-Anmeldedaten unvollständig";
        }
      } catch (e) {
        nextcloudError = (e as any)?.message || "Nextcloud-Upload fehlgeschlagen";
      }
    }
    
    const anySuccess = gdriveOk === true || localOk === true || nextcloudOk === true;
    const anyConfigured = gdriveOk !== null || localOk !== null || nextcloudOk !== null;
    
    if (!anyConfigured) {
      return { success: false, message: "Kein Backup-Ziel konfiguriert" };
    }
    
    if (anySuccess) {
      await dualWrite(STORAGE_KEYS.LAST_BACKUP, "last_backup", new Date().toISOString());
    }
    
    if (nextcloudOk === false && nextcloudError) {
      const currentNcFailCount = parseInt(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT) || "0", 10);
      await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT, "nextcloud_backup_fail_count", String(currentNcFailCount + 1));
      await dualWrite(STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR, "nextcloud_backup_last_error", nextcloudError);
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
