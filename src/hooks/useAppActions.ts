/**
 * useAppActions — Thin Orchestrator über die themenspezifischen
 * Action-Hooks in `src/hooks/actions/`.
 *
 * Die ursprüngliche 479-Zeilen-"God-Hook"-Datei wurde in fünf
 * fokussierte Sub-Hooks zerlegt:
 * - `useTimerActions` — Live-Timer Start/Stop/Cancel
 * - `useEntryActions` — Save/Edit (neuer Eintrag, Kopie aus Timer)
 * - `useDeleteActions` — Single/Bulk Delete mit Bestätigung
 * - `useOnboardingActions` — Wizard-Complete, Demo-Daten laden
 * - `useMiscActions` — Update-Check, sonstige Callbacks
 *
 * Jeder Sub-Hook bekommt nur die Props, die er wirklich braucht.
 * Die Gesamt-API an `App.tsx` ist identisch zum vorherigen Stand —
 * dieser Hook ist reine Fassade.
 *
 * @returns
 * Ein flaches Objekt mit allen Action-Callbacks aus den fünf
 * Sub-Hooks (handleSaveEntry, handleDeleteEntry, handleStartLive,
 * handleStopLive, handleOnboardingComplete, handleManualUpdateCheck,
 * …)
 */

import type { Entry, UserData, WorkCode, DeleteTarget, FormState } from '../types';
import type { Locale } from "../locales/types";
import { useTimerActions } from "./actions/useTimerActions";
import { useEntryActions } from "./actions/useEntryActions";
import { useDeleteActions } from "./actions/useDeleteActions";
import { useOnboardingActions } from "./actions/useOnboardingActions";
import { useMiscActions } from "./actions/useMiscActions";

interface UseAppActionsProps {
  form: FormState;
  entries: Entry[];
  userData: UserData;
  workCodes: WorkCode[];
  removeAttachmentsForEntry: (entryId: number | string) => Promise<void>;
  getDefaultCode: () => number;
  addEntry: (entry: Entry) => Promise<void>;
  updateEntry: (entry: Entry) => Promise<void>;
  deleteEntry: (id: number | string) => Promise<void>;
  deleteAllEntries: () => Promise<void>;
  importEntries: (entries: Entry[]) => Promise<void>;
  startTimer: () => void;
  stopTimer: () => { start: Date | null; end: Date | null; pause: number };
  setUserData: (data: UserData) => void;
  setAutoBackup: (enabled: boolean) => void;
  setView: (view: string) => void;
  setCurrentDate: (fn: (prev: Date) => Date) => void;
  setDeleteTarget: (target: DeleteTarget | null) => void;
  setShowOnboarding: (show: boolean) => void;
  locale?: Locale;
}

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
  // Locale
  locale,
}: UseAppActionsProps) {
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
    locale,
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
