import React, { useCallback } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { Entry, EntryType, UserData, WorkCode, FormState, CalculationConfig } from '../../types';
import type { Locale } from "../../locales/types";
import { toLocalDateString } from "../../utils";
import { parseTime, calculateEntryNetDuration, getTargetMinutesForDate } from "../../utils/timeCalculations";
import { generateEntryId } from "../../utils/entryId";
import { saveLastCode } from "../../utils/lastCode";
import { WORK_CODE } from "../constants";

/**
 * Handler rund um das Entry-Formular: Neu, Bearbeiten, Speichern.
 *
 * Die komplette Validierung (Start/End, Overlap) und die Logik zur
 * Ermittlung von netDuration und storedType bleibt hier zentralisiert,
 * genauso wie die "last code"-Persistenz über settingsRepo.
 */
interface UseEntryActionsProps {
  form: FormState;
  entries: Entry[];
  userData: UserData;
  workCodes: WorkCode[];
  addEntry: (entry: Entry) => Promise<void>;
  updateEntry: (entry: Entry) => Promise<void>;
  getDefaultCode: () => number;
  setView: (view: string) => void;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
}

export function useEntryActions({
  form,
  entries,
  userData,
  workCodes,
  addEntry,
  updateEntry,
  getDefaultCode,
  setView,
  locale,
  calculationConfig,
}: UseEntryActionsProps) {
  const { t } = useTranslation();
  const getDefaultTimesForDate = useCallback(
    (date: string) => {
      const dayEntries = entries
        .filter((entry) => entry.date === date && entry.type === "work" && entry.end)
        .sort((a, b) => (a.end || "").localeCompare(b.end || ""));

      const lastEnd = dayEntries.length ? dayEntries[dayEntries.length - 1].end : null;

      if (lastEnd) {
        return { startTime: lastEnd, endTime: lastEnd };
      }
      return { startTime: "06:00", endTime: "16:30" };
    },
    [entries]
  );

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
    form.setSpecialManualMode?.(false);
    setView("add");
  }, [form, getDefaultCode, getDefaultTimesForDate, setView]);

  const startEdit = useCallback(
    (entry: Entry) => {
      form.setEditingEntry(entry);
      const isDrive = entry.type === "work" && entry.code === WORK_CODE.DRIVE;
      const isSpecial =
        entry.type === "vacation" || entry.type === "sick" || entry.type === "time_comp";
      const specialManual = isSpecial && !!entry.start && !!entry.end;
      form.setEntryType(isDrive ? "drive" : entry.type);
      form.setFormDate(entry.date);
      form.setSpecialManualMode?.(specialManual);
      if (entry.type === "work") {
        form.setStartTime(entry.start || "06:00");
        form.setEndTime(entry.end || "16:30");
        form.setPauseDuration(isDrive ? 0 : entry.pause ?? 0);
        form.setCode(entry.code ?? getDefaultCode());
        form.setProject(entry.project || "");
      } else if (specialManual && entry.start && entry.end) {
        form.setStartTime(entry.start);
        form.setEndTime(entry.end);
        form.setPauseDuration(0);
        form.setProject("");
      } else {
        form.setPauseDuration(0);
        form.setProject("");
      }
      form.setIsLiveEntry(false);
      setView("add");
    },
    [form, getDefaultCode, setView]
  );

  const handleSaveEntry = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      const isDrive = form.entryType === "drive";
      const isSpecial =
        form.entryType === "vacation" ||
        form.entryType === "sick" ||
        form.entryType === "time_comp";
      const isManualSpecial = isSpecial && !!form.specialManualMode;
      const hasTimeInputs = form.entryType === "work" || isDrive || isManualSpecial;
      let net = 0;
      let label = "";

      if (hasTimeInputs) {
        const s = parseTime(form.startTime);
        const en = parseTime(form.endTime);
        if (en <= s) {
          toast.error(t("toasts.entry.endBeforeStart"));
          return;
        }

        const hasOverlap = entries.some((existing) => {
          if (existing.date !== form.formDate) return false;
          if (form.editingEntry && existing.id === form.editingEntry.id) return false;
          if (!existing.start || !existing.end) return false;
          const exStart = parseTime(existing.start);
          const exEnd = parseTime(existing.end);
          return s < exEnd && exStart < en;
        });

        if (hasOverlap) {
          Haptics.impact({ style: ImpactStyle.Heavy });
          toast.error(t("toasts.entry.overlap"), { duration: 4000, icon: "⛔" });
          return;
        }

        net = calculateEntryNetDuration({
          entryType: form.entryType,
          startTime: form.startTime,
          endTime: form.endTime,
          pauseDuration: form.pauseDuration,
          formDate: form.formDate,
          userData,
          code: form.code,
          specialManualMode: isManualSpecial,
          locale,
          config: calculationConfig,
        });

        if (isManualSpecial) {
          label =
            form.entryType === "vacation"
              ? "Urlaub"
              : form.entryType === "sick"
              ? "Krank"
              : "Zeitausgleich";
        } else {
          const usedCode = isDrive ? WORK_CODE.DRIVE : form.code;
          label =
            workCodes.find((c) => c.id === usedCode)?.label || (isDrive ? "Fahrzeit" : "Arbeit");
        }
      } else {
        net = calculateEntryNetDuration({
          entryType: form.entryType,
          startTime: form.startTime,
          endTime: form.endTime,
          pauseDuration: form.pauseDuration,
          formDate: form.formDate,
          userData,
          code: form.code,
          locale,
          config: calculationConfig,
        });
        label =
          form.entryType === "vacation"
            ? "Urlaub"
            : form.entryType === "sick"
            ? "Krank"
            : "Zeitausgleich";
      }
      if (net < 0) net = 0;

      // Gemischter Krank-Tag: netDuration nur bis Rest-Sollzeit
      if (form.entryType === "sick" && !isManualSpecial) {
        const existingWork = entries
          .filter((ex) => ex.date === form.formDate && ex.type === "work"
                  && ex.code !== WORK_CODE.DRIVE
                  && (!form.editingEntry || ex.id !== form.editingEntry.id))
          .reduce((sum, ex) => sum + (ex.netDuration || 0), 0);

        if (existingWork > 0) {
          const dayTarget = getTargetMinutesForDate(form.formDate, userData?.workDays, locale);
          net = Math.max(0, dayTarget - existingWork);
        }
      }

      const storedType: EntryType = isDrive ? "work" : (form.entryType as EntryType);
      const usedCode = isDrive ? WORK_CODE.DRIVE : form.code;
      const usedPause = storedType === "work" ? (isDrive ? 0 : form.pauseDuration) : 0;
      // Im Manual-Modus für Krank/Urlaub/ZA persistieren wir Start/Ende,
      // damit der Edit-Pfad sie wieder erkennen kann.
      const persistTimes = storedType === "work" || isManualSpecial;

      const newEntry = {
        id: form.editingEntry ? form.editingEntry.id : generateEntryId(),
        type: storedType,
        date: form.formDate,
        start: persistTimes ? form.startTime : null,
        end: persistTimes ? form.endTime : null,
        pause: usedPause,
        project: storedType === "work" ? form.project : label,
        code: storedType === "work" ? usedCode : null,
        netDuration: net,
      };

      try {
        if (form.editingEntry) await updateEntry(newEntry);
        else await addEntry(newEntry);
      } catch {
        return;
      }

      if (
        storedType === "work" &&
        usedCode &&
        usedCode !== WORK_CODE.DRIVE &&
        usedCode !== WORK_CODE.ARRIVAL
      ) {
        saveLastCode(usedCode);
      }

      toast.success(form.editingEntry ? t("toasts.entry.updated") : t("toasts.entry.saved"));
      form.setEditingEntry(null);
      form.setProject("");
      form.setEntryType("work");
      form.setSpecialManualMode?.(false);
      setView("dashboard");
    },
    [form, entries, workCodes, userData, addEntry, updateEntry, setView, locale, calculationConfig, t]
  );

  return { getDefaultTimesForDate, startNewEntry, startEdit, handleSaveEntry };
}
