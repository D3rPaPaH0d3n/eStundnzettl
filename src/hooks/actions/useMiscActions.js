import { useCallback } from "react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { PLAY_STORE } from "../constants";

/**
 * Kleinere App-weite Handler, die keine eigene Datei rechtfertigen:
 *  - changeMonth: Monats-Navigation im Dashboard
 *  - handleManualUpdateCheck: öffnet den Play Store für ein manuelles Update
 */
export function useMiscActions({ setCurrentDate }) {
  const changeMonth = useCallback(
    (delta) => {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + delta);
        return d;
      });
    },
    [setCurrentDate]
  );

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

  return { changeMonth, handleManualUpdateCheck };
}
