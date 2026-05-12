// ============================================================
// useWorkCodes.js - Hook für Tätigkeitscodes Verwaltung
//
// SQLite ist die Source of Truth.
// API für Consumer bleibt 100% identisch.
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import type { WorkCode } from '../types';
import { STORAGE_KEYS, WORK_CODE_PRESETS } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { logger } from "../utils/logger";
import {
  getAllWorkCodes,
  insertWorkCode,
  updateWorkCodeInDb,
  deleteWorkCodeFromDb,
  bulkReplaceWorkCodes,
} from "../db/repositories/workCodesRepo";

/**
 * useWorkCodes — Verwaltung der Tätigkeitscodes (Work Codes).
 *
 * Work Codes sind vom User definierte Nummer-Label-Paare, die pro
 * Arbeits-Eintrag ausgewählt werden können (z.B. `19` = "Fahrtzeit",
 * `190` = "An/Abreise"). Es gibt Presets für bestimmte Branchen
 * (Kogler Aufzugsbau, Allgemein), aber jeder User kann seine eigenen
 * Codes anlegen.
 *
 * Persistenz: SQLite (`workCodesRepo`).
 *
 * ### Return
 * - `workCodes` — sortierte Liste aller aktiven Codes
 * - `isLoading` — true während des initialen SQLite-Loads
 * - `hasAnyCodes` — false bei komplett leerer Liste (Onboarding-Check)
 * - `addCode(label)` — erzeugt neuen Code mit nächster freier ID
 * - `updateCode(id, label)` — benennt Code um
 * - `deleteCode(id)` — entfernt Code (bestehende Entries bleiben,
 *   zeigen nur keine Label-Zuordnung mehr)
 * - `availablePresets` — Array aus `WORK_CODE_PRESETS`
 * - `loadPreset(presetId)` — ersetzt alle Codes durch Preset
 * - `mergePreset(presetId)` — fügt Preset-Codes zur bestehenden Liste
 * - `clearAllCodes()` — entfernt alle Codes
 * - `sortCodes()` — sortiert Codes nach ID (numerisch)
 * - `loadWorkCodes()` — Re-Load aus DB (nach Import)
 */
