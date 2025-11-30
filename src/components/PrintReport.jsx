import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Loader, Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
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

const PrintReport = ({ entries, monthDate, employeeName, userPhoto, onClose }) => {
  const [filterMode, setFilterMode] = useState(() => getWeekNumber(new Date())); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const reportRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const baseWidth = 850; 
      const screenWidth = window.innerWidth;
      if (screenWidth < baseWidth) {
        const newScale = (screenWidth - 32) / baseWidth; 
        setScale(newScale);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        margin: 0, // Strikt 0 Margin
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          windowWidth: 850, 
          backgroundColor: "#ffffff"
        }, 
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
      } catch (uriError) { 
        console.error("URI Fehler:", uriError); 
      }

      if (shareUrl) {
        // HIER DER FIX: Teilen in eigenem Try/Catch, damit "Abbrechen" nicht als Fehler gilt
        try {
          await Share.share({ title: "Stundenzettel teilen", text: `Stundenzettel`, url: shareUrl });
          toast.success("📤 Datei bereitgestellt.");
        } catch (shareErr) {
          console.log("Teilen abgebrochen oder fehlgeschlagen", shareErr);
          // Kein Fehler-Toast hier, da die Datei ja erstellt wurde!
        }
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
    <div className="fixed inset-0 bg-slate-800 z-[200] overflow-y-auto">
      {/* TOPBAR */}
      <div 
        className="sticky top-0 bg-slate-900 text-white p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl z-50"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="flex items-center gap-4 w-full">
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X /></button>
          <h2 className="font-bold flex-1 text-center mr-10 text-xl">Berichtsvorschau</h2>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-center w-full">
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-sm flex-1 outline-none">
            <option value="month">Gesamter Monat</option>
            {availableWeeks.map((w) => <option key={w} value={w}>KW {w} ({getWeekLabel(w)})</option>)}
          </select>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadPdf} 
            disabled={isGenerating} 
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 text-base shadow-lg shadow-orange-900/20"
          >
            {isGenerating ? <Loader className="animate-spin" size={18} /> : <Download size={18} />} PDF
          </motion.button>
        </div>
      </div>

      {/* PREVIEW CONTAINER */}
      <div className="flex flex-col items-center p-4 min-h-screen">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `-${(1 - scale) * 100}%` }}>
          
          {/* PAPIER */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            id="report-to-print"
            ref={reportRef}
            // HIER DER FIX FÜR LEERE SEITE: min-h-[296mm] statt 297mm
            className="w-[210mm] min-w-[210mm] min-h-[296mm] mx-auto p-8 shadow-2xl"
            style={{ backgroundColor: PRINT_STYLES.bgWhite, color: PRINT_STYLES.textBlack, fontFamily: 'Arial, sans-serif' }}
          >
            {/* HEADER - TEXT LINKS, BILD RECHTS */}
            <div style={{ borderBottom: `2px solid ${PRINT_STYLES.borderDark}`, paddingBottom: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', color: PRINT_STYLES.textDark, margin: 0 }}>Stundenzettel</h1>
                <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: PRINT_STYLES.textMedium, marginTop: '0.25rem', margin: 0 }}>Kogler Aufzugsbau</p>
              </div>
              
              {/* RECHTE SEITE: CONTAINER FÜR TEXT UND BILD */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                
                {/* TEXTBLOCK */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '500', margin: 0 }}>Mitarbeiter: {employeeName}</p>
                  <p style={{ fontSize: '0.875rem', color: PRINT_STYLES.textMedium, margin: 0 }}>
                    Zeitraum: {monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                    {filterMode !== "month" && ` (KW ${filterMode})`}
                  </p>
                </div>

                {/* BILD - VERGRÖSSERT AUF 65px */}
                {userPhoto && (
                  <img 
                    src={userPhoto} 
                    alt="Mitarbeiter" 
                    style={{ width: '65px', height: '65px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${PRINT_STYLES.borderLight}`, display: 'block' }} 
                  />
                )}
              </div>
            </div>

            {/* TABLE */}
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

            {/* SUMMARY */}
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
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PrintReport;