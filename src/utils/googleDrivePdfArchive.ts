/**
 * googleDrivePdfArchive.js — Parallel GDrive-Integration fuer das automatische
 * PDF-Archiv (Iteration 2).
 *
 * DESIGN-LEITLINIE: Diese Datei ist **komplett isoliert** vom bestehenden
 * `googleDriveBackup.js` (JSON-Backup in appDataFolder). Die beiden Module
 * teilen sich nur den Capacitor-Plugin-Endpunkt `GoogleDriveBackup`, aber
 * jedes uebergibt seinen eigenen Scope bei JEDEM Aufruf, hat einen eigenen
 * Session-Token-Cache, einen eigenen localStorage-Key und eigenes Folder-ID-
 * Caching. Google's Identity AuthorizationClient unterstuetzt Incremental
 * Authorization → beide Scopes koennen am selben Account parallel existieren.
 *
 * Warum kein Eingriff in googleDriveBackup.js?
 * - `sessionAccessToken` dort ist ein Modul-Level-Cache ohne Scope-Key.
 *   Wuerden wir ihn mitbenutzen, koennte ein drive.file-Token in einem
 *   appdata-Call landen (oder umgekehrt) → 403/Bruch des JSON-Backups.
 * - `TOKEN_STORAGE_KEY = 'google_auth_state'` ist ebenfalls ein einziger
 *   Schluessel und traegt `scope` statisch eingetragen.
 *
 * Unabhaengigkeit → null Regressionsrisiko fuer den JSON-Backup-Flow.
 */

import { registerPlugin } from '@capacitor/core';

// ─────── Konstanten (alle eigen, keine Ueberlappung mit googleDriveBackup.js) ───────

const AUTH_SCOPE_PDF = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_STORAGE_KEY_PDF = 'google_auth_state_pdf';
const FOLDER_ID_STORAGE_KEY = 'google_pdf_archive_folder_id';
const ARCHIVE_FOLDER_NAME = 'eStundnzettl Archiv';
const SESSION_TOKEN_MAX_AGE_MS = 45 * 60 * 1000;

const GoogleDriveBackupPlugin: any = registerPlugin('GoogleDriveBackup');

// ─────── Modul-lokaler Token-Cache (isoliert!) ───────

let sessionAccessTokenPdf: string | null = null;
let sessionTokenSavedAtPdf: number = 0;

const cacheSessionTokenPdf = (token: string | null): void => {
  sessionAccessTokenPdf = token || null;
  sessionTokenSavedAtPdf = token ? Date.now() : 0;
};

const getCachedSessionTokenPdf = (): string | null => {
  if (!sessionAccessTokenPdf) return null;
  if (Date.now() - sessionTokenSavedAtPdf > SESSION_TOKEN_MAX_AGE_MS) {
    cacheSessionTokenPdf(null);
    return null;
  }
  return sessionAccessTokenPdf;
};

// ─────── Persistenter Auth-State (separater localStorage-Key) ───────

const getStoredAuthPdf = (): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY_PDF);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveStoredAuthPdf = (auth: Record<string, unknown> | null): void => {
  localStorage.setItem(
    TOKEN_STORAGE_KEY_PDF,
    JSON.stringify({
      scope: AUTH_SCOPE_PDF,
      savedAt: Date.now(),
      source: auth?.source || 'native-plugin',
      accountEmail: auth?.accountEmail || null,
      nativeConnected: auth?.nativeConnected !== false,
      reauthRequired: !!auth?.reauthRequired,
    }),
  );
};

const clearStoredAuthPdf = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY_PDF);
  localStorage.removeItem(FOLDER_ID_STORAGE_KEY);
  cacheSessionTokenPdf(null);
};

// ─────── Plugin-Verfuegbarkeit ───────

const nativeAvailable = async (): Promise<boolean> => {
  try {
    return typeof GoogleDriveBackupPlugin?.getStatus === 'function';
  } catch {
    return false;
  }
};