export const useWorkCodes = () => {
  const [workCodes, setWorkCodes] = useState<WorkCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const sqliteReady = useRef<boolean>(false);

  // -------------------------------------------------------
  // Laden beim Start: SQLite nachladen
  // -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    if (isSQLiteActive()) {
      sqliteReady.current = true;
      (async () => {
        try {
          const sqlCodes = await getAllWorkCodes();
          if (cancelled) return;
          if (sqlCodes && sqlCodes.length > 0) {
            setWorkCodes(sqlCodes);
          } else {
            const defaultPreset = WORK_CODE_PRESETS.allgemein;
            const defaultCodes = defaultPreset ? JSON.parse(JSON.stringify(defaultPreset.codes)) : [];
            setWorkCodes(defaultCodes);
            await bulkReplaceWorkCodes(defaultCodes);
          }
        } catch (err) {
          logger.error("[useWorkCodes] SQLite-Load fehlgeschlagen:", err);
          sqliteReady.current = false;
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    } else {
      const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
      if (stored) {
        try {
          setWorkCodes(JSON.parse(stored));
        } catch {
          setWorkCodes([]);
        }
      } else {
        const defaultPreset = WORK_CODE_PRESETS.allgemein;
        setWorkCodes(defaultPreset ? JSON.parse(JSON.stringify(defaultPreset.codes)) : []);
      }
      setIsLoading(false);
    }

    return () => { cancelled = true; };
  }, []);

  // -------------------------------------------------------
  // SQLite-Write Helper mit State-Rollback bei Persistenzfehler
  // -------------------------------------------------------
  const sqliteWrite = useCallback(async (operation: () => Promise<void>, rollback?: () => void) => {
    if (!sqliteReady.current) return;
    try {
      await operation();
    } catch (err) {
      logger.error("[useWorkCodes] SQLite-Write fehlgeschlagen:", err);
      rollback?.();
    }
  }, []);

  // -------------------------------------------------------
  // Speichern (intern) — setzt State + SQLite bulk-replace
  // -------------------------------------------------------
  const saveWorkCodes = useCallback(
    (codes: WorkCode[]) => {
      const previousCodes = workCodes;
      setWorkCodes(codes);
      if (!isSQLiteActive()) {
        localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(codes));
      }
      sqliteWrite(() => bulkReplaceWorkCodes(codes), () => setWorkCodes(previousCodes));
    },
    [workCodes, sqliteWrite]
  );

  // -------------------------------------------------------
  // Code hinzufügen
  // -------------------------------------------------------
  const addCode = useCallback(
    (label: string) => {
      const trimmedLabel = label.trim();
      if (!trimmedLabel) return false;

      const maxId = workCodes.reduce((max, code) => Math.max(max, code.id), 0);
      const newCode = { id: maxId + 1, label: trimmedLabel };

      const updatedCodes = [...workCodes, newCode];
      setWorkCodes(updatedCodes);
      if (!isSQLiteActive()) {
        localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(updatedCodes));
      }
      sqliteWrite(() => insertWorkCode(newCode), () => setWorkCodes(workCodes));
      return true;
    },
    [workCodes, sqliteWrite]
  );

  // -------------------------------------------------------
  // Code aktualisieren
  // -------------------------------------------------------
  const updateCode = useCallback(
    (id: number, newLabel: string) => {
      const trimmedLabel = newLabel.trim();
      if (!trimmedLabel) return false;

      const updatedCodes = workCodes.map((code) =>
        code.id === id ? { ...code, label: trimmedLabel } : code
      );
      setWorkCodes(updatedCodes);
      if (!isSQLiteActive()) {
        localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(updatedCodes));
      }
      sqliteWrite(() => updateWorkCodeInDb(id, trimmedLabel), () => setWorkCodes(workCodes));
      return true;
    },
    [workCodes, sqliteWrite]
  );

  // -------------------------------------------------------
  // Code löschen
  // -------------------------------------------------------
  const deleteCode = useCallback(
    (id: number) => {
      const updatedCodes = workCodes.filter((code) => code.id !== id);
      setWorkCodes(updatedCodes);
      if (!isSQLiteActive()) {
        localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(updatedCodes));
      }
      sqliteWrite(() => deleteWorkCodeFromDb(id), () => setWorkCodes(workCodes));
    },
    [workCodes, sqliteWrite]
  );

  // -------------------------------------------------------
  // Preset laden (ersetzt alle Codes!)
  // -------------------------------------------------------
  const loadPreset = useCallback(
    (presetId: string) => {
      const preset = WORK_CODE_PRESETS[presetId];
      if (!preset) {
        logger.error(`Preset "${presetId}" nicht gefunden!`);
        return false;
      }

      if (
        !window.confirm(
          `Preset "${preset.name}" laden? Alle bestehenden Tätigkeitscodes werden ersetzt!`
        )
      ) {
        return false;
      }

      const codes = JSON.parse(JSON.stringify(preset.codes));
      saveWorkCodes(codes);
      return true;
    },
    [saveWorkCodes]
  );

  // -------------------------------------------------------
  // Codes importieren (aus Backup)
  // -------------------------------------------------------
  const loadWorkCodes = useCallback(
    (codes: WorkCode[]) => {
      if (!Array.isArray(codes)) return false;
      saveWorkCodes(codes);
      return true;
    },
    [saveWorkCodes]
  );

  // -------------------------------------------------------
  // Preset zu bestehenden Codes hinzufügen (merged)
  // -------------------------------------------------------
  const mergePreset = useCallback(
    (presetId: string) => {
      const preset = WORK_CODE_PRESETS[presetId];
      if (!preset) {
        logger.error(`Preset "${presetId}" nicht gefunden!`);
        return false;
      }

      const existingIds = new Set(workCodes.map((c) => c.id));
      const newCodes = preset.codes.filter((c) => !existingIds.has(c.id));

      if (newCodes.length === 0) return false;

      const mergedCodes = [...workCodes, ...newCodes];
      saveWorkCodes(mergedCodes);
      return true;
    },
    [workCodes, saveWorkCodes]
  );

  // -------------------------------------------------------
  // Alle Codes löschen
  // -------------------------------------------------------
  const clearAllCodes = useCallback(() => {
    saveWorkCodes([]);
  }, [saveWorkCodes]);

  // -------------------------------------------------------
  // Codes sortieren (nach ID)
  // -------------------------------------------------------
  const sortCodes = useCallback(() => {
    const sorted = [...workCodes].sort((a, b) => a.id - b.id);
    saveWorkCodes(sorted);
  }, [workCodes, saveWorkCodes]);

  // -------------------------------------------------------
  // Prüfen ob Codes vorhanden sind
  // -------------------------------------------------------
  const hasAnyCodes = workCodes.length > 0;

  // -------------------------------------------------------
  // Verfügbare Presets als Array
  // -------------------------------------------------------
  const availablePresets = Object.values(WORK_CODE_PRESETS);

  // Pure-state-Setter für atomare Snapshot-Restores: Caller hat bereits
  // (via replaceFullSnapshot) erfolgreich in die DB geschrieben und braucht
  // nur einen React-State-Refresh ohne erneute DB-Schreiboperation.
  const setWorkCodesFromSnapshot = useCallback((codes: WorkCode[]) => {
    setWorkCodes(codes);
  }, []);

  return {
    // State
    workCodes,
    isLoading,
    hasAnyCodes,

    // CRUD
    addCode,
    updateCode,
    deleteCode,

    // Presets
    availablePresets,
    loadPreset,
    mergePreset,

    // Utilities
    clearAllCodes,
    sortCodes,
    loadWorkCodes,
    setWorkCodesFromSnapshot,
  };
};
