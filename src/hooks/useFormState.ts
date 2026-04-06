// @ts-nocheck
import { useState } from "react";
import { WORK_CODE } from "./constants";
import { toLocalDateString } from "../utils";
import type { Entry, FormState } from "../types";

const DEFAULTS = {
  entryType: "work",
  startTime: "06:00",
  endTime: "16:30",
  pauseDuration: 30,
  project: "",
  code: WORK_CODE.DEFAULT,
};

type UseFormStateProps = {
  getDefaultCode: () => number;
};

/**
 * useFormState — manages all entry form field state
 *
 * @param {Function} getDefaultCode — returns the last-used or first available work code
 * @returns {Object} form fields + setters + action helpers
 */
export function useFormState({ getDefaultCode }: UseFormStateProps): FormState {
  const [formDate, setFormDate] = useState<string>(toLocalDateString(new Date()));
  const [entryType, setEntryType] = useState<string>(DEFAULTS.entryType);
  const [startTime, setStartTime] = useState<string>(DEFAULTS.startTime);
  const [endTime, setEndTime] = useState<string>(DEFAULTS.endTime);
  const [pauseDuration, setPauseDuration] = useState<number>(DEFAULTS.pauseDuration);
  const [project, setProject] = useState<string>(DEFAULTS.project);
  const [code, setCode] = useState<number>(WORK_CODE.DEFAULT);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isLiveEntry, setIsLiveEntry] = useState<boolean>(false);
  // Nur relevant für Krank/Urlaub/ZA: wenn true, gibt der Nutzer Start/Ende
  // wie bei einem normalen Eintrag manuell an, statt die automatische
  // Sollzeit-Gutschrift zu verwenden.
  const [specialManualMode, setSpecialManualMode] = useState<boolean>(false);

  // --- Reset to defaults (for new entry) ---
  const resetForm = (): void => {
    setFormDate(toLocalDateString(new Date()));
    setEntryType("work");
    setStartTime(DEFAULTS.startTime);
    setEndTime(DEFAULTS.endTime);
    setPauseDuration(DEFAULTS.pauseDuration);
    setProject("");
    setCode(getDefaultCode());
    setEditingEntry(null);
    setIsLiveEntry(false);
    setSpecialManualMode(false);
  };

  // --- Populate from existing entry (edit mode) ---
  const startEdit = (entry: Entry): void => {
    const isDrive = entry.type === "work" && entry.code === WORK_CODE.DRIVE;
    const isSpecial =
      entry.type === "vacation" || entry.type === "sick" || entry.type === "time_comp";
    const specialManual = isSpecial && !!entry.start && !!entry.end;
    setEditingEntry(entry);
    setEntryType(isDrive ? "drive" : entry.type);
    setFormDate(entry.date);
    setSpecialManualMode(specialManual);
    if (entry.type === "work") {
      setStartTime(entry.start ?? DEFAULTS.startTime);
      setEndTime(entry.end ?? DEFAULTS.endTime);
      setPauseDuration(isDrive ? 0 : entry.pause ?? 0);
      setCode(entry.code ?? getDefaultCode());
      setProject(entry.project || "");
    } else if (specialManual) {
      setStartTime(entry.start ?? DEFAULTS.startTime);
      setEndTime(entry.end ?? DEFAULTS.endTime);
      setPauseDuration(0);
      setProject("");
    } else {
      setPauseDuration(0);
      setProject("");
    }
    setIsLiveEntry(false);
  };

  return {
    // Fields
    formDate, setFormDate,
    entryType, setEntryType,
    startTime, setStartTime,
    endTime, setEndTime,
    pauseDuration, setPauseDuration,
    project, setProject,
    code, setCode,
    editingEntry, setEditingEntry,
    isLiveEntry, setIsLiveEntry,
    specialManualMode, setSpecialManualMode,
    // Actions
    resetForm,
    startEdit,
  };
}
