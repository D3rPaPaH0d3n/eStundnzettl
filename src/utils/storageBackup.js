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

  // Das Plugin nutzt den gespeicherten Kontext (URI/Bookmark), um die Datei dort zu erstellen
  // Hinweis: Auf Android muss oft der content-String base64 codiert sein, wenn 'encoding' gesetzt ist,
  // aber bei reinem Text/JSON handhabt das Plugin das meist smart. 
  // Falls Fehler auftreten, muss content ggf. btoa(unescape(encodeURIComponent(content))) sein.
  // Wir probieren es direkt als UTF8 String.
  
  await ScopedStorage.writeFile({
    ...folderObj,          // Spread: übergibt uri, name, etc. aus dem gespeicherten Objekt
    filename: fileName,    // Achtung: manche Versionen nutzen 'filename', manche 'path'
    data: content,
    mimeType: "application/json"
  });
  
  return true;
};

// 4. Zugriff entfernen
export const clearBackupTarget = () => {
  localStorage.removeItem("kogler_backup_target");
};