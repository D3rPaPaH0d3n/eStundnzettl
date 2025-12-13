import { ScopedStorage } from '@daniele-rolli/capacitor-scoped-storage';

// 1. Ordner auswählen & Rechte dauerhaft sichern
export const selectBackupFolder = async () => {
  try {
    // Öffnet den nativen Picker (Android SAF / iOS Files)
    const result = await ScopedStorage.pickFolder();
    
    // Wir speichern das komplette Objekt (enthält URI/Bookmark), das für den Zugriff nötig ist
    if (result) {
      // Das Plugin gibt je nach Plattform unterschiedliche Strukturen zurück,
      // wir speichern einfach das Ergebnis als String, um es später wieder reinzugeben.
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

  // KORREKTUR: Das Plugin benötigt zwingend 'path' statt 'filename'.
  await ScopedStorage.writeFile({
    ...folderObj,       // Übergibt das gespeicherte folder-Objekt (z.B. uri)
    path: fileName,     // WICHTIG: Hier stand vorher 'filename', das war der Fehler!
    data: content,
    encoding: 'utf8',   // Sicherstellen, dass Text korrekt gespeichert wird
    mimeType: "application/json"
  });
  
  return true;
};

// 4. Zugriff entfernen
export const clearBackupTarget = () => {
  localStorage.removeItem("kogler_backup_target");
};

// 5. NEU: Einmaliger manueller Export in einen beliebigen Ordner
export const exportToSelectedFolder = async (fileName, dataObj) => {
  try {
    // 1. Ordner auswählen (ohne Speichern)
    const folder = await ScopedStorage.pickFolder();
    if (!folder) return false; // Abbruch durch User

    // 2. Datei schreiben
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