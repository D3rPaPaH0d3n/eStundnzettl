import { useState, MutableRefObject } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import toast from "react-hot-toast";
import type { Entry, UserData, WorkCode, Attachment, BackupPayload } from '../types';
import { exportToSelectedFolder, attachBackupChecksum, verifyBackupIntegrity } from "../utils/storageBackup";
import { toLocalDateString } from "../utils";
import { filterValidEntries } from "../schemas/entry";
import { logger } from "../utils/logger";

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
interface UseExportProps {
  entries: Entry[];
  userData: UserData;
  workCodes: WorkCode[];
  attachments?: Attachment[];
  importEntries: (entries: Entry[]) => void;
  setUserData: (data: UserData) => void;
  importWorkCodes?: (codes: WorkCode[]) => void;
  exportPayloadRef: MutableRefObject<BackupPayload | null>;
}

export function useExport({ entries, userData, workCodes, attachments = [], importEntries, setUserData, importWorkCodes, exportPayloadRef }: UseExportProps) {
  const [showExportModal, setShowExportModal] = useState(false);

  const buildPayload = async () => {
    const payload = {
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
  const handleWebExport = async () => {
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
        } catch (shareError) {
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
      toast.error(`❌ Export Fehler: ${e.message}`, { id: toastId, duration: 5000 });
    }
  };

  // --- Main entry point ---
  const exportData = async () => {
    if (Capacitor.isNativePlatform()) {
      exportPayloadRef.current = await buildPayload();
      setShowExportModal(true);
    } else {
      await handleWebExport();
    }
  };

  // --- Capacitor: save to selected folder ---
  const handleExportToFolder = async () => {
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
  const handleExportShare = async () => {
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
      if (e.message?.includes("canceled") || e.message?.includes("cancelled")) {
        toast.dismiss(toastId);
      } else {
        toast.error(`❌ Export Fehler: ${e.message}`, { id: toastId, duration: 5000 });
      }
    }
  };

  // --- Import from JSON file ---
  const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB

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
          // Zod-basierte Validierung (src/schemas/entry.js)
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
      } catch (err: any) {
        toast.error(`Fehler: ${err.message || "Datei ungültig."}`);
      } finally {
        (event.target as HTMLInputElement).value = "";
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
