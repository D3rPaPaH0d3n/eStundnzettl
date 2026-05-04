/**
 * storageMode.js — Zentrale Steuerung: SQLite oder localStorage?
 *
 * eStundnzettl ist eine reine Android-App — SQLite ist IMMER der aktive Speicher.
 * Diese Datei bleibt für API-Kompatibilität, aber alle Funktionen geben "sqlite" zurück.
 */

import { logger } from "../utils/logger";

let _initialized: boolean = false;
const listeners = new Set<() => void>();

function notifyStorageModeListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      logger.error("[storageMode] Listener fehlgeschlagen", err);
    }
  });
}

/**
 * Setzt den aktiven Storage-Modus (nur "sqlite" erlaubt).
 *
 * @param {"sqlite"|"localStorage"} mode
 */
export function setStorageMode(mode: "sqlite" | "localStorage"): void {
  if (mode !== "sqlite") {
    logger.warn(`[storageMode] Nur "sqlite" erlaubt, aber "${mode}" übergeben — ignoriert`);
  }
  _initialized = true;
  logger.info(`[storageMode] Aktiver Speicher: sqlite`);
  notifyStorageModeListeners();
}

/**
 * Informiert Consumer, sobald der Storage-Modus bestimmt/neu bestätigt wurde.
 * Das ist absichtlich klein gehalten: Hooks wie `useSettings` können damit
 * nach einem initialen localStorage-Fallback zuverlässig SQLite nachladen,
 * sobald `useEntries` die DB-Verbindung erfolgreich hergestellt hat.
 */
export function subscribeStorageMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Gibt den aktuellen Storage-Modus zurück (immer "sqlite").
 * @returns {"sqlite"}
 */
export function getStorageMode(): "sqlite" {
  return "sqlite";
}

/**
 * Prüft ob SQLite der aktive Speicher ist (immer true).
 * @returns {boolean}
 */
export function isSQLiteActive(): boolean {
  return true;
}

/**
 * Prüft ob der Modus bereits bestimmt wurde.
 * @returns {boolean}
 */
export function isStorageModeInitialized(): boolean {
  return _initialized;
}
