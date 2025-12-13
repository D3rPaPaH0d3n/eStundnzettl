import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// --- AUTH ---
export const initGoogleAuth = () => {
  GoogleAuth.initialize();
};

export const signInGoogle = async () => {
  const user = await GoogleAuth.signIn();
  return user;
};

export const signOutGoogle = async () => {
  await GoogleAuth.signOut();
};

// --- UPLOAD (Bestehend) ---
export const uploadToGoogleDrive = async (accessToken, fileName, jsonContent) => {
  const metadata = {
    name: fileName,
    mimeType: "application/json",
  };

  const fileContent = JSON.stringify(jsonContent);
  const boundary = "foo_bar_baz";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const body =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    fileContent +
    close_delim;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
};

// --- NEU: DOWNLOAD & SUCHE ---

// 1. Neuestes Backup finden
export const findLatestBackup = async (accessToken) => {
  // Suche nach Dateien, die "kogler_backup" im Namen haben und nicht im Papierkorb sind
  // Sortiert nach Erstelldatum (neueste zuerst)
  const query = "name contains 'kogler_backup' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&pageSize=1&fields=files(id, name, createdTime)`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error("Fehler beim Suchen des Backups");

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0]; // Die neueste Datei zurückgeben
  }
  return null; // Kein Backup gefunden
};

// 2. Dateiinhalt herunterladen
export const downloadFileContent = async (accessToken, fileId) => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error("Fehler beim Herunterladen");

  return await response.json(); // Wir erwarten JSON
};