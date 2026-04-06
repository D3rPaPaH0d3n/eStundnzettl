// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import { X, Loader, Download, ChevronDown, FileText, ChevronLeft, ChevronRight, Check, MessageSquarePlus } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { useAttachmentShare } from "../hooks/useAttachmentShare";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "../utils/logger";
import { blobToBase64 } from "../utils";
import {
  getWeekNumber,
  getWeekRangeInMonth,
} from "../utils/timeCalculations";
import { usePeriodStats } from "../hooks/usePeriodStats";
import ExportModal from "./ExportModal";
import ReportDocument from "./ReportDocument";
import { TimeEntry, WorkCode, UserData, Attachment } from "../types";

interface PrintReportProps {
  entries: TimeEntry[];
  allEntries: TimeEntry[];
  monthDate: Date;
  employeeName: string;
  onClose: () => void;
  onMonthChange: (date: Date) => void;
  userData: UserData;
  workCodes?: WorkCode[];
  attachments?: Attachment[];
  readAttachmentFile: (attachment: Attachment) => Promise<string>;
}

const PrintReport: React.FC<PrintReportProps> = ({ 
  entries, 
  allEntries, 
  monthDate, 
  employeeName, 
  onClose, 
  onMonthChange, 
  userData, 
  workCodes = [], 
  attachments = [], 
  readAttachmentFile 
}) => {
  const [filterMode, setFilterMode] = useState<string | number>(() => {
    const today = new Date();
    if (monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear()) {
      return getWeekNumber(today);
    }
    return "month";
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false); 

  const { shareReportBundle } = useAttachmentShare({
    readAttachmentFile: async (file: Attachment) => {
      if (file.storagePath && file.mimeType === "application/pdf" && file.label === "Stundenzettel") {
        const result = await Filesystem.readFile({
          path: file.storagePath,
          directory: Directory.Cache,
        });
        return result.data;
      }
      return readAttachmentFile(file);
    },
  });

  useEffect(() => {
    const calculateFitScale = () => {
      const container = document.getElementById("report-container");
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const contentWidth = 794; // A4 width in pixels at 96 DPI
      const newScale = Math.min(1, containerWidth / contentWidth);
      setScale(newScale);
    };

    calculateFitScale();
    window.addEventListener("resize", calculateFitScale);
    return () => window.removeEventListener("resize", calculateFitScale);
  }, []);

  const filteredEntries = useMemo(() => {
    if (filterMode === "month") return entries;
    
    const weekNum = Number(filterMode);
    const { start, end } = getWeekRangeInMonth(monthDate, weekNum);
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
  }, [entries, filterMode, monthDate]);

  const { totalHours, totalMinutes, totalDays, totalOvertime } = usePeriodStats(filteredEntries, userData.monthlyTargetMinutes);

  const weekOptions = useMemo(() => {
    const weeksInMonth = Math.ceil(
      (new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate() + 
       new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay()) / 7
    );
    
    const options = [
      { value: "month", label: "Ganzer Monat" }
    ];
    
    for (let i = 1; i <= weeksInMonth; i++) {
      const { start, end } = getWeekRangeInMonth(monthDate, i);
      options.push({
        value: i,
        label: `KW ${i} (${start.getDate()}.–${end.getDate()}.${monthDate.getMonth() + 1}.)`
      });
    }
    
    return options;
  }, [monthDate]);

  const handleGeneratePDF = async (destination: 'folder' | 'share') => {
    setIsGenerating(true);
    
    try {
      const element = document.getElementById("report-to-print");
      if (!element) throw new Error("Report element not found");
      
      const opt = {
        margin: 0,
        filename: `Stundenzettel_${monthDate.getFullYear()}_${monthDate.getMonth() + 1}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" 
        }
      };
      
      const pdfBlob = await html2pdf().from(element).set(opt).output("blob");
      
      if (destination === "folder") {
        const base64 = await blobToBase64(pdfBlob);
        await Filesystem.writeFile({
          path: `Stundenzettel_${monthDate.getFullYear()}_${monthDate.getMonth() + 1}.pdf`,
          data: base64,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        
        toast.success("PDF im Dokumente-Ordner gespeichert");
      } else {
        const base64 = await blobToBase64(pdfBlob);
        const tempPath = `temp_${Date.now()}.pdf`;
        
        await Filesystem.writeFile({
          path: tempPath,
          data: base64,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        
        const fileUri = await Filesystem.getUri({
          path: tempPath,
          directory: Directory.Cache,
        });
        
        await Share.share({
          title: `Stundenzettel ${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
          text: `Mein Stundenzettel für ${monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`,
          url: fileUri.uri,
          dialogTitle: "Stundenzettel teilen",
        });
        
        toast.success("PDF zum Teilen bereit");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF konnte nicht erstellt werden");
    } finally {
      setIsGenerating(false);
      setShowExportModal(false);
    }
  };

  const handleShareBundle = async () => {
    try {
      await shareReportBundle({
        entries: filteredEntries,
        monthDate,
        employeeName,
        userData,
        workCodes,
        attachments: attachments.filter(a => 
          filteredEntries.some(e => e.id === a.entryId)
        ),
        customNote: customNote.trim() || undefined,
      });
      toast.success("Berichtspaket geteilt");
    } catch (error) {
      console.error("Bundle share failed:", error);
      toast.error("Teilen fehlgeschlagen");
    }
  };

  const handlePrevMonth = () => {
    const prev = new Date(monthDate);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(monthDate);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  const stopClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={stopClick}
          className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <FileText size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-zinc-800 dark:text-white">
                    Stundenzettel drucken
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                aria-label="Schließen"
              >
                <X size={20} className="text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  aria-label="Vorheriger Monat"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    {weekOptions.find(opt => opt.value === filterMode)?.label || "Auswählen"}
                    <ChevronDown size={16} />
                  </button>
                  
                  <AnimatePresence>
                    {isPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 min-w-[200px]"
                      >
                        {weekOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setFilterMode(option.value);
                              setIsPickerOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between transition-colors first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span>{option.label}</span>
                            {option.value === filterMode && (
                              <Check size={16} className="text-emerald-500" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  aria-label="Nächster Monat"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  <MessageSquarePlus size={16} />
                  Notiz hinzufügen
                </button>
                
                <button
                  onClick={() => setShowExportModal(true)}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Wird erstellt…
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      PDF erstellen
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl">
                <div className="text-sm text-zinc-500">Gesamtstunden</div>
                <div className="text-xl font-bold">{totalHours.toFixed(1)} h</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl">
                <div className="text-sm text-zinc-500">Tage</div>
                <div className="text-xl font-bold">{totalDays}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl">
                <div className="text-sm text-zinc-500">Überstunden</div>
                <div className="text-xl font-bold">{totalOvertime.toFixed(1)} h</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl">
                <div className="text-sm text-zinc-500">Einträge</div>
                <div className="text-xl font-bold">{filteredEntries.length}</div>
              </div>
            </div>
          </div>

          {/* Report Preview */}
          <div className="flex-1 overflow-auto p-5" id="report-container">
            <div 
              className="mx-auto transition-transform duration-200 origin-top"
              style={{ transform: `scale(${scale})` }}
            >
              <ReportDocument
                entries={filteredEntries}
                monthDate={monthDate}
                employeeName={employeeName}
                userData={userData}
                workCodes={workCodes}
                customNote={customNote}
                id="report-to-print"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
            <div className="flex justify-between items-center">
              <div className="text-sm text-zinc-500">
                Skalierung: {(scale * 100).toFixed(0)}%
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleShareBundle}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  Berichtspaket teilen
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onSelectFolder={() => handleGeneratePDF('folder')}
        onSelectShare={() => handleGeneratePDF('share')}
        isPdf={true}
      />

      {/* Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
            onClick={() => setIsNoteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={stopClick}
              className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Notiz hinzufügen</h3>
                  <button
                    onClick={() => setIsNoteModalOpen(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-5">
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Zusätzliche Bemerkungen für den Stundenzettel…"
                  className="w-full h-32 p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>
              
              <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsNoteModalOpen(false)}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => setIsNoteModalOpen(false)}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default PrintReport;