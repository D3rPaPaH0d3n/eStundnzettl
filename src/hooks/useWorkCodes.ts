// ============================================================
// useWorkCodes.js - Hook für Tätigkeitscodes Verwaltung
//
// Welle 2: SQLite-primär mit Dual-Write auf localStorage.
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
 * Hook für CRUD-Operationen auf Tätigkeitscodes
 *
 * @returns {Object} - workCodes, addCode, updateCode, deleteCode, loadPreset, etc.
 */
export const useWorkCodes = () => {
  const [workCodes, setWorkCodes] = useState<WorkCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const sqliteReady = useRef<boolean>(false);

  // -------------------------------------------------------
  // Laden beim Start: localStorage sofort, dann SQLite nachladen
  // -------------------------------------------------------
  useEffect(() => {
    // 1) Sofort aus localStorage laden (für schnelle UI)
    let initialCodes: WorkCode[] = [];
    const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
    if (stored) {
      try {
        initialCodes = JSON.parse(stored);
      } catch (e) {
        logger.error("Fehler beim Laden der Work Codes:", e);
        initialCodes = [];
      }
    }

    // Neue User: Default-Preset
    if (initialCodes.length === 0 && !stored) {
      const defaultPreset = WORK_CODE_PRESETS.allgemein;
      if (defaultPreset) {
        initialCodes = JSON.parse(JSON.stringify(defaultPreset.codes));
        localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(initialCodes));
      }
    }

    setWorkCodes(initialCodes);

    // 2) SQLite nachladen wenn verfügbar
    if (isSQLiteActive()) {
      sqliteReady.current = true;
      (async () => {
        try {
          const sqlCodes = await getAllWorkCodes();
          if (sqlCodes && sqlCodes.length > 0) {
            setWorkCodes(sqlCodes);
            // Dual-Write: localStorage aktualisieren
            localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(sqlCodes));
          }
        } catch (err) {
          logger.error("[useWorkCodes] SQLite-Load fehlgeschlagen, behalte localStorage-Daten:", err);
          sqliteReady.current = false;
        }
      })();
    }

    setIsLoading(false);
  }, []);

  // -------------------------------------------------------
  // Dual-Write: localStorage immer aktuell halten
  // -------------------------------------------------------
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(workCodes));
  }, [workCodes]);

  // -------------------------------------------------------
  // SQLite-Write Helper (fire-and-forget)
  // -------------------------------------------------------
  const sqliteWrite = useCallback(async (operation: () => Promise<void>) => {
    if (!sqliteReady.current) return;
    try {
      await operation();
    } catch (err) {
      logger.error("[useWorkCodes] SQLite-Write fehlgeschlagen:", err);
    }
  }, []);

  // -------------------------------------------------------
  // Speichern (intern) — setzt State + SQLite bulk-replace
  // -------------------------------------------------------
  const saveWorkCodes = useCallback(
    (codes: WorkCode[]) => {
      setWorkCodes(codes);
      sqliteWrite(() => bulkReplaceWorkCodes(codes));
    },
    [sqliteWrite]
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
      sqliteWrite(() => insertWorkCode(newCode));
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
      sqliteWrite(() => updateWorkCodeInDb(id, trimmedLabel));
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
      sqliteWrite(() => deleteWorkCodeFromDb(id));
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
  };
};

export default useWorkCodes;
