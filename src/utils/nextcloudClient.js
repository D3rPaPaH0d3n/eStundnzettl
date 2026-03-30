import { Capacitor } from '@capacitor/core';
import { NextcloudLoginFlow } from '../plugins/NextcloudLoginFlowPlugin';

/**
 * nextcloudClient.js — WebDAV-Client für Nextcloud Backup
 *
 * Android nutzt für Login Flow v2 ein kleines natives Plugin,
 * Web bleibt beim fetch-Fallback.
 */

function buildError(code, message, httpStatus, retriable = false) {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(httpStatus ? { httpStatus } : {}),
      retriable,
    },
  };
}

function normalizeServerUrl(serverUrl) {
  const input = String(serverUrl || '').trim();
  if (!input) {
    return buildError('INVALID_URL', 'Server-URL fehlt');
  }

  let normalized = input;
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  normalized = normalized.replace(/\/+$/, '');

  try {
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return buildError('INVALID_URL', 'Server-URL ist ungültig');
    }
    return { ok: true, value: url.toString().replace(/\/+$/, '') };
  } catch {
    return buildError('INVALID_URL', 'Server-URL ist ungültig');
  }
}

function validatePollInput(pollEndpoint, token) {
  if (!pollEndpoint || typeof pollEndpoint !== 'string') {
    return buildError('INVALID_POLL_ENDPOINT', 'Poll-Endpunkt fehlt');
  }
  if (!token || typeof token !== 'string') {
    return buildError('INVALID_TOKEN', 'Token fehlt');
  }

  try {
    const url = new URL(pollEndpoint);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return buildError('INVALID_POLL_ENDPOINT', 'Poll-Endpunkt ist ungültig');
    }
  } catch {
    return buildError('INVALID_POLL_ENDPOINT', 'Poll-Endpunkt ist ungültig');
  }

  return { ok: true };
}

async function parseJsonResponse(response, fallbackMessage) {
  const httpStatus = response.status;
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html') || rawText.trim().startsWith('<')) {
    return buildError('INVALID_CONTENT_TYPE', 'Server liefert HTML statt JSON', httpStatus);
  }

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    return buildError('INVALID_JSON', fallbackMessage || 'Server liefert ungültiges JSON', httpStatus);
  }

  return { ok: true, data, rawText, httpStatus };
}

export async function initiateLoginFlow(serverUrl) {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized.ok) return normalized;

  if (Capacitor.getPlatform() === 'android') {
    try {
      return await NextcloudLoginFlow.startLoginFlow({ serverUrl: normalized.value });
    } catch (error) {
      return buildError('PLUGIN_ERROR', error?.message || 'Native Android-Integration fehlgeschlagen', undefined, true);
    }
  }

  try {
    const response = await fetch(`${normalized.value}/index.php/login/v2`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    if (response.status < 200 || response.status >= 300) {
      const rawText = await response.text();
      return buildError(
        'HTTP_ERROR',
        `Login Flow konnte nicht gestartet werden${rawText ? ` (HTTP ${response.status}: ${rawText.slice(0, 180)})` : ''}`,
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }

    const parsed = await parseJsonResponse(response, 'Server liefert ungültiges JSON');
    if (!parsed.ok) return parsed;

    const data = parsed.data;
    if (!data?.login || !data?.poll?.endpoint || !data?.poll?.token) {
      return buildError('INVALID_RESPONSE', 'Antwort vom Server ist unvollständig', parsed.httpStatus);
    }

    return {
      ok: true,
      loginUrl: data.login,
      pollEndpoint: data.poll.endpoint,
      token: data.poll.token,
    };
  } catch (error) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler bei der Verbindung zu Nextcloud', undefined, true);
  }
}

