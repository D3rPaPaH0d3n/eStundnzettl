/**
 * migrate-from-localstorage.js — Einmalige Migration bestehender Entries
 *
 * Liest Entries aus localStorage, schreibt sie in SQLite,
 * und markiert die Migration als abgeschlossen.
 *
 * Strategie:
 * - Nur einmal ausführen (Flag in localStorage)
 * - Bei Fehler: kein Flag setzen → nächster Start versucht erneut
 * - localStorage-Daten werden NICHT gelöscht (Sicherheitsnetz)
 */

import { STORAGE_KEYS } from "../hooks/constants";
import { bulkInsertEntries } from "./repositories/entriesRepo";

const MIGRATION_FLAG = "estundnzettl_sqlite_migration_done";

/**
 * Prüft ob die Migration bereits durchgeführt wurde.
 * @returns {boolean}
 */
export function isMigrationDone() {
  return localStorage.getItem(MIGRATION_FLAG) === "true";
}

/**
 * Führt die Migration durch: localStorage → SQLite.
 *
 * @returns {Promise<{migrated: number, skipped: boolean}>}
 */
export async function migrateEntriesToSQLite() {
  // Bereits migriert?
  if (isMigrationDone()) {
    return { migrated: 0, skipped: true };
  }

  // Entries aus localStorage lesen
  let entries = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (stored && stored !== "undefined") {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        entries = parsed;
      }
    }
  } catch (err) {
    console.error("[migration] Fehler beim Lesen von localStorage:", err);
    // Keine Daten → nichts zu migrieren, aber auch kein Fehler
  }

  if (entries.length === 0) {
    // Keine Daten zum Migrieren → trotzdem als erledigt markieren
    localStorage.setItem(MIGRATION_FLAG, "true");
    console.info("[migration] Keine Entries in localStorage — Migration übersprungen");
    return { migrated: 0, skipped: false };
  }

  // In SQLite schreiben
  try {
    await bulkInsertEntries(entries);
    localStorage.setItem(MIGRATION_FLAG, "true");
    console.info(`[migration] ${entries.length} Entries erfolgreich nach SQLite migriert`);
    return { migrated: entries.length, skipped: false };
  } catch (err) {
    console.error("[migration] SQLite-Insert fehlgeschlagen — localStorage bleibt aktiv:", err);
    throw err; // Caller entscheidet, ob Fallback greift
  }
}

/**
 * Setzt das Migrations-Flag zurück (für Debug/Testing).
 */
export function resetMigrationFlag() {
  localStorage.removeItem(MIGRATION_FLAG);
}
