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
import { migrateEntriesToSQLite } from "../db/migrate-from-localstorage";

/**
 * useEntries — Hook für CRUD auf Entries.
 *
 * API für Consumer bleibt 100% identisch:
 *   { entries, addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries }
 *
 * Intern: SQLite-primär (reine Android-App).
 */
export function useEntries() {
  const [entries, setEntries] = useState([]);
  const sqliteReady = useRef(false);
  const initDone = useRef(false);

  // ─── SQLite-Initialisierung + Migration (einmalig) ───
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    let cancelled = false;

    (async () => {
      try {
        // SQLite ist immer verfügbar
        const db = await getDb();
        setStorageMode("sqlite");
        sqliteReady.current = true;

        // Migration versuchen (localStorage → SQLite, einmalig)
        try {
          await migrateEntriesToSQLite();
        } catch (migErr) {
          console.error("[useEntries] Migration fehlgeschlagen:", migErr);
        }

        // Entries aus SQLite laden und State aktualisieren
        if (!cancelled) {
          try {
            const sqliteEntries = await getAllEntries();
            setEntries(sqliteEntries);
          } catch (loadErr) {
            console.error("[useEntries] SQLite-Load fehlgeschlagen:", loadErr);
            sqliteReady.current = false;
          }
        }
      } catch (err) {
        console.error("[useEntries] DB-Init fehlgeschlagen:", err);
        // Kein Fallback mehr — SQLite ist Pflicht
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── SQLite-Write Helper ───
  const sqliteWrite = useCallback(async (operation) => {
    try {
      await operation();
    } catch (err) {
      console.error("[useEntries] SQLite-Write fehlgeschlagen:", err);
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
