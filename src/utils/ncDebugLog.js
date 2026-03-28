/**
 * Nextcloud Debug Log — sichtbar in der App UI.
 * Sammelt alle Nextcloud-Operationen für Live-Debugging.
 */

const MAX_ENTRIES = 50;
const _log = [];
const _listeners = new Set();

export function ncLog(msg) {
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  _log.push(entry);
  if (_log.length > MAX_ENTRIES) _log.shift();
  _listeners.forEach(fn => fn([..._log]));
}

export function getNcLog() {
  return [..._log];
}

export function onNcLogChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function clearNcLog() {
  _log.length = 0;
  _listeners.forEach(fn => fn([]));
}
