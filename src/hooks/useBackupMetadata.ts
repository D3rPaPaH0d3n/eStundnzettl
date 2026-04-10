/**
 * useBackupMetadata — Liefert die Metadaten des letzten Backup-Events
 * und bietet eine Update-Funktion für neue Events.
 *
 * Im Gegensatz zu `useAutoBackup` (der den Auto-Sync orchestriert)
 * persistiert dieser Hook nur den "wann war das letzte Backup"-State
 * — er triggert **kein** Backup selbst. Wird in UI-Komponenten
 * (BackupSettings, AboutDialog) genutzt, um "Letztes Backup: vor
 * 3 Stunden"-Anzeigen zu rendern.
 *
 * Persistenz: ausschließlich SQLite (`backupMetadataRepo`). Kein
 * localStorage-Fallback, weil diese Daten rein informativ sind.
 *
 * ### Return
 * - `lastBackup` — ISO-Timestamp des letzten Eintrags oder null
 * - `updateLastBackup(timestamp?)` — setzt den State und schreibt
 *   einen neuen History-Eintrag ein (Default: `new Date().toISOString()`)
 * - `isLoaded` — true nach dem initialen Read (für Skeleton-States)
 */

import { useState, useEffect, useCallback } from "react";
import { getDb } from "../db/database";
import { setStorageMode } from "../db/storageMode";
import { logger } from "../utils/logger";
import {
  getLastBackupMetadata,
  insertBackupMetadata,
} from "../db/repositories/backupMetadataRepo";

export function useBackupMetadata() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

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
        logger.error("[useBackupMetadata] Init fehlgeschlagen:", err);
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
  const updateLastBackup = useCallback(async (timestamp: string = new Date().toISOString()) => {
    setLastBackup(timestamp);

    // SQLite
    try {
      await insertBackupMetadata({
        type: "manual",
        timestamp,
      });
    } catch (err) {
      logger.error("[useBackupMetadata] Failed to insert metadata:", err);
    }
  }, []);

  return {
    lastBackup,
    updateLastBackup,
    isLoaded,
  };
}
