import { useCallback } from "react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { toLocalDateString } from "../utils";
import { parseTime, calculateEntryNetDuration } from "../utils/timeCalculations";
import { PLAY_STORE, STORAGE_KEYS, WORK_CODE, WORK_MODELS } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { setSetting, deleteSetting, getSetting } from "../db/repositories/settingsRepo";
import { getAllEntries } from "../db/repositories/entriesRepo";
import { getAllWorkCodes } from "../db/repositories/workCodesRepo";

// ─── Dual-Write Helpers (localStorage + SQLite) ─────────────

function dualWriteSync(lsKey, sqlKey, value) {
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    setSetting(sqlKey, value).catch(e =>
      console.error(`[useAppActions] SQLite-Write "${sqlKey}" fehlgeschlagen:`, e)
    );
  }
}

function dualRemoveSync(lsKey, sqlKey) {
  localStorage.removeItem(lsKey);
  if (isSQLiteActive()) {
    deleteSetting(sqlKey).catch(e =>
      console.error(`[useAppActions] SQLite-Delete "${sqlKey}" fehlgeschlagen:`, e)
    );
  }
}

/**
 * Zentralisiert alle Event-Handler aus App.jsx
 * Logik 1:1 verschoben, keine funktionalen Änderungen.
 *
 * Übernimmt alle Handler-Logik die vorher in App.jsx direkt stand.
 */
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
  pauseTimer,
  resumeTimer,
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
  const getDefaultTimesForDate = useCallback((date) => {
    const dayEntries = entries
      .filter((entry) => entry.date === date && entry.type === "work" && entry.end)
      .sort((a, b) => (a.end || "").localeCompare(b.end || ""));

    const lastEnd = dayEntries.length ? dayEntries[dayEntries.length - 1].end : null;

    if (lastEnd) {
      return {
        startTime: lastEnd,
        endTime: lastEnd,
      };
    }

    return {
      startTime: "06:00",
      endTime: "16:30",
    };
  }, [entries]);

  // =====================
  // LIVE TIMER
  // =====================

  const handleStartLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    startTimer();
    toast.success("⏱️ Stempeluhr gestartet!");
  }, [startTimer]);

  const handleStopLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    const result = stopTimer();
    const yyyy = result.start.getFullYear();
    const mm = String(result.start.getMonth() + 1).padStart(2, '0');
    const dd = String(result.start.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    form.setEntryType("work");
    form.setFormDate(dateStr);

    const toLocalHHMM = (dateObj) => {
      const h = String(dateObj.getHours()).padStart(2, '0');
      const m = String(dateObj.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    form.setStartTime(toLocalHHMM(result.start));
    form.setEndTime(toLocalHHMM(result.end));
    form.setPauseDuration(result.pause);
    form.setProject("");
    form.setCode(getDefaultCode());

    form.setEditingEntry(null);
    form.setIsLiveEntry(true);
    setView("add");
    toast("🏁 Zeit wurde übernommen", { icon: "✨" });
  }, [form, getDefaultCode, setView, stopTimer]);

  // =====================
  // MONATS-NAVIGATION
  // =====================

  const changeMonth = useCallback((delta) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }, [setCurrentDate]);

  // =====================
  // EINTRAG NEU / BEARBEITEN
  // =====================

  const startNewEntry = useCallback(() => {
    const formDate = toLocalDateString(new Date());
    const { startTime, endTime } = getDefaultTimesForDate(formDate);

    form.setEditingEntry(null);
    form.setEntryType("work");
    form.setFormDate(formDate);
    form.setStartTime(startTime);
    form.setEndTime(endTime);
    form.setPauseDuration(30);
    form.setProject("");
    form.setCode(getDefaultCode());
    form.setIsLiveEntry(false);
    setView("add");
  }, [form, getDefaultCode, getDefaultTimesForDate, setView]);

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

  // =====================
  // EINTRAG SPEICHERN
  // =====================

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
        return;
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
        Haptics.impact({ style: ImpactStyle.Heavy });
        toast.error("⚠️ Zeitüberschneidung!", { duration: 4000, icon: "⛔" });
        return;
      }

      const usedCode = isDrive ? WORK_CODE.DRIVE : form.code;
      net = calculateEntryNetDuration({
        entryType: form.entryType,
        startTime: form.startTime,
        endTime: form.endTime,
        pauseDuration: form.pauseDuration,
        formDate: form.formDate,
        userData,
        code: form.code,
      });
      label = workCodes.find((c) => c.id === usedCode)?.label || (isDrive ? "Fahrzeit" : "Arbeit");
    } else {
      net = calculateEntryNetDuration({
        entryType: form.entryType,
        startTime: form.startTime,
        endTime: form.endTime,
        pauseDuration: form.pauseDuration,
        formDate: form.formDate,
        userData,
        code: form.code,
      });
      label =
        form.entryType === "vacation"
          ? "Urlaub"
          : form.entryType === "sick"
          ? "Krank"
          : "Zeitausgleich";
    }
    if (net < 0) net = 0;

    const storedType = isDrive ? "work" : form.entryType;
    const usedCode = isDrive ? WORK_CODE.DRIVE : form.code;
    const usedPause = storedType === "work" ? (isDrive ? 0 : form.pauseDuration) : 0;

    const newEntry = {
      id: form.editingEntry ? form.editingEntry.id : Date.now() * 100 + Math.floor(Math.random() * 100),
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

    if (
      storedType === "work" &&
      usedCode &&
      usedCode !== WORK_CODE.DRIVE &&
      usedCode !== WORK_CODE.ARRIVAL
    ) {
      dualWriteSync(STORAGE_KEYS.LAST_CODE, "last_code", usedCode);
    }

    toast.success(form.editingEntry ? "✏️ Eintrag aktualisiert" : "💾 Eintrag gespeichert");
    form.setEditingEntry(null);
    form.setProject("");
    form.setEntryType("work");
    setView("dashboard");
  }, [form, entries, workCodes, userData, addEntry, updateEntry, setView]);

  // =====================
  // LÖSCHEN
  // =====================

  const executeDelete = useCallback(async (deleteTarget) => {
    if (deleteTarget?.type === "single") {
      if (removeAttachmentsForEntry) {
        await removeAttachmentsForEntry(deleteTarget.id);
      }
      deleteEntry(deleteTarget.id);
      toast.success("🗑️ Eintrag gelöscht");
    } else if (deleteTarget?.type === "all") {
      if (entries?.length && removeAttachmentsForEntry) {
        for (const entry of entries) {
          await removeAttachmentsForEntry(entry.id);
        }
      }
      deleteAllEntries();
      const emptyUser = {
        name: "",
        position: "",
        photo: null,
        workDays: [...WORK_MODELS[0].days],
      };
      setUserData(emptyUser);
      dualRemoveSync(STORAGE_KEYS.LAST_CODE, "last_code");
      localStorage.removeItem(STORAGE_KEYS.ATTACHMENTS);
      localStorage.removeItem(STORAGE_KEYS.ATTACHMENT_LABELS);
      toast.success("🧹 App vollständig zurückgesetzt");
    }
    setDeleteTarget(null);
  }, [deleteEntry, deleteAllEntries, entries, removeAttachmentsForEntry, setUserData, setDeleteTarget]);

  // =====================
  // ONBOARDING
  // =====================

  const handleOnboardingFinish = useCallback(async () => {
    // SQLite-first: Lade Daten aus SQLite, wenn verfügbar
    if (isSQLiteActive()) {
      try {
        // User-Daten aus settingsRepo laden - verwende "user" key (nicht "user_data")
        const userDataFromSQLite = await getSetting("user");
        
        if (userDataFromSQLite) {
          // userDataFromSQLite ist bereits ein Objekt (nicht JSON-String)
          setUserData(userDataFromSQLite);
          if (userDataFromSQLite.settings?.autoBackup !== undefined) {
            setAutoBackup(userDataFromSQLite.settings.autoBackup);
          }
        }

        // Einträge aus entriesRepo laden
        const entriesFromSQLite = await getAllEntries();
        
        importEntries(entriesFromSQLite || []);

        // Work Codes aus workCodesRepo laden
        await getAllWorkCodes();
        
        // Work Codes werden bereits durch useWorkCodes Hook geladen
      } catch (e) {
        // Fallback auf localStorage (falls noch vorhanden)
        const storedUserStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (storedUserStr) {
          try {
            const storedUser = JSON.parse(storedUserStr);
            if (storedUser && typeof storedUser === "object") {
              setUserData(storedUser);
              if (storedUser.settings?.autoBackup !== undefined) {
                setAutoBackup(storedUser.settings.autoBackup);
              }
            }
          } catch (e2) {
          }
        }

        const storedEntriesStr = localStorage.getItem(STORAGE_KEYS.ENTRIES);
        if (storedEntriesStr) {
          try {
            const storedEntries = JSON.parse(storedEntriesStr);
            importEntries(storedEntries);
          } catch (e2) {
          }
        }
      }
    } else {
      // Fallback: Web/Dev Mode - localStorage
      const storedUserStr = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          if (storedUser && typeof storedUser === "object") {
            setUserData(storedUser);
            if (storedUser.settings?.autoBackup !== undefined) {
              setAutoBackup(storedUser.settings.autoBackup);
            }
          }
        } catch (e) {
        }
      }

      const storedEntriesStr = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (storedEntriesStr) {
        try {
          const storedEntries = JSON.parse(storedEntriesStr);
          importEntries(storedEntries);
        } catch (e) {
        }
      }
    }

    setShowOnboarding(false);
    setView("dashboard");
    toast.success("Einrichtung abgeschlossen!");
    Haptics.notification({ type: NotificationType.Success });
  }, [setUserData, setAutoBackup, importEntries, setShowOnboarding]);

  // =====================
  // UPDATE CHECK
  // =====================

  const handleManualUpdateCheck = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Keine Internetverbindung");
      return;
    }

    const toastId = toast.loading("Oeffne den Play Store...");
    try {
      await new Promise((r) => setTimeout(r, 250));
      toast.dismiss(toastId);

      Haptics.impact({ style: ImpactStyle.Light });
      const opened = window.open(PLAY_STORE.URL, "_system");

      if (!opened) {
        try {
          await navigator.clipboard.writeText(PLAY_STORE.URL);
          toast("Play-Store-Link in die Zwischenablage kopiert.", {
            duration: 5000,
            icon: "info",
          });
        } catch {
          toast.error("Play Store konnte nicht geoeffnet werden.");
        }
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Play Store konnte nicht geoeffnet werden.");
    }
  }, []);

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
