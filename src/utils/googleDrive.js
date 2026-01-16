import { SocialLogin } from '@capgo/capacitor-social-login';

// --- CONFIG ---
const WEB_CLIENT_ID = "618528142382-pes4415amf381rk4bjovlamgh4emhrov.apps.googleusercontent.com";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Token Storage
const TOKEN_STORAGE_KEY = "google_auth_state";

const getStoredAuth = () => {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

const saveAuth = (accessToken, userInfo) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
    accessToken,
    userInfo,
    savedAt: Date.now()
  }));
};

const clearAuth = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

// --- AUTH: Initialize ---
export const initGoogleAuth = async () => {
  try {
    await SocialLogin.initialize({
      google: {
        webClientId: WEB_CLIENT_ID,
        mode: 'online'
      }
    });
    console.log("Google Auth initialized");
  } catch (err) {
    console.error("Google Auth init error:", err);
  }
};

// --- AUTH: Sign In ---
export const signInGoogle = async () => {
  console.log("Starting Google Sign-In...");
  
  try {
    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: SCOPES
      }
    });
    
    console.log("SocialLogin result:", JSON.stringify(result, null, 2));
    
    if (result.provider === 'google' && result.result) {
      const r = result.result;
      
      // Token kann direkt oder als Objekt kommen
      const accessToken = r.accessToken?.token || r.accessToken;
      
      if (accessToken) {
        const userInfo = {
          email: r.profile?.email || r.email,
          givenName: r.profile?.givenName || r.givenName,
          familyName: r.profile?.familyName || r.familyName,
          imageUrl: r.profile?.imageUrl || r.avatarUrl
        };
        
        saveAuth(accessToken, userInfo);
        
        return {
          authentication: { accessToken },
          ...userInfo
        };
      }
    }
    
    throw new Error("No access token received");
  } catch (err) {
    console.error("Google Sign-In error:", err);
    throw err;
  }
};

// --- AUTH: Get valid access token (tries silent refresh) ---
export const refreshGoogleToken = async () => {
  try {
    const result = await SocialLogin.refresh({ provider: 'google' });
    console.log("Refresh result:", JSON.stringify(result, null, 2));
    
    const accessToken = result?.accessToken?.token || result?.accessToken;
    if (accessToken) {
      const stored = getStoredAuth();
      saveAuth(accessToken, stored?.userInfo || {});
      return { accessToken };
    }
  } catch (err) {
    console.warn("Silent refresh failed:", err);
  }
  
  // Fallback: gespeichertes Token zurückgeben
  const stored = getStoredAuth();
  if (stored?.accessToken) {
    return { accessToken: stored.accessToken };
  }
  
  return null;
};

// --- AUTH: Check if user is logged in ---
export const isGoogleLoggedIn = () => {
  return getStoredAuth() !== null;
};

// --- AUTH: Sign Out ---
export const signOutGoogle = async () => {
  clearAuth();
  try {
    await SocialLogin.logout({ provider: 'google' });
  } catch (e) {
    // Ignore logout errors
  }
};

// --- HELPER: Multipart Body bauen ---
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
    return data.files[0].id;
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
    console.log("Drive: Überschreibe Datei", existingFileId);
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH";
  } else {
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