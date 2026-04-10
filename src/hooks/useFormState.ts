import { useState } from "react";
import type { Entry, EntryType } from '../types';
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
 * useFormState — State-Container für das Entry-Formular (EntryForm).
 *
 * Hält alle Feld-Werte (Datum, Start/Ende, Pause, Projekt, Code,
 * Eintragstyp) plus ein paar Meta-Flags (editingEntry, isLiveEntry,
 * specialManualMode) und stellt `resetForm()` zum Zurücksetzen auf
 * die Defaults bereit.
 *
 * Der Hook persistiert **nichts** — er ist ein reiner In-Memory-
 * State, der beim Submit in ein echtes `Entry` übersetzt wird
 * (siehe `useEntryActions`). Beim Wechsel auf "add"/"edit" werden
 * die Felder aus dem zu bearbeitenden Entry bzw. den Defaults
 * initialisiert.
 *
 * ### specialManualMode
 * Normalerweise bekommen `vacation`/`sick`/`time_comp` die tägliche
 * Sollzeit automatisch gutgeschrieben. Wenn `specialManualMode`
 * true ist, gibt der User stattdessen Start/Ende wie bei einem
 * normalen Arbeitseintrag manuell an.
 *
 * @param getDefaultCode — liefert die Default-Code-Id beim Reset
 *                         (meist aus `useLastCode`)
 *
 * @returns Feld-Werte + Setter + `resetForm()`, `setEditingEntry()`,
 *          `setIsLiveEntry()`, `setSpecialManualMode()`.
 */
export function useFormState({ getDefaultCode }: { getDefaultCode: () => number }) {
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
    setSpecialManualMode(false);
  };

  // --- Populate from existing entry (edit mode) ---
  const startEdit = (entry: Entry) => {
    const isDrive = entry.type === "work" && entry.code === WORK_CODE.DRIVE;
    const isSpecial =
      entry.type === "vacation" || entry.type === "sick" || entry.type === "time_comp";
    const specialManual = isSpecial && !!entry.start && !!entry.end;
    setEditingEntry(entry);
    setEntryType(isDrive ? "drive" : entry.type);
    setFormDate(entry.date);
    setSpecialManualMode(specialManual);
    if (entry.type === "work") {
      setStartTime(entry.start || DEFAULTS.startTime);
      setEndTime(entry.end || DEFAULTS.endTime);
      setPauseDuration(isDrive ? 0 : entry.pause ?? 0);
      setCode(entry.code ?? getDefaultCode());
      setProject(entry.project || "");
    } else if (specialManual) {
      setStartTime(entry.start || "");
      setEndTime(entry.end || "");
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
