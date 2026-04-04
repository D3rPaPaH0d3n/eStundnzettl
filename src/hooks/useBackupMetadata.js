/**
 * useBackupMetadata.js — Hook für Backup-Metadaten mit SQLite-Persistenz
 *
 * LAST_BACKUP wird jetzt in SQLite gespeichert statt localStorage.
 */

import { useState, useEffect, useCallback } from "react";
import { getDb } from "../db/database";
import { setStorageMode } from "../db/storageMode";
import {
  getLastBackupMetadata,
  insertBackupMetadata,
} from "../db/repositories/backupMetadataRepo";

export function useBackupMetadata() {
  const [lastBackup, setLastBackup] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── Initial Load ───
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // SQLite ist immer verfügbar
        await getDb();
        setStorageMode("sqlite");
        try {
          const metadata = await getLastBackupMetadata();
          if (!cancelled) {
            setLastBackup(metadata?.timestamp || null);
          }
        } catch {
          // Kein Fallback mehr — SQLite ist Pflicht
          if (!cancelled) {
            setLastBackup(null);
          }
        }
      } catch (err) {
        console.error("[useBackupMetadata] Init fehlgeschlagen:", err);
        // Kein Fallback mehr
        if (!cancelled) {
          setLastBackup(null);
        }
      }

      if (!cancelled) setIsLoaded(true);
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── Update Last Backup ───
  const updateLastBackup = useCallback(async (timestamp = new Date().toISOString()) => {
    setLastBackup(timestamp);

    // SQLite
    try {
      await insertBackupMetadata({
        type: "manual",
        timestamp,
      });
    } catch (err) {
      console.error("[useBackupMetadata] Failed to insert metadata:", err);
    }
  }, []);

  return {
    lastBackup,
    updateLastBackup,
    isLoaded,
  };
}