const parseNativeError = (error: unknown, fallback: string = 'GOOGLE_DRIVE_PDF_ERROR'): string => {
  const message = String((error as any)?.message || error || fallback);
  if (message.includes('not implemented') || message.includes('UNAVAILABLE')) {
    return 'GOOGLE_DRIVE_NATIVE_UNAVAILABLE';
  }
  if (message.includes('CANCELLED')) {
    return 'GOOGLE_DRIVE_AUTH_CANCELLED';
  }
  return message;
};

// ─────── Auth-Operationen (immer explizit mit scope: AUTH_SCOPE_PDF) ───────

/**
 * Oeffnet den Consent-Flow fuer den drive.file-Scope. Falls der Nutzer bereits
 * den drive.appdata-Scope (JSON-Backup) am selben Google-Account genehmigt hat,
 * wird Google den drive.file-Scope in der Regel **inkrementell** ohne erneuten
 * Consent hinzufuegen. Andernfalls erscheint ein Consent-Dialog.
 */
export async function connectGoogleDrivePdf(): Promise<Record<string, unknown>> {
  if (!(await nativeAvailable())) {
    throw new Error('GOOGLE_DRIVE_NATIVE_UNAVAILABLE');
  }
  try {
    const nativeResult = await GoogleDriveBackupPlugin.connect({ scope: AUTH_SCOPE_PDF });
    const accessToken = nativeResult?.accessToken || null;
    if (!accessToken) {
      throw new Error('GOOGLE_DRIVE_PDF_AUTH_NO_ACCESS_TOKEN');
    }
    cacheSessionTokenPdf(accessToken);
    saveStoredAuthPdf({
      accountEmail: nativeResult?.accountEmail || null,
      source: nativeResult?.source || 'native-plugin',
      nativeConnected: true,
      reauthRequired: false,
    });
    return {
      authentication: { accessToken },
      email: nativeResult?.accountEmail || null,
      native: nativeResult || null,
    };
  } catch (error) {
    clearStoredAuthPdf();
    throw new Error(parseNativeError(error));
  }
}

/**
 * Widerruft NUR den drive.file-Scope. Der drive.appdata-Scope des bestehenden
 * JSON-Backups bleibt unangetastet (eigener Revocation-Call vom anderen Modul).
 *
 * Achtung: Der native Plugin ruft `revokeAccess` auf dem Scope auf, der aktuell
 * in `lastGrantedScope` steht. Deshalb muessen wir VOR dem Disconnect-Call
 * einen Status-Call mit drive.file machen, damit das Plugin seinen
 * `lastGrantedScope` auf drive.file setzt. Erst dann `disconnect()` aufrufen.
 */
export async function disconnectGoogleDrivePdf(): Promise<void> {
  clearStoredAuthPdf();

  if (!(await nativeAvailable())) return;

  try {
    // Plugin's lastGrantedScope auf drive.file setzen, damit disconnect()
    // nur diesen Scope revoked. getStatus({scope: AUTH_SCOPE_PDF}) setzt
    // lastGrantedScope im Plugin entsprechend.
    await GoogleDriveBackupPlugin.getStatus({ scope: AUTH_SCOPE_PDF });
    await GoogleDriveBackupPlugin.disconnect();
  } catch {
    // Lokaler State ist bereits geleert — Native-Fehler ignorieren
  }
}

/**
 * Holt einen gueltigen drive.file-Token, entweder aus dem Session-Cache oder
 * per silent refresh ueber den Plugin. Immer mit explizitem scope.
 */
