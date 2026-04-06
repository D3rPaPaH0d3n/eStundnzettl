import { useState, RefObject } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import toast from "react-hot-toast";
import { exportToSelectedFolder, attachBackupChecksum, verifyBackupIntegrity } from "../utils/storageBackup";
import { toLocalDateString } from "../utils";
import { filterValidEntries } from "../schemas/entry";
import { logger } from "../utils/logger";
import type { Entry, UserData, WorkCodeItem, Attachment } from "../types";

/**
 * useExport — encapsulates all export/import logic
 *
 * @param {Array}   entries        — all time entries
 * @param {Object}  userData       — user profile data
 * @param {Array}   workCodes      — user's custom work codes
 * @param {Function} importEntries — callback to import entries
 * @param {Function} setUserData   — callback to update user data
 * @param {Function} importWorkCodes — callback to import work codes
 * @returns {Object} export state + handlers
 */
type UseExportProps = {
  entries: Entry[];
  userData: UserData | null;
  workCodes: WorkCodeItem[];
  attachments?: Attachment[];
  importEntries: (entries: Entry[]) => Promise<void>;
  setUserData: (data: Partial<UserData>) => void | Promise<void>;
  importWorkCodes?: (workCodes: WorkCodeItem[]) => void | Promise<void>;
  exportPayloadRef: RefObject<any>;
};

type BackupPayload = {
  user: UserData | null;
  entries: Entry[];
  workCodes: WorkCodeItem[];
  attachments: Attachment[];
  exportedAt: string;
  timezone: string;
  checksum?: string;
};

export function useExport({ entries, userData, workCodes, attachments = [], importEntries, setUserData, importWorkCodes, exportPayloadRef }: UseExportProps) {
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const buildPayload = async (): Promise<BackupPayload> => {
    const payload: BackupPayload = {
      user: userData,
      entries,
      workCodes,
      attachments,
      exportedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    await attachBackupChecksum(payload);
    return payload;
  };

  // --- Web fallback: download as file ---
  const handleWebExport = async (): Promise<void> => {
    const toastId = toast.loading("Exportiere Daten...");
    try {
      const dateStr = toLocalDateString(new Date());
      const fileName = `estundnzettl_${dateStr}.json`;
      const payload = await buildPayload();
      const json = JSON.stringify(payload, null, 2);

      const file = new File([json], fileName, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "eStundnzettl Backup", text: "Backup meiner Stunden" });
          toast.success("📤 Export erfolgreich!", { id: toastId });
          return;
        } catch (shareError: any) {
          if (shareError.name === "AbortError") {
            toast.dismiss(toastId);
            return;
          }
        }
      }
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("💾 Download gestartet!", { id: toastId });
    } catch (e) {
      toast.error(`❌ Export Fehler: ${e instanceof Error ? e.message : String(e)}`, { id: toastId, duration: 5000 });
    }
  };

  // --- Main entry point ---
  const exportData = async (): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      exportPayloadRef.current = await buildPayload();
      setShowExportModal(true);
    } else {
      await handleWebExport();
    }
  };

  // --- Capacitor: save to selected folder ---
  const handleExportToFolder = async (): Promise<void> => {
    setShowExportModal(false);
    const toastId = toast.loading("Exportiere in Ordner...");

    try {
      const now = new Date();
      const dateStr = toLocalDateString(now);
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");
      const fileName = `estundnzettl_${dateStr}_${timeStr}.json`;
      const success = await exportToSelectedFolder(fileName, exportPayloadRef.current);

      if (success) {
        toast.success("✅ Erfolgreich im Ordner gespeichert!", { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (e) {
      logger.error("Export to folder error:", e);
      toast.error("Export abgebrochen oder fehlgeschlagen", { id: toastId });
    }
  };

  // --- Capacitor: native share sheet ---
  const handleExportShare = async (): Promise<void> => {
    setShowExportModal(false);
    const toastId = toast.loading("Bereite Export vor...");

    try {
      const now = new Date();
      const dateStr = toLocalDateString(now);
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");
      const fileName = `estundnzettl_${dateStr}_${timeStr}.json`;
      const json = JSON.stringify(exportPayloadRef.current, null, 2);

      await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });

      await Share.share({
        title: "eStundnzettl Backup",
        text: `Backup vom ${new Date().toLocaleDateString("de-DE")}`,
        url: uriResult.uri,
        dialogTitle: "Backup sichern",
      });

      toast.success("📤 Export bereitgestellt!", { id: toastId });
    } catch (e) {
      logger.error("Share error:", e);
      if (e instanceof Error && (e.message?.includes("canceled") || e.message?.includes("cancelled"))) {
        toast.dismiss(toastId);
      } else {
        toast.error(`❌ Export Fehler: ${e instanceof Error ? e.message : String(e)}`, { id: toastId, duration: 5000 });
      }
    }
  };

  // --- Import from JSON file ---
  const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_SIZE) {
      toast.error("Datei zu groß (max. 10 MB)");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
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
          // Zod-basierte Validierung (src/schemas/entry.js)
          const valid = filterValidEntries(d.entries);
          const skipped = d.entries.length - valid.length;
          if (valid.length > 0) {
            // Konvertiere Entry[] zu TimeEntry[]
            const timeEntries: any[] = valid.map(entry => ({
              id: entry.id,
              date: new Date(entry.date),
              start: entry.start ? new Date(entry.start) : new Date(),
              end: entry.end ? new Date(entry.end) : new Date(),
              pauseMinutes: entry.pause,
              workCodeId: entry.code ? entry.code.toString() : null,
              description: entry.project || '',
              attachments: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
            importEntries(timeEntries);
          }
          if (skipped > 0) {
            toast(`${skipped} ungültige Einträge übersprungen`, { icon: "⚠️" });
          }
        }
        if (d.user && typeof d.user === "object") setUserData(d.user);
        if (d.workCodes && Array.isArray(d.workCodes) && importWorkCodes) importWorkCodes(d.workCodes);
        toast.success("Daten erfolgreich importiert!");
      } catch (err) {
        toast.error(`Fehler: ${err instanceof Error ? err.message : "Datei ungültig."}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return {
    showExportModal,
    setShowExportModal,
    exportData,
    handleExportToFolder,
    handleExportShare,
    handleImport,
  };
}