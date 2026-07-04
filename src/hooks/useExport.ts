import { useState } from "react";
import type { RefObject } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Entry, UserData, WorkCode, Attachment, BackupPayload, CalculationConfig } from '../types';
import { exportToSelectedFolder, composeBackupPayload } from "../utils/storageBackup";
import { toLocalDateString } from "../utils";
import { getIntlLocale } from "../utils/formatLocale";
import { logger } from "../utils/logger";

interface UseExportProps {
  entries: Entry[];
  userData: UserData;
  workCodes: WorkCode[];
  attachments?: Attachment[];
  attachmentLabels?: string[];
  exportPayloadRef: RefObject<BackupPayload | null>;
  calculationConfig?: CalculationConfig | null;
  locale?: string | null;
  theme?: string | null;
}

/**
 * useExport — Kapselt die Export-Logik für Backup-JSON-Dateien.
 *
 * Unterstützt zwei native Android-Export-Wege:
 * 1. **Ordner-Export** — Capacitor Filesystem schreibt in einen
 *    vom User via SAF ausgewählten Ordner
 * 2. **Native Share** — Capacitor Share API öffnet das native
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
 * - `exportData()` — baut den Payload und öffnet das Export-Modal
 * - `handleExportToFolder()` — schreibt in SAF-Ordner
 * - `handleExportShare()` — öffnet natives Share-Sheet
 */
export function useExport({ entries, userData, workCodes, attachments = [], attachmentLabels = [], exportPayloadRef, calculationConfig, locale, theme }: UseExportProps) {
  const { t } = useTranslation();
  const [showExportModal, setShowExportModal] = useState(false);

  const buildPayload = async (): Promise<BackupPayload> =>
    composeBackupPayload(
      {
        user: userData,
        entries,
        workCodes,
        attachments,
        attachmentLabels,
        calculationConfig,
        locale,
        theme,
      },
      "eStundnzettl Export"
    );

  // --- Main entry point ---
  const exportData = async () => {
    exportPayloadRef.current = await buildPayload();
    setShowExportModal(true);
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
