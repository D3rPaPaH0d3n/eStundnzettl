import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Loader, Download, ZoomIn, ZoomOut, ChevronDown, FileText, ChevronLeft, ChevronRight, Check } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { WORK_CODES, getWeekNumber, formatTime, blobToBase64 } from "../utils";

const PRINT_STYLES = {
  textBlack: '#000000',
  textDark: '#1e293b',
  textMedium: '#475569',
  textLight: '#94a3b8',
  bgWhite: '#ffffff',
  bgGray: '#f8fafc',
  bgZebra: '#f1f5f9',
  bgBlueLight: '#eff6ff',
  textBlue: '#1e40af',
  textRed: '#b91c1c',
  textGreen: '#15803d',
  borderDark: '#1e293b',
  borderLight: '#e2e8f0',
};

const PrintReport = ({ entries, monthDate, employeeName, userPhoto, onClose, onMonthChange }) => {
  
  const [filterMode, setFilterMode] = useState(() => {
    const today = new Date();
    if (monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear()) {
      return getWeekNumber(today);
    }
    return "month";
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(0.5); 
  const [isPickerOpen, setIsPickerOpen] = useState(false); // State für Custom Dropdown
  const reportRef = useRef(null);

  // Auto-Scale beim Start
  useEffect(() => {
    const calculateFitScale = () => {
      const A4_WIDTH_PX = 794; 
      const A4_HEIGHT_PX = 1123; 
      const padding = 40; 
      const headerHeight = 160; 
      const availableWidth = window.innerWidth - padding;
      const availableHeight = window.innerHeight - headerHeight;
      const scaleX = availableWidth / A4_WIDTH_PX;
      const scaleY = availableHeight / A4_HEIGHT_PX;
      const optimalScale = Math.min(scaleX, scaleY, 1); 
      setScale(optimalScale);
    };
    calculateFitScale();
    window.addEventListener("resize", calculateFitScale);
    return () => window.removeEventListener("resize", calculateFitScale);
  }, []);

  const changeZoom = (delta) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.3), 1.5));
  };

  const handleMonthChange = (delta) => {
    const newDate = new Date(monthDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setFilterMode("month"); 
    onMonthChange(newDate);
  };

  const getWeekLabel = (week) => {
    const year = monthDate.getFullYear();
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const monday = new Date(ISOweekStart);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    return `${fmt(monday)} - ${fmt(sunday)}`;
  };

  const formatSaldo = (minutes) => {
    const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
    const abs = Math.abs(Math.round(minutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const filteredEntries = useMemo(() => {
    let list = filterMode === "month" ? [...entries] : entries.filter((e) => getWeekNumber(new Date(e.date)) === Number(filterMode));
    list.sort((a, b) => {
      const da = new Date(a.date); const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return da - db;
      return (a.start || "").localeCompare(b.start || "");
    });
    return list;
  }, [entries, filterMode]);

  const availableWeeks = useMemo(() => {
    const w = new Set(entries.map((e) => getWeekNumber(new Date(e.date))));
    return Array.from(w).sort((a, b) => a - b);
  }, [entries]);

  // Für das Dropdown Label
  const currentLabel = useMemo(() => {
    if (filterMode === "month") return "Gesamter Monat";
    return `KW ${filterMode} (${getWeekLabel(filterMode)})`;
  }, [filterMode, availableWeeks, monthDate]);

  const reportStats = useMemo(() => {
    let work = 0; let vacation = 0; let sick = 0; let holiday = 0; let drive = 0;
    let periodStart, periodEnd;

    if (filteredEntries.length > 0) {
      if (filterMode === "month") {
        periodStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        periodEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      } else {
        const d = new Date(filteredEntries[0].date);
        const day = d.getDay() || 7;
        periodStart = new Date(d);
        periodStart.setDate(d.getDate() - day + 1);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
      }
    } else { periodStart = new Date(); periodEnd = new Date(); }

    filteredEntries.forEach((e) => {
      if (e.type === "work") {
        if (e.code === 19) drive += e.netDuration; else work += e.netDuration;
      }
      if (e.type === "vacation") vacation += e.netDuration;
      if (e.type === "sick") sick += e.netDuration;
      if (e.type === "public_holiday") holiday += e.netDuration;
    });

    const totalIst = work + vacation + sick + holiday;
    let totalTarget = 0;
    let loopDate = new Date(periodStart);
    while (loopDate <= periodEnd) {
      const dow = loopDate.getDay();
      if (dow >= 1 && dow <= 5) totalTarget += dow === 5 ? 270 : 510;
      loopDate.setDate(loopDate.getDate() + 1);
    }
    return { work, vacation, sick, holiday, drive, totalIst, totalTarget, totalSaldo: totalIst - totalTarget };
  }, [filteredEntries, monthDate, filterMode]);

  const dayMetaMap = useMemo(() => {
    const map = {}; let currentDateStr = ""; let dayIndex = 0; const sums = {};
    filteredEntries.forEach((e) => {
      if (!sums[e.date]) sums[e.date] = { totalMinutes: 0 };
      if (!(e.type === "work" && e.code === 19)) sums[e.date].totalMinutes += e.netDuration;
    });
    filteredEntries.forEach((e, idx) => {
      if (e.date !== currentDateStr) { dayIndex++; currentDateStr = e.date; }
      const d = new Date(e.date); const dow = d.getDay();
      let target = 0; if (dow >= 1 && dow <= 4) target = 510; if (dow === 5) target = 270;
      const nextEntry = filteredEntries[idx + 1];
      const isLastOfDay = !nextEntry || nextEntry.date !== e.date;
      const balance = sums[e.date].totalMinutes - target;
      map[e.id] = { dayIndex, isEvenDay: dayIndex % 2 === 0, showBalance: isLastOfDay && target > 0, balance: balance };
    });
    return map;
  }, [filteredEntries]);

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const element = document.getElementById("report-to-print");
      if (!element) { toast.error("❌ Fehler: PDF-Element nicht gefunden."); return; }

      const timestamp = new Date().getTime().toString().slice(-6);
      const filename = `Stundenzettel_${timestamp}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 850, backgroundColor: "#ffffff" }, 
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      const worker = html2pdf().set(opt).from(element);

      if (!Capacitor.isNativePlatform()) {
        await worker.save();
        toast.success("📄 PDF erfolgreich heruntergeladen!");
        return;
      }

      const pdfBlob = await worker.output("blob");
      const base64 = await blobToBase64(pdfBlob);

      await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents, encoding: Encoding.BASE64, recursive: true });
      
      let shareUrl;
      try { 
        const uriResult = await Filesystem.getUri({ path: filename, directory: Directory.Documents }); 
        shareUrl = uriResult.uri || uriResult.path; 
      } catch (uriError) { console.error("URI Fehler:", uriError); }

      if (shareUrl) {
        try {
          await Share.share({ title: "Stundenzettel teilen", text: `Stundenzettel`, url: shareUrl });
          toast.success("📤 Datei bereitgestellt.");
        } catch (shareErr) { console.log("Teilen abgebrochen"); }
      } else {
        toast.success("💾 PDF in Dokumente gespeichert.");
      }
    } catch (err) {
      console.error(err);
      toast.error("❌ Fehler beim Erstellen der PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col h-full">
      {/* 1. TOPBAR */}
      <div 
        className="bg-slate-900 text-white p-3 shadow-xl z-50 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2 text-slate-100 min-w-0">
                <FileText size={20} className="text-orange-500 shrink-0" /> 
                <span className="truncate">Vorschau</span>
            </h2>
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button onClick={() => handleMonthChange(-1)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300"><ChevronLeft size={18} /></button>
              <span className="px-2 text-sm font-bold w-24 text-center tabular-nums">
                {monthDate.toLocaleDateString("de-DE", { month: "short", year: "2-digit" })}
              </span>
              <button onClick={() => handleMonthChange(1)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300"><ChevronRight size={18} /></button>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors shrink-0">
                <X size={20} />
            </button>
        </div>

        <div className="flex gap-2 items-center">
            
            {/* FIX: CUSTOM DROPDOWN (Statt <select>) */}
            <div className="relative flex-1 min-w-0">
                <button 
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-2 pl-3 pr-8 text-sm font-medium flex items-center justify-between transition-colors hover:border-orange-500/50 active:bg-slate-700"
                >
                    <span className="truncate">{currentLabel}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPickerOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                    {isPickerOpen && (
                        <>
                            {/* Backdrop zum Schließen beim Klicken außerhalb */}
                            <div className="fixed inset-0 z-40" onClick={() => setIsPickerOpen(false)} />
                            
                            {/* Dropdown Liste */}
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1"
                            >
                                <div 
                                    onClick={() => { setFilterMode("month"); setIsPickerOpen(false); }}
                                    className={`px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-slate-700/50 ${filterMode === "month" ? "text-orange-500 bg-slate-700/50" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}
                                >
                                    <span>Gesamter Monat</span>
                                    {filterMode === "month" && <Check size={16} />}
                                </div>
                                {availableWeeks.map((w) => (
                                    <div 
                                        key={w}
                                        onClick={() => { setFilterMode(w); setIsPickerOpen(false); }}
                                        className={`px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-slate-700/50 last:border-0 ${Number(filterMode) === w ? "text-orange-500 bg-slate-700/50" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}
                                    >
                                        <span>KW {w} ({getWeekLabel(w)})</span>
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
                onClick={handleDownloadPdf} 
                disabled={isGenerating} 
                className="bg-orange-500 hover:bg-orange-600 text-white p-2 px-4 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-900/20 shrink-0"
            >
                {isGenerating ? <Loader className="animate-spin" size={18} /> : <Download size={18} />} 
                <span className="hidden sm:inline">PDF</span>
            </motion.button>
        </div>
      </div>

      {/* 2. PREVIEW CONTAINER */}
      <div className="flex-1 overflow-auto bg-slate-800/50 relative p-4 touch-pan-x touch-pan-y flex flex-col items-center">
        <div 
            className="transition-transform duration-200 ease-out origin-top"
            style={{ 
                transform: `scale(${scale})`, 
                width: '210mm',
                height: '296mm'
            }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            id="report-to-print"
            ref={reportRef}
            className="w-full h-full bg-white shadow-2xl p-8"
            style={{ color: PRINT_STYLES.textBlack, fontFamily: 'Arial, sans-serif' }}
          >
            {/* PDF CONTENT START */}
            <div style={{ borderBottom: `2px solid ${PRINT_STYLES.borderDark}`, paddingBottom: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', color: PRINT_STYLES.textDark, margin: 0 }}>Stundenzettel</h1>
                <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: PRINT_STYLES.textMedium, marginTop: '0.25rem', margin: 0 }}>Kogler Aufzugsbau</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '500', margin: 0 }}>Mitarbeiter: {employeeName}</p>
                  <p style={{ fontSize: '0.875rem', color: PRINT_STYLES.textMedium, margin: 0 }}>
                    Zeitraum: {monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                    {filterMode !== "month" && ` (KW ${filterMode})`}
                  </p>
                </div>
                {userPhoto && (
                  <img src={userPhoto} alt="Mitarbeiter" style={{ width: '65px', height: '65px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${PRINT_STYLES.borderLight}`, display: 'block' }} />
                )}
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'left', marginBottom: '2rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${PRINT_STYLES.borderDark}`, color: PRINT_STYLES.textMedium, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.5rem 0', width: '5.5rem' }}>Datum</th>
                  <th style={{ padding: '0.5rem 0', width: '6rem' }}>Zeit</th>
                  <th style={{ padding: '0.5rem 0' }}>Projekt</th>
                  <th style={{ padding: '0.5rem 0', width: '6rem' }}>Code</th>
                  <th style={{ padding: '0.5rem 1rem 0.5rem 0', width: '4.5rem', textAlign: 'right' }}>Std.</th>
                  <th style={{ padding: '0.5rem 1rem 0.5rem 0', width: '4.5rem', textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => {
                  const d = new Date(e.date);
                  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2);
                  const ds = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                  const meta = dayMetaMap[e.id] || {};

                  let rowBg = 'transparent';
                  if (e.type === "public_holiday") rowBg = PRINT_STYLES.bgBlueLight;
                  else if (meta.isEvenDay) rowBg = PRINT_STYLES.bgZebra;

                  let projectText = e.project;
                  let codeText = WORK_CODES.find((c) => c.id === e.code)?.label || "";
                  let durationDisplay = formatTime(e.netDuration);
                  let timeColor = PRINT_STYLES.textDark;
                  
                  let timeCellContent = null;
                  if (e.type === "work") {
                    if (e.code === 19) { durationDisplay = "-"; timeColor = PRINT_STYLES.textLight; }
                    const pauseText = e.pause > 0 ? `Pause: ${e.pause}m` : "Keine Pause";
                    const pauseColor = e.pause > 0 ? PRINT_STYLES.textMedium : PRINT_STYLES.textLight;
                    timeCellContent = (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: PRINT_STYLES.textDark, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{e.start} – {e.end}</span>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', marginTop: '2px', color: pauseColor }}>{pauseText}</span>
                      </div>
                    );
                  } else if (e.type === "public_holiday") {
                    timeCellContent = <span style={{ fontWeight: 'bold', color: PRINT_STYLES.textDark }}>Feiertag</span>;
                    projectText = e.project || "Gesetzlicher Feiertag";
                    durationDisplay = formatTime(e.netDuration);
                    timeColor = PRINT_STYLES.textBlue;
                  } else {
                    timeCellContent = <span style={{ color: PRINT_STYLES.textLight }}>-</span>;
                    projectText = e.type === "vacation" ? "Urlaub" : "Krank";
                  }

                  return (
                    <tr key={e.id} style={{ backgroundColor: rowBg, borderBottom: `1px solid ${PRINT_STYLES.bgZebra}`, pageBreakInside: 'avoid' }}>
                      <td style={{ padding: '0.5rem 0.5rem', fontWeight: '500', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', width: '2.5rem', fontWeight: 'bold' }}>{wd}</span>
                        <span style={{ color: PRINT_STYLES.textMedium }}>{ds}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>{timeCellContent}</td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>
                        <span style={{ fontWeight: '500', color: e.type === "public_holiday" ? PRINT_STYLES.textBlue : PRINT_STYLES.textMedium }}>{projectText}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'top', fontSize: '0.75rem', color: PRINT_STYLES.textMedium }}>{codeText}</td>
                      <td style={{ padding: '0.5rem 1rem 0.5rem 0', verticalAlign: 'top', textAlign: 'right', fontWeight: 'bold', color: timeColor }}>{durationDisplay}</td>
                      <td style={{ padding: '0.5rem 1rem 0.5rem 0', verticalAlign: 'top', textAlign: 'right', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {meta.showBalance && (
                          <span style={{ color: meta.balance >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }}>
                            {formatSaldo(meta.balance)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '2rem', pageBreakInside: 'avoid' }}>
              <div style={{ backgroundColor: PRINT_STYLES.bgGray, padding: '1rem', borderRadius: '0.5rem', border: `1px solid ${PRINT_STYLES.borderLight}` }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: `1px solid ${PRINT_STYLES.borderLight}`, paddingBottom: '0.25rem' }}>Zusammenfassung</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Arbeitszeit (inkl. Anreise):</span><span style={{ fontWeight: 'bold' }}>{formatTime(reportStats.work)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem', color: PRINT_STYLES.textBlue }}>
                  <span>Feiertage:</span><span style={{ fontWeight: 'bold' }}>{formatTime(reportStats.holiday)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem', color: PRINT_STYLES.textBlue }}>
                  <span>Urlaub:</span><span style={{ fontWeight: 'bold' }}>{formatTime(reportStats.vacation)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem', color: PRINT_STYLES.textRed }}>
                  <span>Krankenstand:</span><span style={{ fontWeight: 'bold' }}>{formatTime(reportStats.sick)}</span>
                </div>
                {reportStats.drive > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem', color: PRINT_STYLES.textLight, fontStyle: 'italic', marginTop: '0.5rem' }}>
                    <span>Fahrtzeit (unbezahlt):</span><span>{formatTime(reportStats.drive)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${PRINT_STYLES.borderLight}`, fontWeight: 'bold' }}>
                  <span>Gesamt (IST):</span><span>{formatTime(reportStats.totalIst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginTop: '0.25rem', color: PRINT_STYLES.textMedium, fontWeight: '500' }}>
                  <span>Sollzeit (SOLL):</span><span>{formatTime(reportStats.totalTarget)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${PRINT_STYLES.borderLight}`, fontWeight: 'bold' }}>
                  <span>Saldo:</span>
                  <span style={{ color: reportStats.totalSaldo >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }}>
                    {formatSaldo(reportStats.totalSaldo)}
                  </span>
                </div>
              </div>
            </div>
            {/* PDF CONTENT END */}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PrintReport;