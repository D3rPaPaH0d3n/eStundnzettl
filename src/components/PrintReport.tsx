import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Loader,
  Download,
  ChevronDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  MessageSquarePlus,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import i18n from "../i18n";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { useAttachmentShare } from "../hooks/useAttachmentShare";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { logger } from "../utils/logger";
import { blobToBase64 } from "../utils";
import { getIntlLocale } from "../utils/formatLocale";
import {
  getWeekNumber,
  getWeekRangeInMonth,
  applyEffectiveDurations,
} from "../utils/timeCalculations";
import { usePeriodStats } from "../hooks/usePeriodStats";
import ExportModal from "./ExportModal";
import ReportPdfDocument from "./ReportPdfDocument";
import PdfBlobPreview from "./PdfBlobPreview";

import type {
  Entry,
  UserData,
  WorkCode,
  Attachment,
  CalculationConfig,
} from "../types";
import type { Locale } from "../locales/types";

// Debounce-Fenster fuer das Aktualisieren der Vorschau, wenn der User
// im Notiz-Feld tippt. Verhindert, dass der PDF-Renderer auf jeden
// Tastendruck einen kompletten Neuaufbau triggert.
const PREVIEW_DEBOUNCE_MS = 350;

interface Props {
  entries: Entry[];
  allEntries: Entry[];
  monthDate: Date;
  employeeName: string;
  onClose: () => void;
  onMonthChange: (date: Date) => void;
  userData: UserData;
  workCodes?: WorkCode[];
  attachments?: Attachment[];
  readAttachmentFile: (file: Attachment) => Promise<string>;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
}

