import { useCallback } from "react";
import toast from "react-hot-toast";
import { Haptics, NotificationType } from "@capacitor/haptics";
import type { UserData, Entry } from '../../types';
import { STORAGE_KEYS } from "../constants";
import { isSQLiteActive } from "../../db/storageMode";
import { getSetting } from "../../db/repositories/settingsRepo";
import { getAllEntries } from "../../db/repositories/entriesRepo";
import { getAllWorkCodes } from "../../db/repositories/workCodesRepo";

/**
 * Abschluss des Onboarding-Wizards.
 *
 * Lädt die final im Wizard gespeicherten Daten zurück in den App-State:
 *  - User-Profil (bevorzugt aus SQLite, Fallback localStorage)
 *  - Einträge (ggf. aus importiertem Backup oder Demo-Daten)
 *  - Work Codes (werden bereits durch den useWorkCodes-Hook geladen,
 *    hier nur der Lesevorgang zur Konsistenzsicherung)
 */
interface UseOnboardingActionsProps {
  setUserData: (data: UserData) => void;
  setAutoBackup: (enabled: boolean) => void;
  importEntries: (entries: Entry[]) => void;
  setShowOnboarding: (show: boolean) => void;
  setView: (view: string) => void;
}

export function useOnboardingActions({
  setUserData,
  setAutoBackup,
  importEntries,
  setShowOnboarding,
  setView,
}: UseOnboardingActionsProps) {
  const handleOnboardingFinish = useCallback(async () => {
    if (isSQLiteActive()) {
      try {
        const userDataFromSQLite = await getSetting("user") as (UserData & { settings?: { autoBackup?: boolean } }) | null;
        if (userDataFromSQLite) {
          setUserData(userDataFromSQLite);
          if (userDataFromSQLite.settings?.autoBackup !== undefined) {
            setAutoBackup(userDataFromSQLite.settings.autoBackup);
          }
        }

        const entriesFromSQLite = await getAllEntries();
        importEntries(entriesFromSQLite || []);

        // Work Codes werden bereits durch useWorkCodes Hook geladen;
        // dieser Call stellt nur sicher, dass die Repo-Schicht initialisiert ist.
        await getAllWorkCodes();
      } catch {
        // SQLite-Load fehlgeschlagen → localStorage-Fallback
        loadFromLocalStorage({ setUserData, setAutoBackup, importEntries });
      }
    } else {
      loadFromLocalStorage({ setUserData, setAutoBackup, importEntries });
    }

    setShowOnboarding(false);
    setView("dashboard");
    toast.success("Einrichtung abgeschlossen!");
    Haptics.notification({ type: NotificationType.Success });
  }, [setUserData, setAutoBackup, importEntries, setShowOnboarding, setView]);

  return { handleOnboardingFinish };
}

// ─── Interne Helpers ───────────────────────────────────────

function loadFromLocalStorage({ setUserData, setAutoBackup, importEntries }: { setUserData: (data: UserData) => void; setAutoBackup: (enabled: boolean) => void; importEntries: (entries: Entry[]) => void }) {
  const storedUserStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (storedUserStr) {
    try {
      const storedUser = JSON.parse(storedUserStr);
      if (storedUser && typeof storedUser === "object") {
        setUserData(storedUser);
        if (storedUser.settings?.autoBackup !== undefined) {
          setAutoBackup(storedUser.settings.autoBackup);
        }
      }
    } catch {
      /* corrupt — überspringen */
    }
  }

  const storedEntriesStr = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  if (storedEntriesStr) {
    try {
      const storedEntries = JSON.parse(storedEntriesStr);
      importEntries(storedEntries);
    } catch {
      /* corrupt — überspringen */
    }
  }
}
