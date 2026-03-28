import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { STORAGE_KEYS, BACKUP_CONFIG } from "../hooks/constants";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth } from "./googleDrive";
import { uploadBackup as ncUploadBackup } from "./nextcloudClient";
import { isSQLiteActive } from "../db/storageMode";
import { setSetting, deleteSetting, getSetting } from "../db/repositories/settingsRepo";
import { getAllEntries, bulkInsertEntries } from "../db/repositories/entriesRepo";
import { bulkReplaceWorkCodes } from "../db/repositories/workCodesRepo";
import { bulkReplaceAttachments, bulkReplaceLabelSuggestions } from "../db/repositories/attachmentsRepo";

// =========================================================
// BACKUP ORDNER
// - Auto-Backup: Directory.Data (intern, zuverlässig)
// - Manueller Export: Directory.Documents (für User sichtbar)
// =========================================================

const BACKUP_FOLDER = 'eStundnzettl';

// ─── Dual-Write Helper ──────────────────────────────────────

async function dualWrite(lsKey, sqlKey, value) {
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    try { await setSetting(sqlKey, value); } catch (e) {
      console.error(`[storageBackup] SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}

async function dualRemove(lsKey, sqlKey) {
  localStorage.removeItem(lsKey);
  if (isSQLiteActive()) {
    try { await deleteSetting(sqlKey); } catch (e) {
      console.error(`[storageBackup] SQLite-Delete "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}

// Ordner erstellen falls nicht vorhanden (für Documents - manueller Export)
const ensureBackupFolder = async () => {
  try {
    await Filesystem.mkdir({
      path: BACKUP_FOLDER,
      directory: Directory.Documents,
      recursive: true
    });
  } catch (e) {
    // Ordner existiert bereits - ignorieren
  }
};

// Ordner erstellen für internen Speicher (Auto-Backup)
const ensureInternalBackupFolder = async () => {
  try {
    await Filesystem.mkdir({
      path: BACKUP_FOLDER,
      directory: Directory.Data,
      recursive: true
    });
  } catch (e) {
    // Ordner existiert bereits - ignorieren
  }
};

// =========================================================
// TEIL 1: BACKUP FUNKTIONEN
// =========================================================

// 1. Backup-Ordner "aktivieren" (erstellt den Ordner)
export const selectBackupFolder = async () => {
  try {
    await ensureInternalBackupFolder();
    // Dual-Write: BACKUP_TARGET
    await dualWrite(STORAGE_KEYS.BACKUP_TARGET, "backup_target", "documents");
    return true;
  } catch (err) {
    console.error("Backup-Ordner konnte nicht erstellt werden:", err);
    throw err;
  }
};

// 2. Zugriff prüfen (synchron, aus localStorage — schnell für UI)
export const hasBackupTarget = () => {
  return localStorage.getItem(STORAGE_KEYS.BACKUP_TARGET) === 'documents';
};

// 3. Backup schreiben (AUTO-BACKUP - intern, keine Permission-Probleme)
export const writeBackupFile = async (fileName, dataObj) => {
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
export const clearBackupTarget = async () => {
  await dualRemove(STORAGE_KEYS.BACKUP_TARGET, "backup_target");
};

// 5. Einmaliger Export (JSON) - in Documents für User sichtbar
export const exportToSelectedFolder = async (fileName, dataObj) => {
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
    } catch (e) {
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
    console.error("Export Fehler:", err);
    throw err;
  }
};

// 6. PDF Export (Base64)
export const exportPdfToFolder = async (fileName, base64Data) => {
  try {
    await ensureBackupFolder();
    const filePath = `${BACKUP_FOLDER}/${fileName}`;
    
    // Versuche alte Datei zu löschen
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Documents
      });
    } catch (e) {
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
    console.error("PDF Export Fehler:", err);
    throw err;
  }
};

// 7. Backup aus internem Ordner lesen (für Import im Wizard)
export const readBackupFromFolder = async () => {
  try {
    const result = await Filesystem.readFile({
      path: `${BACKUP_FOLDER}/estundnzettl_backup.json`,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
    
    return JSON.parse(result.data);
  } catch (err) {
    console.warn("Kein internes Backup gefunden:", err);
    return null;
  }
};

// =========================================================
// TEIL 2: IMPORT LOGIK & ANALYSE
// =========================================================

// Hilfsfunktion zum Einlesen einer JSON-Datei (für lokalen Import)
export const readJsonFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const normalizeEntries = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.entries)) return value.entries;
  if (Array.isArray(value?.data?.entries)) return value.data.entries;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const normalizeSettings = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value.user || value.settings || value.profile || value.userData || value.employee || null;
};

const normalizeWorkCodes = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = value.workCodes || value.codes || value.workcodes || [];
  return Array.isArray(raw) ? raw : [];
};

const normalizeAttachments = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = value.attachments || value.files || [];
  return Array.isArray(raw) ? raw : [];
};

const normalizeAttachmentLabels = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = value.attachmentLabels || value.labels || value.attachment_labels || [];
  return Array.isArray(raw) ? raw : [];
};

const normalizeTimestamp = (value) => {
  return value?.backupDate || value?.exportedAt || value?.lastModified || value?.timestamp || new Date().toISOString();
};

