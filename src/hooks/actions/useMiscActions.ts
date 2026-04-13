import { useCallback } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { PLAY_STORE } from "../constants";

/**
 * Kleinere App-weite Handler, die keine eigene Datei rechtfertigen:
 *  - changeMonth: Monats-Navigation im Dashboard
 *  - handleManualUpdateCheck: öffnet den Play Store für ein manuelles Update
 */
export function useMiscActions({ setCurrentDate }: { setCurrentDate: (fn: (prev: Date) => Date) => void }) {
  const { t } = useTranslation();
  const changeMonth = useCallback(
    (delta: number) => {
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
      toast.error(t("toasts.noInternet"));
      return;
    }

    const toastId = toast.loading(t("toasts.playStore.opening"));
    try {
      await new Promise((r) => setTimeout(r, 250));
      toast.dismiss(toastId);

      Haptics.impact({ style: ImpactStyle.Light });
      const opened = window.open(PLAY_STORE.URL, "_system");

      if (!opened) {
        try {
          await navigator.clipboard.writeText(PLAY_STORE.URL);
          toast(t("toasts.playStore.copiedClipboard"), {
            duration: 5000,
            icon: "info",
          });
        } catch {
          toast.error(t("toasts.playStore.failed"));
        }
      }
    } catch {
      toast.dismiss(toastId);
      toast.error(t("toasts.playStore.failed"));
    }
  }, [t]);

  return { changeMonth, handleManualUpdateCheck };
}
