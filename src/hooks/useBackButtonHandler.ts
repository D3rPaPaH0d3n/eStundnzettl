import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { FormState } from "../types";

/**
 * useBackButtonHandler — Fängt den Android-Hardware-Back-Button via
 * `@capacitor/app` und implementiert das erwartete Mobile-Navigation-
 * Verhalten:
 *
 * - Aktueller View ≠ "dashboard" → zurück zum Dashboard,
 *   setzt gleichzeitig editingEntry null (falls der User im
 *   Edit-Flow war)
 * - Aktueller View = "dashboard" → App beenden
 *   (`CapacitorApp.exitApp()`)
 *
 * @param view — aktueller View-Key
 * @param setView — View-Setter aus `useAppState`
 * @param form — FormState, wird zum Zurücksetzen des
 *               editingEntry-Flags benötigt
 */
export function useBackButtonHandler({
  view,
  setView,
  form,
}: {
  view: string;
  setView: (view: string) => void;
  form: FormState;
}) {
  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", () => {
      if (view !== "dashboard") {
        setView("dashboard");
        form.setEditingEntry(null);
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [view]);
}
