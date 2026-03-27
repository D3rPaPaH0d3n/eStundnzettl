import { SocialLogin } from '@capgo/capacitor-social-login';
import { BACKUP_CONFIG } from '../hooks/constants';

// --- CONFIG ---
const WEB_CLIENT_ID = "618528142382-pes4415amf381rk4bjovlamgh4emhrov.apps.googleusercontent.com";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Token Storage Key
const TOKEN_STORAGE_KEY = "google_auth_state";

// --- TOKEN STORAGE (localStorage — schnell, synchron) ---
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
  } catch (err) {
    // Fehler ignorieren, wenn bereits initialisiert
    if (!err.message?.includes('already')) {
      console.error("Google Auth init error:", err);
    }
  }
};

// --- AUTH: Sign In (auf Android = Silent Refresh wenn User bereits berechtigt) ---
export const signInGoogle = async () => {
  try {
    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: SCOPES
      }
    });

    if (result.provider === 'google' && result.result) {
      const r = result.result;
      const accessToken = r.accessToken?.token || r.accessToken;

      if (accessToken) {
        const userInfo = {
          email: r.profile?.email || r.email,
          givenName: r.profile?.givenName || r.givenName,
          familyName: r.profile?.familyName || r.familyName,
          imageUrl: r.profile?.imageUrl || r.avatarUrl
        };
        saveAuth(accessToken, userInfo);
        return { authentication: { accessToken }, ...userInfo };
      }
    }
    throw new Error("No access token received");
  } catch (err) {
    console.error("Google Sign-In error:", err);
    throw err;
  }
};

// --- AUTH: Silently refresh token via re-login ---
// Auf Android macht SocialLogin.login() ein Silent Refresh wenn der User schon berechtigt ist.
// Das ist der EINZIGE Refresh-Mechanismus den das Plugin bietet.
const silentRefresh = async () => {
  try {
    await initGoogleAuth();
    const result = await signInGoogle();
    return result?.authentication?.accessToken || null;
  } catch (e) {
    console.warn("Silent refresh fehlgeschlagen:", e.message);
    return null;
  }
};

// --- AUTH: Get valid access token ---
// KEIN künstliches 50-Min-Ablaufdatum mehr!
// Wir geben das gespeicherte Token zurück und prüfen erst bei echtem 401.
export const getValidToken = async () => {
  const stored = getStoredAuth();
  if (stored?.accessToken) {
    return { accessToken: stored.accessToken };
  }
  // Kein Token gespeichert → versuche Silent Login
  const freshToken = await silentRefresh();
  if (freshToken) {
    return { accessToken: freshToken };
  }
  return null;
};

// --- AUTH: Fetch mit Auto-Retry bei 401 ---
// Das Herzstück: Jeder Google Drive API-Call geht durch diese Funktion.
// Bei 401 (Token abgelaufen) wird EIN Silent Refresh versucht und der Call wiederholt.
const authFetch = async (url, options = {}) => {
  const stored = getStoredAuth();
  if (!stored?.accessToken) {
    // Kein Token → erstmal Silent Refresh probieren
    const freshToken = await silentRefresh();
    if (!freshToken) {
      throw new Error("AUTH_REQUIRED");
    }
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${freshToken}`
    };
    return fetch(url, options);
  }

  // Erster Versuch mit gespeichertem Token
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${stored.accessToken}`
  };

  const response = await fetch(url, options);

  // Bei 401/403: Token abgelaufen → Silent Refresh + Retry
  if (response.status === 401 || response.status === 403) {
    console.log("GDrive API 401/403 — versuche Silent Refresh...");
    const freshToken = await silentRefresh();
    if (!freshToken) {
      clearAuth();
      throw new Error("AUTH_REQUIRED");
    }
    // Retry mit neuem Token
    options.headers.Authorization = `Bearer ${freshToken}`;
    return fetch(url, options);
  }

  return response;
};

// Backwards-compatible
export const refreshGoogleToken = async () => {
  return await getValidToken();
};

export const isGoogleLoggedIn = () => {
  return getStoredAuth() !== null;
};

export const signOutGoogle = async () => {
  clearAuth();
  try {
    await SocialLogin.logout({ provider: 'google' });
  } catch (e) { }
};

// --- Beim App-Start aufrufen: Background Token Refresh ---
// Prüft ob ein gespeichertes Token vorhanden ist und refresht es leise im Hintergrund.
// So hat der User beim nächsten Backup schon ein frisches Token.
export const backgroundTokenRefresh = async () => {
  const stored = getStoredAuth();
  if (!stored?.accessToken) return false;

  // Prüfe ob Token älter als 45 Min ist → proaktiver Refresh
  const tokenAge = Date.now() - (stored.savedAt || 0);
  if (tokenAge > 45 * 60 * 1000) {
    const freshToken = await silentRefresh();
    return !!freshToken;
  }
  return true; // Token ist noch jung genug
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

// --- CORE: Datei suchen (mit Auto-Retry) ---
const findFileIdByName = async (accessToken, fileName) => {
  const query = `name = '${fileName}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;

  const response = await authFetch(url, { method: "GET" });
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

// --- CORE: Upload (mit Auto-Retry) ---
export const uploadOrUpdateFile = async (accessToken, fileName, jsonContent) => {
  const boundary = "foo_bar_baz";
  const existingFileId = await findFileIdByName(accessToken, fileName);

  let url;
  let method;

  if (existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH";
  } else {
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    method = "POST";
  }

  const metadata = {
    name: fileName,
    mimeType: BACKUP_CONFIG.MIME_TYPE,
  };

  const body = createMultipartBody(metadata, jsonContent, boundary);

  const response = await authFetch(url, {
    method: method,
    headers: {
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

// --- RESTORE (mit Auto-Retry) ---
export const findLatestBackup = async (accessToken) => {
  // V6 Suche
  let query = `name = '${BACKUP_CONFIG.FILENAME}' and trashed=false`;
  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id, name, createdTime, modifiedTime)`;

  let response = await authFetch(url, { method: "GET" });

  if (!response.ok) throw new Error("Fehler beim Suchen (V6)");

  let data = await response.json();

  // Fallback Legacy
  if (!data.files || data.files.length === 0) {
    console.log("Suche Legacy...", BACKUP_CONFIG.LEGACY_FILENAME);
    query = `name = '${BACKUP_CONFIG.LEGACY_FILENAME}' and trashed=false`;
    url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id, name, createdTime, modifiedTime)`;

    response = await authFetch(url, { method: "GET" });

    if (response.ok) {
      data = await response.json();
    }
  }

  return (data.files && data.files.length > 0) ? data.files[0] : null;
};

export const downloadFileContent = async (accessToken, fileId) => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await authFetch(url, { method: "GET" });
  if (!response.ok) throw new Error("Fehler beim Download");
  return await response.json();
};
