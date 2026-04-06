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

import React from "react";
import { useTimerActions } from "./actions/useTimerActions";
import { useEntryActions } from "./actions/useEntryActions";
import { useDeleteActions } from "./actions/useDeleteActions";
import { useOnboardingActions } from "./actions/useOnboardingActions";
import { useMiscActions } from "./actions/useMiscActions";
import type { FormState, Entry, UserData, WorkCodeItem, DeleteTarget, TimeEntry, TimerResult } from "../types";

type UseAppActionsProps = {
  // Form-State (von useFormState)
  form: FormState;
  // Entries für Overlap-Check und Speichern
  entries: Entry[];
  // UserData für workDays
  userData: UserData;
  // Work Codes für Label-Lookup
  workCodes: WorkCodeItem[];
  // Attachments Cleanup
  removeAttachmentsForEntry: (id: number) => Promise<void>;
  // Default-Code Funktion
  getDefaultCode: () => number;
  // useEntries Funktionen
  addEntry: (entry: Entry) => void;
  updateEntry: (entry: Entry) => void;
  deleteEntry: (id: number) => Promise<void>;
  deleteAllEntries: () => Promise<void>;
  importEntries: (entries: TimeEntry[] | Entry[]) => void;
  // useLiveTimer Funktionen
  startTimer: () => void;
  stopTimer: () => TimerResult;
  // useSettings Funktionen - accept React state setters
  setUserData: React.Dispatch<React.SetStateAction<UserData>> | ((data: Partial<UserData>) => void | Promise<void>);
  setAutoBackup: React.Dispatch<React.SetStateAction<boolean>> | ((enabled: boolean) => void | Promise<void>);
  // View-Setter
  setView: React.Dispatch<React.SetStateAction<'settings' | 'add' | 'dashboard' | 'report'>> | ((view: string) => void);
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  // Lokale State-Setter in App.jsx
  setDeleteTarget: (target: DeleteTarget | null) => void;
  setShowOnboarding: (show: boolean) => void;
};

export function useAppActions({
  form,
  entries,
  userData,
  workCodes,
  removeAttachmentsForEntry,
  getDefaultCode,
  addEntry,
  updateEntry,
  deleteEntry,
  deleteAllEntries,
  importEntries,
  startTimer,
  stopTimer,
  setUserData,
  setAutoBackup,
  setView,
  setCurrentDate,
  setDeleteTarget,
  setShowOnboarding,
}: UseAppActionsProps) {
  const { handleStartLive, handleStopLive } = useTimerActions({
    form,
    startTimer,
    stopTimer,
    getDefaultCode,
    setView: setView as (view: string) => void,
  });

  const { startNewEntry, startEdit, handleSaveEntry } = useEntryActions({
    form,
    entries,
    userData,
    workCodes,
    addEntry,
    updateEntry,
    getDefaultCode,
    setView: setView as (view: string) => void,
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
    setView: setView as (view: string) => void,
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
