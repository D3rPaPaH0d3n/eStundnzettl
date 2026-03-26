/**
 * storageMode.js — Zentrale Steuerung: SQLite oder localStorage?
 *
 * eStundnzettl ist eine reine Android-App — SQLite ist IMMER der aktive Speicher.
 * Diese Datei bleibt für API-Kompatibilität, aber alle Funktionen geben "sqlite" zurück.
 */

let _initialized = false;

/**
 * Setzt den aktiven Storage-Modus (nur "sqlite" erlaubt).
 *
 * @param {"sqlite"|"localStorage"} mode
 */
export function setStorageMode(mode) {
  if (mode !== "sqlite") {
    console.warn(`[storageMode] Nur "sqlite" erlaubt, aber "${mode}" übergeben — ignoriert`);
  }
  _initialized = true;
  console.info(`[storageMode] Aktiver Speicher: sqlite`);
}

/**
 * Gibt den aktuellen Storage-Modus zurück (immer "sqlite").
 * @returns {"sqlite"}
 */
export function getStorageMode() {
  return "sqlite";
}

/**
 * Prüft ob SQLite der aktive Speicher ist (immer true).
 * @returns {boolean}
 */
export function isSQLiteActive() {
  return true;
}

/**
 * Prüft ob der Modus bereits bestimmt wurde.
 * @returns {boolean}
 */
export function isStorageModeInitialized() {
  return _initialized;
}
