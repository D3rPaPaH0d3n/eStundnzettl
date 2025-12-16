import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// --- AUTH ---
export const initGoogleAuth = () => {
  // WICHTIG: return hinzugefügt, damit Promises (wie .catch) funktionieren
  return GoogleAuth.initialize();
};

export const signInGoogle = async () => {
  const user = await GoogleAuth.signIn();
  return user;
};

export const signOutGoogle = async () => {
  await GoogleAuth.signOut();
};

// --- HELPER: Multipart Body bauen (für Upload & Update identisch) ---
const createMultipartBody = (metadata, jsonContent, boundary) => {
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  return (
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(jsonContent) +
    close_delim
  );
};

// --- CORE: Datei suchen ---
const findFileIdByName = async (accessToken, fileName) => {
  const query = `name = '${fileName}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id; // ID der existierenden Datei zurückgeben
  }
  return null;
};

// --- CORE: Erstellen oder Updaten (SMART UPLOAD) ---
export const uploadOrUpdateFile = async (accessToken, fileName, jsonContent) => {
  const boundary = "foo_bar_baz";
  const existingFileId = await findFileIdByName(accessToken, fileName);

  let url;
  let method;

  if (existingFileId) {
    // UPDATE (Überschreiben)
    console.log("Drive: Überschreibe Datei", existingFileId);
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH"; // Wichtig: PATCH zum Aktualisieren
  } else {
    // CREATE (Neu anlegen)
    console.log("Drive: Erstelle neue Datei");
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    method = "POST";
  }

  const metadata = {
    name: fileName,
    mimeType: "application/json",
  };

  const body = createMultipartBody(metadata, jsonContent, boundary);

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error("Upload Error: " + txt);
  }

  return await response.json();
};

// --- RESTORE: Neuestes Backup finden & laden ---
export const findLatestBackup = async (accessToken) => {
  // Suche exakt nach UNSEREM Dateinamen
  const query = "name = 'kogler_backup.json' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id, name, createdTime, modifiedTime)`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error("Fehler beim Suchen");

  const data = await response.json();
  return (data.files && data.files.length > 0) ? data.files[0] : null;
};

export const downloadFileContent = async (accessToken, fileId) => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("Fehler beim Download");
  return await response.json();
};