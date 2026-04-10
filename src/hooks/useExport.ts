import { useState, MutableRefObject } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import toast from "react-hot-toast";
import type { Entry, UserData, WorkCode, Attachment, BackupPayload } from '../types';
import { exportToSelectedFolder, attachBackupChecksum } from "../utils/storageBackup";
import { toLocalDateString } from "../utils";
import { logger } from "../utils/logger";

/**
 * useExport — kapselt die Export-Logik (Web-Download, Ordner-Export,
 * native Share). Der Import wurde in useImport extrahiert.
 */
interface UseExportProps {
  entries: Entry[];
  userData: UserData;
  workCodes: WorkCode[];
  attachments?: Attachment[];
  exportPayloadRef: MutableRefObject<BackupPayload | null>;
}

export function useExport({ entries, userData, workCodes, attachments = [], exportPayloadRef }: UseExportProps) {
  const [showExportModal, setShowExportModal] = useState(false);

  const buildPayload = async () => {
    const payload = {
      user: userData,
      entries,
      workCodes,
      attachments,
      attachmentLabels: [],
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
        } catch (shareError: unknown) {
          if ((shareError as DOMException).name === "AbortError") {
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
      toast.error(`❌ Export Fehler: ${(e as Error).message}`, { id: toastId, duration: 5000 });
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
      if ((e as Error).message?.includes("canceled") || (e as Error).message?.includes("cancelled")) {
        toast.dismiss(toastId);
      } else {
        toast.error(`❌ Export Fehler: ${(e as Error).message}`, { id: toastId, duration: 5000 });
      }
    }
  };

  return {
    showExportModal,
    setShowExportModal,
    exportData,
    handleExportToFolder,
    handleExportShare,
  };
}
