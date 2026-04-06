import React, { useEffect, useState, useCallback } from "react";
import { FileText, CheckCircle2, AlertTriangle, Loader, HardDrive, Cloud } from "lucide-react";
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

async function dualWrite(lsKey: string, sqlKey: string, value: any) {
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

interface PdfArchiveSettingsProps {
  lastRun: string | null;
  lastError: string | null;
  performRun: () => void;
}

const PdfArchiveSettings: React.FC<PdfArchiveSettingsProps> = ({
  lastRun,
  lastError,
  performRun,
}) => {
  const [pdfArchiveEnabled, setPdfArchiveEnabled] = useState(false);
  const [pdfArchiveTarget, setPdfArchiveTarget] = useState<"local" | "google">("local");
  const [isLoading, setIsLoading] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const enabled = localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_ENABLED) === "true";
      const target = localStorage.getItem(STORAGE_KEYS.PDF_ARCHIVE_TARGET) as "local" | "google" || "local";
      
      if (isSQLiteActive()) {
        try {
          const sqlEnabled = await getSetting(STORAGE_KEYS.PDF_ARCHIVE_ENABLED);
          const sqlTarget = await getSetting(STORAGE_KEYS.PDF_ARCHIVE_TARGET);
          if (sqlEnabled !== null) setPdfArchiveEnabled(sqlEnabled === "true");
          if (sqlTarget !== null) setPdfArchiveTarget(sqlTarget as "local" | "google");
        } catch (e) {
          log.warn("SQLite-Load für PDF-Archive fehlgeschlagen:", e);
          setPdfArchiveEnabled(enabled);
          setPdfArchiveTarget(target);
        }
      } else {
        setPdfArchiveEnabled(enabled);
        setPdfArchiveTarget(target);
      }
    };
    
    loadSettings();
  }, []);

  useEffect(() => {
    const checkGoogleDrive = async () => {
      if (pdfArchiveTarget === "google") {
        const status = await getGoogleDrivePdfStatus();
        setGoogleDriveConnected(status.connected);
      }
    };
    checkGoogleDrive();
  }, [pdfArchiveTarget]);

  const handleToggleEnabled = useCallback(async () => {
    const newValue = !pdfArchiveEnabled;
    setPdfArchiveEnabled(newValue);
    await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_ENABLED, STORAGE_KEYS.PDF_ARCHIVE_ENABLED, newValue);
    toast.success(`PDF-Archiv ${newValue ? "aktiviert" : "deaktiviert"}`);
  }, [pdfArchiveEnabled]);

  const handleTargetChange = useCallback(async (target: "local" | "google") => {
    if (target === "google") {
      setIsLoading(true);
      try {
        const connected = await connectGoogleDrivePdf();
        if (!connected) {
          toast.error("Google Drive-Verbindung fehlgeschlagen");
          return;
        }
        setGoogleDriveConnected(true);
      } catch (error) {
        console.error("Google Drive connection failed:", error);
        toast.error("Google Drive-Verbindung fehlgeschlagen");
        return;
      } finally {
        setIsLoading(false);
      }
    } else if (pdfArchiveTarget === "google") {
      await disconnectGoogleDrivePdf();
      setGoogleDriveConnected(false);
    }
    
    setPdfArchiveTarget(target);
    await dualWrite(STORAGE_KEYS.PDF_ARCHIVE_TARGET, STORAGE_KEYS.PDF_ARCHIVE_TARGET, target);
    toast.success(`PDF-Ziel: ${target === "local" ? "Lokaler Speicher" : "Google Drive"}`);
  }, [pdfArchiveTarget]);

  const handleManualRun = async () => {
    setIsLoading(true);
    try {
      await performRun();
      toast.success("PDF-Archivierung gestartet");
    } catch (error) {
      console.error("Manual PDF archive run failed:", error);
      toast.error("PDF-Archivierung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <FileText size={18} className="text-emerald-400" />
        <span>PDF-Archiv</span>
      </h3>
      
      <div className="space-y-4">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">PDF-Archiv aktivieren</div>
            <div className="text-sm text-zinc-500">
              Monatliche Stundenzettel automatisch archivieren
            </div>
          </div>
          <button
            onClick={handleToggleEnabled}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              pdfArchiveEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                pdfArchiveEnabled ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
        
        {/* Target Selection */}
        <div>
          <div className="font-medium mb-2">Zielort</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTargetChange("local")}
              disabled={isLoading}
              className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-2 ${
                pdfArchiveTarget === "local"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800"
              }`}
            >
              <HardDrive size={20} className="text-zinc-600 dark:text-zinc-400" />
              <span className="font-medium">Lokal</span>
              <span className="text-xs text-zinc-500">Gerätespeicher</span>
            </button>
            
            <button
              onClick={() => handleTargetChange("google")}
              disabled={isLoading}
              className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-2 ${
                pdfArchiveTarget === "google"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800"
              }`}
            >
              <Cloud size={20} className="text-zinc-600 dark:text-zinc-400" />
              <span className="font-medium">Google Drive</span>
              <span className="text-xs text-zinc-500">Cloud-Speicher</span>
              {pdfArchiveTarget === "google" && googleDriveConnected && (
                <CheckCircle2 size={12} className="text-emerald-500" />
              )}
            </button>
          </div>
        </div>
        
        {/* Last Run Info */}
        {(lastRun || lastError) && (
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            <div className="font-medium mb-1">Letzte Ausführung</div>
            {lastRun ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {new Date(lastRun).toLocaleString("de-DE")}
              </div>
            ) : lastError ? (
              <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle size={14} />
                Fehler: {lastError}
              </div>
            ) : null}
          </div>
        )}
        
        {/* Manual Run Button */}
        <button
          onClick={handleManualRun}
          disabled={isLoading || !pdfArchiveEnabled}
          className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Wird ausgeführt…
            </>
          ) : (
            <>
              <FileText size={16} />
              Jetzt archivieren
            </>
          )}
        </button>
        
        <p className="text-xs text-zinc-500">
          Das PDF-Archiv erstellt am Monatsende automatisch eine PDF-Kopie aller Stundenzettel.
          {pdfArchiveTarget === "google" && !googleDriveConnected && (
            <span className="text-amber-600 dark:text-amber-400">
              {" "}Google Drive-Verbindung erforderlich.
            </span>
          )}
        </p>
      </div>
    </Card>
  );
};

export default PdfArchiveSettings;