/**
 * Liefert einen mit `delay` ms verzoegerten Wert. Wird genutzt, um die
 * PDF-Vorschau nicht auf jeden Tastendruck im Notizfeld neu rendern zu
 * lassen.
 */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const PrintReport: React.FC<Props> = ({
  entries,
  allEntries: rawAllEntries,
  monthDate,
  employeeName,
  onClose,
  onMonthChange,
  userData,
  workCodes = [],
  attachments = [],
  readAttachmentFile,
  locale,
  calculationConfig,
}) => {
  const { t } = useTranslation();
  // Krank-Korrektur auf allEntries anwenden (entries sind bereits korrigiert via useAppData)
  const allEntries = useMemo(
    () => applyEffectiveDurations(rawAllEntries, userData, locale, calculationConfig),
    [rawAllEntries, userData, locale, calculationConfig],
  );
  const [filterMode, setFilterMode] = useState<number | "month">(() => {
    const today = new Date();
    if (
      monthDate.getMonth() === today.getMonth() &&
      monthDate.getFullYear() === today.getFullYear()
    ) {
      return getWeekNumber(today);
    }
    return "month";
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const debouncedNote = useDebounced(customNote, PREVIEW_DEBOUNCE_MS);

  const { shareReportBundle } = useAttachmentShare({
    readAttachmentFile: async (file) => {
      if (
        file.storagePath &&
        file.mimeType === "application/pdf" &&
        file.label === "Stundenzettel"
      ) {
        const result = await Filesystem.readFile({
          path: file.storagePath,
          directory: Directory.Cache,
        });
        return result.data as string;
      }
      return readAttachmentFile(file);
    },
  });

  const handleMonthChange = (delta: number) => {
    const newDate = new Date(monthDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setFilterMode("month");
    onMonthChange(newDate);
  };

  const getWeekLabel = (week: number) => {
    const year = monthDate.getFullYear();
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const monday = new Date(ISOweekStart);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString(getIntlLocale(), { day: "2-digit", month: "2-digit" });
    return `${fmt(monday)} - ${fmt(sunday)}`;
  };

  const filteredEntries = useMemo(() => {
    const list =
      filterMode === "month"
        ? [...entries]
        : entries.filter(
            (e) => getWeekNumber(new Date(e.date)) === Number(filterMode),
          );
    list.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
      return (a.start || "").localeCompare(b.start || "");
    });
    return list;
  }, [entries, filterMode]);

  const availableWeeks = useMemo(() => {
    const w = new Set(entries.map((e) => getWeekNumber(new Date(e.date))));
    return Array.from(w).sort((a, b) => b - a);
  }, [entries]);

  const currentLabel = useMemo(() => {
    if (filterMode === "month") return t("reports.fullMonth");
    return `${t("dashboard.calendarWeekShort", { week: filterMode })} (${getWeekLabel(filterMode)})`;
  }, [filterMode, availableWeeks, monthDate, t]);

  // --- STATISTIK ---
  const { periodStart, periodEnd } = useMemo(() => {
    if (filterMode === "month") {
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      return { periodStart: start, periodEnd: end };
    } else {
      if (filteredEntries.length > 0) {
        const refDate = new Date(filteredEntries[0].date);
        const range = getWeekRangeInMonth(refDate, monthDate);
        return { periodStart: range.start, periodEnd: range.end };
      } else {
        return { periodStart: new Date(), periodEnd: new Date() };
      }
    }
  }, [filterMode, monthDate, filteredEntries]);

  const stats = usePeriodStats(
    entries,
    userData,
    periodStart,
    periodEnd,
    allEntries,
    locale,
    calculationConfig,
  );

  // Anhaenge fuer den aktuellen Filterzeitraum
  const reportAttachments = useMemo(() => {
    const ids = new Set(filteredEntries.map((e) => e.id));
    return attachments.filter((a) => ids.has(a.entryId));
  }, [filteredEntries, attachments]);

  // Sprache als Re-Render-Trigger, damit ein UI-Sprachwechsel waehrend
  // der Preview offen ist auch das PDF neu generiert. Die
  // ReportPdfDocument verwendet `i18n.t` ueber den Singleton — ein
  // Sprachwechsel ruft ohne expliziten Trigger sonst kein Re-Render aus.
  const currentLanguage = i18n.language;

  // Vorschau-Blob: pdfjs-dist rendert die fertige PDF auf Canvas in
  // PdfBlobPreview. Wir generieren den Blob selbst, damit wir den
  // Memo-/Effect-Lifecycle voll im Griff haben (Debounce, Sprachwechsel,
  // Cancellation).
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    void currentLanguage; // Trigger fuer Sprachwechsel
    const promise = pdf(
      <ReportPdfDocument
        entries={filteredEntries}
        userData={userData}
        monthDate={monthDate}
        filterMode={filterMode}
        stats={stats}
        workCodes={workCodes}
        attachments={reportAttachments}
        customNote={debouncedNote}
        locale={locale}
        calculationConfig={calculationConfig}
        allEntries={allEntries}
      />,
    ).toBlob();

    promise
      .then((blob) => {
        if (!cancelled) setPreviewBlob(blob);
      })
      .catch((err) => {
        if (!cancelled) {
          logger.error("Vorschau-Blob fehlgeschlagen:", err);
          setPreviewBlob(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    filteredEntries,
    userData,
    monthDate,
    filterMode,
    stats,
    workCodes,
    reportAttachments,
    debouncedNote,
    locale,
    calculationConfig,
    allEntries,
    currentLanguage,
  ]);

  /** Erzeugt das Export-PDF (immer mit aktuellem, nicht-debouncten Notiz-Stand). */
  const buildExportBlob = async (): Promise<Blob> =>
    pdf(
      <ReportPdfDocument
        entries={filteredEntries}
        userData={userData}
        monthDate={monthDate}
        filterMode={filterMode}
        stats={stats}
        workCodes={workCodes}
        attachments={reportAttachments}
        customNote={customNote}
        locale={locale}
        calculationConfig={calculationConfig}
        allEntries={allEntries}
      />,
    ).toBlob();

  const buildFilename = (): string => {
    const employeeNameClean = employeeName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
    let timePeriod: string;
    if (filterMode === "month") {
      timePeriod = monthDate.toLocaleDateString(getIntlLocale(), {
        month: "long",
        year: "numeric",
      });
    } else {
      const weekLabel = getWeekLabel(filterMode);
      timePeriod = `KW_${filterMode}_(${weekLabel.replace(/[\s-.]/g, "")})`;
    }
    const timestamp = new Date().getTime().toString().slice(-6);
    return `${employeeNameClean}_Stundenzettel_${timePeriod.replace(/\s+/g, "_")}_${timestamp}.pdf`;
  };

  const handlePdfAction = async (actionType: string) => {
    try {
      setShowExportModal(false);
      setIsGenerating(true);

      const filename = buildFilename();
      const pdfBlob = await buildExportBlob();

      if (!Capacitor.isNativePlatform()) {
        // Web: Download via Blob-URL
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t("reports.toast.downloadStarted"));
      } else {
        const base64 = await blobToBase64(pdfBlob);

        if (actionType === "share") {
          await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache,
            recursive: true,
          });
          const uriResult = await Filesystem.getUri({
            path: filename,
            directory: Directory.Cache,
          });

          if (reportAttachments.length === 0) {
            await Share.share({ title: t("reports.title"), url: uriResult.uri });
            toast.success(t("reports.toast.readyToShare"));
          } else {
            await shareReportBundle({
              pdfFile: {
                storagePath: filename,
                mimeType: "application/pdf",
              },
              attachments: reportAttachments,
            });
          }
        } else {
          await Filesystem.writeFile({
            path: `eStundnzettl/${filename}`,
            data: base64,
            directory: Directory.Documents,
            recursive: true,
          });
          toast.success(t("reports.toast.savedToDocuments"), { icon: "📂" });
        }
      }

      setIsGenerating(false);
    } catch (err) {
      const msg = (err as Error).message || "";
      if (msg.includes("canceled") || msg.includes("cancelled")) {
        setIsGenerating(false);
        return;
      }
      logger.error(err);
      toast.error(t("reports.toast.error", { message: msg }));
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-[200] flex flex-col h-full">
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onSelectFolder={() => handlePdfAction("folder")}
        onSelectShare={() => handlePdfAction("share")}
        isPdf={true}
      />

      <div
        className="bg-zinc-900 text-white p-3 shadow-xl z-50 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2 text-zinc-100 min-w-0">
            <FileText size={20} className="text-emerald-500 shrink-0" />
            <span className="truncate">{t("reports.preview")}</span>
          </h2>
          <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1.5 hover:bg-zinc-700 rounded-md text-zinc-300"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-2 text-sm font-bold w-24 text-center tabular-nums">
              {monthDate.toLocaleDateString(getIntlLocale(), {
                month: "short",
                year: "2-digit",
              })}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1.5 hover:bg-zinc-700 rounded-md text-zinc-300"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setIsNoteModalOpen(true)}
            className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${
              customNote
                ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
            }`}
          >
            <MessageSquarePlus size={20} />
          </button>
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg py-2 pl-3 pr-8 text-sm font-medium flex items-center justify-between transition-colors hover:border-emerald-500/50 active:bg-zinc-700"
            >
              <span className="truncate">{currentLabel}</span>
              <ChevronDown
                size={16}
                className={`text-zinc-400 transition-transform ${isPickerOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {isPickerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPickerOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 py-1"
                  >
                    <div
                      onClick={() => {
                        setFilterMode("month");
                        setIsPickerOpen(false);
                      }}
                      className={`px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-zinc-700/50 ${
                        filterMode === "month"
                          ? "text-emerald-500 bg-zinc-700/50"
                          : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      }`}
                    >
                      <span>{t("reports.fullMonth")}</span>
                      {filterMode === "month" && <Check size={16} />}
                    </div>
                    {availableWeeks.map((w) => (
                      <div
                        key={w}
                        onClick={() => {
                          setFilterMode(w);
                          setIsPickerOpen(false);
                        }}
                        className={`px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-zinc-700/50 last:border-0 ${
                          Number(filterMode) === w
                            ? "text-emerald-500 bg-zinc-700/50"
                            : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        }`}
                      >
                        <span>
                          {t("dashboard.calendarWeekShort", { week: w })} ({getWeekLabel(w)})
                        </span>
                        {Number(filterMode) === w && <Check size={16} />}
                      </div>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExportModal(true)}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 px-4 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20 shrink-0"
          >
            {isGenerating ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            <span className="hidden sm:inline">PDF</span>
          </motion.button>
        </div>
      </div>

      {/* Inline-PDF-Vorschau via pdfjs-dist (Canvas-Render).
          Bewusst NICHT <PDFViewer>: dessen iframe mit blob:-URL wird
          von der Capacitor-Android-WebView nicht gerendert (schwarze
          Vorschau). Canvas-Rendering funktioniert in jeder WebView. */}
      <div className="flex-1 overflow-hidden">
        <PdfBlobPreview blob={previewBlob} />
      </div>

      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsNoteModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-5"
            >
              <h3 className="font-bold text-lg mb-3 text-zinc-800 dark:text-white">
                {t("reports.noteModal.title")}
              </h3>
              <textarea
                className="w-full h-32 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg resize-none outline-none focus:border-blue-500 text-zinc-800 dark:text-zinc-100"
                placeholder={t("reports.noteModal.placeholder")}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setCustomNote("")}
                  className="text-red-500 text-sm font-medium px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  {t("common.delete")}
                </button>
                <button
                  onClick={() => setIsNoteModalOpen(false)}
                  className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold px-4 py-2 rounded-lg"
                >
                  {t("reports.noteModal.done")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrintReport;
