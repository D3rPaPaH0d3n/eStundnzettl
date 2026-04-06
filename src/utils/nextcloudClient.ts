import { Capacitor } from '@capacitor/core';
import { NextcloudLoginFlow } from '../plugins/NextcloudLoginFlowPlugin';

/**
 * nextcloudClient.ts — WebDAV-Client für Nextcloud Backup
 *
 * Android nutzt für Login Flow v2 ein kleines natives Plugin,
 * Web bleibt beim fetch-Fallback.
 */

interface NextcloudError {
  ok: false;
  error: {
    code: string;
    message: string;
    httpStatus?: number;
    retriable?: boolean;
  };
}

interface NextcloudSuccess<T = any> {
  ok: true;
  value?: T;
  data?: T;
  rawText?: string;
  httpStatus?: number;
}

type NextcloudResult<T = any> = NextcloudSuccess<T> | NextcloudError;

function buildError(code: string, message: string, httpStatus?: number, retriable = false): NextcloudError {
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

function normalizeServerUrl(serverUrl: string): NextcloudResult<string> {
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

function validatePollInput(pollEndpoint: string, token: string): NextcloudResult {
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

async function parseJsonResponse(response: Response, fallbackMessage?: string): Promise<NextcloudResult> {
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

export async function initiateLoginFlow(serverUrl: string): Promise<NextcloudResult<{
  poll: { token: string; endpoint: string };
  login: string;
}>> {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized.ok) return normalized;

  if (Capacitor.getPlatform() === 'android') {
    try {
      const result = await (NextcloudLoginFlow as any).startLoginFlow({ serverUrl: normalized.value });
      // Convert plugin result to expected format
      return {
        ok: true,
        value: {
          poll: {
            token: result.token,
            endpoint: `${normalized.value}/index.php/login/v2/poll`
          },
          login: result.url
        }
      };
    } catch (error: any) {
      return buildError('PLUGIN_ERROR', error?.message || 'Native Android-Integration fehlgeschlagen', undefined, true);
    }
  }

  try {
    const response = await fetch(`${normalized.value}/index.php/login/v2`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return buildError('HTTP_ERROR', `Login-Init fehlgeschlagen (${response.status})`, response.status);
    }

    const parsed = await parseJsonResponse(response, 'Login-Init: Ungültige Antwort');
    if (!parsed.ok) return parsed;

    const { poll, login } = parsed.data || {};
    if (!poll?.token || !poll?.endpoint || !login) {
      return buildError('INVALID_RESPONSE', 'Login-Init: Unvollständige Antwort');
    }

    return { ok: true, data: { poll, login } };
  } catch (error: any) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler', undefined, true);
  }
}

export async function pollLoginToken(pollEndpoint: string, token: string): Promise<NextcloudResult<{
  server: string;
  loginName: string;
  appPassword: string;
}>> {
  const validated = validatePollInput(pollEndpoint, token);
  if (!validated.ok) return validated;

  try {
    const response = await fetch(pollEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ token }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return buildError('POLL_404', 'Poll-Endpunkt nicht gefunden', 404);
      }
      return buildError('HTTP_ERROR', `Poll fehlgeschlagen (${response.status})`, response.status);
    }

    const parsed = await parseJsonResponse(response, 'Poll: Ungültige Antwort');
    if (!parsed.ok) return parsed;

    const { server, loginName, appPassword } = parsed.data || {};
    if (!server || !loginName || !appPassword) {
      return buildError('INVALID_RESPONSE', 'Poll: Unvollständige Antwort');
    }

    return { ok: true, data: { server, loginName, appPassword } };
  } catch (error: any) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler', undefined, true);
  }
}

export async function testWebdavConnection(
  serverUrl: string,
  username: string,
  password: string
): Promise<NextcloudResult> {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized.ok) return normalized;

  if (!username || !password) {
    return buildError('MISSING_CREDENTIALS', 'Benutzername oder Passwort fehlt');
  }

  try {
    const webdavUrl = `${normalized.value}/remote.php/dav/files/${encodeURIComponent(username)}/`;
    const response = await fetch(webdavUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        Depth: '0',
      },
    });

    if (response.status === 401) {
      return buildError('UNAUTHORIZED', 'Anmeldedaten ungültig', 401);
    }
    if (!response.ok) {
      return buildError('HTTP_ERROR', `WebDAV-Test fehlgeschlagen (${response.status})`, response.status);
    }

    return { ok: true };
  } catch (error: any) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler', undefined, true);
  }
}

