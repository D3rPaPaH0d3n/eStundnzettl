import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Loader, Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { WORK_CODES, getWeekNumber, formatTime, blobToBase64 } from "../utils";

const PrintReport = ({ entries, monthDate, employeeName, onClose }) => {
  // Startwert ist die aktuelle Kalenderwoche
  const [filterMode, setFilterMode] = useState(() => getWeekNumber(new Date())); 
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Zoom-Faktor State
  const [scale, setScale] = useState(1);
  const reportRef = useRef(null);

  // Automatische Skalierung berechnen
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

  // ** NEU: Helper für Datumsbereich der KW **
  const getWeekLabel = (week) => {
    const year = monthDate.getFullYear();
    // Berechnung des Montags der KW nach ISO-8601
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    // Montag
    const monday = new Date(ISOweekStart);
    // Sonntag
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
    let list =
      filterMode === "month"
        ? [...entries]
        : entries.filter(
            (e) => getWeekNumber(new Date(e.date)) === Number(filterMode)
          );

    list.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
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
    } else {
      periodStart = new Date();
      periodEnd = new Date();
    }

    filteredEntries.forEach((e) => {
      if (e.type === "work") {
        if (e.code === 19) drive += e.netDuration;
        else work += e.netDuration;
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
    const map = {};
    let currentDateStr = "";
    let dayIndex = 0;
    const sums = {};

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
      if (!element) {
        toast.error("❌ Fehler: PDF-Element nicht gefunden.");
        return;
      }

      const timestamp = new Date().getTime().toString().slice(-6);
      const filename = `Stundenzettel_${timestamp}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 850 }, 
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

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        encoding: Encoding.BASE64,
        recursive: true,
      });

      let shareUrl;
      try {
        const uriResult = await Filesystem.getUri({ path: filename, directory: Directory.Documents });
        shareUrl = uriResult.uri || uriResult.path;
      } catch (uriError) { console.error("URI Fehler:", uriError); }

      if (shareUrl) {
        await Share.share({ title: "Stundenzettel teilen", text: `Stundenzettel`, url: shareUrl });
        toast.success("📤 PDF bereitgestellt zum Teilen.");
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
    <div className="fixed inset-0 bg-slate-800 z-50 overflow-y-auto">
      {/* TOPBAR */}
      <div 
        className="sticky top-0 bg-slate-900 text-white p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl z-50"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="flex items-center gap-4 w-full">
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
            <X />
          </button>
          <h2 className="font-bold flex-1 text-center mr-10 text-xl">Berichtsvorschau</h2>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-center w-full">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded p-2 text-sm flex-1"
          >
            <option value="month">Gesamter Monat</option>
            {/* ** ÄNDERUNG: Hier wird jetzt der Datumsbereich angezeigt ** */}
            {availableWeeks.map((w) => (
              <option key={w} value={w}>KW {w} ({getWeekLabel(w)})</option>
            ))}
          </select>
          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 text-base"
          >
            {isGenerating ? <Loader className="animate-spin" size={18} /> : <Download size={18} />}
            PDF
          </button>
        </div>
      </div>

      {/* PREVIEW CONTAINER */}
      <div className="flex flex-col items-center p-4 min-h-screen">
        <div 
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center', 
            marginBottom: `-${(1 - scale) * 100}%` 
          }}
        >
          <div
            id="report-to-print"
            ref={reportRef}
            className="bg-white w-[210mm] min-w-[210mm] min-h-[297mm] mx-auto p-8 shadow-2xl text-black"
          >
            {/* HEADER */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">Stundenzettel</h1>
                <p className="text-sm font-bold text-slate-500 mt-1">Kogler Aufzugsbau</p>
              </div>
              <div className="text-right">
                <p className="font-medium">Mitarbeiter: {employeeName}</p>
                <p className="text-slate-500 text-sm">
                  Zeitraum: {monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                  {filterMode !== "month" && ` (KW ${filterMode})`}
                </p>
              </div>
            </div>

            {/* TABLE */}
            <table className="w-full text-sm text-left mb-8 border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-500 uppercase text-xs">
                  <th className="py-2 w-16">Datum</th>
                  <th className="py-2 w-24">Zeit</th>
                  <th className="py-2">Projekt</th>
                  <th className="py-2 w-24">Code</th>
                  <th className="py-2 w-14 text-right">Std.</th>
                  <th className="py-2 w-14 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => {
                  const d = new Date(e.date);
                  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2);
                  const ds = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                  const meta = dayMetaMap[e.id] || {};

                  let rowStyle = meta.isEvenDay ? { backgroundColor: "#f8faff" } : {};
                  let rowClass = "break-inside-avoid border-b border-slate-100";
                  if (e.type === "public_holiday") rowClass += " bg-blue-100/50";

                  let projectText = e.project;
                  let codeText = WORK_CODES.find((c) => c.id === e.code)?.label || "";
                  let durationDisplay = formatTime(e.netDuration);
                  let durationClass = "py-2 text-right font-bold align-top text-slate-900";
                  let timeCellContent = null;

                  if (e.type === "work") {
                    if (e.code === 19) {
                        durationDisplay = "-";
                        durationClass = "py-2 text-right font-medium align-top text-slate-400";
                    }
                    timeCellContent = (
                        <div className="flex flex-col justify-start">
                            <span className="font-bold text-slate-800 leading-tight whitespace-nowrap">{e.start} – {e.end}</span>
                            <span className={`text-[10px] uppercase tracking-wide mt-0.5 ${e.pause > 0 ? "text-slate-500" : "text-slate-400 italic"}`}>
                                {e.pause > 0 ? `Pause: ${e.pause}m` : "Keine Pause"}
                            </span>
                        </div>
                    );
                  } else if (e.type === "public_holiday") {
                    timeCellContent = <span className="font-bold text-slate-800">Feiertag</span>;
                    projectText = e.project || "Gesetzlicher Feiertag";
                    durationClass = "py-2 text-right font-bold align-top text-blue-800";
                  } else {
                    timeCellContent = <span className="text-slate-400">-</span>;
                    projectText = e.type === "vacation" ? "Urlaub" : "Krank";
                  }

                  return (
                    <tr key={e.id} className={rowClass} style={rowStyle}>
                      <td className="py-2 pl-2 font-medium align-top whitespace-nowrap"><span className="font-bold">{wd}</span> <span className="text-slate-600">{ds}</span></td>
                      <td className="py-2 align-top">{timeCellContent}</td>
                      <td className="py-2 align-top"><span className={`font-medium ${e.type === "public_holiday" ? "text-blue-800" : "text-slate-700"}`}>{projectText}</span></td>
                      <td className="py-2 align-top text-xs text-slate-500">{codeText}</td>
                      <td className={durationClass}>{durationDisplay}</td>
                      <td className="py-2 pr-2 text-right align-top font-bold text-xs">
                        {meta.showBalance && <span className={meta.balance >= 0 ? "text-green-600" : "text-red-600"}>{formatSaldo(meta.balance)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-8 break-inside-avoid">
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h3 className="font-bold text-sm uppercase mb-3 border-b border-slate-200 pb-1">Zusammenfassung</h3>
                <div className="flex justify-between text-sm mb-1"><span>Arbeitszeit (inkl. Anreise):</span><span className="font-bold">{formatTime(reportStats.work)}</span></div>
                <div className="flex justify-between text-sm mb-1 text-blue-700"><span>Feiertage:</span><span className="font-bold">{formatTime(reportStats.holiday)}</span></div>
                <div className="flex justify-between text-sm mb-1 text-blue-700"><span>Urlaub:</span><span className="font-bold">{formatTime(reportStats.vacation)}</span></div>
                <div className="flex justify-between text-sm mb-1 text-red-700"><span>Krankenstand:</span><span className="font-bold">{formatTime(reportStats.sick)}</span></div>
                {reportStats.drive > 0 && <div className="flex justify-between text-sm mb-1 text-slate-400 italic mt-2"><span>Fahrtzeit (unbezahlt):</span><span>{formatTime(reportStats.drive)}</span></div>}
                
                <div className="flex justify-between text-base mt-2 pt-2 border-t border-slate-300 font-bold"><span>Gesamt (IST):</span><span>{formatTime(reportStats.totalIst)}</span></div>
                <div className="flex justify-between text-sm mt-1 text-slate-500 font-medium"><span>Sollzeit (SOLL):</span><span>{formatTime(reportStats.totalTarget)}</span></div>
                <div className="flex justify-between text-base mt-2 pt-2 border-t border-slate-300 font-bold"><span>Saldo:</span><span className={reportStats.totalSaldo >= 0 ? "text-green-600" : "text-red-600"}>{formatSaldo(reportStats.totalSaldo)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintReport;