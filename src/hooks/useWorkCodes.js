// ============================================================
// useWorkCodes.js - Hook für Tätigkeitscodes Verwaltung
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, WORK_CODE_PRESETS } from './constants.js';

/**
 * Hook für CRUD-Operationen auf Tätigkeitscodes
 * 
 * @returns {Object} - workCodes, addCode, updateCode, deleteCode, loadPreset, etc.
 */
export const useWorkCodes = () => {
  const [workCodes, setWorkCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // -------------------------------------------------------
  // Laden beim Start
  // -------------------------------------------------------
useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.WORK_CODES);
    if (stored) {
      try {
        setWorkCodes(JSON.parse(stored));
      } catch (e) {
        console.error("Fehler beim Laden der Work Codes:", e);
        setWorkCodes([]);
      }
    } else {
      // Neue User: "Allgemein" Preset als Default laden
      const defaultPreset = WORK_CODE_PRESETS.allgemein;
      if (defaultPreset) {
        const defaultCodes = JSON.parse(JSON.stringify(defaultPreset.codes));
        localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(defaultCodes));
        setWorkCodes(defaultCodes);
        console.log("✅ Neue User: 'Allgemein' Preset als Default geladen");
      }
    }
    setIsLoading(false);
  }, []);

  // -------------------------------------------------------
  // Speichern bei Änderungen
  // -------------------------------------------------------
  const saveWorkCodes = useCallback((codes) => {
    localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(codes));
    setWorkCodes(codes);
  }, []);

  // -------------------------------------------------------
  // Code hinzufügen
  // -------------------------------------------------------
  const addCode = useCallback((label) => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return false;

    // Nächste freie ID finden
    const maxId = workCodes.reduce((max, code) => Math.max(max, code.id), 0);
    const newCode = {
      id: maxId + 1,
      label: trimmedLabel,
    };

    const updatedCodes = [...workCodes, newCode];
    saveWorkCodes(updatedCodes);
    return true;
  }, [workCodes, saveWorkCodes]);

  // -------------------------------------------------------
  // Code aktualisieren
  // -------------------------------------------------------
  const updateCode = useCallback((id, newLabel) => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) return false;

    const updatedCodes = workCodes.map((code) =>
      code.id === id ? { ...code, label: trimmedLabel } : code
    );
    saveWorkCodes(updatedCodes);
    return true;
  }, [workCodes, saveWorkCodes]);

  // -------------------------------------------------------
  // Code löschen
  // -------------------------------------------------------
  const deleteCode = useCallback((id) => {
    const updatedCodes = workCodes.filter((code) => code.id !== id);
    saveWorkCodes(updatedCodes);
  }, [workCodes, saveWorkCodes]);

  // -------------------------------------------------------
  // Preset laden (ersetzt alle Codes!)
  // -------------------------------------------------------
  const loadPreset = useCallback((presetId) => {
    const preset = WORK_CODE_PRESETS[presetId];
    if (!preset) {
      console.error(`Preset "${presetId}" nicht gefunden!`);
      return false;
    }

    // Deep copy um Referenzprobleme zu vermeiden
    const codes = JSON.parse(JSON.stringify(preset.codes));
    saveWorkCodes(codes);
    console.log(`✅ Preset "${preset.name}" geladen (${codes.length} Codes)`);
    return true;
  }, [saveWorkCodes]);

  // -------------------------------------------------------
  // Preset zu bestehenden Codes hinzufügen (merged)
  // -------------------------------------------------------
  const mergePreset = useCallback((presetId) => {
    const preset = WORK_CODE_PRESETS[presetId];
    if (!preset) {
      console.error(`Preset "${presetId}" nicht gefunden!`);
      return false;
    }

    // Bestehende IDs sammeln
    const existingIds = new Set(workCodes.map((c) => c.id));
    
    // Nur neue Codes hinzufügen (die noch nicht existieren)
    const newCodes = preset.codes.filter((c) => !existingIds.has(c.id));
    
    if (newCodes.length === 0) {
      console.log("Keine neuen Codes zum Hinzufügen.");
      return false;
    }

    const mergedCodes = [...workCodes, ...newCodes];
    saveWorkCodes(mergedCodes);
    console.log(`✅ ${newCodes.length} Codes aus "${preset.name}" hinzugefügt`);
    return true;
  }, [workCodes, saveWorkCodes]);

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
  };
};

export default useWorkCodes;