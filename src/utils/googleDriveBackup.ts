import { registerPlugin } from '@capacitor/core';
import { BACKUP_CONFIG } from '../hooks/constants';

const TOKEN_STORAGE_KEY = 'google_auth_state';
const AUTH_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GoogleDriveBackupPlugin = registerPlugin('GoogleDriveBackup') as any;
const SESSION_TOKEN_MAX_AGE_MS = 45 * 60 * 1000;

// Type Definitions
interface StoredAuth {
  scope: string;
  savedAt: number;
  source: string;
  accountEmail: string | null;
  userInfo: { email: string } | null;
  nativeConnected: boolean;
  reauthRequired: boolean;
}

interface NativeStatusResult {
  connected: boolean;
  hasToken: boolean;
  reauthRequired: boolean;
  scope: string;
  accountEmail?: string;
  source?: string;
  [key: string]: any;
}

interface NativeConnectResult {
  accessToken: string;
  accountEmail?: string;
  source?: string;
  [key: string]: any;
}

interface NativeRefreshResult {
  accessToken: string;
  accountEmail?: string;
  source?: string;
  [key: string]: any;
}

interface AuthResult {
  authentication: { accessToken: string };
  email: string | null;
  native: NativeConnectResult | null;
}

interface DriveFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  [key: string]: any;
}

interface DriveFileList {
  files: DriveFile[];
}

let sessionAccessToken: string | null = null;
let sessionTokenSavedAt = 0;

const getStoredAuth = (): StoredAuth | null => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveStoredAuth = (auth: Partial<StoredAuth>): void => {
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

const clearStoredAuth = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionAccessToken = null;
  sessionTokenSavedAt = 0;
};

const cacheSessionToken = (accessToken: string | null): void => {
  sessionAccessToken = accessToken || null;
  sessionTokenSavedAt = accessToken ? Date.now() : 0;
};

const getCachedSessionToken = (): string | null => {
  if (!sessionAccessToken) return null;
  if (Date.now() - sessionTokenSavedAt > SESSION_TOKEN_MAX_AGE_MS) {
    cacheSessionToken(null);
    return null;
  }
  return sessionAccessToken;
};

const parseNativeError = (error: any, fallback = 'GOOGLE_DRIVE_NATIVE_ERROR'): string => {
  const message = String(error?.message || error || fallback);
  if (message.includes('not implemented') || message.includes('UNAVAILABLE')) {
    return 'GOOGLE_DRIVE_NATIVE_UNAVAILABLE';
  }
  if (message.includes('CANCELLED')) {
    return 'GOOGLE_DRIVE_AUTH_CANCELLED';
  }
  return message;
};

const nativeAvailable = async (): Promise<boolean> => {
  try {
    return typeof GoogleDriveBackupPlugin?.getStatus === 'function';
  } catch {
    return false;
  }
};

const getNativeStatus = async (): Promise<{
  available: boolean;
  connected: boolean;
  hasToken: boolean;
  reauthRequired: boolean;
  scope: string;
  userInfo: { email: string } | null;
  savedAt: number | null;
  accountEmail: string | null;
  native?: NativeStatusResult | null;
  error?: string;
}> => {
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
    const result = await GoogleDriveBackupPlugin.getStatus({ scope: AUTH_SCOPE }) as NativeStatusResult;
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

const ensureGoogleAuthInitialized = async (): Promise<boolean> => {
  if (!(await nativeAvailable())) {
    throw new Error('GOOGLE_DRIVE_NATIVE_UNAVAILABLE');
  }
  return true;
};

const connectGoogleDrive = async (): Promise<AuthResult> => {
  await ensureGoogleAuthInitialized();

  try {
    const nativeResult = await GoogleDriveBackupPlugin.connect({
      scope: AUTH_SCOPE,
    }) as NativeConnectResult;

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

const disconnectGoogleDrive = async (): Promise<void> => {
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

const getValidGoogleToken = async (): Promise<{ accessToken: string }> => {
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
    }) as NativeRefreshResult;

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

const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const executeFetch = async (accessToken: string): Promise<Response> => fetch(url, {
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

const createMultipartBody = (metadata: any, jsonContent: any, boundary: string): string => {
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

const findFileIdByName = async (fileName: string): Promise<string | null> => {
  const query = `name = '${fileName}' and 'appDataFolder' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`;
  const response = await authFetch(url, { method: 'GET' });
  const data = await response.json() as DriveFileList;
  return data?.files?.[0]?.id || null;
};

const uploadBackupFile = async (fileName: string, jsonContent: any): Promise<any> => {
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

const listBackupFiles = async (): Promise<DriveFile[]> => {
  const query = `trashed = false and 'appDataFolder' in parents`;
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&fields=files(id,name,createdTime,modifiedTime)`;
  const response = await authFetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error('Fehler beim Laden der Google-Drive-Backups');
  }
  const data = await response.json() as DriveFileList;
  return data?.files || [];
};

const findLatestBackupFile = async (): Promise<DriveFile | null> => {
  const candidates = [BACKUP_CONFIG.FILENAME, BACKUP_CONFIG.LEGACY_FILENAME];

  for (const fileName of candidates) {
    const query = `name = '${fileName}' and 'appDataFolder' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,createdTime,modifiedTime)`;
    const response = await authFetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error('Fehler beim Suchen des Google-Drive-Backups');
    }
    const data = await response.json() as DriveFileList;
    if (data?.files?.length) {
      return data.files[0];
    }
  }

  return null;
};

const downloadBackupFileContent = async (fileId: string): Promise<any> => {
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