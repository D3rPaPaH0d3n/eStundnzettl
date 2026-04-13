import { useCallback } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { FormState } from '../../types';

/**
 * Live-Timer Start/Stop Handler.
 *
 * - Start: startet den Timer (localStorage + State) und zeigt Toast.
 * - Stop: stoppt den Timer, füllt das Entry-Formular mit den gesammelten
 *   Daten vor und wechselt in die "add"-View. Der User kann dort noch
 *   Code/Projekt editieren, bevor er speichert.
 */
interface UseTimerActionsProps {
  form: FormState;
  startTimer: () => void;
  stopTimer: () => { start: Date | null; end: Date | null; pause: number };
  getDefaultCode: () => number;
  setView: (view: string) => void;
}

export function useTimerActions({ form, startTimer, stopTimer, getDefaultCode, setView }: UseTimerActionsProps) {
  const { t } = useTranslation();
  const handleStartLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    startTimer();
    toast.success(t("toasts.timer.started"));
  }, [startTimer, t]);

  const handleStopLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    const result = stopTimer();
    if (!result.start || !result.end) return;

    const yyyy = result.start.getFullYear();
    const mm = String(result.start.getMonth() + 1).padStart(2, "0");
    const dd = String(result.start.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const toLocalHHMM = (dateObj: Date): string => {
      const h = String(dateObj.getHours()).padStart(2, "0");
      const m = String(dateObj.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    };

    form.setEntryType("work");
    form.setFormDate(dateStr);
    form.setStartTime(toLocalHHMM(result.start));
    form.setEndTime(toLocalHHMM(result.end));
    form.setPauseDuration(result.pause);
    form.setProject("");
    form.setCode(getDefaultCode());
    form.setEditingEntry(null);
    form.setIsLiveEntry(true);

    setView("add");
    toast(t("toasts.timer.captured"), { icon: "✨" });
  }, [form, getDefaultCode, setView, stopTimer, t]);

  return { handleStartLive, handleStopLive };
}
