import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import type { Entry } from '../types';
import { getDb } from "../db/database";
import { setStorageMode } from "../db/storageMode";
import {
  getAllEntries,
  insertEntry,
  updateEntryInDb,
  deleteEntryFromDb,
  deleteAllEntriesFromDb,
  bulkInsertEntries,
} from "../db/repositories/entriesRepo";
import { migrateAllToSQLite } from "../db/migrate-from-localstorage";
import { logger } from "../utils/logger";

/**
 * useEntries — CRUD auf Zeiterfassungs-Einträgen.
 *
 * Persistenz ist reine SQLite (`entriesRepo`) für die Android-App.
 * Beim ersten Mount wird eine Legacy-Migration von localStorage
 * (alte Version v1–v3) ausgeführt (`migrateAllToSQLite`), danach
 * ist SQLite die einzige Quelle.
 *
 * Alle Mutationen sind **optimistic** — der State wird sofort
 * aktualisiert, und bei einem SQLite-Fehler wird zurückgerollt
 * und ein Toast gezeigt.
 *
 * ### Return
 * - `entries` — Liste aller Einträge
 * - `addEntry(entry)` — legt neuen Eintrag an; falls `id` fehlt,
 *   wird via `entryId.ts` eine generiert
 * - `updateEntry(entry)` — ersetzt einen Eintrag (match by id)
 * - `deleteEntry(id)` — entfernt einen Eintrag
 * - `deleteAllEntries()` — löscht ALLE Einträge (für Reset/Delete-All)
 * - `importEntries(newEntries)` — Bulk-Import beim JSON-Restore
 */
export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const sqliteReady = useRef<boolean>(false);
  const initDone = useRef<boolean>(false);

  // ─── SQLite-Initialisierung + Migration (einmalig) ───
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    let cancelled = false;

    (async () => {
      try {
        // SQLite ist immer verfügbar
        await getDb();
        setStorageMode("sqlite");
        sqliteReady.current = true;

        // Migration versuchen (localStorage → SQLite, alle Domänen, einmalig)
        try {
          await migrateAllToSQLite();
        } catch (migErr) {
          logger.error("[useEntries] Migration fehlgeschlagen:", migErr);
        }

        // Entries aus SQLite laden und State aktualisieren
        if (!cancelled) {
          try {
            const sqliteEntries = await getAllEntries();
            setEntries(sqliteEntries);
          } catch (loadErr) {
            logger.error("[useEntries] SQLite-Load fehlgeschlagen:", loadErr);
            sqliteReady.current = false;
          }
        }
      } catch (err) {
        logger.error("[useEntries] DB-Init fehlgeschlagen:", err);
        // Kein Fallback mehr — SQLite ist Pflicht
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── CRUD Operationen (optimistisches Update mit Revert bei Fehler) ───

  const addEntry = useCallback(async (entry: Entry) => {
    setEntries((prev) => [entry, ...prev]);
    try {
      await insertEntry(entry);
    } catch (err) {
      logger.error("[useEntries] SQLite-Write fehlgeschlagen:", err);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.error("Eintrag konnte nicht gespeichert werden");
    }
  }, []);

  const updateEntry = useCallback(async (updatedEntry: Entry) => {
    let previous: Entry | null = null;
    setEntries((prev) => {
      previous = prev.find((e) => e.id === updatedEntry.id) || null;
      return prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
    });
    try {
      await updateEntryInDb(updatedEntry);
    } catch (err) {
      logger.error("[useEntries] SQLite-Write fehlgeschlagen:", err);
      if (previous) {
        setEntries((prev) => prev.map((e) => (e.id === updatedEntry.id ? previous! : e)));
      }
      toast.error("Eintrag konnte nicht aktualisiert werden");
    }
  }, []);

  const deleteEntry = useCallback(async (id: number | string) => {
    let removed: Entry | null = null;
    setEntries((prev) => {
      removed = prev.find((e) => e.id === id) || null;
      return prev.filter((e) => e.id !== id);
    });
    try {
      await deleteEntryFromDb(id);
    } catch (err) {
      logger.error("[useEntries] SQLite-Write fehlgeschlagen:", err);
      if (removed) {
        setEntries((prev) => [removed!, ...prev]);
      }
      toast.error("Eintrag konnte nicht gelöscht werden");
    }
  }, []);

  const deleteAllEntries = useCallback(async () => {
    const backup: Entry[] = [];
    setEntries((prev) => { backup.push(...prev); return []; });
    try {
      await deleteAllEntriesFromDb();
    } catch (err) {
      logger.error("[useEntries] SQLite-Write fehlgeschlagen:", err);
      setEntries(backup);
      toast.error("Einträge konnten nicht gelöscht werden");
    }
  }, []);

  const importEntries = useCallback(async (newEntries: Entry[]) => {
    const backup: Entry[] = [];
    setEntries((prev) => { backup.push(...prev); return newEntries; });
    try {
      await bulkInsertEntries(newEntries);
    } catch (err) {
      logger.error("[useEntries] SQLite-Write fehlgeschlagen:", err);
      setEntries(backup);
      toast.error("Import fehlgeschlagen");
    }
  }, []);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteAllEntries,
    importEntries,
  };
}
