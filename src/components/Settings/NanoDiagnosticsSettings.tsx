import React, { useEffect, useState } from "react";
import { Download, Mic, RefreshCw } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { Card } from "../../utils";
import {
  NanoDiagnostics,
  type NanoDiagnosticsResult,
} from "../../plugins/NanoDiagnosticsPlugin";
import { logger } from "../../utils/logger";

const speechStatusLabel: Record<string, string> = {
  AVAILABLE: "bereit",
  DOWNLOADABLE: "nicht bereit",
  DOWNLOADING: "lädt",
  UNAVAILABLE: "nicht verfügbar",
  ERROR: "nicht verfügbar",
};

const getSpeechStatusClasses = (status?: string) => {
  if (status === "AVAILABLE") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (status === "DOWNLOADABLE" || status === "DOWNLOADING") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";
};

const NanoDiagnosticsSettings: React.FC = () => {
  const [status, setStatus] = useState<NanoDiagnosticsResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const speechStatus = status?.speechAdvanced.status;
  const statusLabel = speechStatus ? speechStatusLabel[speechStatus] ?? "unbekannt" : "ungeprüft";

  const loadStatus = async () => {
    if (!Capacitor.isNativePlatform()) {
      setStatus({ speechAdvanced: { status: "UNAVAILABLE" } });
      return;
    }

    setIsBusy(true);
    try {
      const next = await NanoDiagnostics.getStatus();
      setStatus(next);
    } catch (err) {
      logger.error("[NanoDiagnosticsSettings] Statusprüfung fehlgeschlagen:", err);
      toast.error("Nano Status konnte nicht geprüft werden.");
    } finally {
      setIsBusy(false);
    }
  };

  const downloadSpeechAdvanced = async () => {
    setIsBusy(true);
    try {
      await NanoDiagnostics.downloadSpeechAdvanced();
      toast.success("Speech de-DE bereit.");
      await loadStatus();
    } catch (err) {
      logger.error("[NanoDiagnosticsSettings] Speech-Download fehlgeschlagen:", err);
      toast.error("Speech-Download fehlgeschlagen.");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-zinc-100 p-2 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <Mic size={18} />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-zinc-800 dark:text-white">Speech Nano</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSpeechStatusClasses(speechStatus)}`}>
              {statusLabel}
            </span>
          </div>
          {status?.speechAdvanced.error && (
            <p className="mt-1 break-words text-xs text-zinc-500 dark:text-zinc-400">
              {status.speechAdvanced.error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={isBusy}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Speech Nano Status prüfen"
          title="Speech Nano Status prüfen"
        >
          <RefreshCw size={16} className={isBusy ? "animate-spin" : ""} />
        </button>

        {speechStatus === "DOWNLOADABLE" && (
          <button
            type="button"
            onClick={downloadSpeechAdvanced}
            disabled={isBusy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Download size={14} />
            Laden
          </button>
        )}
      </div>
    </Card>
  );
};

export default NanoDiagnosticsSettings;
