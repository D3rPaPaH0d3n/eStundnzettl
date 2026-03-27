/**
 * nextcloudClient.js — WebDAV-Client für Nextcloud Backup
 * 
 * Nutzt nur fetch() + Basic Auth (kein npm-Dependency).
 * App-Passwörter laufen nie ab → kein Token-Refresh nötig.
 */

/**
 * Startet den Nextcloud Login Flow v2
 * @param {string} serverUrl - Nextcloud Server URL
 * @returns {Promise<{ loginUrl: string, pollToken: string, pollEndpoint: string }>}
 */
export async function initiateLoginFlow(serverUrl) {
  let baseUrl = serverUrl.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');

  try {
    const res = await fetch(`${baseUrl}/index.php/login/v2`, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      }
    });

    const rawText = await res.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      // rawText behalten für Debug
    }

    if (!res.ok) {
      const details = `HTTP ${res.status} ${res.statusText}${rawText ? ` — ${rawText.slice(0, 160)}` : ''}`;
      throw new Error(details);
    }

    if (!data?.login || !data?.poll?.token || !data?.poll?.endpoint) {
      throw new Error(`Ungültige Antwort vom Server${rawText ? ` — ${rawText.slice(0, 160)}` : ''}`);
    }

    return {
      loginUrl: data.login,
      pollToken: data.poll.token,
      pollEndpoint: data.poll.endpoint
    };
  } catch (err) {
    const message = err?.message || 'Unbekannter Fehler';
    console.error('Nextcloud Login Flow error:', message);
    throw new Error(message);
  }
}

/**
 * Pollt auf Login-Ergebnis des Login Flow v2
 * @returns {Promise<{ server: string, loginName: string, appPassword: string } | null>}
 */
export async function pollLoginResult(pollEndpoint, pollToken) {
  const res = await fetch(pollEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `token=${encodeURIComponent(pollToken)}`
  });
  if (res.status === 404) return null; // Noch nicht autorisiert
  if (!res.ok) throw new Error('Login Flow fehlgeschlagen');
  return await res.json(); // { server, loginName, appPassword }
}

const BACKUP_FOLDER = "eStundnzettl";
const BACKUP_FILENAME = "estundnzettl_backup.json";

/** URL normalisieren: trailing slash entfernen */
function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

/** Basic Auth Header erzeugen */
function authHeaders(user, pass) {
  return {
    Authorization: "Basic " + btoa(user + ":" + pass),
  };
}

/** WebDAV-Basispfad für Dateien */
function davPath(url, user) {
  return `${normalizeUrl(url)}/remote.php/dav/files/${encodeURIComponent(user)}`;
}

/**
 * Verbindung testen via PROPFIND auf den User-Root.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function testConnection(url, user, pass) {
  try {
    const res = await fetch(`${davPath(url, user)}/`, {
      method: "PROPFIND",
      headers: {
        ...authHeaders(user, pass),
        Depth: "0",
      },
    });
    if (res.status === 207) return { ok: true };
    if (res.status === 401) return { ok: false, error: "Ungültige Anmeldedaten (401)" };
    if (res.status === 404) return { ok: false, error: "Server nicht gefunden (404)" };
    return { ok: false, error: `Unerwarteter Status: ${res.status}` };
  } catch (err) {
    return { ok: false, error: "Verbindung fehlgeschlagen — URL prüfen" };
  }
}

/**
 * Backup-Ordner anlegen (MKCOL, ignoriert 405 = existiert bereits).
 */
export async function ensureFolder(url, user, pass) {
  try {
    const res = await fetch(`${davPath(url, user)}/${BACKUP_FOLDER}`, {
      method: "MKCOL",
      headers: authHeaders(user, pass),
    });
    // 201 = erstellt, 405 = existiert bereits — beides OK
    if (res.status === 201 || res.status === 405) return true;
    if (res.status === 401) throw new Error("Nicht autorisiert (401)");
    // Manche Nextcloud-Versionen geben 409 wenn Ordner existiert
    if (res.status === 409) return true;
    throw new Error(`MKCOL fehlgeschlagen: ${res.status}`);
  } catch (err) {
    if (err.message.includes("401")) throw err;
    throw new Error(`Ordner erstellen fehlgeschlagen: ${err.message}`);
  }
}

/**
 * Backup-JSON hochladen (PUT).
 */
export async function uploadBackup(url, user, pass, jsonData) {
  await ensureFolder(url, user, pass);
  const content = typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData, null, 2);
  const res = await fetch(`${davPath(url, user)}/${BACKUP_FOLDER}/${BACKUP_FILENAME}`, {
    method: "PUT",
    headers: {
      ...authHeaders(user, pass),
      "Content-Type": "application/json",
    },
    body: content,
  });
  if (res.status === 201 || res.status === 204) return true;
  if (res.status === 401) throw new Error("Nicht autorisiert (401)");
  throw new Error(`Upload fehlgeschlagen: ${res.status}`);
}

/**
 * Backup-JSON herunterladen (GET).
 * @returns {Promise<object|null>} Parsed JSON oder null bei 404.
 */
export async function downloadBackup(url, user, pass) {
  const res = await fetch(`${davPath(url, user)}/${BACKUP_FOLDER}/${BACKUP_FILENAME}`, {
    method: "GET",
    headers: authHeaders(user, pass),
  });
  if (res.status === 404) return null;
  if (res.status === 401) throw new Error("Nicht autorisiert (401)");
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  return await res.json();
}

/**
 * Prüfen ob ein Backup existiert (PROPFIND auf die Datei).
 * @returns {Promise<boolean>}
 */
export async function findBackup(url, user, pass) {
  try {
    const res = await fetch(`${davPath(url, user)}/${BACKUP_FOLDER}/${BACKUP_FILENAME}`, {
      method: "PROPFIND",
      headers: {
        ...authHeaders(user, pass),
        Depth: "0",
      },
    });
    return res.status === 207;
  } catch {
    return false;
  }
}
