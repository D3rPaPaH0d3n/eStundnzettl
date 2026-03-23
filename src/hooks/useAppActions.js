import { useCallback } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import toast from "react-hot-toast";
import { STORAGE_KEYS, WORK_CODE, WORK_MODELS } from "./constants";
import { parseTime, getTargetMinutesForDate, checkForUpdate, toLocalDateString, toLocalHHMM } from "../utils";

// Populate form from a stopped live timer
const populateFromLiveResult = (result, form, getDefaultCode) => {
  const yyyy = result.start.getFullYear();
  const mm = String(result.start.getMonth() + 1).padStart(2, "0");
  const dd = String(result.start.getDate()).padStart(2, "0");

  form.setEntryType("work");
  form.setFormDate(`${yyyy}-${mm}-${dd}`);
  form.setStartTime(toLocalHHMM(result.start));
  form.setEndTime(toLocalHHMM(result.end));
  form.setPauseDuration(result.pause);
  form.setProject("");
  form.setCode(getDefaultCode());
  form.setEditingEntry(null);
  form.setIsLiveEntry(true);
};

export const useAppActions = ({
  form,
  entries,
  addEntry,
  updateEntry,
  deleteEntry,
  deleteAllEntries,
  importEntries,
  userData,
  setUserData,
  workCodes,
  getDefaultCode,
  setView,
  stopTimer,
}) => {
  // --- NAVIGATION ---
  const startNewEntry = useCallback(() => {
    form.setEditingEntry(null);
    form.setEntryType("work");
    form.setFormDate(toLocalDateString(new Date()));
    form.setStartTime("06:00");
    form.setEndTime("16:30");
    form.setPauseDuration(30);
    form.setProject("");
    form.setCode(getDefaultCode());
    form.setIsLiveEntry(false);
    setView("add");
  }, [form, getDefaultCode, setView]);

  const startEdit = useCallback((entry) => {
    form.setEditingEntry(entry);
    const isDrive = entry.type === "work" && entry.code === WORK_CODE.DRIVE;
    form.setEntryType(isDrive ? "drive" : entry.type);
    form.setFormDate(entry.date);
    if (entry.type === "work") {
      form.setStartTime(entry.start || "06:00");
      form.setEndTime(entry.end || "16:30");
      form.setPauseDuration(isDrive ? 0 : entry.pause ?? 0);
      form.setCode(entry.code ?? getDefaultCode());
      form.setProject(entry.project || "");
    } else {
      form.setPauseDuration(0);
      form.setProject("");
    }
    form.setIsLiveEntry(false);
    setView("add");
  }, [form, getDefaultCode, setView]);

  // --- LIVE TIMER ---
  const handleStartLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    return true;
  }, []);

  const handleStopLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    const result = stopTimer();
    populateFromLiveResult(result, form, getDefaultCode);
    setView("add");
    return true;
  }, [form, getDefaultCode, setView, stopTimer]);

  // --- SAVE ENTRY ---
  const handleSaveEntry = useCallback((e) => {
    e.preventDefault();
    const isDrive = form.entryType === "drive";
    let net = 0;
    let label = "";

    if (form.entryType === "work" || isDrive) {
      const s = parseTime(form.startTime);
      const en = parseTime(form.endTime);
      if (en <= s) {
        toast.error("⚠️ Endzeit muss nach Startzeit liegen!");
        return { success: false };
      }

      const hasOverlap = entries.some((existing) => {
        if (existing.date !== form.formDate) return false;
        if (form.editingEntry && existing.id === form.editingEntry.id) return false;
        if (!existing.start || !existing.end) return false;
        const exStart = parseTime(existing.start);
        const exEnd = parseTime(existing.end);
        return (s < exEnd && exStart < en);
      });

      if (hasOverlap) {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
        toast.error("⚠️ Zeitüberschneidung!", { duration: 4000, icon: "⛔" });
        return { success: false };
      }

      const usedPause = isDrive ? 0 : form.pauseDuration;
      const usedCode = isDrive ? WORK_CODE.DRIVE : form.code;
      net = en - s - usedPause;
      label = workCodes.find((c) => c.id === usedCode)?.label || (isDrive ? "Fahrzeit" : "Arbeit");
    } else {
      net = getTargetMinutesForDate(form.formDate, userData?.workDays);
      label = form.entryType === "vacation" ? "Urlaub" : form.entryType === "sick" ? "Krank" : "Zeitausgleich";
    }
    if (net < 0) net = 0;

    const storedType = isDrive ? "work" : form.entryType;
    const usedCode = isDrive ? WORK_CODE.DRIVE : form.code;
    const usedPause = storedType === "work" ? (isDrive ? 0 : form.pauseDuration) : 0;

    const newEntry = {
      id: form.editingEntry ? form.editingEntry.id : Date.now(),
      type: storedType,
      date: form.formDate,
      start: storedType === "work" ? form.startTime : null,
      end: storedType === "work" ? form.endTime : null,
      pause: usedPause,
      project: storedType === "work" ? form.project : label,
      code: storedType === "work" ? usedCode : null,
      netDuration: net,
    };

    if (form.editingEntry) updateEntry(newEntry);
    else addEntry(newEntry);

    if (storedType === "work" && usedCode && usedCode !== WORK_CODE.DRIVE && usedCode !== WORK_CODE.ARRIVAL) {
      localStorage.setItem(STORAGE_KEYS.LAST_CODE, usedCode);
    }

    toast.success(form.editingEntry ? "✏️ Eintrag aktualisiert" : "💾 Eintrag gespeichert");
    form.setEditingEntry(null);
    form.setProject("");
    form.setEntryType("work");
    setView("dashboard");
    return { success: true };
  }, [form, entries, addEntry, updateEntry, workCodes, userData, setView]);

  // --- DELETE ---
  const executeDelete = useCallback((deleteTarget) => {
    if (deleteTarget?.type === "single") {
      deleteEntry(deleteTarget.id);
      toast.success("🗑️ Eintrag gelöscht");
    } else if (deleteTarget?.type === "all") {
      deleteAllEntries();
      const emptyUser = { name: "", position: "", photo: null, workDays: [...WORK_MODELS[0].days] };
      setUserData(emptyUser);
      localStorage.removeItem(STORAGE_KEYS.LAST_CODE);
      toast.success("🧹 App vollständig zurückgesetzt");
    }
    return true;
  }, [deleteEntry, deleteAllEntries, setUserData]);

  // --- UPDATE CHECK ---
  const handleManualUpdateCheck = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Keine Internetverbindung 🌐");
      return;
    }
    const toastId = toast.loading("Suche nach Updates...");
    try {
      await new Promise((r) => setTimeout(r, 800));
      const data = await checkForUpdate();
      toast.dismiss(toastId);
      if (data) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        return { hasUpdate: true, data };
      } else {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        toast.success("Alles auf dem neuesten Stand! ✨");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Prüfung fehlgeschlagen.");
    }
    return { hasUpdate: false };
  }, []);

  return {
    startNewEntry,
    startEdit,
    handleStartLive,
    handleStopLive,
    handleSaveEntry,
    executeDelete,
    handleManualUpdateCheck,
  };
};