export async function getValidGoogleTokenPdf(): Promise<{ accessToken: string }> {
  const cached = getCachedSessionTokenPdf();
  if (cached) return { accessToken: cached };

  if (!(await nativeAvailable())) {
    clearStoredAuthPdf();
    throw new Error('AUTH_REQUIRED');
  }

  try {
    const nativeResult = await GoogleDriveBackupPlugin.refreshToken({ scope: AUTH_SCOPE_PDF });
    const accessToken = nativeResult?.accessToken || null;
    if (!accessToken) {
      throw new Error('AUTH_REQUIRED');
    }
    cacheSessionTokenPdf(accessToken);
    saveStoredAuthPdf({
      accountEmail: nativeResult?.accountEmail || null,
      source: nativeResult?.source || 'native-plugin',
      nativeConnected: true,
      reauthRequired: false,
    });
    return { accessToken };
  } catch (error) {
    const message = parseNativeError(error, 'AUTH_REQUIRED');
    const stored = getStoredAuthPdf();
    const requiresReauth = message.includes('AUTH_REQUIRED');
    saveStoredAuthPdf({
      accountEmail: stored?.accountEmail || null,
      source: stored?.source || 'native-plugin',
      nativeConnected: true,
      reauthRequired: requiresReauth,
    });
    cacheSessionTokenPdf(null);
    throw new Error(requiresReauth ? 'AUTH_REQUIRED' : message);
  }
}

/**
 * Status-Info fuer die Settings-UI. Kombiniert persistenten State und
 * plugin-seitigen Status, aber wieder: IMMER mit explizitem scope.
 */
export async function getGoogleDrivePdfStatus(): Promise<Record<string, unknown>> {
  const stored = getStoredAuthPdf();
  if (!(await nativeAvailable())) {
    return {
      available: false,
      connected: false,
      hasToken: false,
      reauthRequired: false,
      scope: AUTH_SCOPE_PDF,
      accountEmail: stored?.accountEmail || null,
    };
  }
  try {
    const result = await GoogleDriveBackupPlugin.getStatus({ scope: AUTH_SCOPE_PDF });
    return {
      available: true,
      connected: !!result?.connected && !!stored?.nativeConnected,
      hasToken: !!result?.hasToken && !!stored?.nativeConnected,
      reauthRequired: !!result?.reauthRequired,
      scope: AUTH_SCOPE_PDF,
      accountEmail: result?.accountEmail || stored?.accountEmail || null,
    };
  } catch (error) {
    return {
      available: true,
      connected: !!stored?.nativeConnected,
      hasToken: false,
      reauthRequired: false,
      scope: AUTH_SCOPE_PDF,
      accountEmail: stored?.accountEmail || null,
      error: parseNativeError(error),
    };
  }
}

// ─────── authFetch mit eigenem Retry-Pfad ───────

async function authFetchPdf(url: string, options: RequestInit = {}): Promise<Response> {
  const execute = async (accessToken: string): Promise<Response> =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  const auth = await getValidGoogleTokenPdf();
  if (!auth?.accessToken) throw new Error('AUTH_REQUIRED');

  let response = await execute(auth.accessToken);

  if (response.status === 401 || response.status === 403) {
    cacheSessionTokenPdf(null);
    const refreshed = await getValidGoogleTokenPdf();
    if (!refreshed?.accessToken) throw new Error('AUTH_REQUIRED');
    response = await execute(refreshed.accessToken);
    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_REQUIRED');
    }
  }

  return response;
}

// ─────── Folder-Management (sichtbarer Ordner im Drive-Root) ───────

/**
 * Findet oder erstellt den Ordner `eStundnzettl Archiv` im Drive des Nutzers.
 *
 * Wichtig: Mit dem drive.file-Scope sieht die App NUR Dateien/Ordner, die sie
 * selbst erstellt hat. Die Suche liefert also nur dann Treffer, wenn wir den
 * Ordner bei einem frueheren Lauf bereits erstellt haben. Wenn der Nutzer ihn
 * manuell loescht, liefert die Suche nichts → wir erstellen einen neuen.
 */
