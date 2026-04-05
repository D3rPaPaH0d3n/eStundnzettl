import { registerPlugin } from '@capacitor/core';
import { BACKUP_CONFIG } from '../hooks/constants';

const TOKEN_STORAGE_KEY = 'google_auth_state';
const AUTH_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GoogleDriveBackupPlugin = registerPlugin('GoogleDriveBackup');
const SESSION_TOKEN_MAX_AGE_MS = 45 * 60 * 1000;

let sessionAccessToken = null;
let sessionTokenSavedAt = 0;

const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveStoredAuth = (auth) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
    scope: AUTH_SCOPE,
    savedAt: Date.now(),
    source: auth?.source || 'native-plugin',
    accountEmail: auth?.accountEmail || null,
    userInfo: auth?.userInfo || (auth?.accountEmail ? { email: auth.accountEmail } : null),
    nativeConnected: auth?.nativeConnected !== false,
    reauthRequired: !!auth?.reauthRequired,
  }));
};

const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionAccessToken = null;
  sessionTokenSavedAt = 0;
};

const cacheSessionToken = (accessToken) => {
  sessionAccessToken = accessToken || null;
  sessionTokenSavedAt = accessToken ? Date.now() : 0;
};

const getCachedSessionToken = () => {
  if (!sessionAccessToken) return null;
  if (Date.now() - sessionTokenSavedAt > SESSION_TOKEN_MAX_AGE_MS) {
    cacheSessionToken(null);
    return null;
  }
  return sessionAccessToken;
};

const parseNativeError = (error, fallback = 'GOOGLE_DRIVE_NATIVE_ERROR') => {
  const message = String(error?.message || error || fallback);
  if (message.includes('not implemented') || message.includes('UNAVAILABLE')) {
    return 'GOOGLE_DRIVE_NATIVE_UNAVAILABLE';
  }
  if (message.includes('CANCELLED')) {
    return 'GOOGLE_DRIVE_AUTH_CANCELLED';
  }
  return message;
};

const nativeAvailable = async () => {
  try {
    return typeof GoogleDriveBackupPlugin?.getStatus === 'function';
  } catch {
    return false;
  }
};

const getNativeStatus = async () => {
  const stored = getStoredAuth();

  if (!(await nativeAvailable())) {
    return {
      available: false,
      connected: false,
      hasToken: false,
      reauthRequired: false,
      scope: AUTH_SCOPE,
      userInfo: stored?.userInfo || null,
      savedAt: stored?.savedAt || null,
      accountEmail: stored?.accountEmail || null,
    };
  }

  try {
    // WICHTIG: Scope MUSS explizit uebergeben werden, sonst nimmt der native
    // Plugin seinen persistierten lastGrantedScope-Default. Wenn kurz vorher
    // das PDF-Archiv-Modul (googleDrivePdfArchive.js) mit scope: drive.file
    // aufgerufen wurde, steht der Default auf drive.file — ohne explizites
    // Scope wuerde dieser Call dann ein drive.file-Token zurueckliefern und
    // das JSON-Backup wuerde "NEED_REMOTE_CONSENT" im Auth-Log triggern.
    const result = await GoogleDriveBackupPlugin.getStatus({ scope: AUTH_SCOPE });
    const accountEmail = result?.accountEmail || stored?.accountEmail || null;
    return {
      available: true,
      connected: !!result?.connected,
      hasToken: !!result?.hasToken,
      reauthRequired: !!result?.reauthRequired,
      scope: result?.scope || AUTH_SCOPE,
      userInfo: stored?.userInfo || (accountEmail ? { email: accountEmail } : null),
      savedAt: stored?.savedAt || null,
      accountEmail,
      native: result || null,
    };
  } catch (error) {
    return {
      available: true,
      connected: !!stored?.nativeConnected,
      hasToken: false,
      reauthRequired: false,
      scope: AUTH_SCOPE,
      userInfo: stored?.userInfo || null,
      savedAt: stored?.savedAt || null,
      accountEmail: stored?.accountEmail || null,
      error: parseNativeError(error),
    };
  }
};

const ensureGoogleAuthInitialized = async () => {
  if (!(await nativeAvailable())) {
    throw new Error('GOOGLE_DRIVE_NATIVE_UNAVAILABLE');
  }
  return true;
};

const connectGoogleDrive = async () => {
  await ensureGoogleAuthInitialized();

  try {
    const nativeResult = await GoogleDriveBackupPlugin.connect({
      scope: AUTH_SCOPE,
    });

    const accessToken = nativeResult?.accessToken || null;
    if (!accessToken) {
      throw new Error('GOOGLE_DRIVE_AUTH_NO_ACCESS_TOKEN');
    }

    cacheSessionToken(accessToken);

    const authRecord = {
      accountEmail: nativeResult?.accountEmail || null,
      source: nativeResult?.source || 'native-plugin',
      userInfo: nativeResult?.accountEmail ? { email: nativeResult.accountEmail } : null,
      nativeConnected: true,
      reauthRequired: false,
    };

    saveStoredAuth(authRecord);

    return {
      authentication: { accessToken },
      email: authRecord.accountEmail,
      native: nativeResult || null,
    };
  } catch (error) {
    clearStoredAuth();
    throw new Error(parseNativeError(error));
  }
};

