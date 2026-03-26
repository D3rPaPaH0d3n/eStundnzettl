/**
 * storageMode.js — Zentrale Steuerung: SQLite oder localStorage?
 *
 * Wird einmalig beim App-Start initialisiert.
 * Danach können alle Module synchron abfragen, welcher Storage aktiv ist.
 */

let _mode = "localStorage"; // Default/Fallback
let _initialized = false;

/**
 * Setzt den aktiven Storage-Modus.
 * Wird von der DB-Initialisierung aufgerufen.
 *
 * @param {"sqlite"|"localStorage"} mode
 */
export function setStorageMode(mode) {
  _mode = mode;
  _initialized = true;
  console.info(`[storageMode] Aktiver Speicher: ${mode}`);
}

/**
 * Gibt den aktuellen Storage-Modus zurück.
 * @returns {"sqlite"|"localStorage"}
 */
export function getStorageMode() {
  return _mode;
}

/**
 * Prüft ob SQLite der aktive Speicher ist.
 * @returns {boolean}
 */
export function isSQLiteActive() {
  return _mode === "sqlite";
}

/**
 * Prüft ob der Modus bereits bestimmt wurde.
 * @returns {boolean}
 */
export function isStorageModeInitialized() {
  return _initialized;
}