// 1. ANALYSE - Schaut in die Daten, OHNE zu speichern
export const analyzeBackupData = (data) => {
  if (!data) return { valid: false, isValid: false };

  const entries = normalizeEntries(data);
  const settings = normalizeSettings(data);
  const workCodes = normalizeWorkCodes(data);
  const attachments = normalizeAttachments(data);
  const attachmentLabels = normalizeAttachmentLabels(data);

  const hasUsefulData = entries.length > 0 || !!settings || workCodes.length > 0 || attachments.length > 0 || attachmentLabels.length > 0;
  if (!hasUsefulData) return { valid: false, isValid: false };

  const analysisResult = {
    valid: true,
    entryCount: entries.length,
    hasSettings: !!settings,
    hasWorkCodes: workCodes.length > 0,
    hasAttachments: attachments.length > 0,
    entries,
    settings,
    workCodes,
    attachments,
    attachmentLabels,
    timestamp: normalizeTimestamp(data)
  };

  return {
    isValid: true,
    data: analysisResult,
    ...analysisResult
  };
};

// 2. ANWENDEN - Speichert die Daten basierend auf der Entscheidung
export const applyBackup = async (analyzedData, mode = 'ALL') => {
  if (!analyzedData || !analyzedData.valid) return false;

  try {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(analyzedData.entries || []));

    if (mode === 'ALL' && analyzedData.hasSettings && analyzedData.settings) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(analyzedData.settings));
    }

    if (analyzedData.hasWorkCodes) {
      localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(analyzedData.workCodes));
    }

    if (analyzedData.hasAttachments) {
      localStorage.setItem(STORAGE_KEYS.ATTACHMENTS, JSON.stringify(analyzedData.attachments));
    }

    if (analyzedData.attachmentLabels?.length) {
      localStorage.setItem(STORAGE_KEYS.ATTACHMENT_LABELS, JSON.stringify(analyzedData.attachmentLabels));
    }

    if (isSQLiteActive()) {
      await bulkInsertEntries(analyzedData.entries || []);

      if (mode === 'ALL' && analyzedData.hasSettings && analyzedData.settings) {
        await setSetting('user', analyzedData.settings);
      }

      if (analyzedData.hasWorkCodes) {
        await bulkReplaceWorkCodes(analyzedData.workCodes);
      }

      if (analyzedData.hasAttachments) {
        await bulkReplaceAttachments(analyzedData.attachments);
      }

      if (analyzedData.attachmentLabels?.length) {
        await bulkReplaceLabelSuggestions(analyzedData.attachmentLabels);
      }
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Anwenden des Backups:", error);
    return false;
  }
};

// 6. MANUELLER BACKUP (für "Jetzt sichern"-Button)
export const triggerManualBackup = async () => {
  try {
    // Daten aus SQLite laden (Source of Truth), localStorage nur als Fallback
    let userData = null;
    let entries = [];

    if (isSQLiteActive()) {
      try {
        userData = await getSetting("user");
        entries = await getAllEntries();
      } catch (e) {
        console.warn("[triggerManualBackup] SQLite-Read fehlgeschlagen, Fallback auf localStorage:", e);
      }
    }

    // Fallback auf localStorage
    if (!userData) {
      try { userData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'); } catch { /* corrupt */ }
    }
    if (!entries || entries.length === 0) {
      try { entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES) || '[]'); } catch { entries = []; }
    }

    // Cloud-Status: Flag UND gespeicherter Token müssen vorhanden sein,
    // sonst öffnet signInGoogle() einen Login-Dialog obwohl der User gar nicht verbunden ist!
    const cloudFlag = localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true";
    const hasGoogleToken = !!localStorage.getItem("google_auth_state");
    const cloudActive = cloudFlag && hasGoogleToken;
    const localActive = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true";
    const ncActive = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_ENABLED) === "true";

    if (!entries || entries.length === 0) {
      return { success: false, message: "Keine Daten zum Sichern" };
    }

    const payload = {
      user: userData,
      entries,
      lastModified: new Date().toISOString(),
      note: "eStundnzettl Manueller Backup",
      version: "v6"
    };

    // null = nicht aktiv, true = erfolgreich, false = fehlgeschlagen
    let gdriveOk = cloudActive ? false : null;
    let localOk = localActive ? false : null;
    let nextcloudOk = ncActive ? false : null;

    if (cloudActive) {
      try {
        await initGoogleAuth().catch(() => {});
        const auth = await getValidToken();
        if (auth?.accessToken) {
          await uploadOrUpdateFile(auth.accessToken, BACKUP_CONFIG.FILENAME, payload);
          gdriveOk = true;
        }
      } catch (e) {
        console.error("[triggerManualBackup] Google Drive fehlgeschlagen:", e);
      }
    }

    if (localActive) {
      try {
        await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
        localOk = true;
      } catch (e) {
        console.error("[triggerManualBackup] Lokales Backup fehlgeschlagen:", e);
      }
    }

    if (ncActive) {
      try {
        const ncUrl = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL) || "";
        const ncUser = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || "";
        const ncPass = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || "";
        if (ncUrl && ncUser && ncPass) {
          await ncUploadBackup(ncUrl, ncUser, ncPass, payload);
          nextcloudOk = true;
        } else {
          console.warn("[triggerManualBackup] Nextcloud aktiv aber Credentials unvollständig");
        }
      } catch (e) {
        console.error("[triggerManualBackup] Nextcloud-Upload fehlgeschlagen:", e);
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

    return {
      success: anySuccess,
      gdrive: gdriveOk,
      local: localOk,
      nextcloud: nextcloudOk,
      message: anySuccess ? undefined : "Alle Backup-Ziele fehlgeschlagen"
    };
  } catch (err) {
    return { success: false, message: "Backup fehlgeschlagen" };
  }
};
