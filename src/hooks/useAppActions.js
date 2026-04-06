/**
 * useAppActions — Thin Orchestrator über die themenspezifischen Action-Hooks.
 *
 * Welle 2: Die bisherige 479-Zeilen-"God-Hook"-Datei ist in fünf fokussierte
 * Sub-Hooks unter `src/hooks/actions/` zerlegt. Dieser Hook bleibt als
 * Orchestrator-Fassade erhalten, sodass App.jsx unverändert bleibt.
 *
 * Jeder Sub-Hook bekommt nur die Props, die er wirklich braucht — die
 * Gesamt-API an App.jsx ist identisch zum vorherigen Stand.
 */

import { useTimerActions } from "./actions/useTimerActions";
import { useEntryActions } from "./actions/useEntryActions";
import { useDeleteActions } from "./actions/useDeleteActions";
import { useOnboardingActions } from "./actions/useOnboardingActions";
import { useMiscActions } from "./actions/useMiscActions";

export function useAppActions({
  // Form-State (von useFormState)
  form,
  // Entries für Overlap-Check und Speichern
  entries,
  // UserData für workDays
  userData,
  // Work Codes für Label-Lookup
  workCodes,
  // Attachments Cleanup
  removeAttachmentsForEntry,
  // Default-Code Funktion
  getDefaultCode,
  // useEntries Funktionen
  addEntry,
  updateEntry,
  deleteEntry,
  deleteAllEntries,
  importEntries,
  // useLiveTimer Funktionen
  startTimer,
  stopTimer,
  // useSettings Funktionen
  setUserData,
  setAutoBackup,
  // View-Setter
  setView,
  setCurrentDate,
  // Lokale State-Setter in App.jsx
  setDeleteTarget,
  setShowOnboarding,
}) {
  const { handleStartLive, handleStopLive } = useTimerActions({
    form,
    startTimer,
    stopTimer,
    getDefaultCode,
    setView,
  });

  const { startNewEntry, startEdit, handleSaveEntry } = useEntryActions({
    form,
    entries,
    userData,
    workCodes,
    addEntry,
    updateEntry,
    getDefaultCode,
    setView,
  });

  const { executeDelete } = useDeleteActions({
    entries,
    userData,
    deleteEntry,
    deleteAllEntries,
    removeAttachmentsForEntry,
    setUserData,
    setDeleteTarget,
  });

  const { handleOnboardingFinish } = useOnboardingActions({
    setUserData,
    setAutoBackup,
    importEntries,
    setShowOnboarding,
    setView,
  });

  const { changeMonth, handleManualUpdateCheck } = useMiscActions({ setCurrentDate });

  return {
    handleStartLive,
    handleStopLive,
    changeMonth,
    startNewEntry,
    startEdit,
    handleSaveEntry,
    executeDelete,
    handleOnboardingFinish,
    handleManualUpdateCheck,
  };
}
