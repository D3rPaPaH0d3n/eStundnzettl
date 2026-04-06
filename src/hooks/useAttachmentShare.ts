import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { MultiShare } from "../plugins/MultiSharePlugin";
import toast from "react-hot-toast";

const sanitizeFileName = (fileName = "datei") => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const ensureNativePath = (uri = "") => (uri.startsWith("file://") ? uri.replace("file://", "") : uri);

/**
 * useAttachmentShare — teilt PDF + Anhänge in EINEM nativen Android-Share-Intent.
 */
export function useAttachmentShare({ readAttachmentFile }) {
  const copyAttachmentToCache = useCallback(async (attachment) => {
    const base64Data = await readAttachmentFile(attachment);
    const safeName = sanitizeFileName(attachment.fileName || attachment.label || `anhang_${attachment.id || Date.now()}`);
    const cachePath = `shares/${attachment.id || Date.now()}_${safeName}`;

    await Filesystem.writeFile({
      path: cachePath,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    const uriResult = await Filesystem.getUri({
      path: cachePath,
      directory: Directory.Cache,
    });

    return ensureNativePath(uriResult.uri);
  }, [readAttachmentFile]);

  const shareReportBundle = useCallback(async ({ pdfFile, attachments = [] }) => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error("Multi-Share wird nur in der Android-App unterstützt.");
    }

    if (!pdfFile?.storagePath) {
      throw new Error("PDF fehlt.");
    }

    try {
      const pdfUri = await Filesystem.getUri({
        path: pdfFile.storagePath,
        directory: Directory.Cache,
      });

      const files = [{
        path: ensureNativePath(pdfUri.uri),
        mimeType: pdfFile.mimeType || "application/pdf",
      }];

      for (const attachment of attachments) {
        const attachmentPath = await copyAttachmentToCache(attachment);
        files.push({
          path: attachmentPath,
          mimeType: attachment.mimeType || "application/octet-stream",
        });
      }

      const suffix = attachments.length > 0
        ? ` + ${attachments.length} Dokument${attachments.length > 1 ? "e" : ""}`
        : "";

      await MultiShare.shareMultiple({
        files,
        chooserTitle: `Stundenzettel${suffix}`,
      });

      toast.success(`${files.length} Datei${files.length > 1 ? "en" : ""} zum Teilen bereit`);
    } catch (error) {
      if (error?.message?.includes("canceled") || error?.message?.includes("cancelled")) {
        return;
      }
      throw error;
    }
  }, [copyAttachmentToCache]);

  return {
    shareReportBundle,
  };
}
