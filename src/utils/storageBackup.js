import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { STORAGE_KEYS, BACKUP_CONFIG } from "../hooks/constants";
import { uploadOrUpdateFile, getValidToken, initGoogleAuth } from "./googleDrive";
import { getSetting, setSetting } from "../db/repositories/settingsRepo";
import { getAllEntries, deleteAllEntriesFromDb, bulkInsertEntries } from "../db/repositories/entriesRepo";

// =========================================================
// BACKUP ORDNER
// - Auto-Backup: Directory.Data (intern, zuverlässig)
// - Manueller Export: Directory.Documents (für User sichtbar)
// =========================================================

const BACKUP_FOLDER = 'eStundnzettl';

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
    localStorage.setItem(STORAGE_KEYS.BACKUP_TARGET, 'documents');
    return true;
  } catch (err) {
    console.error("Backup-Ordner konnte nicht erstellt werden:", err);
    throw err;
  }
};

// 2. Zugriff prüfen
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
export const clearBackupTarget = () => {
  localStorage.removeItem(STORAGE_KEYS.BACKUP_TARGET);
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

// 1. ANALYSE - Schaut in die Daten, OHNE zu speichern
export const analyzeBackupData = (data) => {
  if (!data) return { valid: false, isValid: false };

  const isArray = Array.isArray(data);
  const entries = isArray ? data : (data.entries || []);
  const settings = (!isArray && data.user) ? data.user : null;

  const analysisResult = {
    valid: true,
    entryCount: entries.length,
    hasSettings: !!settings,
    entries,
    settings,
    timestamp: data.backupDate || new Date().toISOString()
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
    const dbEntries = await getAllEntries().catch(() => null);

    if (dbEntries) {
      await deleteAllEntriesFromDb();
      await bulkInsertEntries(analyzedData.entries || []);

      if (mode === 'ALL' && analyzedData.hasSettings && analyzedData.settings) {
        await setSetting("userData", analyzedData.settings);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(analyzedData.entries));

      if (mode === 'ALL' && analyzedData.hasSettings && analyzedData.settings) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(analyzedData.settings));
      }
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Anwenden des Backups:", error);
    return false;
  }
};

// 6. MANUELLER BACKUP (für "Jetzt sichern"-Button)
// @param {Object} options - { entries, userData, cloudSyncEnabled, localBackupEnabled }
// Falls nicht übergeben, wird aus localStorage gelesen (Backward Compatibility)
export const triggerManualBackup = async (options = {}) => {
  try {
    const entries = options.entries || await getAllEntries().catch(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES) || '[]'));
    const userData = options.userData || await getSetting('userData', null).catch(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'));
    const cloudActive = options.cloudSyncEnabled ?? await getSetting('cloudSyncEnabled', false).catch(() => localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true");
    const localActive = options.localBackupEnabled ?? await getSetting('localBackupEnabled', false).catch(() => localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED) === "true");

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

    let gdriveOk = false;
    let localOk = false;

    if (cloudActive) {
      try {
        await initGoogleAuth().catch(() => {});
        const auth = await getValidToken();
        if (auth?.accessToken) {
          await uploadOrUpdateFile(auth.accessToken, BACKUP_CONFIG.FILENAME, payload);
          gdriveOk = true;
        }
      } catch (e) {
        // cloud backup failed silently
      }
    }

    if (localActive) {
      try {
        await writeBackupFile(BACKUP_CONFIG.FILENAME, payload);
        localOk = true;
      } catch (e) {
        // local backup failed silently
      }
    }

    if (gdriveOk || localOk) {
      const timestamp = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);
      await setSetting('lastBackup', timestamp).catch(() => {});
      return { success: true, gdrive: gdriveOk, local: localOk };
    }

    return { success: false, message: "Kein Backup-Ziel konfiguriert" };
  } catch (err) {
    return { success: false, message: "Backup fehlgeschlagen" };
  }
};