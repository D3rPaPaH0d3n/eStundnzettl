import { useCallback, useEffect, useMemo, useState } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import type { Attachment } from '../types';
import { isSQLiteActive } from "../db/storageMode";
import { logger } from "../utils/logger";
import {
  getAllAttachments,
  insertAttachment,
  deleteAttachmentFromDb,
  getAllLabelSuggestions,
  pushLabelSuggestion,
} from "../db/repositories/attachmentsRepo";

const ATTACHMENTS_DIR = "attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ─── File Helpers ────────────────────────────────────────────

const sanitizeFileName = (name: string = "dokument"): string => {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "dokument";
};

const getExtension = (fileName: string = ""): string => {
  const parts = fileName.split(".");
  if (parts.length <= 1) return "bin";
  const ext = parts.pop();
  return ext ? ext.toLowerCase() : "bin";
};

const ensureNative = (): void => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Dokumente werden aktuell nur in der Android-App unterstützt.");
  }
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Datei konnte nicht gelesen werden."));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });

/**
 * useAttachments — SQLite ist die Source of Truth fuer Attachment-Metadaten.
 *
 * Identische API wie bisher. Intern:
 * - Initialer leerer State
 * - SQLite-Daten nachladen wenn verfügbar
 * - Schreiboperationen: SQLite + State
 */
/**
 * useAttachments — Verwaltet Datei-Anhänge (PDF, Bilder) zu Einträgen.
 *
 * Anhänge werden in zwei Schichten gespeichert:
 * - **Metadata** (id, entryId, label, fileName, mimeType, fileSize) →
 *   SQLite (`attachmentsRepo`)
 * - **Dateiinhalte** → Capacitor Filesystem unter
 *   `Directory.Data/attachments/` als Base64
 *
 * Das Label wird zusätzlich als "recently used"-Vorschlag gespeichert
 * (`attachment_labels`), damit beim nächsten Anhang die zuletzt
 * verwendeten Labels angeboten werden können.
 *
 * ### Validierung
 * - Max. Dateigröße: 10 MB (`MAX_FILE_SIZE`)
 * - Erlaubte MIME-Types: PDF, JPEG, PNG, WebP
 *
 * ### Return
 * - `attachments` — alle Anhänge der App (sortiert nach createdAt desc)
 * - `labelSuggestions` — zuletzt verwendete Labels (MRU)
 * - `attachmentStats` — `{ total, labels }` (memoisiert)
 * - `addAttachment(entryId, label, file)` — legt neuen Anhang an
 * - `removeAttachment(attachmentId)` — löscht einen Anhang (inkl. Datei)
 * - `removeAttachmentsForEntry(entryId)` — löscht alle Anhänge zu einem
 *   Eintrag (wird beim Entry-Delete automatisch gerufen)
 * - `getAttachmentsForEntry(entryId)` — Anhänge eines Eintrags
 * - `getAttachmentsForEntries(entryIds)` — Bulk-Version
 * - `getLabelSuggestions()` — aktuelle MRU-Labels
 * - `readAttachmentFile(attachment)` — liefert Base64-Inhalt (für Share
 *   oder PDF-Report-Bundling)
 * - `formatFileSize(bytes)` — Helper für UI ("1,2 MB")
 *
 * @remarks
 * Der Hook nimmt keine Props entgegen — er ist die zentrale
 * Datenquelle für Anhänge und wird einmal in `App.tsx` instanziiert.
 */
