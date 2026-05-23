import React, { useState } from "react";
import { BrainCircuit, Download, Play, RefreshCw } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { Card } from "../../utils";
import {
  NanoDiagnostics,
  type NanoDiagnosticsResult,
  type NanoFeatureDiagnostic,
} from "../../plugins/NanoDiagnosticsPlugin";
import { logger } from "../../utils/logger";

const statusClasses: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  DOWNLOADABLE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  DOWNLOADING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  UNAVAILABLE: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const StatusBadge = ({ feature }: { feature?: NanoFeatureDiagnostic }) => {
  const status = feature?.status ?? "UNKNOWN";
  const classes = statusClasses[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>
      {status}
    </span>
  );
};

const FeatureRow = ({
  label,
  feature,
}: {
  label: string;
  feature?: NanoFeatureDiagnostic;
}) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <StatusBadge feature={feature} />
    </div>
    {feature?.error && (
      <p className="mt-2 break-words text-xs leading-relaxed text-red-600 dark:text-red-300">
        {feature.error}
      </p>
    )}
  </div>
);

const NanoDiagnosticsSettings: React.FC = () => {
  const [status, setStatus] = useState<NanoDiagnosticsResult | null>(null);
  const [smokeResult, setSmokeResult] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const speechStatus = status?.speechAdvanced.status;
  const promptStatus = status?.prompt.status;
  const speechDownloadLabel = speechStatus === "AVAILABLE" ? "Speech bereit" : "Speech laden";
  const promptDownloadLabel = promptStatus === "AVAILABLE" ? "Prompt bereit" : "Prompt laden";

  const loadStatus = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast("Nano Diagnose ist nur in der Android-App verfügbar.");
      return;
    }

    setIsBusy(true);
    setSmokeResult(null);
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

  const downloadPrompt = async () => {
    setIsBusy(true);
    try {
      await NanoDiagnostics.downloadPrompt();
      toast.success("Prompt-Modell bereit.");
      await loadStatus();
    } catch (err) {
      logger.error("[NanoDiagnosticsSettings] Prompt-Download fehlgeschlagen:", err);
      toast.error("Prompt-Download fehlgeschlagen.");
    } finally {
      setIsBusy(false);
    }
  };

  const downloadSpeechAdvanced = async () => {
    setIsBusy(true);
    setSmokeResult(null);
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

  const runSmokeTest = async () => {
    setIsBusy(true);
    setSmokeResult(null);
    try {
      const result = await NanoDiagnostics.runPromptSmokeTest();
      setSmokeResult(result.text);
    } catch (err) {
      logger.error("[NanoDiagnosticsSettings] Prompt-Test fehlgeschlagen:", err);
      toast.error("Prompt-Test fehlgeschlagen.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 border-violet-200 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-950/20">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          <BrainCircuit size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-zinc-800 dark:text-white">Gemini Nano Diagnose</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Prüft AICore, Speech Advanced und Prompt API direkt auf diesem Android-Gerät.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={loadStatus}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={isBusy ? "animate-spin" : ""} />
          Status prüfen
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={downloadSpeechAdvanced}
            disabled={isBusy || speechStatus !== "DOWNLOADABLE"}
            className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900 dark:bg-zinc-800 dark:text-violet-300 dark:hover:bg-zinc-700"
          >
            <Download size={15} />
            {speechDownloadLabel}
          </button>

          <button
            type="button"
            onClick={downloadPrompt}
            disabled={isBusy || promptStatus !== "DOWNLOADABLE"}
            className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900 dark:bg-zinc-800 dark:text-violet-300 dark:hover:bg-zinc-700"
          >
            <Download size={15} />
            {promptDownloadLabel}
          </button>

          <button
            type="button"
            onClick={runSmokeTest}
            disabled={isBusy || promptStatus !== "AVAILABLE"}
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900 dark:bg-zinc-800 dark:text-violet-300 dark:hover:bg-zinc-700"
          >
            <Play size={15} />
            Prompt testen
          </button>
        </div>
      </div>

      {status && (
        <div className="space-y-2">
          <div className="rounded-lg bg-white/80 p-3 text-xs text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-300">
            <div><b>Gerät:</b> {status.device ?? "unbekannt"}</div>
            <div><b>Android SDK:</b> {status.androidSdk ?? "unbekannt"}</div>
            <div><b>AICore:</b> {status.aicoreVersion ?? "nicht gefunden"}</div>
          </div>
          <FeatureRow label="Speech Advanced de-DE" feature={status.speechAdvanced} />
          <FeatureRow label="Prompt API" feature={status.prompt} />
        </div>
      )}

      {smokeResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {smokeResult}
        </div>
      )}
    </Card>
  );
};

export default NanoDiagnosticsSettings;
