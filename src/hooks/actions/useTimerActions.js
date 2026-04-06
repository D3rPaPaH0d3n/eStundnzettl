import { useCallback } from "react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Live-Timer Start/Stop Handler.
 *
 * - Start: startet den Timer (localStorage + State) und zeigt Toast.
 * - Stop: stoppt den Timer, füllt das Entry-Formular mit den gesammelten
 *   Daten vor und wechselt in die "add"-View. Der User kann dort noch
 *   Code/Projekt editieren, bevor er speichert.
 */
export function useTimerActions({ form, startTimer, stopTimer, getDefaultCode, setView }) {
  const handleStartLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    startTimer();
    toast.success("⏱️ Stempeluhr gestartet!");
  }, [startTimer]);

  const handleStopLive = useCallback(() => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    const result = stopTimer();

    const yyyy = result.start.getFullYear();
    const mm = String(result.start.getMonth() + 1).padStart(2, "0");
    const dd = String(result.start.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const toLocalHHMM = (dateObj) => {
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
    toast("🏁 Zeit wurde übernommen", { icon: "✨" });
  }, [form, getDefaultCode, setView, stopTimer]);

  return { handleStartLive, handleStopLive };
}