export function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([]);

  // ─── SQLite nachladen beim Start ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadFromSQLite = async () => {
      if (!isSQLiteActive()) return;

      try {
        const [sqlAttachments, sqlLabels] = await Promise.all([
          getAllAttachments(),
          getAllLabelSuggestions(),
        ]);

        if (cancelled) return;

        setAttachments(sqlAttachments);
        setLabelSuggestions(sqlLabels);
      } catch (err) {
        logger.error("[useAttachments] SQLite-Load fehlgeschlagen:", err);
      }
    };

    loadFromSQLite();
    return () => { cancelled = true; };
  }, []);

  // ─── Label-Suggestion Update (SQLite + State) ─────────────

  const updateSuggestions = useCallback((label: string) => {
    const trimmed = (label || "").trim();
    if (!trimmed) return;

    // State updaten (MRU)
    setLabelSuggestions((prev) => {
      const lower = trimmed.toLowerCase();
      const next = [trimmed, ...prev.filter((item) => item.toLowerCase() !== lower)];
      return next.slice(0, 20);
    });

    // SQLite (fire & forget)
    if (isSQLiteActive()) {
      pushLabelSuggestion(trimmed).catch((err) => {
        logger.error("[useAttachments] SQLite label-push fehlgeschlagen:", err);
      });
    }
  }, []);

  // ─── Add Attachment ───────────────────────────────────────

  const addAttachment = useCallback(async ({ entryId, file, label }: { entryId: number | string; file: File; label: string }) => {
    ensureNative();

    if (!entryId) throw new Error("Eintrag fehlt.");
    if (!file) throw new Error("Keine Datei ausgewählt.");

    const trimmedLabel = (label || "").trim();
    if (!trimmedLabel) throw new Error("Bitte eine Bezeichnung eingeben.");

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Datei ist größer als 10 MB.");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error("Nur PDF, JPG, PNG oder WEBP sind erlaubt.");
    }

    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const extension = getExtension(file.name);
    const fileName = sanitizeFileName(file.name);
    const storagePath = `${ATTACHMENTS_DIR}/${id}.${extension}`;
    const base64 = await fileToBase64(file);

    await Filesystem.writeFile({
      path: storagePath,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });

    const attachment = {
      id,
      entryId,
      label: trimmedLabel,
      fileName,
      mimeType: file.type,
      storagePath,
      fileSize: file.size,
      createdAt: new Date().toISOString(),
    };

    // SQLite ist Source of Truth für Metadaten: erst persistieren,
    // dann den UI-State aktualisieren. Wenn der DB-Write fehlschlägt,
    // räumen wir die bereits geschriebene Datei wieder weg.
    if (isSQLiteActive()) {
      try {
        await insertAttachment(attachment);
      } catch (err) {
        try {
          await Filesystem.deleteFile({
            path: storagePath,
            directory: Directory.Data,
          });
        } catch { /* best effort cleanup */ }
        logger.error("[useAttachments] SQLite-Insert fehlgeschlagen:", err);
        throw new Error("Anhang konnte nicht gespeichert werden.");
      }
    }

    setAttachments((prev) => [attachment, ...prev]);
    updateSuggestions(trimmedLabel);

    return attachment;
  }, [updateSuggestions]);

  // ─── Remove Attachment ────────────────────────────────────

  const removeAttachment = useCallback(async (attachmentId: string) => {
    const removed = attachments.find((item) => item.id === attachmentId) || null;
    if (!removed) return;

    // SQLite zuerst löschen; wenn das fehlschlägt, bleiben State und Datei konsistent.
    if (isSQLiteActive()) {
      try {
        await deleteAttachmentFromDb(attachmentId);
      } catch (err) {
        logger.error("[useAttachments] SQLite-Delete fehlgeschlagen:", err);
        throw new Error("Anhang konnte nicht gelöscht werden.");
      }
    }

    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));

    if (removed.storagePath) {
      try {
        ensureNative();
        await Filesystem.deleteFile({
          path: removed.storagePath,
          directory: Directory.Data,
        });
      } catch {
        // Datei evtl. schon weg — Metadaten trotzdem entfernt.
      }
    }
  }, [attachments]);

  // ─── Remove all Attachments for an Entry ──────────────────

  const removeAttachmentsForEntry = useCallback(async (entryId: number | string) => {
    const matching = attachments.filter((item) => item.entryId === entryId);

    for (const item of matching) {
      await removeAttachment(item.id);
    }
  }, [attachments, removeAttachment]);

  // ─── Read Helpers (unverändert) ───────────────────────────

  const attachmentsByEntryId = useMemo(() => {
    const grouped = new Map<number | string, Attachment[]>();

    attachments.forEach((item) => {
      const existing = grouped.get(item.entryId);
      if (existing) existing.push(item);
      else grouped.set(item.entryId, [item]);
    });

    grouped.forEach((items) => {
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return grouped;
  }, [attachments]);

  const attachmentCountByEntryId = useMemo(() => {
    const counts = new Map<number | string, number>();
    attachmentsByEntryId.forEach((items, entryId) => {
      counts.set(entryId, items.length);
    });
    return counts;
  }, [attachmentsByEntryId]);

  const getAttachmentsForEntry = useCallback((entryId: number | string) => {
    return attachmentsByEntryId.get(entryId) || [];
  }, [attachmentsByEntryId]);

  const getAttachmentsForEntries = useCallback((entryIds: (number | string)[]) => {
    const idSet = new Set(entryIds);
    return attachments.filter((item) => idSet.has(item.entryId));
  }, [attachments]);

  const getLabelSuggestions = useCallback((query: string = "") => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return labelSuggestions.slice(0, 6);
    return labelSuggestions
      .filter((item) => item.toLowerCase().includes(trimmed))
      .slice(0, 6);
  }, [labelSuggestions]);

  const readAttachmentFile = useCallback(async (attachment: Attachment): Promise<string> => {
    ensureNative();
    const result = await Filesystem.readFile({
      path: attachment.storagePath,
      directory: Directory.Data,
    });
    // Capacitor docs: native returns a base64 string; Blob only happens on web,
    // and ensureNative() above already excludes the web platform.
    return result.data as string;
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const attachmentStats = useMemo(() => ({
    total: attachments.length,
    labels: labelSuggestions.length,
  }), [attachments.length, labelSuggestions.length]);

  return {
    attachments,
    labelSuggestions,
    attachmentStats,
    attachmentsByEntryId,
    attachmentCountByEntryId,
    addAttachment,
    removeAttachment,
    removeAttachmentsForEntry,
    getAttachmentsForEntry,
    getAttachmentsForEntries,
    getLabelSuggestions,
    readAttachmentFile,
    formatFileSize,
  };
}
