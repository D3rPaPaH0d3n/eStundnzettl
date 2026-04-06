// ============================================================
// useWorkCodes.ts - Hook für Tätigkeitscodes Verwaltung
//
// Welle 2: SQLite-primär mit Dual-Write auf localStorage.
// API für Consumer bleibt 100% identisch.
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
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
// import { WorkCode as FullWorkCode } from "../types/index";

import type { WorkCode } from "../types";
type SimpleWorkCode = WorkCode;

type WorkCodePreset = {
  id: string;
  name: string;
  description: string;
  codes: SimpleWorkCode[];
};

/**
 * Hook für CRUD-Operationen auf Tätigkeitscodes
 *
 * @returns {Object} - workCodes, addCode, updateCode, deleteCode, loadPreset, etc.
 */
export const useWorkCodes = () => {
  const [workCodes, setWorkCodes] = useState<SimpleWorkCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const sqliteReady = useRef<boolean>(false);

  // -------------------------------------------------------
  // Laden beim Start: localStorage sofort, dann SQLite nachladen
  // -------------------------------------------------------
  useEffect(() => {
    // 1) Sofort aus localStorage laden (für schnelle UI)
    let initialCodes: SimpleWorkCode[] = [];
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
            // Konvertiere FullWorkCode[] zu SimpleWorkCode[]
            const simpleCodes: SimpleWorkCode[] = sqlCodes.map(code => ({
              id: code.id,
              code: code.code,
              description: code.description,
              label: code.description,
              color: code.color,
              order: code.order,
              createdAt: code.createdAt,
              updatedAt: code.updatedAt
            }));
            setWorkCodes(simpleCodes);
            // Dual-Write: localStorage aktualisieren
            localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(simpleCodes));
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
    (codes: SimpleWorkCode[]) => {
      setWorkCodes(codes);
      // Konvertiere SimpleWorkCode[] zu WorkCodeInput[]
      const inputs = codes.map(code => ({
        id: parseInt(code.id, 10),
        label: code.label || code.description // Use description as fallback
      }));
      sqliteWrite(() => bulkReplaceWorkCodes(inputs));
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

      const maxId = workCodes.reduce((max, code) => Math.max(max, parseInt(code.id, 10)), 0);
      const newCode: WorkCode = { 
        id: (maxId + 1).toString(), 
        code: (maxId + 1).toString(),
        description: trimmedLabel,
        label: trimmedLabel,
        color: '#3b82f6', // Default blue
        order: maxId + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedCodes = [...workCodes, newCode];
      setWorkCodes(updatedCodes);
      sqliteWrite(() => insertWorkCode({ id: maxId + 1, label: trimmedLabel }));
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
        code.id === id.toString() ? { ...code, label: trimmedLabel } : code
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
      const updatedCodes = workCodes.filter((code) => code.id !== id.toString());
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
      const preset = WORK_CODE_PRESETS[presetId as keyof typeof WORK_CODE_PRESETS];
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

      const codes: SimpleWorkCode[] = JSON.parse(JSON.stringify(preset.codes));
      saveWorkCodes(codes);
      return true;
    },
    [saveWorkCodes]
  );

  // -------------------------------------------------------
  // Codes importieren (aus Backup)
  // -------------------------------------------------------
  const loadWorkCodes = useCallback(
    (codes: SimpleWorkCode[]) => {
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
      const preset = WORK_CODE_PRESETS[presetId as keyof typeof WORK_CODE_PRESETS];
      if (!preset) {
        logger.error(`Preset "${presetId}" nicht gefunden!`);
        return false;
      }

      const existingIds = new Set(workCodes.map((c) => c.id));
      const newCodes: WorkCode[] = preset.codes
        .filter((c) => !existingIds.has(c.id.toString()))
        .map(c => ({ 
          id: c.id.toString(), 
          code: c.id.toString(),
          description: c.label,
          label: c.label,
          color: '#3b82f6', // Default blue
          order: c.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

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
    const sorted = [...workCodes].sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
    saveWorkCodes(sorted);
  }, [workCodes, saveWorkCodes]);

  // -------------------------------------------------------
  // Prüfen ob Codes vorhanden sind
  // -------------------------------------------------------
  const hasAnyCodes = workCodes.length > 0;

  // -------------------------------------------------------
  // Verfügbare Presets als Array
  // -------------------------------------------------------
  const availablePresets = Object.values(WORK_CODE_PRESETS) as WorkCodePreset[];

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
  } as const;
};

export default useWorkCodes;