async function findOrCreateArchiveFolder(): Promise<string> {
  // Cache-Hit: ID aus localStorage
  const cached = localStorage.getItem(FOLDER_ID_STORAGE_KEY);
  if (cached) {
    // Cheap verify: get file metadata — falls 404, Cache invalidieren
    try {
      const verifyRes = await authFetchPdf(
        `https://www.googleapis.com/drive/v3/files/${cached}?fields=id,name,trashed`,
        { method: 'GET' },
      );
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (data?.id && !data.trashed) {
          return cached;
        }
      }
      // 404 / trashed → invalidiere Cache, fall through zur Neu-Erstellung
      localStorage.removeItem(FOLDER_ID_STORAGE_KEY);
    } catch {
      localStorage.removeItem(FOLDER_ID_STORAGE_KEY);
    }
  }

  // Suche nach vorhandenem Ordner
  const query = `name = '${ARCHIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`;
  const searchRes = await authFetchPdf(searchUrl, { method: 'GET' });
  if (searchRes.ok) {
    const data = await searchRes.json();
    const existing = data?.files?.[0]?.id;
    if (existing) {
      localStorage.setItem(FOLDER_ID_STORAGE_KEY, existing);
      return existing;
    }
  }

  // Ordner erstellen
  const createRes = await authFetchPdf('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: ARCHIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Folder create failed: ${createRes.status} ${txt}`);
  }

  const created = await createRes.json();
  if (!created?.id) {
    throw new Error('Folder create returned no id');
  }
  localStorage.setItem(FOLDER_ID_STORAGE_KEY, created.id);
  return created.id;
}

// ─────── Datei-Upload (Multipart mit binaerem Blob) ───────

/**
 * Findet die Datei-ID im Archiv-Ordner nach Dateiname (fuer Update statt Create).
 */
async function findFileIdInFolder(fileName: string, folderId: string): Promise<string | null> {
  const query = `name = '${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`;
  const res = await authFetchPdf(url, { method: 'GET' });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.files?.[0]?.id || null;
}

/**
 * Laedt ein PDF in den `eStundnzettl Archiv`-Ordner hoch. Existiert bereits
 * eine Datei mit gleichem Namen → Update (PATCH); sonst → neu erstellen (POST).
 *
 * Body-Konstruktion: Wir bauen den multipart/related-Body als **reinen String**
 * mit base64-codiertem Binary-Teil — byte-identisches Muster wie im bewaehrten
 * JSON-Backup (`googleDriveBackup.js:253-266`, `createMultipartBody`), das seit
 * Monaten stabil laeuft. Ein Versuch mit `new Blob([str, str, blob, str])`
 * fuehrte auf Android-WebView zu "400 Invalid multipart request with 0 mime
 * parts" — vermutlich weil der Blob-Serializer die Content-Type-Header-Absicht
 * nicht zuverlaessig umsetzt und/oder der leading-dash-Boundary Parser-Quirks
 * ausloest. Der String-Ansatz umgeht beide Probleme.
 *
 * @param {string} filename  z.B. 'Stundenzettel_2026-04_Max.pdf'
 * @param {string} base64    base64-kodierter PDF-Inhalt (ohne data:-Prefix)
 * @param {Blob}   [_blob]   Ignoriert — bleibt fuer API-Kompatibilitaet
 */
export async function uploadPdfArchiveFile(filename: string, base64: string, _blob?: Blob): Promise<unknown> {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('uploadPdfArchiveFile: base64 fehlt oder ist kein String');
  }

  const folderId = await findOrCreateArchiveFolder();
  const existingId = await findFileIdInFolder(filename, folderId);

  const metadata = existingId
    ? { name: filename, mimeType: 'application/pdf' }
    : { name: filename, mimeType: 'application/pdf', parents: [folderId] };

  // Alphanumerischer Boundary ohne Bindestriche — strictere Parser (wie der von
  // Google Drive) mögen keine führenden Dashes im Boundary-Wert.
  const boundary = 'estd_pdf_archive_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/pdf\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64 +
    closeDelimiter;

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await authFetchPdf(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const txt = await response.text();
    // 404 auf den Ordner → Cache invalidieren und beim naechsten Aufruf
    // neu erstellen
    if (response.status === 404) {
      localStorage.removeItem(FOLDER_ID_STORAGE_KEY);
    }
    throw new Error(`PDF upload failed: ${response.status} ${txt}`);
  }

  return response.json();
}

// Re-exports fuer Settings-UI und Targets
export { AUTH_SCOPE_PDF, TOKEN_STORAGE_KEY_PDF, FOLDER_ID_STORAGE_KEY, getStoredAuthPdf };
