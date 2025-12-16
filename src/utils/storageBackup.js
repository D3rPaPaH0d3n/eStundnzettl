import { ScopedStorage } from '@daniele-rolli/capacitor-scoped-storage';
import { STORAGE_KEYS } from "../hooks/constants";

// =========================================================
// TEIL 1: BACKUP ORDNER & SPEICHERN (Original Funktionen)
// =========================================================

// 1. Ordner auswählen & Rechte dauerhaft sichern
export const selectBackupFolder = async () => {
  try {
    const result = await ScopedStorage.pickFolder();
    if (result) {
      localStorage.setItem("kogler_backup_target", JSON.stringify(result));
      return true;
    }
    return false;
  } catch (err) {
    console.error("Ordnerwahl abgebrochen oder Fehler:", err);
    throw err;
  }
};

// 2. Zugriff prüfen (gibt true zurück, wenn wir einen Zielordner haben)
export const hasBackupTarget = () => {
  return !!localStorage.getItem("kogler_backup_target");
};

// 3. Backup schreiben
export const writeBackupFile = async (fileName, dataObj) => {
  const targetStr = localStorage.getItem("kogler_backup_target");
  if (!targetStr) throw new Error("Kein Backup-Ziel gewählt");

  const folderObj = JSON.parse(targetStr);
  const content = JSON.stringify(dataObj, null, 2);

  await ScopedStorage.writeFile({
    ...folderObj,       
    path: fileName,     
    data: content,
    encoding: 'utf8',   
    mimeType: "application/json"
  });
  
  return true;
};

// 4. Zugriff entfernen
export const clearBackupTarget = () => {
  localStorage.removeItem("kogler_backup_target");
};

// 5. Einmaliger manueller Export in einen beliebigen Ordner
export const exportToSelectedFolder = async (fileName, dataObj) => {
  try {
    const folder = await ScopedStorage.pickFolder();
    if (!folder) return false; 

    const content = JSON.stringify(dataObj, null, 2);
    
    await ScopedStorage.writeFile({
      ...folder,
      path: fileName,
      data: content,
      encoding: 'utf8',
      mimeType: "application/json"
    });
    
    return true;
  } catch (err) {
    console.error("Manueller Export Fehler:", err);
    throw err;
  }
};

// =========================================================
// TEIL 2: NEUE IMPORT LOGIK & ANALYSE
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
  if (!data) return { valid: false };

  // Erkennung: Altes Format (Array) vs. Neues Format (Objekt mit .entries und .user)
  const isArray = Array.isArray(data);
  const entries = isArray ? data : (data.entries || []);
  const settings = (!isArray && data.user) ? data.user : null;

  return {
    valid: true,
    entryCount: entries.length,
    hasSettings: !!settings, // Wichtig: True, wenn Einstellungen gefunden wurden
    entries,
    settings,
    timestamp: data.backupDate || new Date().toISOString() // Falls vorhanden
  };
};

// 2. ANWENDEN - Speichert die Daten basierend auf der Entscheidung
// mode: 'ALL' (Alles) oder 'ENTRIES_ONLY' (Nur Einträge)
export const applyBackup = (analyzedData, mode = 'ALL') => {
  if (!analyzedData || !analyzedData.valid) return false;

  try {
    // 1. Immer die Einträge speichern
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(analyzedData.entries));

    // 2. Einstellungen nur speichern, wenn Modus "ALL" ist UND Einstellungen da sind
    if (mode === 'ALL' && analyzedData.hasSettings && analyzedData.settings) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(analyzedData.settings));
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Anwenden des Backups:", error);
    return false;
  }
};