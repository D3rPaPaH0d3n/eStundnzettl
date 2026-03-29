import { registerPlugin } from '@capacitor/core';
import { BACKUP_CONFIG } from '../hooks/constants';

const TOKEN_STORAGE_KEY = 'google_auth_state';
const AUTH_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GoogleDriveBackupPlugin = registerPlugin('GoogleDriveBackup');

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
    accessToken: auth?.accessToken || null,
    accountEmail: auth?.accountEmail || null,
    userInfo: auth?.userInfo || (auth?.accountEmail ? { email: auth.accountEmail } : null),
    nativeConnected: true,
  }));
};

const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
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
    const result = await GoogleDriveBackupPlugin.getStatus();
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
      connected: false,
      hasToken: false,
      reauthRequired: true,
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

    const authRecord = {
      accessToken,
      accountEmail: nativeResult?.accountEmail || null,
      source: nativeResult?.source || 'native-plugin',
      userInfo: nativeResult?.accountEmail ? { email: nativeResult.accountEmail } : null,
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
      await GoogleDriveBackupPlugin.disconnect();
    } catch {
      // local state already cleared
    }
  }
};

const getValidGoogleToken = async () => {
  const stored = getStoredAuth();
  if (stored?.accessToken) {
    return { accessToken: stored.accessToken };
  }

  const status = await getNativeStatus();
  if (status?.reauthRequired || !status?.hasToken) {
    clearStoredAuth();
    throw new Error('AUTH_REQUIRED');
  }

  return null;
};

const authFetch = async (url, options = {}) => {
  const auth = await getValidGoogleToken();
  if (!auth?.accessToken) {
    throw new Error('AUTH_REQUIRED');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    clearStoredAuth();
    throw new Error('AUTH_REQUIRED');
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
