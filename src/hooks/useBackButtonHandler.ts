import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { FormState } from "../types";

/**
 * Handles Android hardware back button via Capacitor.
 * Navigates back to dashboard or exits app if already on dashboard.
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