const disconnectGoogleDrive = async () => {
  clearStoredAuth();

  if (await nativeAvailable()) {
    try {
      // Scope vor disconnect() explizit auf drive.appdata setzen, damit der
      // Plugin-interne Revoke-Flow den RICHTIGEN Scope revoked — und nicht
      // einen durch das PDF-Archiv-Modul polluted drive.file. getStatus()
      // mit explizitem Scope setzt den nativen lastGrantedScope zurueck,
      // bevor disconnect() ihn fuer den Revoke-Call nutzt. Analog zum Pattern
      // in disconnectGoogleDrivePdf (googleDrivePdfArchive.js).
      await GoogleDriveBackupPlugin.getStatus({ scope: AUTH_SCOPE });
      await GoogleDriveBackupPlugin.disconnect();
    } catch {
      // local state already cleared
    }
  }
};

const getValidGoogleToken = async () => {
  const cachedToken = getCachedSessionToken();
  if (cachedToken) {
    return { accessToken: cachedToken };
  }

  if (!(await nativeAvailable())) {
    clearStoredAuth();
    throw new Error('AUTH_REQUIRED');
  }

  try {
    const nativeResult = await GoogleDriveBackupPlugin.refreshToken({
      scope: AUTH_SCOPE,
    });

    const accessToken = nativeResult?.accessToken || null;
    if (!accessToken) {
      throw new Error('AUTH_REQUIRED');
    }

    cacheSessionToken(accessToken);
    saveStoredAuth({
      accountEmail: nativeResult?.accountEmail || null,
      source: nativeResult?.source || 'native-plugin',
      userInfo: nativeResult?.accountEmail ? { email: nativeResult.accountEmail } : null,
      nativeConnected: true,
      reauthRequired: false,
    });

    return { accessToken };
  } catch (error) {
    const message = parseNativeError(error, 'AUTH_REQUIRED');
    const stored = getStoredAuth();
    const requiresReauth = message.includes('AUTH_REQUIRED');
    saveStoredAuth({
      accountEmail: stored?.accountEmail || null,
      source: stored?.source || 'native-plugin',
      userInfo: stored?.userInfo || null,
      nativeConnected: true,
      reauthRequired: requiresReauth,
    });
    cacheSessionToken(null);
    throw new Error(requiresReauth ? 'AUTH_REQUIRED' : message);
  }
};

const authFetch = async (url, options = {}) => {
  const executeFetch = async (accessToken) => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const auth = await getValidGoogleToken();
  if (!auth?.accessToken) {
    throw new Error('AUTH_REQUIRED');
  }

  let response = await executeFetch(auth.accessToken);

  if (response.status === 401 || response.status === 403) {
    cacheSessionToken(null);

    const refreshedAuth = await getValidGoogleToken();
    if (!refreshedAuth?.accessToken) {
      throw new Error('AUTH_REQUIRED');
    }

    response = await executeFetch(refreshedAuth.accessToken);

    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_REQUIRED');
    }
  }

  return response;
};

const createMultipartBody = (metadata, jsonContent, boundary) => {
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  return (
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(jsonContent) +
    closeDelimiter
  );
};

const findFileIdByName = async (fileName) => {
  const query = `name = '${fileName}' and 'appDataFolder' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`;
  const response = await authFetch(url, { method: 'GET' });
  const data = await response.json();
  return data?.files?.[0]?.id || null;
};

const uploadBackupFile = async (fileName, jsonContent) => {
  const boundary = 'foo_bar_baz';
  const existingFileId = await findFileIdByName(fileName);
  const metadata = existingFileId
    ? { name: fileName, mimeType: BACKUP_CONFIG.MIME_TYPE }
    : { name: fileName, mimeType: BACKUP_CONFIG.MIME_TYPE, parents: ['appDataFolder'] };

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await authFetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: createMultipartBody(metadata, jsonContent, boundary),
  });

  if (!response.ok) {
    throw new Error(`Upload Error: ${await response.text()}`);
  }

  return response.json();
};

const listBackupFiles = async () => {
  const query = `trashed = false and 'appDataFolder' in parents`;
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&fields=files(id,name,createdTime,modifiedTime)`;
  const response = await authFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error('Fehler beim Laden der Google-Drive-Backups');
  }
  const data = await response.json();
  return data?.files || [];
};

const findLatestBackupFile = async () => {
  const candidates = [BACKUP_CONFIG.FILENAME, BACKUP_CONFIG.LEGACY_FILENAME];

  for (const fileName of candidates) {
    const query = `name = '${fileName}' and 'appDataFolder' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,createdTime,modifiedTime)`;
    const response = await authFetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error('Fehler beim Suchen des Google-Drive-Backups');
    }
    const data = await response.json();
    if (data?.files?.length) {
      return data.files[0];
    }
  }

  return null;
};

const downloadBackupFileContent = async (fileId) => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await authFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error('Fehler beim Download');
  }
  return response.json();
};

export {
  AUTH_SCOPE,
  ensureGoogleAuthInitialized,
  getNativeStatus,
  connectGoogleDrive,
  disconnectGoogleDrive,
  getValidGoogleToken,
  uploadBackupFile,
  listBackupFiles,
  findLatestBackupFile,
  downloadBackupFileContent,
  clearStoredAuth,
  getStoredAuth,
};
