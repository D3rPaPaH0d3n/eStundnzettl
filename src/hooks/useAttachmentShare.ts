import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { MultiShare } from "../plugins/MultiSharePlugin";
import toast from "react-hot-toast";
import type { Attachment } from '../types';

const sanitizeFileName = (fileName: string = "datei"): string => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const ensureNativePath = (uri: string = ""): string => (uri.startsWith("file://") ? uri.replace("file://", "") : uri);

interface PdfFile {
  storagePath: string;
  mimeType?: string;
}

/**
 * useAttachmentShare — Teilt einen PDF-Report zusammen mit den
 * zugehörigen Datei-Anhängen in EINEM nativen Android-Share-Intent.
 *
 * Nutzt den eigenen `MultiShare`-Capacitor-Plugin (siehe
 * `src/plugins/MultiSharePlugin.ts`), weil `@capacitor/share` nur
 * einzelne URLs senden kann. Kopiert dafür erst alle Dateien (PDF +
 * Anhänge) in `Directory.Cache`, sanitisiert die Dateinamen und ruft
 * dann `MultiShare.shareMultiple` mit den Cache-URIs auf.
 *
 * @param readAttachmentFile — Callback der den Base64-Inhalt eines
 *   Attachments liefert (wird vom Aufrufer durchgereicht, typ. aus
 *   `useAttachments`)
 *
 * @returns
 * - `shareReportBundle({ pdfFile, attachments })` — teilt PDF +
 *   Anhänge als Multi-File-Intent. Bei Fehler: Toast und Exception
 *   wird geschluckt (kein Crash).
 */
export function useAttachmentShare({ readAttachmentFile }: { readAttachmentFile: (attachment: Attachment) => Promise<string> }) {
  const copyAttachmentToCache = useCallback(async (attachment: Attachment) => {
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

  const shareReportBundle = useCallback(async ({ pdfFile, attachments = [] }: { pdfFile: PdfFile; attachments?: Attachment[] }) => {
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
    } catch (error: unknown) {
      if ((error as Error)?.message?.includes("canceled") || (error as Error)?.message?.includes("cancelled")) {
        return;
      }
      throw error;
    }
  }, [copyAttachmentToCache]);

  return {
    shareReportBundle,
  };
}
