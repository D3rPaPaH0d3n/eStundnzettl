import toast from "react-hot-toast";
import type { Entry, UserData, WorkCode } from "../types";
import { verifyBackupIntegrity } from "../utils/storageBackup";
import { filterValidEntries } from "../schemas/entry";
import { getErrorMessage } from "../utils/errorUtils";

/**
 * useImport — kapselt die JSON-Import-Logik.
 *
 * Wurde aus useExport extrahiert, da der Import loosely coupled ist
 * (eigene Dependencies, eigene Callbacks) und so isoliert getestet und
 * gewartet werden kann. Das Verhalten ist identisch zum vorherigen
 * useExport.handleImport.
 */
interface UseImportProps {
  importEntries: (entries: Entry[]) => void;
  setUserData: (data: UserData) => void;
  importWorkCodes?: (codes: WorkCode[]) => void;
}

const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB

export function useImport({ importEntries, setUserData, importWorkCodes }: UseImportProps) {
  const handleImport = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_SIZE) {
      toast.error("Datei zu groß (max. 10 MB)");
      (event.target as HTMLInputElement).value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const d = JSON.parse(e.target?.result as string);
        if (d && typeof d !== "object") throw new Error("Ungültiges Format");

        // Integritäts-Check: Mismatch = mögliche Manipulation, nur Warnung
        try {
          const integrity = await verifyBackupIntegrity(d);
          if (integrity === "mismatch") {
            toast("⚠️ Prüfsumme stimmt nicht — Backup wurde möglicherweise verändert", { duration: 6000 });
          } else if (integrity === "unverified") {
            toast("ℹ️ Backup ohne Prüfsumme (Legacy-Format)", { icon: "ℹ️" });
          }
        } catch { /* silent */ }

        if (d.entries) {
          if (!Array.isArray(d.entries)) throw new Error("entries ist kein Array");
          // Zod-basierte Validierung (src/schemas/entry.ts)
          const valid = filterValidEntries(d.entries);
          const skipped = d.entries.length - valid.length;
          if (valid.length > 0) {
            importEntries(valid);
          }
          if (skipped > 0) {
            toast(`${skipped} ungültige Einträge übersprungen`, { icon: "⚠️" });
          }
        }
        if (d.user && typeof d.user === "object") setUserData(d.user);
        if (d.workCodes && Array.isArray(d.workCodes) && importWorkCodes) importWorkCodes(d.workCodes);
        toast.success("Daten erfolgreich importiert!");
      } catch (err: unknown) {
        toast.error(`Fehler: ${getErrorMessage(err, "Datei ungültig.")}`);
      } finally {
        (event.target as HTMLInputElement).value = "";
      }
    };
    reader.readAsText(file);
  };

  return { handleImport };
}
