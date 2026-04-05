import React, { useEffect, useState, useCallback } from "react";
import { FileText, CheckCircle2, AlertTriangle, Loader, HardDrive, Server } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../utils";
import { STORAGE_KEYS } from "../../hooks/constants";
import { isSQLiteActive } from "../../db/storageMode";
import { getSetting, setSetting } from "../../db/repositories/settingsRepo";
import { logger } from "../../utils/logger";

const log = logger.scope("PdfArchiveSettings");

async function dualWrite(lsKey, sqlKey, value) {
  const prev = localStorage.getItem(lsKey);
  localStorage.setItem(lsKey, String(value));
  if (isSQLiteActive()) {
    try {
      await setSetting(sqlKey, value);
    } catch (e) {
      if (prev !== null) localStorage.setItem(lsKey, prev);
      else localStorage.removeItem(lsKey);
      log.warn(`SQLite-Write "${sqlKey}" fehlgeschlagen:`, e);
    }
  }
}

const readBool = (key) => localStorage.getItem(key) === "true";

const formatLastRun = (dateStr) => {
  if (!dateStr) return "Noch nicht ausgefuehrt";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const PdfArchiveSettings = ({ nextcloudEnabled, performRun, lastRun, lastError }) => {
  const [enabled, setEnabled] = useState(() => readBool(STORAGE_KEYS.PDF_ARCHIVE_ENABLED));
  const [localTarget, setLocalTarget] = useState(() => readBool(STORAGE_KEYS.PDF_ARCHIVE_LOCAL));
  const [nextcloudTarget, setNextcloudTarget] = useState(() => readBool(STORAGE_KEYS.PDF_ARCHIVE_NEXTCLOUD));
  const [isRunning, setIsRunning] = useState(false);

  // SQLite nachladen (analog zum bestehenden Muster)
  useEffect(() => {
    if (!isSQLiteActive()) return;
    let cancelled = false;
    (async () => {
      try {
        const [en, loc, nc] = await Promise.all([
          getSetting("pdf_archive_enabled"),
          getSetting("pdf_archive_local"),
          getSetting("pdf_archive_nextcloud"),
        ]);
        if (cancelled) return;
        if (en != null) setEnabled(String(en) === "true");
        if (loc != null) setLocalTarget(String(loc) === "true");
        if (nc != null) setNextcloudTarget(String(nc) === "true");
      } catch (e) {
        log.warn("SQLite-Read PDF archive settings fehlgeschlagen:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleEnabled = useCallback(async () => {
    const next = !enabled;
    setEnabled(next);
    await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_ENABLED, "pdf_archive_enabled", String(next));
    // Default: Lokal auto-aktivieren, damit beim ersten Einschalten gleich etwas passiert
    if (next && !localTarget && !nextcloudTarget) {
      setLocalTarget(true);
      await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_LOCAL, "pdf_archive_local", "true");
    }
  }, [enabled, localTarget, nextcloudTarget]);

  const toggleLocal = useCallback(async () => {
    const next = !localTarget;
    setLocalTarget(next);
    await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_LOCAL, "pdf_archive_local", String(next));
  }, [localTarget]);

  const toggleNextcloud = useCallback(async () => {
    if (!nextcloudEnabled) {
      toast.error("Nextcloud muss zuerst verbunden sein (Karte 'Backup & Export').");
      return;
    }
    const next = !nextcloudTarget;
    setNextcloudTarget(next);
    await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_NEXTCLOUD, "pdf_archive_nextcloud", String(next));
  }, [nextcloudTarget, nextcloudEnabled]);

  const handleRunNow = useCallback(async () => {
    if (!enabled) {
      toast.error("PDF-Archiv ist deaktiviert.");
      return;
    }
    if (!localTarget && !nextcloudTarget) {
      toast.error("Bitte mindestens ein Ziel auswaehlen.");
      return;
    }
    setIsRunning(true);
    const toastId = toast.loading("Erzeuge Monats-PDF ...");
    try {
      const res = await performRun({ source: "manual", force: true });
      if (res?.ok) {
        const anyUpload = res.anyRealUpload;
        const anyFail = res.anyFailure;
        if (anyFail) {
          toast.error("Teilweise fehlgeschlagen — siehe Details unten", { id: toastId });
        } else if (anyUpload) {
          toast.success("PDF-Archiv aktualisiert", { id: toastId });
        } else {
          toast.success("Nichts zu tun — Daten sind aktuell", { id: toastId, icon: "✓" });
        }
      } else {
        toast.error(`Nicht ausgefuehrt: ${res?.reason || res?.error || "unbekannt"}`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Fehler: ${err?.message || err}`, { id: toastId });
    } finally {
      setIsRunning(false);
    }
  }, [enabled, localTarget, nextcloudTarget, performRun]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base text-zinc-800 dark:text-white">
              Automatisches PDF-Archiv
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Taeglich ein Monats-PDF zur gesetzlich geforderten Langzeit-Aufbewahrung
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            onChange={toggleEnabled}
          />
          <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-indigo-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>

      {enabled && (
        <div className="space-y-3">
          {/* Lokal */}
          <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${localTarget ? "bg-green-100 text-green-600" : "bg-zinc-200 text-zinc-400"}`}>
                <HardDrive size={18} />
              </div>
              <div>
                <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                  Lokaler Ordner
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  Dokumente/eStundnzettl/Archiv/
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={localTarget} onChange={toggleLocal} />
              <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-600 peer-checked:bg-indigo-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          {/* Nextcloud */}
          <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${nextcloudTarget ? "bg-green-100 text-green-600" : "bg-zinc-200 text-zinc-400"}`}>
                <Server size={18} />
              </div>
              <div>
                <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                  Nextcloud
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {nextcloudEnabled ? "/eStundnzettl/Archiv/" : "Erst Nextcloud verbinden"}
                </span>
              </div>
            </div>
            <label className={`relative inline-flex items-center ${nextcloudEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
              <input
                type="checkbox"
                className="sr-only peer"
                checked={nextcloudTarget}
                onChange={toggleNextcloud}
                disabled={!nextcloudEnabled}
              />
              <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-600 peer-checked:bg-indigo-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          {/* Google Drive — Platzhalter fuer Iteration 2 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-400">
                <FileText size={18} />
              </div>
              <div>
                <span className="block font-bold text-sm text-zinc-500 dark:text-zinc-400">
                  Google Drive
                </span>
                <span className="block text-xs text-zinc-400">
                  Folgt in einem separaten Update (isoliert getestet)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">bald</span>
          </div>

          {/* Info-Zeile */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-500" />
                <span>Letzter Lauf: {formatLastRun(lastRun)}</span>
              </div>
              {lastError && (
                <div className="flex items-start gap-1 mt-1 text-red-500">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span className="break-all">{lastError}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRunNow}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isRunning ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}
              Jetzt ausfuehren
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PdfArchiveSettings;
