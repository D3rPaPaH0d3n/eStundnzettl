import { useState, useEffect, useCallback, useRef } from "react";
import { STORAGE_KEYS } from "./constants";
import { getDb } from "../db/database";
import { setStorageMode, isSQLiteActive } from "../db/storageMode";
import {
  getAllEntries,
  insertEntry,
  updateEntryInDb,
  deleteEntryFromDb,
  deleteAllEntriesFromDb,
  bulkInsertEntries,
} from "../db/repositories/entriesRepo";
import { migrateAllToSQLite } from "../db/migrate-from-localstorage";

/**
 * useEntries — Hook für CRUD auf Entries.
 *
 * API für Consumer bleibt 100% identisch:
 *   { entries, addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries }
 *
 * Intern: SQLite-primär mit Dual-Write auf localStorage als Sicherheitsnetz.
 * Auf Web (dev) wird wie bisher nur localStorage genutzt.
 */
export function useEntries() {
  // ─── localStorage-Laden (immer, als Fallback / Sofort-Daten) ───
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (stored && stored !== "undefined") {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* corrupt */ }
    return [];
  };

  const [entries, setEntries] = useState(loadFromLocalStorage);
  const sqliteReady = useRef(false);
  const initDone = useRef(false);

  // ─── SQLite-Initialisierung + Migration (einmalig) ───
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();

        if (!db) {
          // Web/Dev → nur localStorage
          setStorageMode("localStorage");
          return;
        }

        // SQLite ist verfügbar
        setStorageMode("sqlite");
        sqliteReady.current = true;

        // Migration versuchen (localStorage → SQLite, alle Domänen, einmalig)
        try {
          await migrateAllToSQLite();
        } catch (migErr) {
          console.error("[useEntries] Migration fehlgeschlagen, arbeite mit localStorage-Daten weiter:", migErr);
        }

        // Entries aus SQLite laden und State aktualisieren
        if (!cancelled) {
          try {
            const sqliteEntries = await getAllEntries();
            setEntries(sqliteEntries);
            // Dual-Write: auch localStorage aktualisieren
            localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(sqliteEntries));
          } catch (loadErr) {
            console.error("[useEntries] SQLite-Load fehlgeschlagen, behalte localStorage-Daten:", loadErr);
            sqliteReady.current = false;
          }
        }
      } catch (err) {
        console.error("[useEntries] DB-Init fehlgeschlagen:", err);
        setStorageMode("localStorage");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── Dual-Write: localStorage immer aktuell halten ───
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  }, [entries]);

  // ─── SQLite-Write Helper (fire-and-forget mit Error-Log) ───
  const sqliteWrite = useCallback(async (operation) => {
    if (!sqliteReady.current) return;
    try {
      await operation();
    } catch (err) {
      console.error("[useEntries] SQLite-Write fehlgeschlagen:", err);
      // localStorage hat die Daten schon → kein Datenverlust
    }
  }, []);

  // ─── CRUD Operationen (API identisch zu vorher) ───

  const addEntry = useCallback((entry) => {
    setEntries((prev) => [entry, ...prev]);
    sqliteWrite(() => insertEntry(entry));
  }, [sqliteWrite]);

  const updateEntry = useCallback((updatedEntry) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
    sqliteWrite(() => updateEntryInDb(updatedEntry));
  }, [sqliteWrite]);

  const deleteEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    sqliteWrite(() => deleteEntryFromDb(id));
  }, [sqliteWrite]);

  const deleteAllEntries = useCallback(() => {
    setEntries([]);
    sqliteWrite(() => deleteAllEntriesFromDb());
  }, [sqliteWrite]);

  const importEntries = useCallback((newEntries) => {
    setEntries(newEntries);
    sqliteWrite(() => bulkInsertEntries(newEntries));
  }, [sqliteWrite]);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteAllEntries,
    importEntries,
  };
}
