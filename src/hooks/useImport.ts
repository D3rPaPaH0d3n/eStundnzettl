import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { ImportSnapshot } from "../db/snapshot";
import { verifyBackupIntegrity } from "../utils/storageBackup";
import { getErrorMessage } from "../utils/errorUtils";

interface UseImportProps {
  importSnapshot: (snapshot: ImportSnapshot) => Promise<void>;
}

const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * useImport — Parsed und importiert ein Backup-JSON aus einem
 * `<input type="file">` Change-Event.
 *
 * Wurde aus useExport extrahiert, da der Import loosely coupled ist
 * (eigene Dependencies: Zod-Schema-Validierung, Checksum-Check) und
 * so isoliert getestet und gewartet werden kann.
 *
 * ### Ablauf
 * 1. Datei-Größe prüfen (max 10 MB)
 * 2. JSON.parse
 * 3. Optional: Checksum-Verify (Toast bei Mismatch oder Legacy)
 * 4. Entries via {@link filterValidEntries} (Zod) filtern,
 *    ungültige überspringen + Toast mit Count
 * 5. `importSnapshot({ entries, userData, workCodes })` — atomarer
 *    DB-Restore + React-State-Refresh in einem Schritt. Bei Fehler:
 *    nichts wurde geschrieben, Error-Toast.
 *
 * Atomarität: `importSnapshot` läuft als Single SQLite-Transaktion.
 * Wenn irgendein Schritt fehlschlägt, werden ALLE bisherigen Writes
 * zurückgerollt — kein Mischzustand möglich. Der Erfolgs-Toast wird
 * erst NACH dem `await` gefeuert, also nach dem COMMIT.
 *
 * @param importSnapshot — atomarer Restore-Callback (App.tsx setzt
 *                         ihn aus `replaceFullSnapshot` + State-Refresh
 *                         zusammen)
 *
 * @returns
 * - `handleImport(event)` — Change-Event-Handler für File-Input
 */
export function useImport({ importSnapshot }: UseImportProps) {
  const { t } = useTranslation();
  const handleImport = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_SIZE) {
      toast.error(t("toasts.import.fileTooLarge"));
      (event.target as HTMLInputElement).value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const d = JSON.parse(e.target?.result as string);
        if (d && typeof d !== "object") throw new Error(t("toasts.import.invalidFile"));

        // Integritäts-Check: Mismatch = mögliche Manipulation, nur Warnung
        try {
          const integrity = await verifyBackupIntegrity(d);
          if (integrity === "mismatch") {
            toast(t("toasts.import.integrityMismatch"), { duration: 6000 });
          } else if (integrity === "unverified") {
            toast(t("toasts.import.legacyChecksum"), { icon: "ℹ️" });
          }
        } catch { /* silent */ }

        const snapshot: ImportSnapshot = {};
        let skipped = 0;

        if (d.entries) {
          if (!Array.isArray(d.entries)) throw new Error("entries is not an array");
          // Zod-basierte Validierung nur bei tatsächlichem Import laden,
          // damit das große Validierungs-Bundle nicht im Startpfad liegt.
          const { filterValidEntries } = await import("../schemas/entry");
          const valid = filterValidEntries(d.entries);
          skipped = d.entries.length - valid.length;
          snapshot.entries = valid;
        }
        if (d.user && typeof d.user === "object") snapshot.userData = d.user;
        if (d.workCodes && Array.isArray(d.workCodes)) snapshot.workCodes = d.workCodes;

        await importSnapshot(snapshot);

        if (skipped > 0) {
          toast(t("toasts.import.skippedEntries", { count: skipped }), { icon: "⚠️" });
        }
        toast.success(t("toasts.import.success"));
      } catch (err: unknown) {
        toast.error(t("toasts.import.error", { message: getErrorMessage(err, t("toasts.import.invalidFile")) }));
      } finally {
        (event.target as HTMLInputElement).value = "";
      }
    };
    reader.readAsText(file);
  };

  return { handleImport };
}
