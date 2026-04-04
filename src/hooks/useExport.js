import { useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import toast from "react-hot-toast";
import { exportToSelectedFolder } from "../utils/storageBackup";
import { toLocalDateString } from "../utils";

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
export function useExport({ entries, userData, workCodes, attachments = [], importEntries, setUserData, importWorkCodes, exportPayloadRef }) {
  const [showExportModal, setShowExportModal] = useState(false);

  const buildPayload = () => ({
    user: userData,
    entries,
    workCodes,
    attachments,
    exportedAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // --- Web fallback: download as file ---
  const handleWebExport = async () => {
    const toastId = toast.loading("Exportiere Daten...");
    try {
      const dateStr = toLocalDateString(new Date());
      const fileName = `estundnzettl_${dateStr}.json`;
      const payload = buildPayload();
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
      exportPayloadRef.current = buildPayload();
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
      console.error("Export to folder error:", e);
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
      console.error("Share error:", e);
      if (e.message?.includes("canceled") || e.message?.includes("cancelled")) {
        toast.dismiss(toastId);
      } else {
        toast.error(`❌ Export Fehler: ${e.message}`, { id: toastId, duration: 5000 });
      }
    }
  };

  // --- Import from JSON file ---
  const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}:\d{2}$/;

  const validateEntry = (e) => {
    if (!e || typeof e !== "object") return false;
    if (e.id == null) return false;
    if (typeof e.date !== "string" || !DATE_RE.test(e.date)) return false;
    if (e.start != null && typeof e.start === "string" && !TIME_RE.test(e.start)) return false;
    if (e.end != null && typeof e.end === "string" && !TIME_RE.test(e.end)) return false;
    return true;
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_SIZE) {
      toast.error("Datei zu groß (max. 10 MB)");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        if (d && typeof d !== "object") throw new Error("Ungültiges Format");

        if (d.entries) {
          if (!Array.isArray(d.entries)) throw new Error("entries ist kein Array");
          const valid = d.entries.filter(validateEntry);
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
      } catch (err) {
        toast.error(`Fehler: ${err.message || "Datei ungültig."}`);
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
