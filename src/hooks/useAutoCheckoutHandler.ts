import { useEffect } from "react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { AutoCheckoutData, FormState } from "../types";

/**
 * useAutoCheckoutHandler — Konsument von `useLiveTimer.autoCheckoutData`.
 *
 * Wenn der Live-Timer einen Auto-Checkout erzeugt (weil der User die
 * App über mehrere Tage mit laufendem Timer offen hatte), befüllt
 * dieser Hook das Eingabe-Formular mit den Timer-Daten und navigiert
 * zum "add"-View, damit der User die automatisch erfasste Zeit
 * überprüfen und speichern kann.
 *
 * Löst ein Haptic-Feedback (Impact Heavy) als "Achtung — hier gibt's
 * was zu prüfen"-Signal aus.
 *
 * @param autoCheckoutData — aus `useLiveTimer`. Wenn null, passiert
 *                           nichts. Wenn gesetzt, wird das Formular
 *                           befüllt.
 * @param form — FormState aus `useFormState`
 * @param setView — View-Setter aus `useAppState`
 * @param clearAutoCheckout — muss nach dem Handling aufgerufen
 *                             werden, um Endlos-Loop zu vermeiden
 * @param getDefaultCode — aus `useLastCode`, liefert Default-Code-Id
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
