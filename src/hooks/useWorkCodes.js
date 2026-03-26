/**
 * useWorkCodes.js — Hook für Work Codes mit SQLite-Persistenz
 */

import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS, WORK_CODE_PRESETS } from "./constants";
import { getDb } from "../db/database";
import { setStorageMode } from "../db/storageMode";
import {
  getAllWorkCodes,
  bulkUpsertWorkCodes,
} from "../db/repositories/workCodesRepo";

// ─── Migration ───
const WORK_CODES_MIGRATION_FLAG = "estundnzettl_workcodes_migrated";

function isWorkCodesMigrationDone() {
  return localStorage.getItem(WORK_CODES_MIGRATION_FLAG) === "true";
}

async function migrateWorkCodesToSQLite() {
  if (isWorkCodesMigrationDone()) return;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
    if (stored) {
      const codes = JSON.parse(stored);
      if (Array.isArray(codes) && codes.length > 0) {
        await bulkUpsertWorkCodes(codes);
      }
    }
    localStorage.setItem(WORK_CODES_MIGRATION_FLAG, "true");
    console.info("[useWorkCodes] Migration nach SQLite abgeschlossen");
  } catch (err) {
    console.error("[useWorkCodes] Migration fehlgeschlagen:", err);
  }
}

export const useWorkCodes = () => {
  const [workCodes, setWorkCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
            const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
            if (stored) {
              try {
                setWorkCodes(JSON.parse(stored));
              } catch {
                setWorkCodes([]);
              }
            } else {
              // Default preset
              const defaultCodes = JSON.parse(JSON.stringify(WORK_CODE_PRESETS.allgemein.codes));
              localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(defaultCodes));
              setWorkCodes(defaultCodes);
            }
          }
        } else {
          // SQLite
          setStorageMode("sqlite");
          await migrateWorkCodesToSQLite();

          if (!cancelled) {
            try {
              const dbCodes = await getAllWorkCodes();
              if (dbCodes.length > 0) {
                setWorkCodes(dbCodes);
              } else {
                // Default preset
                const defaultCodes = JSON.parse(JSON.stringify(WORK_CODE_PRESETS.allgemein.codes));
                await bulkUpsertWorkCodes(defaultCodes);
                setWorkCodes(defaultCodes);
              }
            } catch {
              setWorkCodes([]);
            }
          }
        }
      } catch (err) {
        console.error("[useWorkCodes] Init fehlgeschlagen:", err);
        // Fallback
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
          if (stored) setWorkCodes(JSON.parse(stored));
        } catch {}
      }

      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── Persist Helper ───
  const persist = useCallback(async (codes) => {
    // localStorage für Web/Dev und Backup-Kompatibilität
    localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(codes));
    // SQLite async
    const db = await getDb();
    if (db) {
      await bulkUpsertWorkCodes(codes).catch(console.error);
    }
  }, []);

  // ─── Speichern bei Änderungen ───
  const saveWorkCodes = useCallback((codes) => {
    setWorkCodes(codes);
    persist(codes);
  }, [persist]);

  // ─── Code hinzufügen ───
  const addCode = useCallback((label) => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return false;

    const maxId = workCodes.reduce((max, code) => Math.max(max, code.id), 0);
    const newCode = {
      id: maxId + 1,
      label: trimmedLabel,
    };

    const updatedCodes = [...workCodes, newCode];
    saveWorkCodes(updatedCodes);
    return true;
  }, [workCodes, saveWorkCodes]);

  // ─── Code aktualisieren ───
  const updateCode = useCallback((id, newLabel) => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) return false;

    const updatedCodes = workCodes.map((code) =>
      code.id === id ? { ...code, label: trimmedLabel } : code
    );
    saveWorkCodes(updatedCodes);
    return true;
  }, [workCodes, saveWorkCodes]);

  // ─── Code löschen ───
  const deleteCode = useCallback((id) => {
    const updatedCodes = workCodes.filter((code) => code.id !== id);
    saveWorkCodes(updatedCodes);
  }, [workCodes, saveWorkCodes]);

  // ─── Preset laden (ersetzt alle Codes!) ───
  const loadPreset = useCallback((presetId) => {
    const preset = WORK_CODE_PRESETS[presetId];
    if (!preset) {
      console.error(`Preset "${presetId}" nicht gefunden!`);
      return false;
    }

    if (!window.confirm(`Preset "${preset.name}" laden? Alle bestehenden Tätigkeitscodes werden ersetzt!`)) {
      return false;
    }

    const codes = JSON.parse(JSON.stringify(preset.codes));
    saveWorkCodes(codes);
    return true;
  }, [saveWorkCodes]);

  // ─── Codes importieren (aus Backup) ───
  const loadWorkCodes = useCallback((codes) => {
    if (!Array.isArray(codes)) return false;
    saveWorkCodes(codes);
    return true;
  }, [saveWorkCodes]);

  // ─── Preset zu bestehenden Codes hinzufügen (merged) ───
  const mergePreset = useCallback((presetId) => {
    const preset = WORK_CODE_PRESETS[presetId];
    if (!preset) {
      console.error(`Preset "${presetId}" nicht gefunden!`);
      return false;
    }

    const existingIds = new Set(workCodes.map((c) => c.id));
    const newCodes = preset.codes.filter((c) => !existingIds.has(c.id));

    if (newCodes.length === 0) {
      return false;
    }

    const mergedCodes = [...workCodes, ...newCodes];
    saveWorkCodes(mergedCodes);
    return true;
  }, [workCodes, saveWorkCodes]);

  // ─── Alle Codes löschen ───
  const clearAllCodes = useCallback(() => {
    saveWorkCodes([]);
  }, [saveWorkCodes]);

  // ─── Codes sortieren (nach ID) ───
  const sortCodes = useCallback(() => {
    const sorted = [...workCodes].sort((a, b) => a.id - b.id);
    saveWorkCodes(sorted);
  }, [workCodes, saveWorkCodes]);

  const hasAnyCodes = workCodes.length > 0;
  const availablePresets = Object.values(WORK_CODE_PRESETS);

  return {
    workCodes,
    isLoading,
    hasAnyCodes,
    addCode,
    updateCode,
    deleteCode,
    availablePresets,
    loadPreset,
    mergePreset,
    clearAllCodes,
    sortCodes,
    loadWorkCodes,
  };
};

export default useWorkCodes;
