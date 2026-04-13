import { useState, MutableRefObject } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Entry, UserData, WorkCode, Attachment, BackupPayload, CalculationConfig } from '../types';
import { exportToSelectedFolder, attachBackupChecksum } from "../utils/storageBackup";
import { toLocalDateString } from "../utils";
import { getIntlLocale } from "../utils/formatLocale";
import { logger } from "../utils/logger";

interface UseExportProps {
  entries: Entry[];
  userData: UserData;
  workCodes: WorkCode[];
  attachments?: Attachment[];
  exportPayloadRef: MutableRefObject<BackupPayload | null>;
  calculationConfig?: CalculationConfig | null;
}

/**
 * useExport — Kapselt die Export-Logik für Backup-JSON-Dateien.
 *
 * Unterstützt drei Export-Wege:
 * 1. **Web-Download** — Browser blob download (für PWA/Dev)
 * 2. **Ordner-Export** — Capacitor Filesystem schreibt in einen
 *    vom User via SAF ausgewählten Ordner (für Android)
 * 3. **Native Share** — Capacitor Share API öffnet das native
 *    Share-Sheet mit der temporären Cache-Datei
 *
 * Der Payload wird in `buildPayload()` zusammengestellt
 * (userData + entries + workCodes + attachments + checksum) und
 * im übergebenen Ref `exportPayloadRef` zwischengespeichert, damit
 * ExportModal ohne Re-Render darauf zugreifen kann.
 *
 * Der Import wurde in {@link useImport} extrahiert.
 *
 * @returns
 * - `showExportModal` / `setShowExportModal` — Modal-Sichtbarkeit
 * - `exportData()` — trigger für Export-Flow (Web oder Modal öffnen)
 * - `handleExportToFolder()` — schreibt in SAF-Ordner
 * - `handleExportShare()` — öffnet natives Share-Sheet
 */
export function useExport({ entries, userData, workCodes, attachments = [], exportPayloadRef, calculationConfig }: UseExportProps) {
  const { t } = useTranslation();
  const [showExportModal, setShowExportModal] = useState(false);

  const buildPayload = async () => {
    const payload: Record<string, unknown> = {
      user: userData,
      entries,
      workCodes,
      attachments,
      attachmentLabels: [],
      calculationConfig: calculationConfig ?? null,
      exportedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    await attachBackupChecksum(payload);
    return payload;
  };

  // --- Web fallback: download as file ---
  const handleWebExport = async () => {
    const toastId = toast.loading(t("toasts.export.exporting"));
    try {
      const dateStr = toLocalDateString(new Date());
      const fileName = `estundnzettl_${dateStr}.json`;
      const payload = await buildPayload();
      const json = JSON.stringify(payload, null, 2);

      const file = new File([json], fileName, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "eStundnzettl Backup", text: "Backup meiner Stunden" });
          toast.success(t("toasts.export.success"), { id: toastId });
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
      toast.success(t("toasts.export.downloadStarted"), { id: toastId });
    } catch (e) {
      toast.error(t("toasts.export.error", { message: (e as Error).message }), { id: toastId, duration: 5000 });
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
    const toastId = toast.loading(t("toasts.export.exportingFolder"));

    try {
      const now = new Date();
      const dateStr = toLocalDateString(now);
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");
      const fileName = `estundnzettl_${dateStr}_${timeStr}.json`;
      const success = await exportToSelectedFolder(fileName, exportPayloadRef.current);

      if (success) {
        toast.success(t("toasts.export.folderSuccess"), { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (e) {
      logger.error("Export to folder error:", e);
      toast.error(t("toasts.export.folderCancelled"), { id: toastId });
    }
  };

  // --- Capacitor: native share sheet ---
  const handleExportShare = async () => {
    setShowExportModal(false);
    const toastId = toast.loading(t("toasts.export.preparing"));

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
        title: t("toasts.export.shareTitle"),
        text: t("toasts.export.shareText", { date: new Date().toLocaleDateString(getIntlLocale()) }),
        url: uriResult.uri,
        dialogTitle: t("toasts.export.shareDialogTitle"),
      });

      toast.success(t("toasts.export.ready"), { id: toastId });
    } catch (e) {
      logger.error("Share error:", e);
      if ((e as Error).message?.includes("canceled") || (e as Error).message?.includes("cancelled")) {
        toast.dismiss(toastId);
      } else {
        toast.error(t("toasts.export.error", { message: (e as Error).message }), { id: toastId, duration: 5000 });
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
