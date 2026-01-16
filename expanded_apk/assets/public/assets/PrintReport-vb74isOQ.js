import { r as reactExports, j as jsxRuntimeExports, ab as Capacitor, a6 as zt, ae as Filesystem, af as Encoding, ad as Directory, aj as Share } from "./vendor-BoN8boPx.js";
import { h as html2pdf } from "./pdf-libs-D6cDjtJ1.js";
import { g as getWeekNumber, a as getWeekRangeInMonth, u as usePeriodStats, b as getTargetMinutesForDate, E as ExportModal, W as WORK_CODES, f as formatTime, c as formatSignedTime, d as blobToBase64 } from "./index-ylejlbmx.js";
import { F as FileText, C as ChevronLeft, a as ChevronRight, X, a1 as MessageSquarePlus, a2 as ChevronDown, c as Check, p as Loader, D as Download } from "./icons-BtkGeADx.js";
import { A as AnimatePresence, m as motion } from "./animation-3vmyltdZ.js";
const PRINT_STYLES = {
  textBlack: "#000000",
  textDark: "#27272a",
  // Zinc-800
  textMedium: "#52525b",
  // Zinc-600
  textLight: "#a1a1aa",
  bgGray: "#fafafa",
  // Zinc-50
  bgZebra: "#f4f4f5",
  // Zinc-100
  bgBlueLight: "#eff6ff",
  textBlue: "#1e40af",
  textRed: "#b91c1c",
  textGreen: "#15803d",
  borderDark: "#27272a",
  // Zinc-800
  borderLight: "#e4e4e7"
  // Zinc-200
};
const PrintReport = ({ entries, monthDate, employeeName, userPhoto, onClose, onMonthChange, userData }) => {
  const [filterMode, setFilterMode] = reactExports.useState(() => {
    const today = /* @__PURE__ */ new Date();
    if (monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear()) {
      return getWeekNumber(today);
    }
    return "month";
  });
  const [isGenerating, setIsGenerating] = reactExports.useState(false);
  const [scale, setScale] = reactExports.useState(1);
  const [isPickerOpen, setIsPickerOpen] = reactExports.useState(false);
  const [customNote, setCustomNote] = reactExports.useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = reactExports.useState(false);
  const [showExportModal, setShowExportModal] = reactExports.useState(false);
  const reportRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const calculateFitScale = () => {
      if (isGenerating) return;
      const A4_WIDTH_PX = 794;
      const availableWidth = window.innerWidth - 24;
      let optimalScale = availableWidth / A4_WIDTH_PX;
      optimalScale = Math.min(Math.max(optimalScale, 0.3), 1);
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
  const filteredEntries = reactExports.useMemo(() => {
    let list = filterMode === "month" ? [...entries] : entries.filter((e) => getWeekNumber(new Date(e.date)) === Number(filterMode));
    list.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return da - db;
      return (a.start || "").localeCompare(b.start || "");
    });
    return list;
  }, [entries, filterMode]);
  const availableWeeks = reactExports.useMemo(() => {
    const w = new Set(entries.map((e) => getWeekNumber(new Date(e.date))));
    return Array.from(w).sort((a, b) => b - a);
  }, [entries]);
  const currentLabel = reactExports.useMemo(() => {
    if (filterMode === "month") return "Gesamter Monat";
    return `KW ${filterMode} (${getWeekLabel(filterMode)})`;
  }, [filterMode, availableWeeks, monthDate]);
  const { periodStart, periodEnd } = reactExports.useMemo(() => {
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
        return { periodStart: /* @__PURE__ */ new Date(), periodEnd: /* @__PURE__ */ new Date() };
      }
    }
  }, [filterMode, monthDate, filteredEntries]);
  const stats = usePeriodStats(entries, userData, periodStart, periodEnd);
  const dayMetaMap = reactExports.useMemo(() => {
    const map = {};
    let currentDateStr = "";
    let dayIndex = 0;
    const sums = {};
    filteredEntries.forEach((e) => {
      if (!sums[e.date]) sums[e.date] = { totalMinutes: 0 };
      if (!(e.type === "work" && e.code === 19)) sums[e.date].totalMinutes += e.netDuration;
    });
    filteredEntries.forEach((e, idx) => {
      if (e.date !== currentDateStr) {
        dayIndex++;
        currentDateStr = e.date;
      }
      const target = getTargetMinutesForDate(e.date, userData?.workDays);
      const nextEntry = filteredEntries[idx + 1];
      const isLastOfDay = !nextEntry || nextEntry.date !== e.date;
      const balance = sums[e.date].totalMinutes - target;
      map[e.id] = { dayIndex, isEvenDay: dayIndex % 2 === 0, showBalance: isLastOfDay && target > 0, balance };
    });
    return map;
  }, [filteredEntries, userData]);
  const handlePdfAction = async (actionType) => {
    try {
      setShowExportModal(false);
      const originalScale = scale;
      setIsGenerating(true);
      setScale(1);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const element = document.getElementById("report-to-print");
      if (!element) throw new Error("PDF Element fehlt");
      let timePeriod = "";
      const employeeNameClean = employeeName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      if (filterMode === "month") {
        timePeriod = monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      } else {
        const weekLabel = getWeekLabel(filterMode);
        timePeriod = `KW_${filterMode}_(${weekLabel.replace(/[\s-.]/g, "")})`;
      }
      const timestamp = (/* @__PURE__ */ new Date()).getTime().toString().slice(-6);
      const filename = `${employeeNameClean}_Stundenzettel_${timePeriod.replace(/\s+/g, "_")}_${timestamp}.pdf`;
      const opt = {
        margin: 5,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 794, scrollY: 0, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: "css" }
      };
      const worker = html2pdf().set(opt).from(element);
      if (!Capacitor.isNativePlatform()) {
        await worker.save();
        zt.success("🖨️ Download gestartet!");
      } else {
        const pdfBlob = await worker.output("blob");
        const base64 = await blobToBase64(pdfBlob);
        if (actionType === "share") {
          await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache, encoding: Encoding.BASE64, recursive: true });
          const uriResult = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
          await Share.share({ title: "Stundenzettel", url: uriResult.uri });
          zt.success("Bereit zum Teilen");
        } else {
          await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents, encoding: Encoding.BASE64, recursive: true });
          zt.success("Gespeichert in 'Dokumente'", { icon: "📂" });
        }
      }
      setScale(originalScale);
      setIsGenerating(false);
    } catch (err) {
      if (err.message && (err.message.includes("canceled") || err.message.includes("cancelled"))) {
        setIsGenerating(false);
        setScale(1);
        return;
      }
      console.error(err);
      zt.error("Fehler: " + err.message);
      setIsGenerating(false);
      setScale(1);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 bg-zinc-950 z-[200] flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExportModal,
      {
        isOpen: showExportModal,
        onClose: () => setShowExportModal(false),
        onSelectFolder: () => handlePdfAction("folder"),
        onSelectShare: () => handlePdfAction("share"),
        isPdf: true
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-900 text-white p-3 shadow-xl z-50 shrink-0", style: { paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "font-bold text-lg flex items-center gap-2 text-zinc-100 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 20, className: "text-emerald-500 shrink-0" }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: "Vorschau" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleMonthChange(-1), className: "p-1.5 hover:bg-zinc-700 rounded-md text-zinc-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 18 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 text-sm font-bold w-24 text-center tabular-nums", children: monthDate.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleMonthChange(1), className: "p-1.5 hover:bg-zinc-700 rounded-md text-zinc-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 18 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 20 }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsNoteModalOpen(true), className: `p-2 rounded-lg border flex items-center justify-center transition-colors ${customNote ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquarePlus, { size: 20 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setIsPickerOpen(!isPickerOpen), className: "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg py-2 pl-3 pr-8 text-sm font-medium flex items-center justify-between transition-colors hover:border-emerald-500/50 active:bg-zinc-700", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: currentLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 16, className: `text-zinc-400 transition-transform ${isPickerOpen ? "rotate-180" : ""}` })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isPickerOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40", onClick: () => setIsPickerOpen(false) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: { opacity: 0, y: -10, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.95 }, transition: { duration: 0.15 }, className: "absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 py-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onClick: () => {
                setFilterMode("month");
                setIsPickerOpen(false);
              }, className: `px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-zinc-700/50 ${filterMode === "month" ? "text-emerald-500 bg-zinc-700/50" : "text-zinc-300 hover:bg-zinc-700 hover:text-white"}`, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Gesamter Monat" }),
                filterMode === "month" && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 16 })
              ] }),
              availableWeeks.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onClick: () => {
                setFilterMode(w);
                setIsPickerOpen(false);
              }, className: `px-4 py-3 text-sm font-medium flex items-center justify-between cursor-pointer border-b border-zinc-700/50 last:border-0 ${Number(filterMode) === w ? "text-emerald-500 bg-zinc-700/50" : "text-zinc-300 hover:bg-zinc-700 hover:text-white"}`, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "KW ",
                  w,
                  " (",
                  getWeekLabel(w),
                  ")"
                ] }),
                Number(filterMode) === w && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 16 })
              ] }, w))
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.button,
          {
            whileTap: { scale: 0.95 },
            onClick: () => setShowExportModal(true),
            disabled: isGenerating,
            className: "bg-emerald-600 hover:bg-emerald-700 text-white p-2 px-4 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20 shrink-0",
            children: [
              isGenerating ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader, { className: "animate-spin", size: 18 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 18 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "PDF" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-zinc-800/50 relative overflow-hidden flex flex-col items-center justify-start py-8 overflow-y-auto touch-pan-y", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "origin-top transition-transform duration-200 shadow-2xl bg-white", style: { transform: `scale(${scale})`, width: "210mm", minHeight: "297mm", marginBottom: "5rem" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { id: "report-to-print", ref: reportRef, style: { width: "100%", backgroundColor: "white", padding: "5mm", color: PRINT_STYLES.textBlack, fontFamily: "Arial, sans-serif" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderBottom: `2px solid ${PRINT_STYLES.borderDark}`, paddingBottom: "0.75rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: "1.6rem", fontWeight: "bold", textTransform: "uppercase", color: PRINT_STYLES.textDark, margin: 0 }, children: "Stundenzettel" }),
          userData.company && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: "0.9rem", fontWeight: "bold", color: PRINT_STYLES.textMedium, marginTop: "0.25rem", margin: 0 }, children: userData.company })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "right" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontWeight: "500", fontSize: "0.9rem", margin: 0 }, children: employeeName }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: "0.8rem", color: PRINT_STYLES.textMedium, margin: 0 }, children: [
              monthDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
              filterMode !== "month" && ` (KW ${filterMode})`
            ] })
          ] }),
          userPhoto && /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: userPhoto, alt: "Mitarbeiter", style: { width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${PRINT_STYLES.borderLight}`, display: "block" } })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", fontSize: "0.85rem", textAlign: "left", marginBottom: "1rem", borderCollapse: "collapse", tableLayout: "fixed" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: `2px solid ${PRINT_STYLES.borderDark}`, color: PRINT_STYLES.textMedium, textTransform: "uppercase", fontSize: "0.75rem" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "0.4rem 0", width: "5rem" }, children: "Datum" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "0.4rem 0", width: "6rem" }, children: "Zeit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "0.4rem 0" }, children: "Projekt" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "0.4rem 0", width: "5.5rem" }, children: "Code" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "0.4rem 0", width: "3.5rem", textAlign: "right" }, children: "Std." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "0.4rem 0", width: "3.5rem", textAlign: "right" }, children: "Saldo" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredEntries.map((e, idx) => {
          const d = new Date(e.date);
          const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2);
          const ds = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
          const meta = dayMetaMap[e.id] || {};
          const prevEntry = filteredEntries[idx - 1];
          const nextEntry = filteredEntries[idx + 1];
          const isSameDay = prevEntry && prevEntry.date === e.date;
          const isLastOfDay = !nextEntry || nextEntry.date !== e.date;
          let rowBg = "transparent";
          if (e.type === "public_holiday") rowBg = PRINT_STYLES.bgBlueLight;
          else if (meta.isEvenDay) rowBg = PRINT_STYLES.bgZebra;
          let projectText = e.project;
          let codeText = WORK_CODES.find((c) => c.id === e.code)?.label || "";
          let durationDisplay = formatTime(e.netDuration);
          let timeColor = PRINT_STYLES.textDark;
          let timeCellContent = null;
          if (e.type === "work") {
            if (e.code === 19) {
              durationDisplay = "-";
              timeColor = PRINT_STYLES.textLight;
            }
            const pauseText = e.pause > 0 ? `Pause: ${e.pause}m` : "KEINE PAUSE";
            const pauseColor = e.pause > 0 ? PRINT_STYLES.textMedium : PRINT_STYLES.textLight;
            timeCellContent = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center" }, children: [
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontWeight: "bold", color: PRINT_STYLES.textDark, lineHeight: 1.2, whiteSpace: "nowrap" }, children: [
                e.start,
                " – ",
                e.end
              ] }),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "0.65rem", textTransform: "uppercase", marginTop: "2px", color: pauseColor }, children: pauseText }),
              " "
            ] });
          } else if (e.type === "public_holiday") {
            timeCellContent = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold", color: PRINT_STYLES.textDark }, children: "Feiertag" });
            projectText = e.project || "Gesetzlicher Feiertag";
            durationDisplay = formatTime(e.netDuration);
            timeColor = PRINT_STYLES.textBlue;
          } else if (e.type === "time_comp") {
            timeCellContent = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: PRINT_STYLES.textLight }, children: "-" });
            projectText = "Zeitausgleich";
            timeColor = "#7e22ce";
          } else {
            timeCellContent = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: PRINT_STYLES.textLight }, children: "-" });
            projectText = e.type === "vacation" ? "Urlaub" : "Krank";
          }
          const borderStyle = isLastOfDay ? `1px solid ${PRINT_STYLES.borderLight}` : "none";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { pageBreakInside: "avoid", breakInside: "avoid", backgroundColor: rowBg, borderBottom: borderStyle }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "0.5rem 0", verticalAlign: "top", whiteSpace: "nowrap" }, children: !isSameDay && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { display: "inline-block", width: "2rem", fontWeight: "bold" }, children: wd }),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: PRINT_STYLES.textMedium }, children: ds }),
              " "
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "0.5rem 0", verticalAlign: "top" }, children: timeCellContent }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "0.5rem 0", verticalAlign: "top", whiteSpace: "normal", wordWrap: "break-word", paddingRight: "0.5rem" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "500", color: e.type === "public_holiday" ? PRINT_STYLES.textBlue : e.type === "time_comp" ? "#7e22ce" : PRINT_STYLES.textMedium }, children: projectText }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "0.5rem 0", verticalAlign: "top", fontSize: "0.75rem", color: PRINT_STYLES.textMedium, whiteSpace: "normal", wordWrap: "break-word" }, children: codeText }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "0.5rem 0", verticalAlign: "bottom", textAlign: "right", fontWeight: "bold", color: timeColor }, children: durationDisplay }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "0.5rem 0", verticalAlign: "bottom", textAlign: "right", fontWeight: "bold", fontSize: "0.75rem" }, children: meta.showBalance && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: meta.balance >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }, children: [
              " ",
              formatSignedTime(meta.balance),
              " "
            ] }) })
          ] }, e.id);
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: "0.5rem", pageBreakInside: "avoid", breakInside: "avoid" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { backgroundColor: PRINT_STYLES.bgGray, padding: "0.75rem", borderRadius: "0.5rem", border: `1px solid ${PRINT_STYLES.borderLight}` }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.3rem", borderBottom: `1px solid ${PRINT_STYLES.borderLight}`, paddingBottom: "0.1rem", color: PRINT_STYLES.textMedium }, children: "Zusammenfassung" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 2rem" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.1rem" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Arbeit (inkl. Anreise):" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.work) })
            ] }),
            stats.holiday > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.1rem", color: PRINT_STYLES.textBlue }, children: [
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Feiertage:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.holiday) }),
              " "
            ] }),
            stats.vacation > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.1rem", color: PRINT_STYLES.textBlue }, children: [
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Urlaub:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.vacation) }),
              " "
            ] }),
            stats.timeComp > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.1rem", color: "#7e22ce" }, children: [
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Zeitausgleich:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.timeComp) }),
              " "
            ] }),
            stats.sick > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.1rem", color: PRINT_STYLES.textRed }, children: [
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Krankenstand:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.sick) }),
              " "
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.1rem", borderBottom: `1px dashed ${PRINT_STYLES.borderLight}`, paddingBottom: "2px" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Gesamt (IST):" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.totalIst) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.1rem", color: PRINT_STYLES.textMedium }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Sollzeit (SOLL):" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(stats.totalTarget) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginTop: "0.3rem", fontWeight: "bold" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Saldo:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: stats.totalSaldo >= 0 ? PRINT_STYLES.textGreen : PRINT_STYLES.textRed }, children: formatSignedTime(stats.totalSaldo) })
            ] }),
            (stats.overtimeSplit.mehrarbeit > 0 || stats.overtimeSplit.ueberstunden > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: "0.4rem", paddingTop: "0.2rem", borderTop: `1px dashed ${PRINT_STYLES.borderLight}` }, children: [
              stats.overtimeSplit.mehrarbeit > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: PRINT_STYLES.textBlue }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Mehrarbeit:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.overtimeSplit.mehrarbeit) })
              ] }),
              stats.overtimeSplit.ueberstunden > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#7e22ce" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Überstunden:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: "bold" }, children: formatTime(stats.overtimeSplit.ueberstunden) })
              ] })
            ] })
          ] })
        ] }),
        stats.drive > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: `1px solid ${PRINT_STYLES.borderLight}`, marginTop: "0.3rem", paddingTop: "0.2rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: PRINT_STYLES.textLight, fontStyle: "italic" }, children: [
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Fahrtzeit (unbezahlt):" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(stats.drive) }),
          " "
        ] })
      ] }) }),
      customNote && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: "1.5rem", pageBreakInside: "avoid", breakInside: "avoid", borderTop: `2px dashed ${PRINT_STYLES.borderLight}`, paddingTop: "1rem" }, children: [
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", color: PRINT_STYLES.textMedium, marginBottom: "0.5rem" }, children: "Anmerkungen / Notiz:" }),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: "0.85rem", whiteSpace: "pre-wrap", lineHeight: "1.4", color: PRINT_STYLES.textDark }, children: customNote }),
        " "
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isNoteModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-[250] flex items-center justify-center p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: () => setIsNoteModalOpen(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, className: "relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-lg mb-3 text-zinc-800 dark:text-white", children: "Notiz für PDF" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { className: "w-full h-32 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg resize-none outline-none focus:border-blue-500 text-zinc-800 dark:text-zinc-100", placeholder: "Z.B. Zusätzliche Infos, Bankverbindung, etc...", value: customNote, onChange: (e) => setCustomNote(e.target.value) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 mt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCustomNote(""), className: "text-red-500 text-sm font-medium px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg", children: "Löschen" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsNoteModalOpen(false), className: "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold px-4 py-2 rounded-lg", children: "Fertig" })
        ] })
      ] })
    ] }) })
  ] });
};
export {
  PrintReport as default
};
