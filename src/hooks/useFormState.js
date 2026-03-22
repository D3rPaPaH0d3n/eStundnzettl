import { useState } from "react";
import { WORK_CODE } from "./constants";
import { toLocalDateString } from "../utils";

const DEFAULTS = {
  entryType: "work",
  startTime: "06:00",
  endTime: "16:30",
  pauseDuration: 30,
  project: "",
  code: WORK_CODE.DEFAULT,
};

/**
 * useFormState — manages all entry form field state
 *
 * @param {Function} getDefaultCode — returns the last-used or first available work code
 * @returns {Object} form fields + setters + action helpers
 */
export function useFormState({ getDefaultCode }) {
  const [formDate, setFormDate] = useState(toLocalDateString(new Date()));
  const [entryType, setEntryType] = useState(DEFAULTS.entryType);
  const [startTime, setStartTime] = useState(DEFAULTS.startTime);
  const [endTime, setEndTime] = useState(DEFAULTS.endTime);
  const [pauseDuration, setPauseDuration] = useState(DEFAULTS.pauseDuration);
  const [project, setProject] = useState(DEFAULTS.project);
  const [code, setCode] = useState(WORK_CODE.DEFAULT);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isLiveEntry, setIsLiveEntry] = useState(false);

  // --- Internal helpers ---
  const toLocalHHMM = (dateObj) => {
    const h = String(dateObj.getHours()).padStart(2, "0");
    const m = String(dateObj.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const toLocalDateStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // --- Reset to defaults (for new entry) ---
  const resetForm = () => {
    setFormDate(toLocalDateString(new Date()));
    setEntryType("work");
    setStartTime(DEFAULTS.startTime);
    setEndTime(DEFAULTS.endTime);
    setPauseDuration(DEFAULTS.pauseDuration);
    setProject("");
    setCode(getDefaultCode());
    setEditingEntry(null);
    setIsLiveEntry(false);
  };

  // --- Populate from live timer stop ---
  const startFromLive = (result) => {
    setFormDate(toLocalDateStr(result.start));
    setEntryType("work");
    setStartTime(toLocalHHMM(result.start));
    setEndTime(toLocalHHMM(result.end));
    setPauseDuration(result.pause);
    setProject("");
    setCode(getDefaultCode());
    setEditingEntry(null);
    setIsLiveEntry(true);
  };

  // --- Populate from auto-checkout ---
  const startFromAutoCheckout = (autoCheckoutData) => {
    setFormDate(toLocalDateStr(autoCheckoutData.start));
    setEntryType("work");
    setStartTime(toLocalHHMM(autoCheckoutData.start));
    setEndTime(toLocalHHMM(autoCheckoutData.end));
    setPauseDuration(autoCheckoutData.pause);
    setProject("");
    setCode(getDefaultCode());
    setEditingEntry(null);
    setIsLiveEntry(true);
  };

  // --- Populate from existing entry (edit mode) ---
  const startEdit = (entry) => {
    const isDrive = entry.type === "work" && entry.code === WORK_CODE.DRIVE;
    setEditingEntry(entry);
    setEntryType(isDrive ? "drive" : entry.type);
    setFormDate(entry.date);
    if (entry.type === "work") {
      setStartTime(entry.start || DEFAULTS.startTime);
      setEndTime(entry.end || DEFAULTS.endTime);
      setPauseDuration(isDrive ? 0 : entry.pause ?? 0);
      setCode(entry.code ?? getDefaultCode());
      setProject(entry.project || "");
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
    // Actions
    resetForm,
    startFromLive,
    startFromAutoCheckout,
    startEdit,
  };
}
