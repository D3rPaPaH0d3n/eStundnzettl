import React, { useEffect, useState, useCallback } from "react";
import { FileText, CheckCircle2, AlertTriangle, Loader, HardDrive, Server, Cloud } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../utils";
import { STORAGE_KEYS } from "../../hooks/constants";
import { isSQLiteActive } from "../../db/storageMode";
import { getSetting, setSetting } from "../../db/repositories/settingsRepo";
import { logger } from "../../utils/logger";
import {
  connectGoogleDrivePdf,
  disconnectGoogleDrivePdf,
  getGoogleDrivePdfStatus,
} from "../../utils/googleDrivePdfArchive";

const log = logger.scope("PdfArchiveSettings");

async function dualWrite(lsKey: string, sqlKey: string, value: string) {
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

const readBool = (key: string) => localStorage.getItem(key) === "true";

const formatLastRun = (dateStr: string | null | undefined) => {
  if (!dateStr) return "Noch nicht ausgefuehrt";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

interface Props {
  nextcloudEnabled: boolean;
  performRun: (opts: any) => Promise<any>;
  lastRun?: string | null;
  lastError?: string | null;
}

const PdfArchiveSettings: React.FC<Props> = ({ nextcloudEnabled, performRun, lastRun, lastError }) => {
  const [enabled, setEnabled] = useState(() => readBool(STORAGE_KEYS.PDF_ARCHIVE_ENABLED));
  const [localTarget, setLocalTarget] = useState(() => readBool(STORAGE_KEYS.PDF_ARCHIVE_LOCAL));
  const [nextcloudTarget, setNextcloudTarget] = useState(() => readBool(STORAGE_KEYS.PDF_ARCHIVE_NEXTCLOUD));
  const [gdriveTarget, setGdriveTarget] = useState(() => readBool(STORAGE_KEYS.PDF_ARCHIVE_GDRIVE));
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveEmail, setGdriveEmail] = useState("");
  const [gdriveBusy, setGdriveBusy] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // SQLite nachladen (analog zum bestehenden Muster)
  useEffect(() => {
    if (!isSQLiteActive()) return;
    let cancelled = false;
    (async () => {
      try {
        const [en, loc, nc, gd] = await Promise.all([
          getSetting("pdf_archive_enabled"),
          getSetting("pdf_archive_local"),
          getSetting("pdf_archive_nextcloud"),
          getSetting("pdf_archive_gdrive"),
        ]);
        if (cancelled) return;
        if (en != null) setEnabled(String(en) === "true");
        if (loc != null) setLocalTarget(String(loc) === "true");
        if (nc != null) setNextcloudTarget(String(nc) === "true");
        if (gd != null) setGdriveTarget(String(gd) === "true");
      } catch (e) {
        log.warn("SQLite-Read PDF archive settings fehlgeschlagen:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // GDrive-Archiv-Status laden (separat vom JSON-Backup-GDrive-Status)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getGoogleDrivePdfStatus();
        if (cancelled) return;
        setGdriveConnected(!!(status?.connected && status?.hasToken));
        setGdriveEmail((status?.accountEmail as string) || "");
      } catch (e) {
        log.warn("GDrive-PDF-Archiv Status laden fehlgeschlagen:", e);
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

  const handleGdriveConnect = useCallback(async () => {
    setGdriveBusy(true);
    try {
      const result = await connectGoogleDrivePdf();
      setGdriveConnected(true);
      setGdriveEmail((result as { email?: string })?.email || "");
      toast.success("Google Drive (PDF-Archiv) verbunden");
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || err);
      if (msg.includes("CANCELLED")) {
        toast("Verbindung abgebrochen", { icon: "ℹ️" });
      } else {
        toast.error(`Verbindung fehlgeschlagen: ${msg}`);
      }
    } finally {
      setGdriveBusy(false);
    }
  }, []);

  const handleGdriveDisconnect = useCallback(async () => {
    setGdriveBusy(true);
    try {
      await disconnectGoogleDrivePdf();
      setGdriveConnected(false);
      setGdriveEmail("");
      // Wenn der User trennt, deaktiviere auch den Ziel-Toggle
      if (gdriveTarget) {
        setGdriveTarget(false);
        await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_GDRIVE, "pdf_archive_gdrive", "false");
      }
      toast.success("Google Drive (PDF-Archiv) getrennt");
    } catch (err) {
      toast.error(`Trennen fehlgeschlagen: ${(err as Error)?.message || err}`);
    } finally {
      setGdriveBusy(false);
    }
  }, [gdriveTarget]);

  const toggleGdrive = useCallback(async () => {
    if (!gdriveConnected) {
      toast.error("Bitte zuerst mit Google Drive verbinden.");
      return;
    }
    const next = !gdriveTarget;
    setGdriveTarget(next);
    await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_GDRIVE, "pdf_archive_gdrive", String(next));
  }, [gdriveTarget, gdriveConnected]);

  const handleRunNow = useCallback(async () => {
    if (!enabled) {
      toast.error("PDF-Archiv ist deaktiviert.");
      return;
    }
    if (!localTarget && !nextcloudTarget && !gdriveTarget) {
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
      toast.error(`Fehler: ${(err as Error)?.message || err}`, { id: toastId });
    } finally {
      setIsRunning(false);
    }
  }, [enabled, localTarget, nextcloudTarget, gdriveTarget, performRun]);

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

          {/* Google Drive (drive.file, sichtbarer Ordner eStundnzettl Archiv) */}
          <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${gdriveTarget && gdriveConnected ? "bg-green-100 text-green-600" : "bg-zinc-200 text-zinc-400"}`}>
                <Cloud size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                    Google Drive
                  </span>
                  {gdriveConnected && (
                    <span className="flex items-center px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full">
                      Verbunden
                    </span>
                  )}
                </div>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {gdriveConnected
                    ? (gdriveEmail
                        ? `Ordner eStundnzettl Archiv · ${gdriveEmail}`
                        : "Ordner eStundnzettl Archiv")
                    : "Separater Zugriff vom JSON-Backup (drive.file-Scope)"}
                </span>
              </div>
            </div>
            {gdriveConnected ? (
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={gdriveTarget}
                    onChange={toggleGdrive}
                  />
                  <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-600 peer-checked:bg-indigo-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </label>
                <button
                  onClick={handleGdriveDisconnect}
                  disabled={gdriveBusy}
                  className="px-2 py-1 text-[10px] font-bold rounded border border-red-200 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 disabled:opacity-50"
                >
                  {gdriveBusy ? <Loader size={10} className="animate-spin" /> : "Trennen"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGdriveConnect}
                disabled={gdriveBusy}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                {gdriveBusy ? <Loader size={12} className="animate-spin" /> : <Cloud size={12} />}
                Verbinden
              </button>
            )}
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
