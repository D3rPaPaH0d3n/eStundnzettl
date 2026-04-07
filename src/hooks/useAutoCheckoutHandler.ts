import { useEffect } from "react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { AutoCheckoutData, FormState } from "../types";

/**
 * Handles auto-checkout data from useLiveTimer.
 * When autoCheckoutData is set, populates the form and navigates to "add" view.
 */
export function useAutoCheckoutHandler({
  autoCheckoutData,
  form,
  setView,
  clearAutoCheckout,
  getDefaultCode,
}: {
  autoCheckoutData: AutoCheckoutData | null;
  form: FormState;
  setView: (view: string) => void;
  clearAutoCheckout: () => void;
  getDefaultCode: () => number;
}) {
  useEffect(() => {
    if (autoCheckoutData) {
      Haptics.impact({ style: ImpactStyle.Heavy });

      const yyyy = autoCheckoutData.start.getFullYear();
      const mm = String(autoCheckoutData.start.getMonth() + 1).padStart(2, '0');
      const dd = String(autoCheckoutData.start.getDate()).padStart(2, '0');
      form.setFormDate(`${yyyy}-${mm}-${dd}`);

      form.setEntryType("work");

      const toLocalHHMM = (dateObj: Date) => {
        const h = String(dateObj.getHours()).padStart(2, '0');
        const m = String(dateObj.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      };

      form.setStartTime(toLocalHHMM(autoCheckoutData.start));
      form.setEndTime(toLocalHHMM(autoCheckoutData.end));
      form.setPauseDuration(autoCheckoutData.pause);

      form.setProject("");
      form.setCode(getDefaultCode());

      form.setEditingEntry(null);
      form.setIsLiveEntry(true);
      setView("add");

      toast("⚠️ Automatisch ausgestempelt! Bitte prüfen.", {
        duration: 6000,
        icon: "🌙"
      });

      clearAutoCheckout();
    }
  }, [autoCheckoutData]);
}
