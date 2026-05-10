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
    // Re-registers when view changes so the closure sees the current view.
    // setView and form are imperative callbacks the handler invokes once per
    // back-press; including them would re-register on every parent render
    // (form is recreated each render) and could drop back-presses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
}
