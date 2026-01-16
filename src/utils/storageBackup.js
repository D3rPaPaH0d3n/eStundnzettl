import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { STORAGE_KEYS } from "../hooks/constants";

// =========================================================
// BACKUP ORDNER: Documents/eStundnzettl/
// =========================================================

const BACKUP_FOLDER = 'eStundnzettl';

// Ordner erstellen falls nicht vorhanden
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

// =========================================================
// TEIL 1: BACKUP FUNKTIONEN
// =========================================================

// 1. Backup-Ordner "aktivieren" (erstellt den Ordner)
export const selectBackupFolder = async () => {
  try {
    await ensureBackupFolder();
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

// 3. Backup schreiben
export const writeBackupFile = async (fileName, dataObj) => {
  if (!hasBackupTarget()) throw new Error("Backup nicht aktiviert");

  await ensureBackupFolder();
  const content = JSON.stringify(dataObj, null, 2);

  await Filesystem.writeFile({
    path: `${BACKUP_FOLDER}/${fileName}`,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8
  });
  
  return true;
};

// 4. Zugriff entfernen
export const clearBackupTarget = () => {
  localStorage.removeItem(STORAGE_KEYS.BACKUP_TARGET);
};

// 5. Einmaliger Export (JSON)
export const exportToSelectedFolder = async (fileName, dataObj) => {
  try {
    await ensureBackupFolder();
    const content = JSON.stringify(dataObj, null, 2);
    
    await Filesystem.writeFile({
      path: `${BACKUP_FOLDER}/${fileName}`,
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
    
    await Filesystem.writeFile({
      path: `${BACKUP_FOLDER}/${fileName}`,
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

// 7. Backup aus Ordner lesen (für Import im Wizard)
export const readBackupFromFolder = async () => {
  try {
    const result = await Filesystem.readFile({
      path: `${BACKUP_FOLDER}/kogler_backup.json`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    
    return JSON.parse(result.data);
  } catch (err) {
    console.warn("Kein Backup gefunden:", err);
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
export const applyBackup = (analyzedData, mode = 'ALL') => {
  if (!analyzedData || !analyzedData.valid) return false;

  try {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(analyzedData.entries));

    if (mode === 'ALL' && analyzedData.hasSettings && analyzedData.settings) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(analyzedData.settings));
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Anwenden des Backups:", error);
    return false;
  }
};