export async function pollLoginResult(pollEndpoint, token) {
  const validation = validatePollInput(pollEndpoint, token);
  if (!validation.ok) return validation;

  if (Capacitor.getPlatform() === 'android') {
    try {
      return await NextcloudLoginFlow.pollLoginFlow({ pollEndpoint, token });
    } catch (error) {
      return buildError('PLUGIN_ERROR', error?.message || 'Native Android-Integration fehlgeschlagen', undefined, true);
    }
  }

  try {
    const response = await fetch(pollEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${encodeURIComponent(token)}`,
    });

    if (response.status === 404) {
      return { ok: true, status: 'pending' };
    }

    if (response.status < 200 || response.status >= 300) {
      const rawText = await response.text();
      return buildError(
        'HTTP_ERROR',
        `Polling des Login Flow fehlgeschlagen${rawText ? ` (HTTP ${response.status}: ${rawText.slice(0, 180)})` : ''}`,
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }

    const parsed = await parseJsonResponse(response, 'Server liefert ungültiges JSON');
    if (!parsed.ok) return parsed;

    const data = parsed.data;
    if (!data?.server || !data?.loginName || !data?.appPassword) {
      return buildError('INVALID_RESPONSE', 'Antwort vom Server ist unvollständig', parsed.httpStatus);
    }

    return {
      ok: true,
      status: 'complete',
      server: data.server,
      loginName: data.loginName,
      appPassword: data.appPassword,
    };
  } catch (error) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler bei der Verbindung zu Nextcloud', undefined, true);
  }
}

const BACKUP_FOLDER = "eStundnzettl";
const BACKUP_FILENAME = "estundnzettl_backup.json";
const DIRECT_ROOT_UPLOAD = false;
const verifiedFolderCache = new Map();
const resolvedDavUserCache = new Map();
const NEXTCLOUD_RATE_LIMIT_KEY = "estundnzettl_nextcloud_rate_limit_until";
const DEFAULT_RATE_LIMIT_MS = 30000;

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

function getFolderCacheKey(url, user) {
  return `${normalizeUrl(url)}|${String(user || "").trim()}`;
}

function getDavUserCacheKey(url, user) {
  return `${normalizeUrl(url)}|${String(user || "").trim()}`;
}

function getRateLimitCacheKey(url, user) {
  return `${normalizeUrl(url)}|${String(user || "").trim()}`;
}

function readRateLimitState() {
  try {
    const raw = localStorage.getItem(NEXTCLOUD_RATE_LIMIT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRateLimitState(state) {
  localStorage.setItem(NEXTCLOUD_RATE_LIMIT_KEY, JSON.stringify(state));
}

function setRateLimited(url, user, waitMs = DEFAULT_RATE_LIMIT_MS) {
  const state = readRateLimitState();
  state[getRateLimitCacheKey(url, user)] = Date.now() + waitMs;
  writeRateLimitState(state);
}

function clearRateLimited(url, user) {
  const state = readRateLimitState();
  const key = getRateLimitCacheKey(url, user);
  if (state[key]) {
    delete state[key];
    writeRateLimitState(state);
  }
}

function getRateLimitRemaining(url, user) {
  const state = readRateLimitState();
  const until = Number(state[getRateLimitCacheKey(url, user)] || 0);
  if (!until) return 0;
  const remaining = until - Date.now();
  if (remaining <= 0) {
    delete state[getRateLimitCacheKey(url, user)];
    writeRateLimitState(state);
    return 0;
  }
  return remaining;
}

function formatRateLimitMessage(remainingMs) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `Nextcloud drosselt gerade Anfragen. Bitte ${seconds}s warten und dann erneut versuchen.`;
}

/**
 * Echte Nextcloud User-ID via OCS API auflösen.
 * loginName aus Login Flow v2 kann vom WebDAV-Pfad abweichen
 * (z.B. E-Mail vs. uid, Display-Name vs. uid).
 * Gibt die echte uid zurück, oder den loginName als Fallback.
 */
export async function resolveUserId(serverUrl, loginName, appPassword) {
  try {
    const url = `${normalizeUrl(serverUrl)}/ocs/v1.php/cloud/user?format=json`;
    const res = await nativeHttp(url, "GET", loginName, appPassword);
    if (res.status === 200 && res.body) {
      const data = typeof res.body === "string" ? JSON.parse(res.body) : res.body;
      const uid = data?.ocs?.data?.id;
      if (uid && uid.trim()) {
        return uid.trim();
      }
    }
    return loginName;
  } catch (e) {
    return loginName;
  }
}

async function getDavUser(serverUrl, authUser, appPassword) {
  const cacheKey = getDavUserCacheKey(serverUrl, authUser);
  if (resolvedDavUserCache.has(cacheKey)) {
    return resolvedDavUserCache.get(cacheKey);
  }

  const davUser = await resolveUserId(serverUrl, authUser, appPassword);
  resolvedDavUserCache.set(cacheKey, davUser || authUser);
  return davUser || authUser;
}

export function getNextcloudErrorMessage(result, fallback = 'Nextcloud Login fehlgeschlagen') {
  return result?.error?.message || fallback;
}

/**
 * Native HTTP-Request über das Capacitor Plugin (umgeht CORS auf Android).
 * Fällt auf fetch() zurück wenn nicht auf Android.
 */
async function nativeHttp(url, method, user, pass, body, contentType) {
  const remaining = getRateLimitRemaining(url, user);
  if (remaining > 0) {
    throw new Error(formatRateLimitMessage(remaining));
  }

  if (Capacitor.getPlatform() === 'android') {
    const result = await NextcloudLoginFlow.httpRequest({
      url,
      method,
      username: user,
      password: pass,
      body: body || undefined,
      contentType: contentType || undefined,
    });
    if (!result.ok) {
      const errMsg = result.error?.message || `Native HTTP fehlgeschlagen: ${result.error?.code}`;
      throw new Error(errMsg);
    }
    if (result.status === 429) {
      setRateLimited(url, user);
      throw new Error(formatRateLimitMessage(DEFAULT_RATE_LIMIT_MS));
    }
    clearRateLimited(url, user);
    return { status: result.status, body: result.body || "" };
  }

  // Web-Fallback
  const headers = { ...authHeaders(user, pass) };
  if (contentType) headers["Content-Type"] = contentType;
  if (method === "PROPFIND") headers["Depth"] = "0";
  const res = await fetch(url, { method, headers, body: body || undefined });
  if (res.status === 429) {
    setRateLimited(url, user);
    throw new Error(formatRateLimitMessage(DEFAULT_RATE_LIMIT_MS));
  }
  clearRateLimited(url, user);
  return { status: res.status, body: await res.text() };
}

/**
 * Verbindung testen via PROPFIND auf den User-Root.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function testConnection(url, user, pass) {
  try {
    const davUser = await getDavUser(url, user, pass);
    const res = await nativeHttp(`${davPath(url, davUser)}/`, "PROPFIND", user, pass);
    if (res.status === 207 || res.status === 200) { 
      return { ok: true }; 
    }
    if (res.status === 401) { return { ok: false, error: "Ungültige Anmeldedaten (401)" }; }
    if (res.status === 404) { return { ok: false, error: "Server nicht gefunden (404)" }; }
    return { ok: false, error: `Unerwarteter Status: ${res.status}` };
  } catch (e) {
    return { ok: false, error: `Verbindung fehlgeschlagen: ${e.message}` };
  }
}

/**
 * Backup-Ordner anlegen (MKCOL, ignoriert 405 = existiert bereits).
 */
export async function ensureFolder(url, user, pass) {
  const cacheKey = getFolderCacheKey(url, user);
  if (verifiedFolderCache.has(cacheKey)) {
    return { ok: true };
  }

  const davUser = await getDavUser(url, user, pass);
  const folderUrl = `${davPath(url, davUser)}/${BACKUP_FOLDER}/`;
  try {
    const res = await nativeHttp(folderUrl, "MKCOL", user, pass);
    if (res.status === 201 || res.status === 405) {
      verifiedFolderCache.set(cacheKey, true);
      return { ok: true };
    }
    if (res.status === 401) throw new Error("Nicht autorisiert (401)");
    if (res.status === 409) {
      verifiedFolderCache.set(cacheKey, true);
      return { ok: true };
    }
    throw new Error(`MKCOL ${res.status} auf ${folderUrl} body=${(res.body || "").substring(0, 500)}`);
  } catch (err) {
    if (err.message.includes("401")) throw err;
    if (err.message.includes("drosselt gerade Anfragen")) {
      return { ok: false, reason: "rate_limited" };
    }
    throw new Error(`Ordner erstellen fehlgeschlagen: ${err.message}`);
  }
}

export async function uploadBackup(url, user, pass, jsonData) {
  const content = typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData, null, 2);
  const davUser = await getDavUser(url, user, pass);

  const targetUrl = DIRECT_ROOT_UPLOAD
    ? `${davPath(url, davUser)}/${BACKUP_FILENAME}`
    : `${davPath(url, davUser)}/${BACKUP_FOLDER}/${BACKUP_FILENAME}`;

  if (!DIRECT_ROOT_UPLOAD) {
    const folderResult = await ensureFolder(url, user, pass);
    if (folderResult?.reason === "rate_limited") {
      throw new Error(formatRateLimitMessage(getRateLimitRemaining(url, user) || DEFAULT_RATE_LIMIT_MS));
    }
  } else {
  }

  const res = await nativeHttp(
    targetUrl,
    "PUT", user, pass, content, "application/json"
  );
  if (res.status === 201 || res.status === 204) {
    verifiedFolderCache.set(getFolderCacheKey(url, user), true);
    return true;
  }
  if (res.status === 401) throw new Error("Nicht autorisiert (401)");
  throw new Error(`Upload ${res.status} auf ${targetUrl} body=${(res.body || "").substring(0, 200)}`);
}

export async function downloadBackup(url, user, pass) {
  const davUser = await getDavUser(url, user, pass);
  const res = await nativeHttp(
    `${davPath(url, davUser)}/${BACKUP_FOLDER}/${BACKUP_FILENAME}`,
    "GET", user, pass
  );
  if (res.status === 404) return null;
  if (res.status === 401) throw new Error("Nicht autorisiert (401)");
  if (res.status < 200 || res.status >= 300) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  try {
    return JSON.parse(res.body);
  } catch {
    throw new Error("Backup-Datei ist kein gültiges JSON");
  }
}

export async function findBackup(url, user, pass) {
  try {
    const davUser = await getDavUser(url, user, pass);
    const res = await nativeHttp(
      `${davPath(url, davUser)}/${BACKUP_FOLDER}/${BACKUP_FILENAME}`,
      "PROPFIND", user, pass
    );
    return res.status === 207;
  } catch {
    return false;
  }
}