export async function uploadBackup(
  serverUrl: string,
  username: string,
  password: string,
  backupData: any,
  fileName?: string
): Promise<NextcloudResult> {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized.ok) return normalized;

  if (!username || !password) {
    return buildError('MISSING_CREDENTIALS', 'Benutzername oder Passwort fehlt');
  }

  const backupFileName = fileName || `eStundnzettl-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const content = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);

  try {
    const webdavUrl = `${normalized.value}/remote.php/dav/files/${encodeURIComponent(username)}/${backupFileName}`;
    const response = await fetch(webdavUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'application/json',
      },
      body: content,
    });

    if (response.status === 401) {
      return buildError('UNAUTHORIZED', 'Anmeldedaten ungültig', 401);
    }
    if (response.status === 403) {
      return buildError('FORBIDDEN', 'Keine Schreibberechtigung', 403);
    }
    if (response.status === 404) {
      return buildError('NOT_FOUND', 'WebDAV-Pfad nicht gefunden', 404);
    }
    if (!response.ok) {
      return buildError('HTTP_ERROR', `Upload fehlgeschlagen (${response.status})`, response.status);
    }

    return { ok: true };
  } catch (error: any) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler', undefined, true);
  }
}

export async function listBackups(
  serverUrl: string,
  username: string,
  password: string
): Promise<NextcloudResult<Array<{ name: string; size: number; lastModified: string }>>> {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized.ok) return normalized;

  if (!username || !password) {
    return buildError('MISSING_CREDENTIALS', 'Benutzername oder Passwort fehlt');
  }

  try {
    const webdavUrl = `${normalized.value}/remote.php/dav/files/${encodeURIComponent(username)}/`;
    const response = await fetch(webdavUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        Depth: '1',
        'Content-Type': 'application/xml',
      },
      body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`,
    });

    if (response.status === 401) {
      return buildError('UNAUTHORIZED', 'Anmeldedaten ungültig', 401);
    }
    if (!response.ok) {
      return buildError('HTTP_ERROR', `List fehlgeschlagen (${response.status})`, response.status);
    }

    const text = await response.text();
    // Einfache XML-Parsing (für Demo-Zwecke)
    const backups: Array<{ name: string; size: number; lastModified: string }> = [];
    const nameMatches = text.match(/<d:displayname>([^<]+)<\/d:displayname>/g);
    const sizeMatches = text.match(/<d:getcontentlength>([^<]+)<\/d:getcontentlength>/g);
    const dateMatches = text.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/g);

    if (nameMatches) {
      for (let i = 0; i < nameMatches.length; i++) {
        const name = nameMatches[i].replace(/<[^>]+>/g, '');
        if (name && name.endsWith('.json') && name.includes('eStundnzettl-backup')) {
          const size = sizeMatches?.[i] ? parseInt(sizeMatches[i].replace(/<[^>]+>/g, ''), 10) : 0;
          const lastModified = dateMatches?.[i] ? dateMatches[i].replace(/<[^>]+>/g, '') : '';
          backups.push({ name, size, lastModified });
        }
      }
    }

    return { ok: true, data: backups };
  } catch (error: any) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler', undefined, true);
  }
}

export async function downloadBackup(
  serverUrl: string,
  username: string,
  password: string,
  fileName: string
): Promise<NextcloudResult<string>> {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized.ok) return normalized;

  if (!username || !password) {
    return buildError('MISSING_CREDENTIALS', 'Benutzername oder Passwort fehlt');
  }

  try {
    const webdavUrl = `${normalized.value}/remote.php/dav/files/${encodeURIComponent(username)}/${fileName}`;
    const response = await fetch(webdavUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      },
    });

    if (response.status === 401) {
      return buildError('UNAUTHORIZED', 'Anmeldedaten ungültig', 401);
    }
    if (response.status === 404) {
      return buildError('NOT_FOUND', 'Backup-Datei nicht gefunden', 404);
    }
    if (!response.ok) {
      return buildError('HTTP_ERROR', `Download fehlgeschlagen (${response.status})`, response.status);
    }

    const content = await response.text();
    return { ok: true, data: content };
  } catch (error: any) {
    return buildError('NETWORK_ERROR', error?.message || 'Netzwerkfehler', undefined, true);
  }
}

// Kompatibilitäts-Funktion für alten Code
export async function uploadBackupLegacy(
  serverUrl: string,
  username: string,
  password: string,
  backupData: any
): Promise<NextcloudResult> {
  return uploadBackup(serverUrl, username, password, backupData);
}