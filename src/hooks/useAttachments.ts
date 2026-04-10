import { useCallback, useEffect, useMemo, useState } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import type { Attachment } from '../types';
import { STORAGE_KEYS } from "./constants";
import { isSQLiteActive } from "../db/storageMode";
import { logger } from "../utils/logger";
import {
  getAllAttachments,
  insertAttachment,
  deleteAttachmentFromDb,
  deleteAttachmentsByEntryId,
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

// ─── localStorage Helpers (Dual-Write / Fallback) ────────────

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const persistJson = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// ─── File Helpers ────────────────────────────────────────────

const sanitizeFileName = (name: string = "dokument"): string => {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "dokument";
};

const getExtension = (fileName: string = ""): string => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
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
 * useAttachments — Welle 3: SQLite-primär mit Dual-Write auf localStorage.
 *
 * Identische API wie bisher. Intern:
 * - Initialer State aus localStorage (sofortige UI)
 * - SQLite-Daten nachladen wenn verfügbar
 * - Schreiboperationen: SQLite + localStorage (Dual-Write)
 */
/**
 * useAttachments — Verwaltet Datei-Anhänge (PDF, Bilder) zu Einträgen.
 *
 * Anhänge werden in zwei Schichten gespeichert:
 * - **Metadata** (id, entryId, label, fileName, mimeType, fileSize) →
 *   SQLite (`attachmentsRepo`) mit localStorage-Fallback
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
  // Sofort aus localStorage laden (schnelle UI, kein async-Warten)
  const [attachments, setAttachments] = useState<Attachment[]>(() => readJson<Attachment[]>(STORAGE_KEYS.ATTACHMENTS, []));
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>(() => readJson<string[]>(STORAGE_KEYS.ATTACHMENT_LABELS, []));

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

        // SQLite-Daten haben Vorrang (sind die Source of Truth)
        if (sqlAttachments.length > 0 || readJson(STORAGE_KEYS.ATTACHMENTS, []).length === 0) {
          setAttachments(sqlAttachments);
          // Dual-Write: localStorage aktualisieren
          persistJson(STORAGE_KEYS.ATTACHMENTS, sqlAttachments);
        }

        if (sqlLabels.length > 0 || readJson(STORAGE_KEYS.ATTACHMENT_LABELS, []).length === 0) {
          setLabelSuggestions(sqlLabels);
          persistJson(STORAGE_KEYS.ATTACHMENT_LABELS, sqlLabels);
        }
      } catch (err) {
        logger.error("[useAttachments] SQLite-Load fehlgeschlagen, behalte localStorage-Daten:", err);
      }
    };

    loadFromSQLite();
    return () => { cancelled = true; };
  }, []);

  // ─── Dual-Write: localStorage immer aktuell halten ─────────
  useEffect(() => {
    persistJson(STORAGE_KEYS.ATTACHMENTS, attachments);
  }, [attachments]);

  useEffect(() => {
    persistJson(STORAGE_KEYS.ATTACHMENT_LABELS, labelSuggestions);
  }, [labelSuggestions]);

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

    // SQLite (fire & forget, Dual-Write)
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

    setAttachments((prev) => [attachment, ...prev]);
    updateSuggestions(trimmedLabel);

    // SQLite-Write (fire & forget, localStorage hat die Daten bereits)
    if (isSQLiteActive()) {
      insertAttachment(attachment).catch((err) => {
        logger.error("[useAttachments] SQLite-Insert fehlgeschlagen:", err);
      });
    }

    return attachment;
  }, [updateSuggestions]);

  // ─── Remove Attachment ────────────────────────────────────

  const removeAttachment = useCallback(async (attachmentId: string) => {
    let removed: Attachment | null = null;

    setAttachments((prev) => {
      removed = prev.find((item) => item.id === attachmentId) || null;
      return prev.filter((item) => item.id !== attachmentId);
    });

    // SQLite löschen (fire & forget)
    if (isSQLiteActive()) {
      deleteAttachmentFromDb(attachmentId).catch((err) => {
        logger.error("[useAttachments] SQLite-Delete fehlgeschlagen:", err);
      });
    }

    if (removed && (removed as Attachment).storagePath) {
      try {
        ensureNative();
        await Filesystem.deleteFile({
          path: (removed as Attachment).storagePath,
          directory: Directory.Data,
        });
      } catch {
        // Datei evtl. schon weg — Metadaten trotzdem entfernt.
      }
    }
  }, []);

  // ─── Remove all Attachments for an Entry ──────────────────

  const removeAttachmentsForEntry = useCallback(async (entryId: number | string) => {
    const matching = attachments.filter((item) => item.entryId === entryId);

    // SQLite: Bulk-Delete per entryId (effizienter als einzeln)
    if (isSQLiteActive()) {
      deleteAttachmentsByEntryId(entryId).catch((err) => {
        logger.error("[useAttachments] SQLite bulk-delete fehlgeschlagen:", err);
      });
    }

    for (const item of matching) {
      await removeAttachment(item.id);
    }
  }, [attachments, removeAttachment]);

  // ─── Read Helpers (unverändert) ───────────────────────────

  const getAttachmentsForEntry = useCallback((entryId: number | string) => {
    return attachments
      .filter((item) => item.entryId === entryId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [attachments]);

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

  const readAttachmentFile = useCallback(async (attachment: Attachment) => {
    ensureNative();
    const result = await Filesystem.readFile({
      path: attachment.storagePath,
      directory: Directory.Data,
    });
    return result.data;
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
