import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Loader, Download, ChevronDown, FileText, ChevronLeft, ChevronRight, Check, MessageSquarePlus } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  WORK_CODES, 
  getWeekNumber, 
  formatTime, 
  formatSignedTime, 
  blobToBase64, 
  getTargetMinutesForDate
} from "../utils";
import { usePeriodStats } from "../hooks/usePeriodStats"; // <--- Hook importieren

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

const PrintReport = ({ entries, monthDate, employeeName, userPhoto, onClose, onMonthChange, userData }) => {
  
  const [filterMode, setFilterMode] = useState(() => {
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
  const reportRef = useRef(null);

  useEffect(() => {
    const calculateFitScale = () => {
      if (isGenerating) return;
      const A4_WIDTH_PX = 794; 
      const availableWidth = window.innerWidth - 24; 
      let optimalScale = availableWidth / A4_WIDTH_PX;
      optimalScale = Math.min(Math.max(optimalScale, 0.3), 1.0);
      setScale(optimalScale);
    };
    calculateFitScale();
    window.addEventListener("resize", calculateFitScale);
    return () => window.removeEventListener("resize", calculateFitScale);
  }, [isGenerating]);

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

  // Liste der angezeigten Einträge filtern
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

  const currentLabel = useMemo(() => {
    if (filterMode === "month") return "Gesamter Monat";
    return `KW ${filterMode} (${getWeekLabel(filterMode)})`;
  }, [filterMode, availableWeeks, monthDate]);

  // --- STATISTIK BERECHNUNG ÜBER DEN HOOK ---
  // Wir definieren den Zeitraum für den Hook dynamisch basierend auf dem Filter
  const { periodStart, periodEnd } = useMemo(() => {
    if (filterMode === "month") {
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      return { periodStart: start, periodEnd: end };
    } else {
      // Wochen-Filter
      if (filteredEntries.length > 0) {
        const d = new Date(filteredEntries[0].date);
        const day = d.getDay() || 7;
        const start = new Date(d);
        start.setDate(d.getDate() - day + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { periodStart: start, periodEnd: end };
      } else {
        // Fallback falls Woche leer ist
        return { periodStart: new Date(), periodEnd: new Date() };
      }
    }
  }, [filterMode, monthDate, filteredEntries]);

  // Der Hook macht die ganze Arbeit!
  const stats = usePeriodStats(entries, userData, periodStart, periodEnd);
  // ------------------------------------------

  // --- META MAP ---
  const dayMetaMap = useMemo(() => {
    const map = {}; let currentDateStr = ""; let dayIndex = 0; const sums = {};
    filteredEntries.forEach((e) => {
      if (!sums[e.date]) sums[e.date] = { totalMinutes: 0 };
      if (!(e.type === "work" && e.code === 19)) sums[e.date].totalMinutes += e.netDuration;
    });
    filteredEntries.forEach((e, idx) => {
      if (e.date !== currentDateStr) { dayIndex++; currentDateStr = e.date; }
      const target = getTargetMinutesForDate(e.date, userData?.workDays);
      const nextEntry = filteredEntries[idx + 1];
      const isLastOfDay = !nextEntry || nextEntry.date !== e.date;
      const balance = sums[e.date].totalMinutes - target;
      map[e.id] = { dayIndex, isEvenDay: dayIndex % 2 === 0, showBalance: isLastOfDay && target > 0, balance: balance };
    });
    return map;
  }, [filteredEntries, userData]);

  const handleDownloadPdf = async () => {
    try {
      const originalScale = scale;
      setIsGenerating(true);
      setScale(1); 
      
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = document.getElementById("report-to-print");
      if (!element) throw new Error("PDF Element fehlt");

      let timePeriod = "";
      const employeeNameClean = employeeName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      if (filterMode === "month") {
        timePeriod = monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      } else {
        const weekLabel = getWeekLabel(filterMode); 
        timePeriod = `KW_${filterMode}_(${weekLabel.replace(/[\s-.]/g, '')})`; 
      }
      const timestamp = new Date().getTime().toString().slice(-6); 
      const filename = `${employeeNameClean}_Stundenzettel_${timePeriod.replace(/\s+/g, '_')}_${timestamp}.pdf`; 

      const opt = {
        margin: 5, 
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 794, scrollY: 0, backgroundColor: "#ffffff" }, 
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: 'css' } 
      };

      const worker = html2pdf().set(opt).from(element);

      if (!Capacitor.isNativePlatform()) {
        await worker.save();
        setScale(originalScale);
        setIsGenerating(false);
        toast.success("🖨️ Druck erfolgreich!");
        return;
      }

      const pdfBlob = await worker.output("blob");
      const base64 = await blobToBase64(pdfBlob);

      setScale(originalScale);
      setIsGenerating(false);

      await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache, encoding: Encoding.BASE64, recursive: true });
      const uriResult = await Filesystem.getUri({ path: filename, directory: Directory.Cache }); 
      await Share.share({ title: "Stundenzettel", url: uriResult.uri });
      toast.success("🖨️ Druck erfolgreich vorbereitet");
      
    } catch (err) {
      if (err.message && (err.message.includes("canceled") || err.message.includes("cancelled"))) { return; }
      console.error(err);
      toast.error("❌ Fehler: " + err.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col h-full">
      {/* 1. TOPBAR */}
      <div className="bg-slate-900 text-white p-3 shadow-xl z-50 shrink-0" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2 text-slate-100 min-w-0">
                <FileText size={20} className="text-orange-500 shrink-0" /> <span className="truncate">Vorschau</span>
            </h2>
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button onClick={() => handleMonthChange(-1)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300"><ChevronLeft size={18} /></button>
              <span className="px-2 text-sm font-bold w-24 text-center tabular-nums">{monthDate.toLocaleDateString("de-DE", { month: "short", year: "2-digit" })}</span>
              <button onClick={() => handleMonthChange(1)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300"><ChevronRight size={18} /></button>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors shrink-0"><X size={20} /></button>
        </div>

        <div className="flex gap-2 items-center">
            <button onClick={() => setIsNoteModalOpen(true)} className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${customNote ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}><MessageSquarePlus size={20} /></button>
            <div className="relative flex-1 min-w-0">
                <button onClick={() => setIsPickerOpen(!isPickerOpen)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-2 pl-3 pr-8 text-sm font-medium flex items-center justify-between transition-colors hover:border-orange-500/50 active:bg-slate-700">
                    <span className="truncate">{currentLabel}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPickerOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                    {isPickerOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsPickerOpen(false)} />
                            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1">
                                <div onClick={() => { setFilterMode("month"); setIsPickerOpen(false); }} className={`px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-slate-700/50 ${filterMode === "month" ? "text-orange-500 bg-slate-700/50" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
                                    <span>Gesamter Monat</span>{filterMode === "month" && <Check size={16} />}
                                </div>
                                {availableWeeks.map((w) => (
                                    <div key={w} onClick={() => { setFilterMode(w); setIsPickerOpen(false); }} className={`px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-slate-700/50 last:border-0 ${Number(filterMode) === w ? "text-orange-500 bg-slate-700/50" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
                                        <span>KW {w} ({getWeekLabel(w)})</span>{Number(filterMode) === w && <Check size={16} />}
                                    </div>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPdf} disabled={isGenerating} className="bg-orange-500 hover:bg-orange-600 text-white p-2 px-4 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-900/20 shrink-0">
                {isGenerating ? <Loader className="animate-spin" size={18} /> : <Download size={18} />} <span className="hidden sm:inline">PDF</span>
            </motion.button>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/50 relative overflow-hidden flex flex-col items-center justify-start py-8 overflow-y-auto touch-pan-y">
        <div className="origin-top transition-transform duration-200 shadow-2xl bg-white" style={{ transform: `scale(${scale})`, width: '210mm', minHeight: '297mm', marginBottom: '5rem' }}>
          <div id="report-to-print" ref={reportRef} style={{ width: '100%', backgroundColor: 'white', padding: '5mm', color: PRINT_STYLES.textBlack, fontFamily: 'Arial, sans-serif' }}>
            <div style={{ borderBottom: `2px solid ${PRINT_STYLES.borderDark}`, paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', textTransform: 'uppercase', color: PRINT_STYLES.textDark, margin: 0 }}>Stundenzettel</h1>
                <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: PRINT_STYLES.textMedium, marginTop: '0.25rem', margin: 0 }}>Kogler Aufzugsbau</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{employeeName}</p>
                  <p style={{ fontSize: '0.8rem', color: PRINT_STYLES.textMedium, margin: 0 }}>
                    {monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                    {filterMode !== "month" && ` (KW ${filterMode})`}
                  </p>
                </div>
                {userPhoto && ( <img src={userPhoto} alt="Mitarbeiter" style={{ width: '55px', height: '55px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${PRINT_STYLES.borderLight}`, display: 'block' }} /> )}
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', marginBottom: '1rem', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${PRINT_STYLES.borderDark}`, color: PRINT_STYLES.textMedium, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.4rem 0', width: '5rem' }}>Datum</th>
                  <th style={{ padding: '0.4rem 0', width: '6rem' }}>Zeit</th>
                  <th style={{ padding: '0.4rem 0' }}>Projekt</th>
                  <th style={{ padding: '0.4rem 0', width: '5.5rem' }}>Code</th>
                  <th style={{ padding: '0.4rem 0', width: '3.5rem', textAlign: 'right' }}>Std.</th>
                  <th style={{ padding: '0.4rem 0', width: '3.5rem', textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e, idx) => { 
                  const d = new Date(e.date);
                  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2);
                  const ds = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                  const meta = dayMetaMap[e.id] || {};
                  const prevEntry = filteredEntries[idx - 1];
                  const nextEntry = filteredEntries[idx + 1];
                  const isSameDay = prevEntry && prevEntry.date === e.date;
                  const isLastOfDay = !nextEntry || nextEntry.date !== e.date; 

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
                    const pauseText = e.pause > 0 ? `Pause: ${e.pause}m` : "KEINE PAUSE";
                    const pauseColor = e.pause > 0 ? PRINT_STYLES.textMedium : PRINT_STYLES.textLight;
                    timeCellContent = ( <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}> <span style={{ fontWeight: 'bold', color: PRINT_STYLES.textDark, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{e.start} – {e.end}</span> <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', marginTop: '2px', color: pauseColor }}>{pauseText}</span> </div> );
                  } else if (e.type === "public_holiday") {
                    timeCellContent = <span style={{ fontWeight: 'bold', color: PRINT_STYLES.textDark }}>Feiertag</span>;
                    projectText = e.project || "Gesetzlicher Feiertag";
                    durationDisplay = formatTime(e.netDuration);
                    timeColor = PRINT_STYLES.textBlue;
                  } else if (e.type === "time_comp") {
                    timeCellContent = <span style={{ color: PRINT_STYLES.textLight }}>-</span>;
                    projectText = "Zeitausgleich";
                    timeColor = '#7e22ce'; 
                  } else {
                    timeCellContent = <span style={{ color: PRINT_STYLES.textLight }}>-</span>;
                    projectText = e.type === "vacation" ? "Urlaub" : "Krank";
                  }

                  const borderStyle = isLastOfDay ? `1px solid ${PRINT_STYLES.borderLight}` : 'none';

                  return (
                    <tr key={e.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', backgroundColor: rowBg, borderBottom: borderStyle }}>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {!isSameDay && ( <> <span style={{ display: 'inline-block', width: '2rem', fontWeight: 'bold' }}>{wd}</span> <span style={{ color: PRINT_STYLES.textMedium }}>{ds}</span> </> )}
                      </td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'top' }}>{timeCellContent}</td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'top', whiteSpace: 'normal', wordWrap: 'break-word', paddingRight: '0.5rem' }}>
                        <span style={{ fontWeight: '500', color: e.type === "public_holiday" ? PRINT_STYLES.textBlue : e.type === "time_comp" ? '#7e22ce' : PRINT_STYLES.textMedium }}>{projectText}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'top', fontSize: '0.75rem', color: PRINT_STYLES.textMedium, whiteSpace: 'normal', wordWrap: 'break-word' }}>{codeText}</td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'bottom', textAlign: 'right', fontWeight: 'bold', color: timeColor }}>{durationDisplay}</td>
                      <td style={{ padding: '0.5rem 0', verticalAlign: 'bottom', textAlign: 'right', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {meta.showBalance && ( <span style={{ color: meta.balance >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }}> {formatSignedTime(meta.balance)} </span> )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '0.5rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div style={{ backgroundColor: PRINT_STYLES.bgGray, padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${PRINT_STYLES.borderLight}` }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem', borderBottom: `1px solid ${PRINT_STYLES.borderLight}`, paddingBottom: '0.1rem', color: PRINT_STYLES.textMedium }}>Zusammenfassung</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.1rem' }}>
                        <span>Arbeit (inkl. Anreise):</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.work)}</span>
                        </div>
                        {stats.holiday > 0 && ( <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.1rem', color: PRINT_STYLES.textBlue }}> <span>Feiertage:</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.holiday)}</span> </div> )}
                        {stats.vacation > 0 && ( <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.1rem', color: PRINT_STYLES.textBlue }}> <span>Urlaub:</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.vacation)}</span> </div> )}
                        {stats.timeComp > 0 && ( <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.1rem', color: '#7e22ce' }}> <span>Zeitausgleich:</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.timeComp)}</span> </div> )}
                        {stats.sick > 0 && ( <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.1rem', color: PRINT_STYLES.textRed }}> <span>Krankenstand:</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.sick)}</span> </div> )}
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.1rem', borderBottom: `1px dashed ${PRINT_STYLES.borderLight}`, paddingBottom: '2px' }}>
                            <span>Gesamt (IST):</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.totalIst)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.1rem', color: PRINT_STYLES.textMedium }}>
                            <span>Sollzeit (SOLL):</span><span>{formatTime(stats.totalTarget)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.3rem', fontWeight: 'bold' }}>
                            <span>Saldo:</span>
                            <span style={{ color: stats.totalSaldo >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }}>
                                {formatSignedTime(stats.totalSaldo)}
                            </span>
                        </div>
                        
                        {(stats.overtimeSplit.mehrarbeit > 0 || stats.overtimeSplit.ueberstunden > 0) && (
                            <div style={{ marginTop: '0.4rem', paddingTop: '0.2rem', borderTop: `1px dashed ${PRINT_STYLES.borderLight}` }}>
                                {stats.overtimeSplit.mehrarbeit > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: PRINT_STYLES.textBlue }}>
                                        <span>Mehrarbeit:</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.overtimeSplit.mehrarbeit)}</span>
                                    </div>
                                )}
                                {stats.overtimeSplit.ueberstunden > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7e22ce' }}>
                                        <span>Überstunden:</span><span style={{ fontWeight: 'bold' }}>{formatTime(stats.overtimeSplit.ueberstunden)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {stats.drive > 0 && ( <div style={{ borderTop: `1px solid ${PRINT_STYLES.borderLight}`, marginTop: '0.3rem', paddingTop: '0.2rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: PRINT_STYLES.textLight, fontStyle: 'italic' }}> <span>Fahrtzeit (unbezahlt):</span><span>{formatTime(stats.drive)}</span> </div> )}
              </div>
            </div>
            {customNote && ( <div style={{ marginTop: '1.5rem', pageBreakInside: 'avoid', breakInside: 'avoid', borderTop: `2px dashed ${PRINT_STYLES.borderLight}`, paddingTop: '1rem' }}> <h3 style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: PRINT_STYLES.textMedium, marginBottom: '0.5rem' }}>Anmerkungen / Notiz:</h3> <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.4', color: PRINT_STYLES.textDark }}>{customNote}</p> </div> )}
          </div>
        </div>
      </div>
      <AnimatePresence> {isNoteModalOpen && ( <div className="fixed inset-0 z-[250] flex items-center justify-center p-4"> <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsNoteModalOpen(false)} /> <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-5"> <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-white">Notiz für PDF</h3> <textarea className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" placeholder="Z.B. Zusätzliche Infos, Bankverbindung, etc..." value={customNote} onChange={(e) => setCustomNote(e.target.value)} /> <div className="flex justify-end gap-2 mt-4"> <button onClick={() => setCustomNote("")} className="text-red-500 text-sm font-medium px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">Löschen</button> <button onClick={() => setIsNoteModalOpen(false)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-4 py-2 rounded-lg">Fertig</button> </div> </motion.div> </div> )} </AnimatePresence>
    </div>
  );
};

export default PrintReport;