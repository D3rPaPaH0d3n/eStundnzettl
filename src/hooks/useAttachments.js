/**
 * useAttachments.js — Hook für Attachments mit SQLite-Persistenz
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { STORAGE_KEYS } from "./constants";
import { getDb } from "../db/database";
import { setStorageMode } from "../db/storageMode";
import {
  getAllAttachments,
  bulkUpsertAttachments,
  upsertAttachment,
  deleteAttachment as dbDeleteAttachment,
} from "../db/repositories/attachmentsRepo";
import {
  getAllLabelSuggestions,
  upsertLabelSuggestion,
  bulkUpsertLabelSuggestions,
} from "../db/repositories/labelSuggestionsRepo";

const ATTACHMENTS_DIR = "attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ─── Migration ───
const ATTACHMENTS_MIGRATION_FLAG = "estundnzettl_attachments_migrated";

function isAttachmentsMigrationDone() {
  return localStorage.getItem(ATTACHMENTS_MIGRATION_FLAG) === "true";
}

async function migrateAttachmentsToSQLite() {
  if (isAttachmentsMigrationDone()) return;

  try {
    // Attachments
    const storedAtts = localStorage.getItem(STORAGE_KEYS.ATTACHMENTS);
    if (storedAtts) {
      const attachments = JSON.parse(storedAtts);
      if (Array.isArray(attachments) && attachments.length > 0) {
        await bulkUpsertAttachments(attachments);
      }
    }

    // Label Suggestions
    const storedLabels = localStorage.getItem(STORAGE_KEYS.ATTACHMENT_LABELS);
    if (storedLabels) {
      const labels = JSON.parse(storedLabels);
      if (Array.isArray(labels) && labels.length > 0) {
        await bulkUpsertLabelSuggestions(labels);
      }
    }

    localStorage.setItem(ATTACHMENTS_MIGRATION_FLAG, "true");
    console.info("[useAttachments] Migration nach SQLite abgeschlossen");
  } catch (err) {
    console.error("[useAttachments] Migration fehlgeschlagen:", err);
  }
}

// ─── Helpers ─────────────────────────────────────────────

const readJsonFallback = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const getExtension = (fileName = "") => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "bin";
};

const ensureNative = () => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Dokumente werden aktuell nur in der Android-App unterstützt.");
  }
};

const fileToBase64 = (file) =>
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

export function useAttachments() {
  const [attachments, setAttachments] = useState([]);
  const [labelSuggestions, setLabelSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Initial Load ───
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();

        if (!db) {
          // Web/Dev → nur localStorage
          setStorageMode("localStorage");
          if (!cancelled) {
            setAttachments(readJsonFallback(STORAGE_KEYS.ATTACHMENTS, []));
            setLabelSuggestions(readJsonFallback(STORAGE_KEYS.ATTACHMENT_LABELS, []));
          }
        } else {
          // SQLite
          setStorageMode("sqlite");
          await migrateAttachmentsToSQLite();

          if (!cancelled) {
            try {
              const [dbAttachments, dbLabels] = await Promise.all([
                getAllAttachments(),
                getAllLabelSuggestions(),
              ]);
              setAttachments(dbAttachments);
              setLabelSuggestions(dbLabels);
            } catch {
              // Fallback to localStorage
              setAttachments(readJsonFallback(STORAGE_KEYS.ATTACHMENTS, []));
              setLabelSuggestions(readJsonFallback(STORAGE_KEYS.ATTACHMENT_LABELS, []));
            }
          }
        }
      } catch (err) {
        console.error("[useAttachments] Init fehlgeschlagen:", err);
        setAttachments(readJsonFallback(STORAGE_KEYS.ATTACHMENTS, []));
        setLabelSuggestions(readJsonFallback(STORAGE_KEYS.ATTACHMENT_LABELS, []));
      }

      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // ─── Persist Helpers ───
  const persistAttachments = useCallback((atts) => {
    localStorage.setItem(STORAGE_KEYS.ATTACHMENTS, JSON.stringify(atts));
    const db = getDb();
    if (db) {
      bulkUpsertAttachments(atts).catch(console.error);
    }
  }, []);

  const persistLabelSuggestions = useCallback((labels) => {
    localStorage.setItem(STORAGE_KEYS.ATTACHMENT_LABELS, JSON.stringify(labels));
    const db = getDb();
    if (db) {
      bulkUpsertLabelSuggestions(labels).catch(console.error);
    }
  }, []);

  const updateSuggestions = useCallback((label) => {
    const trimmed = (label || "").trim();
    if (!trimmed) return;

    setLabelSuggestions((prev) => {
      const lower = trimmed.toLowerCase();
      const next = [trimmed, ...prev.filter((item) => item.toLowerCase() !== lower)];
      const result = next.slice(0, 20);
      persistLabelSuggestions(result);
      return result;
    });

    // SQLite upsert
    const db = getDb();
    if (db) {
      upsertLabelSuggestion(trimmed).catch(console.error);
    }
  }, [persistLabelSuggestions]);

  const addAttachment = useCallback(async ({ entryId, file, label }) => {
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
      type: "file",
      uri: storagePath,
      thumbnail: null,
      createdAt: new Date().toISOString(),
    };

    setAttachments((prev) => {
      const next = [attachment, ...prev];
      persistAttachments(next);
      return next;
    });
    updateSuggestions(trimmedLabel);

    // SQLite
    const db = await getDb();
    if (db) {
      await upsertAttachment(attachment).catch(console.error);
    }

    return attachment;
  }, [persistAttachments, updateSuggestions]);

  const removeAttachment = useCallback(async (attachmentId) => {
    let removed = null;

    setAttachments((prev) => {
      removed = prev.find((item) => item.id === attachmentId) || null;
      const next = prev.filter((item) => item.id !== attachmentId);
      persistAttachments(next);
      return next;
    });

    if (removed?.uri) {
      try {
        ensureNative();
        await Filesystem.deleteFile({
          path: removed.uri,
          directory: Directory.Data,
        });
      } catch {
        // Datei evtl. schon weg
      }
    }

    // SQLite
    const db = await getDb();
    if (db) {
      await dbDeleteAttachment(attachmentId).catch(console.error);
    }
  }, [persistAttachments]);

  const removeAttachmentsForEntry = useCallback(async (entryId) => {
    const matching = attachments.filter((item) => item.entryId === entryId);
    for (const item of matching) {
      await removeAttachment(item.id);
    }
  }, [attachments, removeAttachment]);

  const getAttachmentsForEntry = useCallback((entryId) => {
    return attachments
      .filter((item) => item.entryId === entryId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [attachments]);

  const getAttachmentsForEntries = useCallback((entryIds) => {
    const idSet = new Set(entryIds);
    return attachments.filter((item) => idSet.has(item.entryId));
  }, [attachments]);

  const getLabelSuggestions = useCallback((query = "") => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return labelSuggestions.slice(0, 6);
    return labelSuggestions
      .filter((item) => item.toLowerCase().includes(trimmed))
      .slice(0, 6);
  }, [labelSuggestions]);

  const readAttachmentFile = useCallback(async (attachment) => {
    ensureNative();
    const result = await Filesystem.readFile({
      path: attachment.uri,
      directory: Directory.Data,
    });
    return result.data;
  }, []);

  const formatFileSize = useCallback((bytes) => {
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
    isLoading,
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
