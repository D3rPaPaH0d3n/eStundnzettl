/**
 * useBackupMetadata.js — Hook für Backup-Metadaten mit SQLite-Persistenz
 *
 * LAST_BACKUP wird jetzt in SQLite gespeichert statt localStorage.
 */

import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "./constants";
import { getDb } from "../db/database";
import { setStorageMode } from "../db/storageMode";
import {
  getLastBackupMetadata,
  insertBackupMetadata,
  getBackupHistory,
} from "../db/repositories/backupMetadataRepo";

export function useBackupMetadata() {
  const [lastBackup, setLastBackup] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── Initial Load ───
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();

        if (!db) {
          // Web/Dev → nur localStorage
          setStorageMode("localStorage");
          if (!cancelled) {
            const stored = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
            if (stored) setLastBackup(stored);
          }
        } else {
          // SQLite
          setStorageMode("sqlite");
          try {
            const metadata = await getLastBackupMetadata();
            if (!cancelled) {
              setLastBackup(metadata?.timestamp || null);
            }
          } catch {
            // Fallback to localStorage
            if (!cancelled) {
              const stored = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
              if (stored) setLastBackup(stored);
            }
          }
        }
      } catch (err) {
        console.error("[useBackupMetadata] Init fehlgeschlagen:", err);
        // Fallback
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
        if (stored) setLastBackup(stored);
      }

      if (!cancelled) setIsLoaded(true);
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── Update Last Backup ───
  const updateLastBackup = useCallback(async (timestamp = new Date().toISOString()) => {
    // localStorage für Web/Dev und Backup-Kompatibilität
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);
    setLastBackup(timestamp);

    // SQLite
    const db = await getDb();
    if (db) {
      try {
        await insertBackupMetadata({
          type: "manual",
          timestamp,
        });
      } catch (err) {
        console.error("[useBackupMetadata] Failed to insert metadata:", err);
      }
    }
  }, []);

  return {
    lastBackup,
    updateLastBackup,
    isLoaded,
  };
}
