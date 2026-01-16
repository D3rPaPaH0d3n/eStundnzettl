const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/PrintReport-vb74isOQ.js","assets/vendor-BoN8boPx.js","assets/pdf-libs-D6cDjtJ1.js","assets/vendor-BMy3eNrX.css","assets/icons-BtkGeADx.js","assets/animation-3vmyltdZ.js"])))=>i.map(i=>d[i]);
import { j as jsxRuntimeExports, a1 as registerLocale, r as reactExports, a2 as DatePicker, a3 as Haptics, a4 as ImpactStyle, a5 as locale, a6 as zt, a7 as CalendarContainer, a8 as GoogleAuth, a9 as ScopedStorage, aa as React, ab as Capacitor, ac as App$1, ad as Directory, ae as Filesystem, af as Encoding, ag as SplashScreen, ah as Fe, ai as NotificationType, aj as Share, ak as ReactDOM } from "./vendor-BoN8boPx.js";
import { _ as __vitePreload } from "./pdf-libs-D6cDjtJ1.js";
import { m as motion, A as AnimatePresence, u as useDragControls } from "./animation-3vmyltdZ.js";
import { C as ChevronLeft, a as ChevronRight, b as Calendar, T as Trash2, X, c as Check, W as WandSparkles, H as Hourglass, I as Info, d as Clock, L as List, e as History, S as Save, f as Sparkles, B as Building2, g as Shield, R as Rocket, h as SlidersVertical, i as Bug, j as Cloud, D as Download, F as FileText, k as Timer, Z as Zap, G as Globe, P as Play, l as FingerprintPattern, m as ShieldCheck, n as Import, U as User, o as TriangleAlert, p as Loader, q as Camera, r as Briefcase, s as Lock, t as LockOpen, u as Sun, v as CloudOff, w as CircleCheck, x as HardDrive, y as Upload, z as RefreshCw, A as BookOpen, E as Gift, J as CircleAlert, K as Square, M as Pause, N as CloudLightning, O as FolderInput, Q as ArrowLeft, V as FolderUp, Y as Share2, _ as Settings$1, $ as FileChartColumnIncreasing, a0 as Plus } from "./icons-BtkGeADx.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const AppLogo = "/assets/logo-CmJC3P9L.png";
const APP_VERSION = "v6.0.0";
const WORK_MODELS = [
  {
    id: "38.5-classic",
    label: "38,5h Standard",
    description: "Mo-Do 8,5h / Fr 4,5h",
    days: [0, 510, 510, 510, 510, 270, 0]
    // So, Mo, Di, Mi, Do, Fr, Sa
  },
  {
    id: "38.5-even",
    label: "38,5h Gleichmäßig",
    description: "Mo-Fr 7,7h (07:42)",
    days: [0, 462, 462, 462, 462, 462, 0]
  },
  {
    id: "38.5-4days",
    label: "4-Tage Woche (Gleich)",
    description: "Mo-Do 9,6h (09:38)",
    days: [0, 578, 578, 578, 577, 0, 0]
  },
  {
    id: "38.5-4days-split",
    label: "4-Tage Woche (10/8,5)",
    description: "Mo-Mi 10h / Do 8,5h",
    days: [0, 600, 600, 600, 510, 0, 0]
  },
  {
    id: "40-classic",
    label: "40h Woche",
    description: "Mo-Fr 8h",
    days: [0, 480, 480, 480, 480, 480, 0]
  },
  {
    id: "custom",
    label: "Benutzerdefiniert",
    description: "Manuelle Eingabe",
    days: [0, 0, 0, 0, 0, 0, 0]
  }
];
const WORK_CODES = [
  { id: 1, label: "01 - Schienen, Bunse" },
  { id: 2, label: "02 - Umlenkrollen, Rollenrost" },
  { id: 3, label: "03 - TWR mechanisch" },
  { id: 4, label: "04 - Heber, Joch, Seile" },
  { id: 5, label: "05 - GGW, Fangrahmen, Geschw. Regler" },
  { id: 6, label: "06 - TWR elektrisch, Steuerung" },
  { id: 7, label: "07 - Schachttüren, Schachtverblechung" },
  { id: 8, label: "08 - E-Installation, Schachtlicht" },
  { id: 9, label: "09 - Kabine mechanisch, Türantrieb, Auskleidung" },
  { id: 10, label: "10 - Kabine elektrisch, Lichtschranken, Dachsteuerung" },
  { id: 11, label: "11 - Einstellung, Fertigstellung, TÜV-Abnahme" },
  { id: 12, label: "12 - Transport" },
  { id: 13, label: "13 - Diverses, Besprechung, Vermessung" },
  { id: 14, label: "14 - Wartung" },
  { id: 15, label: "15 - Störung" },
  { id: 16, label: "16 - Garantie" },
  { id: 17, label: "17 - Regie" },
  { id: 18, label: "18 - Materialvorbereitung" },
  { id: 19, label: "19 - Fahrzeit" },
  { id: 20, label: "20 - Diverse Zusätze, Stahlschacht" },
  { id: 21, label: "21 - Reparaturen" },
  { id: 22, label: "22 - Umbau, Sanierungen" },
  { id: 23, label: "23 - TÜV-Mängel" },
  { id: 24, label: "24 - Demontage" },
  { id: 25, label: "25 - Gerüstbau" },
  { id: 190, label: "19 - An/Abreise" },
  { id: 70, label: "70 - Büro" }
];
const STORAGE_KEYS = {
  ENTRIES: "kogler_entries",
  USER: "kogler_user",
  THEME: "kogler_theme",
  AUTO_BACKUP: "kogler_auto_backup",
  LAST_CODE: "kogler_last_code",
  LIVE_TIMER: "kogler_live_timer",
  LAST_BACKUP: "kogler_last_backup_date",
  BACKUP_TARGET: "kogler_backup_target",
  CLOUD_SYNC: "kogler_cloud_sync"
};
const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const Card = ({ children, className = "" }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "div",
  {
    className: `bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden ${className}`,
    children
  }
);
const formatTime = (minutes) => {
  const abs = Math.max(0, Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};
const formatSignedTime = (minutes) => {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
};
const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};
const getDayOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
const getTargetMinutesForDate = (dateStr, customWorkDays) => {
  const isHalfDay = dateStr.endsWith("-12-24") || dateStr.endsWith("-12-31");
  let dailyTarget = 0;
  const day = getDayOfWeek(dateStr);
  if (customWorkDays && Array.isArray(customWorkDays) && customWorkDays.length === 7) {
    dailyTarget = customWorkDays[day];
  } else {
    if (day >= 1 && day <= 4) dailyTarget = 510;
    else if (day === 5) dailyTarget = 270;
    else dailyTarget = 0;
  }
  if (isHalfDay && dailyTarget > 0) {
    return Math.round(dailyTarget / 2);
  }
  return dailyTarget;
};
const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 864e5 + 1) / 7);
};
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result.split(",")[1];
    resolve(base64);
  };
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});
const calculateOvertimeSplit = (balanceMinutes, targetMinutes) => {
  if (balanceMinutes <= 0) return { mehrarbeit: 0, ueberstunden: 0 };
  const WEEKLY_LIMIT_MINUTES = 40 * 60;
  const mehrarbeitBuffer = Math.max(0, WEEKLY_LIMIT_MINUTES - targetMinutes);
  const mehrarbeit = Math.min(balanceMinutes, mehrarbeitBuffer);
  const ueberstunden = Math.max(0, balanceMinutes - mehrarbeit);
  return { mehrarbeit, ueberstunden };
};
const calculatePeriodStats = (entries, userData, periodStart, periodEnd) => {
  let stats = {
    work: 0,
    drive: 0,
    holiday: 0,
    vacation: 0,
    sick: 0,
    timeComp: 0,
    totalIst: 0,
    totalTarget: 0,
    totalSaldo: 0,
    overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 }
  };
  const relevantEntries = entries.filter((e) => {
    const d = new Date(e.date);
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOnly = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      periodStart.getDate()
    );
    const endOnly = new Date(
      periodEnd.getFullYear(),
      periodEnd.getMonth(),
      periodEnd.getDate()
    );
    return dOnly >= startOnly && dOnly <= endOnly;
  });
  relevantEntries.forEach((e) => {
    if (e.type === "work") {
      if (e.code === 19) stats.drive += e.netDuration;
      else stats.work += e.netDuration;
    }
    if (e.type === "vacation") stats.vacation += e.netDuration;
    if (e.type === "sick") stats.sick += e.netDuration;
    if (e.type === "public_holiday") stats.holiday += e.netDuration;
    if (e.type === "time_comp") stats.timeComp += e.netDuration;
  });
  stats.totalIst = stats.work + stats.vacation + stats.sick + stats.holiday + stats.timeComp;
  let loopDate = new Date(periodStart);
  loopDate.setHours(0, 0, 0, 0);
  const loopEnd = new Date(periodEnd);
  loopEnd.setHours(23, 59, 59, 999);
  const weeklyMap = {};
  while (loopDate <= loopEnd) {
    const dateStr = toLocalDateString(loopDate);
    const target = getTargetMinutesForDate(dateStr, userData?.workDays);
    stats.totalTarget += target;
    const weekNum = getWeekNumber(new Date(loopDate));
    if (!weeklyMap[weekNum]) weeklyMap[weekNum] = { target: 0, actual: 0 };
    weeklyMap[weekNum].target += target;
    loopDate.setDate(loopDate.getDate() + 1);
  }
  stats.totalSaldo = stats.totalIst - stats.totalTarget;
  relevantEntries.forEach((e) => {
    if (!(e.type === "work" && e.code === 19)) {
      const w = getWeekNumber(new Date(e.date));
      if (weeklyMap[w]) {
        weeklyMap[w].actual += e.netDuration;
      }
    }
  });
  Object.values(weeklyMap).forEach((week) => {
    const diff = week.actual - week.target;
    const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
      diff,
      week.target
    );
    stats.overtimeSplit.mehrarbeit += mehrarbeit;
    stats.overtimeSplit.ueberstunden += ueberstunden;
  });
  return stats;
};
const getWeekRangeInMonth = (dateInWeek, viewDate) => {
  const d = new Date(dateInWeek);
  const day = d.getDay() || 7;
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - day + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  if (!viewDate) return { start: startOfWeek, end: endOfWeek };
  const viewMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const viewMonthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  viewMonthEnd.setHours(23, 59, 59, 999);
  const effectiveStart = startOfWeek < viewMonthStart ? viewMonthStart : startOfWeek;
  const effectiveEnd = endOfWeek > viewMonthEnd ? viewMonthEnd : endOfWeek;
  return { start: effectiveStart, end: effectiveEnd };
};
const calculateWeekStats = (weekEntries, userData, viewDate) => {
  const dateRef = weekEntries.length > 0 ? new Date(weekEntries[0].date) : /* @__PURE__ */ new Date();
  const { start, end } = getWeekRangeInMonth(dateRef, viewDate);
  return calculatePeriodStats(weekEntries, userData, start, end);
};
const getHolidayData = (year) => {
  const addDays = (date, days) => {
    const d2 = new Date(date);
    d2.setDate(d2.getDate() + days);
    return toLocalDateString(d2);
  };
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = (h + l - 7 * m + 114) % 31 + 1;
  const easterDate = new Date(year, month - 1, day);
  const holidays = {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-01-06`]: "Heilige Drei Könige",
    [addDays(easterDate, 1)]: "Ostermontag",
    [`${year}-05-01`]: "Staatsfeiertag",
    [addDays(easterDate, 39)]: "Christi Himmelfahrt",
    [addDays(easterDate, 50)]: "Pfingstmontag",
    [addDays(easterDate, 60)]: "Fronleichnam",
    [`${year}-08-15`]: "Mariä Himmelfahrt",
    [`${year}-10-26`]: "Nationalfeiertag",
    [`${year}-11-01`]: "Allerheiligen",
    [`${year}-12-08`]: "Mariä Empfängnis",
    [`${year}-12-25`]: "Christtag",
    [`${year}-12-26`]: "Stefanitag"
  };
  return holidays;
};
const compareVersions = (v1, v2) => {
  const cleanV1 = v1.replace(/[^0-9.]/g, "");
  const cleanV2 = v2.replace(/[^0-9.]/g, "");
  const parts1 = cleanV1.split(".").map(Number);
  const parts2 = cleanV2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }
  return 0;
};
const checkForUpdate = async () => {
  try {
    const GITHUB_USER = "D3rPaPaH0d3n";
    const REPO_NAME = "kogler-zeit";
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/releases/latest`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const latestVersion = data.tag_name;
    if (compareVersions(latestVersion, APP_VERSION) > 0) {
      return {
        version: latestVersion,
        notes: data.body,
        downloadUrl: data.assets.find((a) => a.name.endsWith(".apk"))?.browser_download_url || data.html_url,
        date: new Date(data.published_at).toLocaleDateString("de-DE")
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};
registerLocale("de", locale);
const CustomMonthInput = reactExports.forwardRef(({ value, onClick }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "button",
  {
    className: "font-bold text-zinc-800 dark:text-white text-lg hover:text-emerald-600 transition-colors capitalize",
    onClick,
    ref,
    children: value
  }
));
const Dashboard = ({
  currentDate,
  onSetCurrentDate,
  changeMonth,
  stats,
  overtime,
  progressPercent,
  groupedByWeek,
  viewMonth,
  viewYear,
  onEditEntry,
  onDeleteEntry,
  userData
}) => {
  const [expandedWeeks, setExpandedWeeks] = reactExports.useState(() => {
    const currentWeek = getWeekNumber(/* @__PURE__ */ new Date());
    return { [currentWeek]: true };
  });
  const toggleWeek = (week) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setExpandedWeeks((prev) => ({ ...prev, [week]: !prev[week] }));
  };
  const monthlyOvertimeSplit = stats.overtimeSplit || { mehrarbeit: 0, ueberstunden: 0 };
  const sortedWeeks = [...groupedByWeek].sort((a, b) => {
    const dateA = new Date(a[1][0].date);
    const dateB = new Date(b[1][0].date);
    return dateB - dateA;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.main, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, className: "w-full p-3 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 border-zinc-200 dark:border-zinc-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 px-4 border-b border-zinc-100 dark:border-zinc-700/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors",
            onClick: () => changeMonth(-1),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 24 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DatePicker,
          {
            selected: currentDate,
            onChange: (date) => {
              const d = new Date(date);
              d.setDate(1);
              onSetCurrentDate(d);
            },
            dateFormat: "MMMM yyyy",
            showMonthYearPicker: true,
            locale: "de",
            withPortal: true,
            customInput: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomMonthInput, {})
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "p-2 -mr-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors",
            onClick: () => changeMonth(1),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 24 })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-0.5", children: "IST" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-zinc-900 dark:text-white leading-none", children: formatTime(stats.totalIst) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-6 text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-0.5", children: "SOLL" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-zinc-600 dark:text-zinc-300 mt-1", children: formatTime(stats.totalTarget) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider mb-0.5 text-zinc-500 dark:text-zinc-400", children: "Saldo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `font-bold text-xl leading-none ${overtime >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`, children: formatSignedTime(overtime) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: { width: 0 }, animate: { width: `${progressPercent}%` }, transition: { duration: 0.8, ease: "easeOut" }, className: `h-full rounded-full ${overtime >= 0 ? "bg-emerald-500" : "bg-orange-500"}` }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap justify-between items-center text-xs pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-zinc-500 dark:text-zinc-400", children: stats.drive > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Fahrzeit (19): " }),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: formatTime(stats.drive) }),
            " "
          ] }) }),
          (monthlyOvertimeSplit.mehrarbeit > 0 || monthlyOvertimeSplit.ueberstunden > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right flex items-center gap-3 ml-auto", children: [
            monthlyOvertimeSplit.mehrarbeit > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-blue-600 dark:text-blue-400 font-medium", children: [
              formatTime(monthlyOvertimeSplit.mehrarbeit),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-zinc-400 dark:text-zinc-500 font-normal text-[10px]", children: "MA" })
            ] }),
            monthlyOvertimeSplit.ueberstunden > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-emerald-600 dark:text-emerald-400 font-medium", children: [
              formatTime(monthlyOvertimeSplit.ueberstunden),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-zinc-400 dark:text-zinc-500 font-normal text-[10px]", children: "ÜS" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 pb-20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-zinc-500 dark:text-zinc-400 text-sm px-1", children: "Letzte Einträge (nach Kalenderwoche)" }),
      sortedWeeks.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12 text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 32, className: "mx-auto mb-2 opacity-20" }),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Keine Einträge vorhanden." })
      ] }) : sortedWeeks.map(([week, weekEntries]) => {
        const weekStats = calculateWeekStats(weekEntries, userData, currentDate);
        const workMinutes = weekStats.totalIst;
        const diff = weekStats.totalSaldo;
        const { mehrarbeit, ueberstunden } = weekStats.overtimeSplit;
        const anyDate = new Date(weekEntries[0].date);
        const currentDay = anyDate.getDay() || 7;
        const monday = new Date(anyDate);
        monday.setDate(anyDate.getDate() - (currentDay - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const expanded = expandedWeeks[week];
        let balanceColorClass = diff < 0 ? "text-red-600 dark:text-red-400 font-bold" : ueberstunden > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-blue-600 dark:text-blue-400 font-bold";
        const daysMap = /* @__PURE__ */ new Map();
        weekEntries.forEach((e) => {
          if (!daysMap.has(e.date)) daysMap.set(e.date, []);
          daysMap.get(e.date).push(e);
        });
        const sortedDays = Array.from(daysMap.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0]));
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "w-full flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl px-3 py-2 transition-colors", onClick: () => toggleWeek(week), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col text-left", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Kalenderwoche" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold text-zinc-800 dark:text-zinc-200", children: [
                " KW ",
                week,
                " ",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-zinc-500 dark:text-zinc-400 font-normal", children: [
                  "(",
                  monday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
                  " – ",
                  sunday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
                  ")"
                ] }),
                " "
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm flex gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: weekStats.work >= weekStats.totalTarget ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-700 dark:text-zinc-300 font-bold", children: formatTime(workMinutes) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: balanceColorClass, children: [
                    " ",
                    diff >= 0 ? "+" : "-",
                    formatTime(Math.abs(diff)),
                    " "
                  ] })
                ] }),
                diff > 0 && (mehrarbeit > 0 || ueberstunden > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] flex items-center gap-2 opacity-80", children: [
                  mehrarbeit > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-blue-600 dark:text-blue-400 font-medium", children: [
                    formatTime(mehrarbeit),
                    " MA"
                  ] }),
                  mehrarbeit > 0 && ueberstunden > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-zinc-300 dark:text-zinc-600", children: "|" }),
                  ueberstunden > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-emerald-600 dark:text-emerald-400 font-medium", children: [
                    formatTime(ueberstunden),
                    " ÜS"
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 18, className: `text-zinc-500 dark:text-zinc-400 transition-transform ${expanded ? "rotate-90" : ""}` })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: expanded && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.3, ease: "easeInOut" }, className: "overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-3", children: sortedDays.map(([dateStr, dayEntries]) => {
            const daySum = dayEntries.reduce((acc, curr) => curr.type === "work" && curr.code === 19 ? acc : acc + curr.netDuration, 0);
            const d = new Date(dateStr);
            const sortedEntries = [...dayEntries].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
            return /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: { y: 10, opacity: 0 }, animate: { y: 0, opacity: 1 }, className: "bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-800 dark:bg-zinc-900 w-12 flex flex-col items-center justify-center text-white flex-shrink-0 z-20 relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold opacity-80", children: d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold", children: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { initial: false, children: sortedEntries.map((entry, idx) => {
                const isHoliday = entry.type === "public_holiday";
                const isTimeComp = entry.type === "time_comp";
                let timeLabel = entry.type === "work" ? `${entry.start} - ${entry.end}` : isHoliday ? "Feiertag" : "Ganztags";
                let codeLabel = "";
                if (entry.type === "work") codeLabel = WORK_CODES.find((c) => c.id === entry.code)?.label;
                else if (isHoliday) codeLabel = "Bezahlt frei";
                else if (isTimeComp) codeLabel = "Zeitausgleich";
                else codeLabel = entry.type === "vacation" ? "Urlaub" : "Krank";
                let pauseLabel = "";
                if (entry.type === "work" && entry.code !== 19) {
                  pauseLabel = entry.pause > 0 ? ` - Pause: ${entry.pause} Min` : " - Keine Pause";
                }
                let rowClass = `p-3 flex justify-between items-start gap-3 transition-colors cursor-pointer bg-white dark:bg-zinc-800 ${idx < sortedEntries.length - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`;
                if (isHoliday) rowClass = `p-3 flex justify-between items-start gap-3 bg-blue-50/50 dark:bg-blue-900/20 ${idx < sortedEntries.length - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`;
                if (isTimeComp) rowClass = `p-3 flex justify-between items-start gap-3 bg-purple-50/50 dark:bg-purple-900/20 ${idx < sortedEntries.length - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`;
                if (isHoliday) {
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: rowClass, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1 flex flex-col gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-sm leading-none text-blue-600 dark:text-blue-400", children: timeLabel }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-tight", children: entry.project }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-zinc-500 dark:text-zinc-400 leading-tight", children: codeLabel })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 pl-2 border-l border-zinc-100 dark:border-zinc-700 ml-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-zinc-400 dark:text-zinc-500 whitespace-nowrap", children: formatTime(entry.netDuration) }) })
                  ] }, entry.id);
                }
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative overflow-hidden bg-red-500", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex items-center justify-end pr-4 text-white", children: [
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 20 }),
                    " "
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { drag: "x", dragConstraints: { left: 0, right: 0 }, dragElastic: { left: 0.5, right: 0.05 }, onDragEnd: (_, info) => {
                    if (info.offset.x < -80) {
                      Haptics.impact({ style: ImpactStyle.Heavy });
                      onDeleteEntry(entry.id);
                    }
                  }, onClick: () => onEditEntry(entry), className: `relative z-10 bg-white dark:bg-zinc-800 ${idx < sortedEntries.length - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`, layout: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-3 flex justify-between items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors ${isTimeComp ? "bg-purple-50/30 dark:bg-purple-900/10" : ""}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1 flex flex-col gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `font-bold text-sm leading-none ${isTimeComp ? "text-purple-700 dark:text-purple-400" : "text-zinc-900 dark:text-zinc-100"}`, children: [
                        " ",
                        timeLabel,
                        " ",
                        pauseLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-normal opacity-70", children: pauseLabel }),
                        " "
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-tight", children: entry.project }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400 leading-tight", children: [
                        " ",
                        codeLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: codeLabel }),
                        " "
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 pl-2 border-l border-zinc-100 dark:border-zinc-700 ml-1", children: [
                      " ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-zinc-400 dark:text-zinc-500 whitespace-nowrap", children: formatTime(entry.netDuration) }),
                      " "
                    ] })
                  ] }) })
                ] }, entry.id);
              }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-700/50 w-20 border-l border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center flex-shrink-0 px-1 z-20 relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wide mb-0.5", children: "Gesamt" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap text-sm", children: formatTime(daySum) })
              ] })
            ] }) }, dateStr);
          }) }) }) })
        ] }, week);
      })
    ] })
  ] });
};
const TimePickerDrawer = ({ isOpen, onClose, value, onChange, title }) => {
  const hoursRef = reactExports.useRef(null);
  const minutesRef = reactExports.useRef(null);
  const dragControls = useDragControls();
  const ITEM_HEIGHT = 64;
  reactExports.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hoursRef.current) {
          const selectedHourEl = hoursRef.current.querySelector('[data-selected="true"]');
          if (selectedHourEl) selectedHourEl.scrollIntoView({ block: "center" });
        }
        if (minutesRef.current) {
          const selectedMinEl = minutesRef.current.querySelector('[data-selected="true"]');
          if (selectedMinEl) selectedMinEl.scrollIntoView({ block: "center" });
        }
      }, 100);
    }
  }, [isOpen]);
  const [selectedHour, selectedMinute] = value ? value.split(":").map(Number) : [6, 0];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];
  const updateTime = (h, m) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };
  const handleScroll = (e, type) => {
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    if (type === "hour") {
      const newHour = hours[index];
      if (newHour !== void 0 && newHour !== selectedHour) {
        Haptics.impact({ style: ImpactStyle.Light });
        updateTime(newHour, selectedMinute);
      }
    } else {
      const newMinute = minutes[index];
      if (newMinute !== void 0 && newMinute !== selectedMinute) {
        Haptics.impact({ style: ImpactStyle.Light });
        updateTime(selectedHour, newMinute);
      }
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { type: "spring", damping: 25, stiffness: 300 },
        drag: "y",
        dragConstraints: { top: 0 },
        dragElastic: 0.2,
        dragListener: false,
        dragControls,
        onDragEnd: (_, info) => {
          if (info.offset.y > 100) onClose();
        },
        className: "fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col pb-safe md:max-w-md md:mx-auto md:rounded-3xl md:bottom-4 md:border md:border-zinc-200 dark:md:border-zinc-700",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none",
              onPointerDown: (e) => dragControls.start(e),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center px-5 pb-4 border-b border-zinc-100 dark:border-zinc-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-3 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 24 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-zinc-800 dark:text-white uppercase tracking-wide text-base", children: title || "Zeit wählen" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  Haptics.impact({ style: ImpactStyle.Medium });
                  onClose();
                },
                className: "p-3 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold transition-transform active:scale-95",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 24 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-[320px] relative bg-white dark:bg-zinc-900 select-none", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-1/2 left-4 right-4 h-[64px] -mt-[32px] bg-zinc-100 dark:bg-zinc-800 pointer-events-none z-0 border border-zinc-200 dark:border-zinc-700 rounded-xl" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                ref: hoursRef,
                onScroll: (e) => handleScroll(e, "hour"),
                className: "flex-1 overflow-y-auto snap-y snap-mandatory py-[128px] text-center z-10 scrollbar-hide",
                children: hours.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    "data-selected": h === selectedHour,
                    onClick: () => updateTime(h, selectedMinute),
                    className: `h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all duration-100 ${h === selectedHour ? "font-bold text-4xl text-emerald-600 dark:text-emerald-500 scale-110" : "text-zinc-400 dark:text-zinc-600 text-2xl opacity-60"}`,
                    children: String(h).padStart(2, "0")
                  },
                  h
                ))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center z-10 text-zinc-300 dark:text-zinc-600 font-bold text-2xl pb-2", children: ":" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                ref: minutesRef,
                onScroll: (e) => handleScroll(e, "minute"),
                className: "flex-1 overflow-y-auto snap-y snap-mandatory py-[128px] text-center z-10 scrollbar-hide",
                children: minutes.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    "data-selected": m === selectedMinute,
                    onClick: () => updateTime(selectedHour, m),
                    className: `h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all duration-100 ${m === selectedMinute ? "font-bold text-4xl text-emerald-600 dark:text-emerald-500 scale-110" : "text-zinc-400 dark:text-zinc-600 text-2xl opacity-60"}`,
                    children: String(m).padStart(2, "0")
                  },
                  m
                ))
              }
            )
          ] })
        ]
      }
    )
  ] }) });
};
const SelectionDrawer = ({ isOpen, onClose, title, options, value, onChange }) => {
  const listRef = reactExports.useRef(null);
  const dragControls = useDragControls();
  reactExports.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (listRef.current) {
          const selectedEl = listRef.current.querySelector('[data-selected="true"]');
          if (selectedEl) selectedEl.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 300);
    }
  }, [isOpen]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { type: "spring", damping: 25, stiffness: 300 },
        drag: "y",
        dragConstraints: { top: 0 },
        dragElastic: 0.2,
        dragListener: false,
        dragControls,
        onDragEnd: (_, info) => {
          if (info.offset.y > 100) onClose();
        },
        className: "fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pb-safe md:max-w-md md:mx-auto md:rounded-3xl md:bottom-4 md:border md:border-zinc-200 dark:md:border-zinc-700",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none",
              onPointerDown: (e) => dragControls.start(e),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center px-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-3 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 24 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-zinc-800 dark:text-white uppercase tracking-wide text-base", children: title || "Auswählen" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: listRef, className: "overflow-y-auto p-4 space-y-2 bg-zinc-50 dark:bg-zinc-950", children: options.map((option) => {
            const isSelected = option.id === value;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                "data-selected": isSelected,
                onClick: () => {
                  onChange(option.id);
                  onClose();
                },
                className: `p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${isSelected ? "bg-white dark:bg-zinc-800 border-emerald-500 shadow-md transform scale-[1.01]" : "bg-white dark:bg-zinc-800 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-base font-bold ${isSelected ? "text-emerald-600 dark:text-emerald-500" : "text-zinc-700 dark:text-zinc-300"}`, children: option.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 dark:border-zinc-600"}`, children: isSelected && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 14, className: "text-white", strokeWidth: 3 }) })
                ]
              },
              option.id
            );
          }) })
        ]
      }
    )
  ] }) });
};
registerLocale("de", locale);
const CustomInput = reactExports.forwardRef(({ value, onClick, icon: Icon }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "button",
  {
    type: "button",
    onClick,
    ref,
    className: "w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none focus:border-emerald-500 transition-colors",
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-center", children: value }),
      Icon && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 18, className: "text-zinc-400 ml-2" })
    ]
  }
));
const CalendarContainerAnimation = ({ className, children }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className, style: { background: "transparent", border: "none", padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      initial: { opacity: 0, scale: 0.9, y: -10 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { type: "spring", duration: 0.3, bounce: 0.3 },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarContainer, { className, children })
    }
  ) });
};
const EntryForm = ({
  onCancel,
  onSubmit,
  entryType,
  setEntryType,
  code,
  setCode,
  pauseDuration,
  setPauseDuration,
  formDate,
  setFormDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  project,
  setProject,
  lastWorkEntry,
  existingProjects = [],
  allEntries = [],
  isEditing = false,
  isLiveEntry = false,
  userData
}) => {
  const [activeTimeField, setActiveTimeField] = reactExports.useState(null);
  const [isWorkCodeOpen, setIsWorkCodeOpen] = reactExports.useState(false);
  const [suggestions, setSuggestions] = reactExports.useState([]);
  const [showSuggestions, setShowSuggestions] = reactExports.useState(false);
  const [viewYear, setViewYear] = reactExports.useState(new Date(formDate).getFullYear());
  reactExports.useEffect(() => {
    setViewYear(new Date(formDate).getFullYear());
  }, [formDate]);
  reactExports.useEffect(() => {
    if (isEditing || isLiveEntry) return;
    if (entryType !== "work" && entryType !== "drive") return;
    const dayEntries = allEntries.filter((e) => e.date === formDate && e.type === "work" && e.end);
    if (dayEntries.length > 0) {
      const sorted = [...dayEntries].sort((a, b) => (a.end || "").localeCompare(b.end || ""));
      const lastEnd = sorted[sorted.length - 1].end;
      if (lastEnd) setStartTime(lastEnd);
    }
  }, [formDate, allEntries, entryType, isEditing, isLiveEntry]);
  const holidayData = reactExports.useMemo(() => {
    return {
      ...getHolidayData(viewYear - 1),
      ...getHolidayData(viewYear),
      ...getHolidayData(viewYear + 1)
    };
  }, [viewYear]);
  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
    });
  };
  const handleCopyLastEntry = () => {
    if (!lastWorkEntry) {
      zt.error("Kein vorheriger Eintrag gefunden.");
      return;
    }
    setStartTime(lastWorkEntry.start || "06:00");
    setEndTime(lastWorkEntry.end || "16:30");
    setPauseDuration(lastWorkEntry.pause || 0);
    setProject(lastWorkEntry.project || "");
    if (lastWorkEntry.code) setCode(lastWorkEntry.code);
    zt.success("Daten übernommen!", { icon: "🪄" });
  };
  const handleProjectChange = (e) => {
    const val = e.target.value;
    setProject(val);
    if (val.length > 0) {
      const filtered = existingProjects.filter(
        (p) => p.toLowerCase().includes(val.toLowerCase()) && p !== val
      ).slice(0, 4);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };
  const selectSuggestion = (suggestion) => {
    setProject(suggestion);
    setShowSuggestions(false);
  };
  const changeDate = (days) => {
    const d = new Date(formDate);
    d.setDate(d.getDate() + days);
    setFormDate(toLocalDateString(d));
  };
  const currentCodeLabel = WORK_CODES.find((c) => c.id === code)?.label || "Bitte wählen";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "w-full p-3 pb-20", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TimePickerDrawer,
      {
        isOpen: !!activeTimeField,
        onClose: () => setActiveTimeField(null),
        title: activeTimeField === "start" ? "Startzeit" : "Endzeit",
        value: activeTimeField === "start" ? startTime : endTime,
        onChange: (val) => activeTimeField === "start" ? setStartTime(val) : setEndTime(val)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SelectionDrawer,
      {
        isOpen: isWorkCodeOpen,
        onClose: () => setIsWorkCodeOpen(false),
        title: "Tätigkeit wählen",
        options: WORK_CODES.filter((c) => c.id !== 190 && c.id !== 19),
        value: code,
        onChange: setCode
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleFormSubmit, className: "p-4 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-bold text-zinc-400 uppercase tracking-wider", children: "Eintragstyp" }),
        entryType === "work" && code !== 190 && lastWorkEntry && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.button,
          {
            type: "button",
            whileTap: { scale: 0.9 },
            onClick: () => {
              handleCopyLastEntry();
              Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
              });
            },
            className: "flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { size: 12 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Wie zuletzt" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-100 dark:bg-zinc-700 p-1 rounded-xl grid grid-cols-5 gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => {
          setEntryType("work");
          setCode(WORK_CODES[0].id);
        }, className: `py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "work" && code !== 190 ? "bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`, children: "Arbeit" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => {
          setEntryType("drive");
          setCode(19);
          setPauseDuration(0);
        }, className: `py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "drive" || code === 190 ? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`, children: "Fahrt" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setEntryType("sick"), className: `py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "sick" ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`, children: "Krank" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setEntryType("vacation"), className: `py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "vacation" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`, children: "Urlaub" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setEntryType("time_comp"), className: `py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "time_comp" ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`, children: "ZA" })
      ] }),
      (entryType === "drive" || code === 190) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => {
          setEntryType("work");
          setCode(190);
          setPauseDuration(0);
          setProject("");
        }, className: `flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${code === 190 ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 ring-2 ring-green-500 ring-offset-1" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "An/Abreise" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase bg-green-200 dark:bg-green-800 px-1 rounded text-green-800 dark:text-green-200", children: "Bezahlt" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => {
          setEntryType("drive");
          setCode(19);
          setPauseDuration(0);
          setProject("");
        }, className: `flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${entryType === "drive" && code === 19 ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-400 ring-2 ring-orange-500 ring-offset-1" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Fahrtzeit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase bg-zinc-200 dark:bg-zinc-600 px-1 rounded text-zinc-600 dark:text-zinc-300", children: "Unbezahlt" })
        ] })
      ] }),
      (entryType === "vacation" || entryType === "sick" || entryType === "time_comp") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `border rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${entryType === "sick" ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-800 dark:text-red-300" : entryType === "vacation" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300" : "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-800 dark:text-purple-300"}`, children: [
        entryType === "time_comp" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Hourglass, { size: 18, className: "mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 18, className: "mt-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold block mb-1", children: "Automatische Berechnung" }),
          "Für ",
          entryType === "vacation" ? "Urlaubstage" : entryType === "sick" ? "Krankenstand" : "Zeitausgleich",
          " wird automatisch die tägliche Sollzeit gutgeschrieben."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Datum" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => changeDate(-1), className: "p-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 20 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            DatePicker,
            {
              selected: new Date(formDate),
              onChange: (date) => setFormDate(toLocalDateString(date)),
              onMonthChange: (date) => setViewYear(date.getFullYear()),
              onYearChange: (date) => setViewYear(date.getFullYear()),
              dateFormat: "eee, dd.MM.yyyy",
              locale: "de",
              withPortal: true,
              calendarContainer: CalendarContainerAnimation,
              customInput: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomInput, { icon: Calendar }),
              dayClassName: (date) => {
                const dateStr = toLocalDateString(date);
                return holidayData[dateStr] ? "!text-red-600 !font-bold" : void 0;
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => changeDate(1), className: "p-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 20 }) })
        ] })
      ] }),
      (entryType === "work" || entryType === "drive") && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Start" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setActiveTimeField("start"), className: "w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-center text-lg", children: startTime }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 18, className: "text-zinc-400 ml-2" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Ende" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setActiveTimeField("end"), className: "w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-center text-lg", children: endTime }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 18, className: "text-zinc-400 ml-2" })
            ] })
          ] })
        ] }),
        entryType === "work" && code !== 190 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Pause" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setPauseDuration(0), className: `flex-1 p-3 rounded-lg border text-sm font-bold ${pauseDuration === 0 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300"}`, children: "Keine" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setPauseDuration(30), className: `flex-1 p-3 rounded-lg border text-sm font-bold ${pauseDuration === 30 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300"}`, children: "30 Min" })
          ] })
        ] }),
        entryType === "work" && code !== 190 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Tätigkeit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setIsWorkCodeOpen(true),
              className: "w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate pr-2", children: currentCodeLabel }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(List, { size: 18, className: "text-zinc-400 flex-shrink-0" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: entryType === "drive" || code === 190 ? "Strecke / Notiz" : "Projekt" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: project,
              onChange: handleProjectChange,
              onFocus: () => {
                if (project) handleProjectChange({ target: { value: project } });
              },
              onBlur: () => setTimeout(() => setShowSuggestions(false), 200),
              className: "w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none dark:text-white focus:border-emerald-500 transition-colors",
              placeholder: "..."
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: showSuggestions && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            motion.div,
            {
              initial: { opacity: 0, height: 0 },
              animate: { opacity: 1, height: "auto" },
              exit: { opacity: 0, height: 0 },
              className: "relative z-50 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden overflow-y-auto",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-100 dark:border-zinc-700 flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(History, { size: 10 }),
                  " Bekannte Projekte"
                ] }),
                suggestions.map((s, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    onMouseDown: () => selectSuggestion(s),
                    className: "px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer border-b border-zinc-50 dark:border-zinc-700 last:border-0",
                    children: s
                  },
                  idx
                ))
              ]
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onCancel, className: "flex-1 py-3 font-bold text-zinc-500 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-xl", children: "Abbrechen" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", className: "flex-[2] py-3 font-bold text-white bg-zinc-900 dark:bg-emerald-600 hover:bg-zinc-800 dark:hover:bg-emerald-700 rounded-xl shadow-lg flex items-center justify-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 18 }),
          " Speichern"
        ] })
      ] })
    ] }) })
  ] });
};
const CHANGELOG_DATA = [
  {
    version: "6.0.0",
    date: "15.01.2026",
    title: "The Neutral & Paper Update 🎨",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Neues Design",
        items: [
          "Paper-Look: Ein frisches, technisches Grau (Anthrazit) ersetzt das alte Blau-Grau.",
          "Emerald-Green: Das neue, satte Grün sorgt für bessere Lesbarkeit und modernen Look.",
          "Konsistenz: Alle Menüs, Popups und Auswahl-Listen wurden an das neue Design angepasst."
        ]
      },
      {
        icon: Building2,
        // Hier wurde es verwendet, ohne importiert zu sein
        title: "Neutral & Flexibel",
        items: [
          "Deine Firma: Du kannst jetzt in den Einstellungen deinen eigenen Firmennamen hinterlegen.",
          "PDF-Bericht: Der Stundenzettel ist nun neutral und zeigt deinen Firmennamen im Header an.",
          "White-Label: Keine fixen Firmen-Brandings mehr – die App gehört dir."
        ]
      },
      {
        icon: Shield,
        title: "Android & System",
        items: [
          "Themed Icons: Das App-Icon passt sich jetzt (ab Android 13) farblich deinem Homescreen an (Monochrome Support).",
          "Optimierter Dark Mode: Bessere Kontraste für augenschonendes Arbeiten bei Nacht."
        ]
      }
    ]
  },
  {
    version: "5.1.4",
    date: "04.01.2026",
    title: "Vorbereitung Play Store & Stabilität 🚀",
    isMajor: false,
    sections: [
      {
        icon: Shield,
        title: "Play Store Release",
        items: [
          "Konfiguration für geschlossenen Testtrack vorbereitet",
          "Optimierung des Build-Prozesses für Android App Bundles (.aab)",
          "Anpassung der Versions-Strings für Google Play Konformität"
        ]
      },
      {
        icon: Sparkles,
        title: "Verbesserungen",
        items: [
          "Interne Performance-Optimierungen beim Laden der Dashboard-Stats",
          "Stabilitätsfix für AnimatePresence bei schnellen Ansichtswechseln"
        ]
      }
    ]
  },
  {
    version: "5.1.0",
    date: "16.12.2025",
    title: "Onboarding & Picker Polish ✨",
    isMajor: false,
    sections: [
      {
        icon: Rocket,
        title: "Neues Onboarding",
        items: [
          "Start-Screen: Wahl zwischen 'Neu' und 'Backup laden'",
          "Profil: Feld für Tätigkeit/Anstellung ist zurück",
          "Backup-Einrichtung: Jetzt auch lokaler Ordner wählbar"
        ]
      },
      {
        icon: SlidersVertical,
        title: "UI & Modelle",
        items: [
          "Picker: Optimiertes Design, fixes 'h', 8h Standard-Start",
          "Arbeitszeit: '38,5h 4-Tage' Modell aktualisiert (Mo-Mi 10h)",
          "Benutzerdefiniert: Neuer Slider für Tagesstunden im Wizard"
        ]
      },
      {
        icon: Bug,
        title: "Wichtige Fixes",
        items: [
          "Crash beim Start (Google Drive Init) behoben",
          "Restore-Probleme (Format & Token) gefixt",
          "Header wird im Wizard nun korrekt ausgeblendet"
        ]
      }
    ]
  },
  {
    version: "5.0.0",
    date: "13.12.2025",
    title: "Das Cloud-Update ☁️",
    isMajor: true,
    sections: [
      {
        icon: Cloud,
        title: "Google Drive Sync",
        items: [
          "Endlich da: Verbinde dich mit Google Drive für automatische Cloud-Backups",
          "Easy Restore: Stelle deine Daten auf einem neuen Handy direkt aus der Cloud wieder her",
          "Sicherheit: Deine Daten gehören dir – gespeichert in deinem privaten Drive"
        ]
      },
      {
        icon: Rocket,
        title: "Neuer Start",
        items: [
          "Komplett überarbeiteter Einrichtungs-Assistent (Onboarding)",
          "Wahlmöglichkeit beim Start: 'Neu beginnen' oder 'Backup laden'",
          "Verbesserte UI in den Einstellungen für Account & Backup"
        ]
      }
    ]
  },
  {
    version: "4.4.3",
    date: "09.12.2025",
    title: "Update-Fix & PDF Politur 🛠️",
    isMajor: false,
    sections: [
      {
        icon: Download,
        title: "System Updates",
        items: [
          "Download-Fix: Updates werden jetzt sicher über den System-Browser geladen (löst Probleme beim Speichern der APK)"
        ]
      },
      {
        icon: FileText,
        title: "PDF Bericht",
        items: [
          "Soll-Stunden: Berechnung korrigiert (zählt im laufenden Monat nur bis 'Heute')",
          "Layout-Fix: Keine abgeschnittenen Texte mehr bei langen Einträgen",
          "Optik: 'Saldo' und 'Std' sind jetzt perfekt auf einer Linie ausgerichtet",
          "Design: Trennlinien optimiert (keine Striche mehr zwischen Einträgen am selben Tag)"
        ]
      }
    ]
  },
  {
    version: "4.4.1",
    date: "04.12.2025",
    title: "Hotfix & Polish 🧹",
    isMajor: false,
    sections: [
      {
        icon: Bug,
        title: "Korrekturen",
        items: [
          "Korrektur der internen Versionsnummerierung für reibungslose Updates",
          "Kleine Optimierungen am Onboarding-Prozess"
        ]
      }
    ]
  },
  {
    version: "4.4.0",
    date: "04.12.2025",
    title: "The Flex-Time Update ⚙️",
    isMajor: true,
    sections: [
      {
        icon: Rocket,
        title: "Onboarding & Modelle",
        items: [
          "Neuer Einrichtungs-Assistent: Begrüßt dich beim Start und richtet die App perfekt auf dich ein",
          "Flexible Arbeitszeit: Wähle zwischen 38,5h (Kogler Standard), 40h oder definiere deine Woche komplett selbst",
          "Wochen-Rechner: Der Assistent zeigt dir live deine Gesamt-Wochenstunden an"
        ]
      },
      {
        icon: Shield,
        title: "Logik & Sicherheit",
        items: [
          "Auto-Checkout: Vergessen auszustempeln? Die App beendet den Tag beim nächsten Start automatisch um 23:59",
          "Zeitzonen-Fix: Die Live-Uhr arbeitet jetzt präzise mit deiner lokalen Gerätezeit",
          "Smart Migration: Bestehende User werden sanft auf das neue Datensystem umgestellt"
        ]
      }
    ]
  },
  {
    version: "4.3.0",
    date: "04.12.2025",
    title: "The Live Update ⏱️",
    isMajor: true,
    sections: [
      {
        icon: Timer,
        title: "Live Stempeluhr",
        items: [
          "Endlich da: Drücke einfach auf 'Einstempeln' und die App erfasst deine Zeit live",
          "Neuer 'EIN/AUS' Button: Schwebend unten links, immer erreichbar",
          "Live-Status: Siehe sofort, wie viel Zeit noch fehlt oder ob du schon Überstunden machst"
        ]
      },
      {
        icon: Zap,
        title: "Workflow",
        items: [
          "Auto-Rundung: Zeiten werden im Hintergrund kaufmännisch auf 15 Minuten geglättet",
          "Smart-Entry: Gestoppte Zeiten landen direkt fix und fertig im Formular"
        ]
      }
    ]
  },
  {
    version: "4.2.0",
    date: "03.12.2025",
    title: "Smart Time & Zeitausgleich 🧠",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Neue Features",
        items: [
          "Smart Time: Bei neuen Einträgen startet die Zeit automatisch dort, wo der letzte aufgehört hat",
          "Zeitausgleich: Neuer lila Button für ZA (wird korrekt berechnet)",
          "Dashboard: Pause wird jetzt direkt hinter der Zeit angezeigt"
        ]
      },
      {
        icon: FileText,
        title: "PDF & Design",
        items: [
          "PDF-Bericht: Kompaktere Zusammenfassung, ungenutzte Kategorien werden ausgeblendet",
          "DatePicker: Feiertage sind jetzt nur noch durch rote Zahlen markiert (dezenter)"
        ]
      }
    ]
  },
  {
    version: "4.1.1",
    date: "02.12.2025",
    title: "PDF Perfektion & Notizen 📝",
    isMajor: false,
    sections: [
      {
        icon: FileText,
        title: "PDF Bericht",
        items: [
          "Layout optimiert: Perfektes A4-Format ohne leere Seiten",
          "Notiz-Funktion: Füge persönliche Anmerkungen zum Bericht hinzu",
          "Design: Größere Schrift & verbesserte Lesbarkeit",
          "Intelligente Datumsanzeige: Tag wird bei Mehrfach-Einträgen gruppiert"
        ]
      },
      {
        icon: Bug,
        title: "Fixes",
        items: [
          "Export-Fehler 'EACCESS' auf Android behoben",
          "Druck-Statusmeldung korrigiert"
        ]
      }
    ]
  },
  {
    version: "4.1.0",
    date: "01.12.2025",
    title: "The Precision Update 🎯",
    isMajor: true,
    sections: [
      {
        icon: Shield,
        title: "Logik & Sicherheit",
        items: [
          "Doppel-Buchungsschutz: Verhindert überlappende Zeiteinträge",
          "Zukunfts-Logik: Feiertage & Stunden werden erst gutgeschrieben, wenn der Tag erreicht ist",
          "OTA-Check: Manueller Update-Prüfer in den Einstellungen"
        ]
      },
      {
        icon: FileText,
        title: "Berichtsvorschau 2.0",
        items: [
          "Monats-Navigation: Wechsle Monate direkt in der Vorschau",
          "Smart-Zoom: PDF passt sich automatisch perfekt an dein Display an",
          "Neuer Dropdown: Schicke Auswahl für Wochen & Monate"
        ]
      },
      {
        icon: Bug,
        title: "Fixes & UI",
        items: [
          "iPhone Fix: 'Neuer Eintrag'-Button ist jetzt immer klickbar",
          "Safe-Area: Menüs werden unten nicht mehr abgeschnitten",
          "Drawer-Scroll Fix: Zeitwahl schließt sich nicht mehr versehentlich beim Scrollen"
        ]
      }
    ]
  },
  {
    version: "4.0.0",
    date: "30.11.2025",
    title: "The Smooth Elevator Update 🛗",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Look & Feel",
        items: [
          "High-End Animationen (Seitenübergänge, Listen)",
          "Haptisches Feedback (Vibrationen bei Interaktionen)",
          "Swipe-to-Delete: Einträge einfach nach links wischen",
          "TimePicker: Zeitwahl aktualisiert sich direkt beim Scrollen"
        ]
      },
      {
        icon: Zap,
        title: "Workflow & Speed",
        items: [
          "Magic Copy: Neuer 'Wie zuletzt'-Button im Formular",
          "Autocomplete: Projekt-Vorschläge beim Tippen",
          "Massive Performance-Optimierung (Lazy Loading)",
          "App-Startzeit drastisch verkürzt"
        ]
      },
      {
        icon: FileText,
        title: "PDF Bericht 2.0",
        items: [
          "Profilfoto im Header (automatisch rechtsbündig)",
          "Layout-Fix: Keine leeren Seiten mehr",
          "Vorschau öffnet sich als schickes Overlay"
        ]
      }
    ]
  },
  {
    version: "3.0.0",
    date: "25.11.2025",
    title: "The Dark Mode Update 🌙",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Neue Features & UI",
        items: [
          "Dark Mode: Unterstützung für Hell, Dunkel und System",
          "Custom Drawers: Moderne Slide-Up Menüs statt nativer Auswahl",
          "Smart DatePicker: Neuer Kalender mit Zebra-Look & großen Flächen",
          "Verbesserte UX: Toasts statt nerviger Alerts",
          "Smart Defaults: Merkt sich die letzte Tätigkeit"
        ]
      },
      {
        icon: Zap,
        title: "Technik",
        items: [
          "Komplettes Refactoring in modulare Komponenten",
          "Upgrade auf Tailwind CSS v4 Engine",
          "Android Splash Screen: Weißes Aufblitzen entfernt"
        ]
      }
    ]
  },
  {
    version: "2.0.1",
    date: "20.11.2025",
    title: "Auto-Backup & Dateizugriff 🛡️",
    isMajor: false,
    sections: [
      {
        icon: Shield,
        title: "Datensicherheit",
        items: [
          "Automatisches Backup: Optional 1x täglich",
          "Offener Speicherort: Dateien landen direkt in 'Dokumente'"
        ]
      },
      {
        icon: Bug,
        title: "Fixes",
        items: [
          "Robuster PDF-Export (Zeitstempel in Dateinamen)",
          "Verbesserter Zugriff auf das Dateisystem"
        ]
      }
    ]
  },
  {
    version: "2.0.0",
    date: "18.11.2025",
    title: "PDF V4, Feiertage & Fahrtzeit 🚀",
    isMajor: true,
    sections: [
      {
        icon: FileText,
        title: "PDF Bericht V4",
        items: [
          "Neues Design: Zebra-Look & optimiertes Layout",
          "Tages-Saldo: Neue Spalte für Plus/Minus pro Tag",
          "Erweiterte Zusammenfassung mit Soll/Ist Vergleich"
        ]
      },
      {
        icon: Globe,
        title: "Logik",
        items: [
          "Intelligente Feiertage (automatische Erkennung Österreich)",
          "Differenzierte Fahrtzeiten: Anreise (bezahlt) vs. Fahrt (unbezahlt)",
          "Unbezahlte Zeiten werden separat ausgewiesen"
        ]
      }
    ]
  }
];
const ChangelogModal = ({ isOpen, onClose }) => {
  const dragControls = useDragControls();
  reactExports.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed left-0 top-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[150]",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { y: "100%", opacity: 0.5 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 0 },
        transition: { type: "spring", damping: 25, stiffness: 300 },
        drag: "y",
        dragConstraints: { top: 0 },
        dragElastic: 0.2,
        dragListener: false,
        dragControls,
        onDragEnd: (_, info) => {
          if (info.offset.y > 100) onClose();
        },
        className: `
              fixed z-[160] flex flex-col bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden
              inset-x-0 bottom-0 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:w-[600px] md:h-[80vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            `,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none",
              onPointerDown: (e) => dragControls.start(e),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center p-5 pt-2 md:pt-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 z-10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-zinc-800 dark:text-white", children: "Änderungsprotokoll" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-500 dark:text-zinc-400", children: "Was ist neu in der App?" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 20 }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              id: "changelog-content",
              className: "flex-1 overflow-y-auto p-0 scrollbar-hide",
              style: { paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" },
              children: [
                CHANGELOG_DATA.map((release, idx) => (
                  // CHANGE: border-slate-100 -> border-zinc-100
                  // CHANGE: bg-orange-50 -> bg-emerald-50 (für Major Highlights)
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-6 ${idx < CHANGELOG_DATA.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""} ${release.isMajor ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-baseline mb-3", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-black text-zinc-800 dark:text-zinc-100 flex items-center gap-2", children: [
                        "v",
                        release.version,
                        release.isMajor && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded-full uppercase tracking-wider", children: "Major" })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-zinc-400", children: release.date })
                    ] }),
                    release.title && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-bold text-zinc-600 dark:text-zinc-300 mb-4 italic", children: [
                      '"',
                      release.title,
                      '"'
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: release.sections.map((section, sIdx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-xs font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(section.icon, { size: 14 }),
                        " ",
                        section.title
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: section.items.map((item, iIdx) => (
                        // CHANGE: text-slate-600 -> text-zinc-600
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-2 leading-relaxed", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 mt-1.5 shrink-0" }),
                          item
                        ] }, iIdx)
                      )) })
                    ] }, sIdx)) })
                  ] }, release.version)
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-zinc-300 dark:text-zinc-600 text-[10px] uppercase tracking-widest", children: "Ende des Protokolls" })
              ]
            }
          )
        ]
      }
    )
  ] }) });
};
const HelpModal = ({ isOpen, onClose }) => {
  const dragControls = useDragControls();
  reactExports.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed left-0 top-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[150]",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { y: "100%", opacity: 0.5 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 0 },
        transition: { type: "spring", damping: 25, stiffness: 300 },
        drag: "y",
        dragConstraints: { top: 0 },
        dragElastic: 0.2,
        dragListener: false,
        dragControls,
        onDragEnd: (_, info) => {
          if (info.offset.y > 100) onClose();
        },
        className: `
              fixed z-[160] flex flex-col bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden
              inset-x-0 bottom-0 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:w-[600px] md:h-[85vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            `,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none",
              onPointerDown: (e) => dragControls.start(e),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 z-10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-black text-zinc-800 dark:text-white tracking-tight", children: "Anleitung & Hilfe" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5", children: "Schnellstart für Kollegen" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onClose,
                className: "p-2 -mr-2 -mt-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 24 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "overflow-y-auto p-5 scrollbar-hide space-y-8 bg-white dark:bg-zinc-900",
              style: { paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider mb-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Rocket, { size: 16 }),
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Wofür ist diese App?" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed", children: "Schluss mit Zettelwirtschaft! Erfasse deine Stunden, Fahrten und Urlaub direkt am Handy. Am Monatsende erstellst du einfach ein PDF." })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg", children: "1" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-lg text-zinc-800 dark:text-white", children: "Stunden erfassen" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-4", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-zinc-600 dark:text-zinc-400", children: "Du hast zwei Möglichkeiten:" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 font-bold text-zinc-800 dark:text-white text-sm mb-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 16, className: "text-green-500" }),
                        " Live Stempeluhr (Neu!)"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2", children: [
                        "Drücke links unten auf ",
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: "EIN" }),
                        ", wenn du anfängst. Wenn du fertig bist, drücke auf ",
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: "AUS" }),
                        ". Die App füllt den Eintrag automatisch aus und rundet die Zeit."
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 font-bold text-zinc-800 dark:text-white text-sm mb-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { size: 16, className: "text-emerald-500" }),
                        ' Manuell & "Wie zuletzt"'
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed", children: [
                        "Drücke rechts unten auf das ",
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: "+" }),
                        '. Oben kannst du "Wie zuletzt" wählen, um Start, Ende und Pause vom Vortag zu kopieren.'
                      ] })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg", children: "2" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-lg text-zinc-800 dark:text-white", children: "Fahrtzeiten" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-zinc-600 dark:text-zinc-400 mb-2", children: 'Wähle oben im Menü "Fahrt".' }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "text-xs text-zinc-500 dark:text-zinc-400 space-y-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2 items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100 dark:border-green-900/30", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-3 h-3 rounded-full bg-green-500 shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "An/Abreise (Grün):" }),
                          " Bezahlte Arbeitszeit (Code 190)."
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2 items-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg border border-orange-100 dark:border-orange-900/30", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-3 h-3 rounded-full bg-orange-500 shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Fahrtzeit (Orange):" }),
                          " Unbezahlte Zeit (Code 19)."
                        ] })
                      ] })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg", children: "3" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-lg text-zinc-800 dark:text-white", children: "Urlaub, Krank & ZA" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Hourglass, { className: "text-purple-500 mt-1 shrink-0", size: 20 }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-zinc-600 dark:text-zinc-400", children: [
                      "Wähle einfach ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Urlaub" }),
                      ", ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Krank" }),
                      " oder ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "ZA" }),
                      " (Zeitausgleich) aus. Die App trägt automatisch die richtigen Soll-Stunden für den Tag ein."
                    ] })
                  ] }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg", children: "4" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-lg text-zinc-800 dark:text-white", children: "Monatsabschluss" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-zinc-600 dark:text-zinc-400", children: [
                      "Klicke auf dem Startbildschirm oben rechts auf das ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "inline w-4 h-4 mx-1 align-sub text-emerald-500" }),
                      " Symbol."
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-zinc-600 dark:text-zinc-400", children: [
                      "Dort siehst du eine Vorschau. Prüfe alles und klicke dann auf ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "PDF" }),
                      ", um den Bericht zu senden oder zu speichern."
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 pt-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FingerprintPattern, { className: "text-zinc-600 dark:text-zinc-400 mb-2", size: 24 }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-sm text-zinc-800 dark:text-zinc-300", children: "Löschen" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight", children: [
                      "Einfach einen Eintrag in der Liste nach ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "links wischen" }),
                      "."
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "text-zinc-600 dark:text-zinc-400 mb-2", size: 24 }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-sm text-zinc-800 dark:text-zinc-300", children: "Backup" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight", children: "Die App speichert 1x täglich automatisch eine Sicherung lokal." })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-zinc-300 dark:text-zinc-700 text-[10px] uppercase tracking-widest font-bold pb-2", children: '"Damit keine Stunde im Schacht verschwindet"' })
              ]
            }
          )
        ]
      }
    )
  ] }) });
};
const initGoogleAuth = () => {
  return GoogleAuth.initialize();
};
const signInGoogle = async () => {
  const user = await GoogleAuth.signIn();
  return user;
};
const signOutGoogle = async () => {
  await GoogleAuth.signOut();
};
const createMultipartBody = (metadata, jsonContent, boundary) => {
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";
  return delimiter + "Content-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + delimiter + "Content-Type: application/json\r\n\r\n" + JSON.stringify(jsonContent) + close_delim;
};
const findFileIdByName = async (accessToken, fileName) => {
  const query = `name = '${fileName}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};
const uploadOrUpdateFile = async (accessToken, fileName, jsonContent) => {
  const boundary = "foo_bar_baz";
  const existingFileId = await findFileIdByName(accessToken, fileName);
  let url;
  let method;
  if (existingFileId) {
    console.log("Drive: Überschreibe Datei", existingFileId);
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH";
  } else {
    console.log("Drive: Erstelle neue Datei");
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    method = "POST";
  }
  const metadata = {
    name: fileName,
    mimeType: "application/json"
  };
  const body = createMultipartBody(metadata, jsonContent, boundary);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error("Upload Error: " + txt);
  }
  return await response.json();
};
const findLatestBackup = async (accessToken) => {
  const query = "name = 'kogler_backup.json' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id, name, createdTime, modifiedTime)`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Fehler beim Suchen");
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
};
const downloadFileContent = async (accessToken, fileId) => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("Fehler beim Download");
  return await response.json();
};
const selectBackupFolder = async () => {
  try {
    const result = await ScopedStorage.pickFolder();
    if (result) {
      localStorage.setItem(STORAGE_KEYS.BACKUP_TARGET, JSON.stringify(result));
      return true;
    }
    return false;
  } catch (err) {
    console.error("Ordnerwahl abgebrochen oder Fehler:", err);
    throw err;
  }
};
const hasBackupTarget = () => {
  return !!localStorage.getItem(STORAGE_KEYS.BACKUP_TARGET);
};
const writeBackupFile = async (fileName, dataObj) => {
  const targetStr = localStorage.getItem(STORAGE_KEYS.BACKUP_TARGET);
  if (!targetStr) throw new Error("Kein Backup-Ziel gewählt");
  const folderObj = JSON.parse(targetStr);
  const content = JSON.stringify(dataObj, null, 2);
  await ScopedStorage.writeFile({
    ...folderObj,
    path: fileName,
    data: content,
    encoding: "utf8",
    mimeType: "application/json"
  });
  return true;
};
const clearBackupTarget = () => {
  localStorage.removeItem(STORAGE_KEYS.BACKUP_TARGET);
};
const exportToSelectedFolder = async (fileName, dataObj) => {
  try {
    const folder = await ScopedStorage.pickFolder();
    if (!folder) return false;
    const content = JSON.stringify(dataObj, null, 2);
    await ScopedStorage.writeFile({
      ...folder,
      path: fileName,
      data: content,
      encoding: "utf8",
      mimeType: "application/json"
    });
    return true;
  } catch (err) {
    console.error("Manueller Export Fehler:", err);
    throw err;
  }
};
const readJsonFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
const analyzeBackupData = (data) => {
  if (!data) return { valid: false, isValid: false };
  const isArray = Array.isArray(data);
  const entries = isArray ? data : data.entries || [];
  const settings = !isArray && data.user ? data.user : null;
  const analysisResult = {
    valid: true,
    entryCount: entries.length,
    hasSettings: !!settings,
    // Wichtig: True, wenn Einstellungen gefunden wurden
    entries,
    settings,
    timestamp: data.backupDate || (/* @__PURE__ */ new Date()).toISOString()
    // Falls vorhanden
  };
  return {
    isValid: true,
    // Für den Wizard
    data: analysisResult,
    // Für den Wizard (wird als restoreData gesetzt)
    ...analysisResult
    // Für direkte Verwendung (Legacy Support)
  };
};
const applyBackup = (analyzedData, mode = "ALL") => {
  if (!analyzedData || !analyzedData.valid) return false;
  try {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(analyzedData.entries));
    if (mode === "ALL" && analyzedData.hasSettings && analyzedData.settings) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(analyzedData.settings));
    }
    return true;
  } catch (error) {
    console.error("Fehler beim Anwenden des Backups:", error);
    return false;
  }
};
const ImportConflictModal = ({ analysisData, onConfirm, onCancel }) => {
  if (!analysisData) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.div,
    {
      initial: { opacity: 0, scale: 0.9, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.9 },
      className: "bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-orange-500 p-4 text-white flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Import, { size: 24, className: "text-white" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-lg", children: "Backup Inhalt prüfen" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-600 dark:text-slate-300 text-sm leading-relaxed", children: [
            "Wir haben Daten in diesem Backup gefunden. Da auch ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Einstellungen" }),
            " (Arbeitszeitmodell) enthalten sind, musst du entscheiden:"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 text-slate-600 dark:text-slate-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 16 }),
                " Zeiteinträge"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow-sm", children: analysisData.entryCount })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 text-slate-600 dark:text-slate-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(User, { size: 16 }),
                " Einstellungen"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-800", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 12 }),
                " Enthalten"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded text-center", children: 'Achtung: "Alles importieren" überschreibt dein aktuelles Arbeitszeitmodell!' })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-slate-50 dark:bg-slate-900/30 flex flex-col gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => onConfirm("ALL"),
              className: "w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 18 }),
                " Alles überschreiben & Importieren"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => onConfirm("ENTRIES_ONLY"),
              className: "w-full py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all active:scale-95",
              children: "Nur Einträge (Einstellungen behalten)"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onCancel,
              className: "w-full py-2 text-slate-400 font-medium text-sm hover:text-slate-600 dark:hover:text-slate-200 transition-colors",
              children: "Abbrechen"
            }
          )
        ] })
      ]
    }
  ) });
};
const PresetModal = ({ isOpen, onClose, onSelect, currentModelId }) => {
  const [selectedId, setSelectedId] = reactExports.useState(currentModelId || "custom");
  reactExports.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);
  reactExports.useEffect(() => {
    if (isOpen) {
      setSelectedId(currentModelId || "custom");
    }
  }, [isOpen, currentModelId]);
  if (!isOpen) return null;
  const handleSave = () => {
    const model = WORK_MODELS.find((m) => m.id === selectedId);
    if (model) {
      onSelect(model);
      onClose();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800 rounded-t-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-lg text-zinc-800 dark:text-white flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 20, className: "text-zinc-600 dark:text-zinc-400" }),
        "Vorlage wählen"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onClose,
          className: "p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-500 dark:text-zinc-400",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 20 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-y-auto p-4 space-y-2", children: WORK_MODELS.map((model) => {
      const isSelected = selectedId === model.id;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          onClick: () => setSelectedId(model.id),
          className: `p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group
                            ${isSelected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-zinc-100 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-700/50"}
                        `,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `font-bold ${isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-200"}`, children: model.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium", children: model.description })
            ] }),
            isSelected && // CHANGE: text-orange -> text-emerald
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 22, strokeWidth: 3, className: "text-emerald-500" })
          ]
        },
        model.id
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 18, className: "text-red-500 shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-red-600 dark:text-red-400 font-medium", children: "Achtung: Das Ändern der Vorlage berechnet die Überstunden aller vergangenen Einträge neu!" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-b-2xl flex gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onClose,
          className: "px-4 py-3 rounded-xl text-zinc-500 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors",
          children: "Abbrechen"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleSave,
          className: "flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 18 }),
            "Übernehmen"
          ]
        }
      )
    ] })
  ] }) });
};
const DecimalDurationPicker = ({ isOpen, onClose, initialMinutes, onConfirm, title }) => {
  const hoursRef = reactExports.useRef(null);
  const decimalsRef = reactExports.useRef(null);
  const dragControls = useDragControls();
  const ITEM_HEIGHT = 64;
  const getInitialValues = (mins) => {
    if (mins === void 0 || mins === null) return { h: 8, d: 0 };
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    let d = 0;
    if (m >= 45) d = 0.75;
    else if (m >= 30) d = 0.5;
    else if (m >= 15) d = 0.25;
    return { h, d };
  };
  const [selectedHour, setSelectedHour] = reactExports.useState(8);
  const [selectedDecimal, setSelectedDecimal] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (isOpen) {
      const { h, d } = getInitialValues(initialMinutes);
      setSelectedHour(h);
      setSelectedDecimal(d);
      setTimeout(() => {
        scrollToValue(hoursRef, h);
        scrollToValue(decimalsRef, d);
      }, 100);
    }
  }, [isOpen, initialMinutes]);
  const scrollToValue = (ref, val) => {
    if (ref.current) {
      const el = ref.current.querySelector(`[data-value="${val}"]`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };
  const hours = Array.from({ length: 25 }, (_, i) => i);
  const decimals = [0, 0.25, 0.5, 0.75];
  const handleScroll = (e, type) => {
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    if (type === "hour") {
      const val = hours[index];
      if (val !== void 0 && val !== selectedHour) {
        setSelectedHour(val);
        Haptics.impact({ style: ImpactStyle.Light });
      }
    } else {
      const val = decimals[index];
      if (val !== void 0 && val !== selectedDecimal) {
        setSelectedDecimal(val);
        Haptics.impact({ style: ImpactStyle.Light });
      }
    }
  };
  const handleConfirm = () => {
    const totalMinutes = selectedHour * 60 + selectedDecimal * 60;
    onConfirm(totalMinutes);
    onClose();
  };
  const formatDecimal = (d) => {
    if (d === 0) return ", 00";
    if (d === 0.25) return ", 25";
    if (d === 0.5) return ", 50";
    if (d === 0.75) return ", 75";
    return String(d).replace("0.", ", ");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { type: "spring", damping: 25, stiffness: 300 },
        drag: "y",
        dragConstraints: { top: 0 },
        dragElastic: 0.2,
        dragListener: false,
        dragControls,
        onDragEnd: (_, info) => {
          if (info.offset.y > 100) onClose();
        },
        className: "fixed bottom-0 left-0 right-0 z-[9999] rounded-t-3xl overflow-visible flex flex-col md:max-w-md md:mx-auto",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl z-0", style: { bottom: "-100px" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "relative z-10 w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none",
              onPointerDown: (e) => dragControls.start(e),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-20 flex justify-between items-center px-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-3xl", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onClose,
                className: "p-3 text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-full transition-transform active:scale-95",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 24 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-zinc-800 dark:text-white tracking-wide text-base", children: title || "Stunden" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  Haptics.impact({ style: ImpactStyle.Medium });
                  handleConfirm();
                },
                className: "p-3 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold transition-transform active:scale-95",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 24 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 h-[280px] w-full select-none pb-safe overflow-hidden", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-1/2 left-4 right-4 h-[64px] -mt-[36px] bg-zinc-100 dark:bg-zinc-800 pointer-events-none z-0 border border-zinc-200 dark:border-zinc-700 rounded-xl" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "relative z-10 h-full w-full flex justify-center items-center",
                style: {
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)"
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      ref: hoursRef,
                      onScroll: (e) => handleScroll(e, "hour"),
                      className: "h-[280px] w-[80px] overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[108px]",
                      children: hours.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "div",
                        {
                          "data-value": h,
                          onClick: () => {
                            setSelectedHour(h);
                            scrollToValue(hoursRef, h);
                          },
                          className: `h-[64px] flex items-center justify-end pr-2 snap-center cursor-pointer transition-all duration-150 pt-1 ${h === selectedHour ? "font-bold text-4xl text-zinc-800 dark:text-white scale-110" : "text-zinc-300 dark:text-zinc-600 text-2xl scale-90"}`,
                          children: h
                        },
                        h
                      ))
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      ref: decimalsRef,
                      onScroll: (e) => handleScroll(e, "decimal"),
                      className: "h-[280px] w-[90px] overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[108px]",
                      children: decimals.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "div",
                        {
                          "data-value": d,
                          onClick: () => {
                            setSelectedDecimal(d);
                            scrollToValue(decimalsRef, d);
                          },
                          className: `h-[64px] flex items-center justify-start pl-0 snap-center cursor-pointer transition-all duration-150 pt-1 ${d === selectedDecimal ? "font-bold text-4xl text-emerald-500 scale-110" : "text-zinc-300 dark:text-zinc-600 text-2xl scale-90"}`,
                          children: formatDecimal(d)
                        },
                        d
                      ))
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[64px] flex items-center justify-start pl-1 pt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl text-zinc-400 font-semibold", children: "h" }) })
                ] })
              }
            )
          ] })
        ]
      }
    )
  ] }) });
};
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Löschen",
  confirmColor = "red"
  // red, emerald (statt blue), zinc (statt slate)
}) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);
  if (!isOpen) return null;
  const getColorClass = (color) => {
    switch (color) {
      // CHANGE: blue -> emerald (falls wir mal positive Bestätigung brauchen)
      case "emerald":
        return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20";
      // CHANGE: slate -> zinc
      case "zinc":
        return "bg-zinc-800 hover:bg-zinc-900 text-white";
      case "red":
      default:
        return "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-[10000] flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.9, opacity: 0 },
        className: "relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "text-red-600 dark:text-red-500", size: 24 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold text-center text-zinc-900 dark:text-white mb-2", children: title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-zinc-500 dark:text-zinc-400 text-center leading-relaxed", children: message })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onClose,
                className: "flex-1 py-3 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
                children: "Abbrechen"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onConfirm,
                className: `flex-1 py-3 px-4 rounded-xl font-bold transition-colors shadow-lg ${getColorClass(confirmColor)}`,
                children: confirmText
              }
            )
          ] })
        ]
      }
    )
  ] });
};
const Settings = ({
  userData,
  setUserData,
  theme,
  setTheme,
  autoBackup,
  setAutoBackup,
  onExport,
  onImport,
  onDeleteAll,
  onCheckUpdate
}) => {
  const fileInputRef = reactExports.useRef(null);
  const [isProcessingImg, setIsProcessingImg] = reactExports.useState(false);
  const [showChangelog, setShowChangelog] = reactExports.useState(false);
  const [showHelp, setShowHelp] = reactExports.useState(false);
  const [isCloudConnected, setIsCloudConnected] = reactExports.useState(false);
  const [hasBackupFolder, setHasBackupFolder] = reactExports.useState(false);
  const [pendingImport, setPendingImport] = reactExports.useState(null);
  const importInputRef = reactExports.useRef(null);
  const [showPresetModal, setShowPresetModal] = reactExports.useState(false);
  const [showPresetWarning, setShowPresetWarning] = reactExports.useState(false);
  const [showDurationPicker, setShowDurationPicker] = reactExports.useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = reactExports.useState(null);
  const activeModelId = userData.workModelId || "custom";
  const isCustomMode = activeModelId === "custom";
  const activeModelLabel = WORK_MODELS.find((m) => m.id === activeModelId)?.label || "Benutzerdefiniert";
  const [isLocked, setIsLocked] = reactExports.useState(true);
  reactExports.useEffect(() => {
    initGoogleAuth();
    setIsCloudConnected(localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC) === "true");
    setHasBackupFolder(hasBackupTarget());
  }, []);
  reactExports.useEffect(() => {
    setIsLocked(true);
  }, [activeModelId]);
  const minToHours = (m) => m === 0 ? "" : Number(m / 60).toFixed(2).replace(".", ",");
  const openDayPicker = (index) => {
    if (!isCustomMode) {
      zt("Bitte erst 'Benutzerdefiniert' wählen", { icon: "🚫" });
      Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
    if (isLocked) {
      zt("Zum Bearbeiten erst Schloss öffnen", { icon: "🔒" });
      Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }
    setPickerTargetIndex(index);
    setShowDurationPicker(true);
    Haptics.impact({ style: ImpactStyle.Light });
  };
  const handleDurationConfirm = (minutes) => {
    if (pickerTargetIndex === null) return;
    const newWorkDays = [...userData.workDays];
    newWorkDays[pickerTargetIndex] = minutes;
    setUserData({ ...userData, workDays: newWorkDays });
    zt.success("Zeit aktualisiert");
  };
  const handlePresetSelect = (model) => {
    const newUserData = { ...userData, workModelId: model.id };
    if (model.id !== "custom" && model.days) {
      newUserData.workDays = [...model.days];
    }
    setUserData(newUserData);
    zt.success(model.id === "custom" ? "Benutzerdefiniert aktiviert" : "Vorlage übernommen");
    Haptics.impact({ style: ImpactStyle.Medium });
  };
  const toggleLock = () => {
    if (!isCustomMode) {
      zt("Nur bei 'Benutzerdefiniert' möglich");
      return;
    }
    const newState = !isLocked;
    setIsLocked(newState);
    Haptics.impact({ style: ImpactStyle.Medium });
    if (!newState) {
      zt.success("Bearbeitung freigegeben");
    }
  };
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      processImport(json);
    } catch (err) {
      zt.error("Fehler beim Lesen der Datei");
    }
    e.target.value = null;
  };
  const processImport = (data) => {
    const analysis = analyzeBackupData(data);
    if (!analysis.valid) {
      zt.error("Ungültiges Backup-Format");
      return;
    }
    if (analysis.hasSettings) {
      setPendingImport(analysis);
    } else {
      applyBackup(analysis, "ALL");
      zt.success(`${analysis.entryCount} Einträge importiert!`);
      setTimeout(() => window.location.reload(), 1500);
    }
  };
  const handleConfirmImport = (mode) => {
    if (!pendingImport) return;
    applyBackup(pendingImport, mode);
    zt.success("Erfolgreich wiederhergestellt!");
    setPendingImport(null);
    setTimeout(() => window.location.reload(), 1e3);
  };
  const handleGoogleToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });
    if (isCloudConnected) {
      try {
        await signOutGoogle();
        localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC);
        setIsCloudConnected(false);
        zt.success("Cloud getrennt");
      } catch (e) {
        console.error(e);
        localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC);
        setIsCloudConnected(false);
      }
    } else {
      try {
        const user = await signInGoogle();
        if (user && user.authentication.accessToken) {
          localStorage.setItem(STORAGE_KEYS.CLOUD_SYNC, "true");
          setIsCloudConnected(true);
          if (!autoBackup) setAutoBackup(true);
          zt.success(`Verbunden: ${user.givenName || "Drive"}`);
        }
      } catch (error) {
        console.error(error);
        zt.error("Anmeldung abgebrochen");
      }
    }
  };
  const handleLocalToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });
    if (hasBackupFolder) {
      clearBackupTarget();
      setHasBackupFolder(false);
      setAutoBackup(false);
      zt("Backup-Ordner getrennt");
    } else {
      try {
        const success = await selectBackupFolder();
        if (success) {
          setHasBackupFolder(true);
          setAutoBackup(true);
          zt.success("Backup aktiviert!");
        }
      } catch (err) {
        zt.error("Auswahl abgebrochen");
      }
    }
  };
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImg(true);
    try {
      const compressedBase64 = await processImage(file);
      setUserData({ ...userData, photo: compressedBase64 });
      zt.success("Profilbild aktualisiert");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (err) {
      console.error(err);
      zt.error("Fehler beim Bild");
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const removePhoto = (e) => {
    e.stopPropagation();
    Haptics.impact({ style: ImpactStyle.Medium });
    const newData = { ...userData };
    delete newData.photo;
    setUserData(newData);
    zt.success("Bild entfernt");
  };
  const handleThemeChange = (newTheme) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setTheme(newTheme);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "w-full p-4 space-y-6 pb-20", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ChangelogModal, { isOpen: showChangelog, onClose: () => setShowChangelog(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(HelpModal, { isOpen: showHelp, onClose: () => setShowHelp(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ImportConflictModal,
      {
        analysisData: pendingImport,
        onConfirm: handleConfirmImport,
        onCancel: () => setPendingImport(null)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PresetModal,
      {
        isOpen: showPresetModal,
        onClose: () => setShowPresetModal(false),
        onSelect: handlePresetSelect,
        currentModelId: activeModelId
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmModal,
      {
        isOpen: showPresetWarning,
        onClose: () => setShowPresetWarning(false),
        onConfirm: () => {
          setShowPresetWarning(false);
          setTimeout(() => setShowPresetModal(true), 100);
        },
        title: "Arbeitszeitmodell ändern?",
        message: "Achtung: Eine Änderung des Modells führt zu einer Neuberechnung der Überstunden aller bisherigen Einträge! Möchtest du fortfahren?",
        confirmText: "Verstanden",
        confirmColor: "red"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DecimalDurationPicker,
      {
        isOpen: showDurationPicker,
        onClose: () => setShowDurationPicker(false),
        initialMinutes: pickerTargetIndex !== null ? userData.workDays[pickerTargetIndex] : 0,
        onConfirm: handleDurationConfirm,
        title: pickerTargetIndex !== null ? `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][pickerTargetIndex]} bearbeiten` : ""
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-700 pb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative group shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              onClick: () => !isProcessingImg && fileInputRef.current?.click(),
              className: "w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-transparent hover:border-emerald-500 transition-all shadow-inner relative",
              children: [
                isProcessingImg ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader, { className: "animate-spin text-emerald-500", size: 24 }) : userData.photo ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: userData.photo, alt: "Profil", className: "w-full h-full object-cover" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(User, { size: 32, className: "text-zinc-400 dark:text-zinc-500" }),
                !isProcessingImg && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { size: 20, className: "text-white" }) })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", ref: fileInputRef, className: "hidden", accept: "image/*", onChange: handlePhotoUpload }),
          userData.photo && !isProcessingImg && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: removePhoto,
              className: "absolute -bottom-1 -right-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 p-1.5 rounded-full shadow-sm hover:scale-110 transition-transform border border-white dark:border-zinc-800",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 12 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-lg dark:text-white truncate", children: "Benutzerdaten" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-400", children: "Tippe auf das Bild, um es zu ändern." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Dein Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 mt-1 focus-within:border-emerald-500 transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(User, { size: 18, className: "text-zinc-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: userData.name || "",
                onChange: (e) => setUserData({ ...userData, name: e.target.value }),
                className: "w-full bg-transparent font-bold text-zinc-800 dark:text-white outline-none",
                placeholder: "Max Mustermann"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Firma" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 mt-1 focus-within:border-emerald-500 transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { size: 18, className: "text-zinc-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: userData.company || "",
                onChange: (e) => setUserData({ ...userData, company: e.target.value }),
                className: "w-full bg-transparent font-bold text-zinc-800 dark:text-white outline-none",
                placeholder: "Firmenname GmbH"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase", children: "Position / Job" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-lg p-3 mt-1 focus-within:border-emerald-500 transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { size: 18, className: "text-zinc-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: userData.position || "",
                onChange: (e) => setUserData({ ...userData, position: e.target.value }),
                className: "w-full bg-transparent font-bold text-zinc-800 dark:text-white outline-none",
                placeholder: "Monteur"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-800/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 18, className: "text-zinc-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-zinc-700 dark:text-white", children: "Arbeitszeit Modell" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-zinc-500 dark:text-zinc-400 mt-1", children: [
            "Aktuell: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-zinc-800 dark:text-zinc-200", children: activeModelLabel })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          isCustomMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: toggleLock,
              className: `p-2 rounded-lg border transition-all ${isLocked ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-500" : "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900 text-emerald-600"}`,
              children: isLocked ? /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(LockOpen, { size: 14 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setShowPresetWarning(true),
              className: "bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 px-3 py-2 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm shrink-0",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(List, { size: 14 }),
                " Vorlagen"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-7 gap-2", children: [
        { label: "Mo", dayIndex: 1 },
        { label: "Di", dayIndex: 2 },
        { label: "Mi", dayIndex: 3 },
        { label: "Do", dayIndex: 4 },
        { label: "Fr", dayIndex: 5 },
        { label: "Sa", dayIndex: 6 },
        { label: "So", dayIndex: 0 }
      ].map(({ label, dayIndex }) => {
        const isInteractive = isCustomMode && !isLocked;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: `text-[10px] font-bold text-center uppercase ${dayIndex === 0 || dayIndex === 6 ? "text-red-400" : "text-zinc-500"}`, children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              onClick: () => openDayPicker(dayIndex),
              className: `w-full text-center p-2 rounded-lg text-xs font-bold border transition-colors relative h-[34px] flex items-center justify-center
                                ${isInteractive ? "bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-white shadow-sm cursor-pointer hover:border-emerald-500" : "bg-transparent border-transparent text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-80"}
                            `,
              children: [
                userData.workDays[dayIndex] > 0 ? minToHours(userData.workDays[dayIndex]) : "-",
                userData.workDays[dayIndex] > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isInteractive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}` })
              ]
            }
          )
        ] }, dayIndex);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full", children: [
        "Wochenstunden: ",
        (userData.workDays.reduce((a, b) => a + b, 0) / 60).toLocaleString("de-DE"),
        " h"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-zinc-700 dark:text-white flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { size: 18, className: "text-emerald-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Design / Theme" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2", children: ["light", "dark", "system"].map((mode) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => handleThemeChange(mode),
          className: `py-2 px-2 rounded-xl text-sm font-bold border transition-colors capitalize 
                    ${theme === mode ? "border-emerald-500 bg-emerald-50 dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"}`,
          children: mode === "system" ? "System" : mode === "light" ? "Hell" : "Dunkel"
        },
        mode
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-zinc-700 dark:text-white", children: "Daten & Backup" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2 rounded-full ${isCloudConnected ? "bg-blue-100 text-blue-600" : "bg-zinc-200 text-zinc-400"}`, children: isCloudConnected ? /* @__PURE__ */ jsxRuntimeExports.jsx(Cloud, { size: 20 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CloudOff, { size: 20 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-bold text-sm text-zinc-800 dark:text-white", children: "Google Drive" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-zinc-500 dark:text-zinc-400", children: isCloudConnected ? "Sync Aktiv" : "Nicht verbunden" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleGoogleToggle,
            className: `px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${isCloudConnected ? "border-red-200 bg-red-50 text-red-600" : "border-zinc-300 bg-white text-zinc-700"}`,
            children: isCloudConnected ? "Trennen" : "Verbinden"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2 rounded-full ${hasBackupFolder ? "bg-green-100 text-green-600" : "bg-zinc-200 text-zinc-400"}`, children: hasBackupFolder ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 20 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { size: 20 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-bold text-sm text-zinc-800 dark:text-white", children: "Lokales Backup" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-zinc-500 dark:text-zinc-400", children: hasBackupFolder ? "Aktiv (Täglich)" : "Nicht konfiguriert" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleLocalToggle,
            className: `px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${hasBackupFolder ? "border-red-200 bg-red-50 text-red-600" : "border-zinc-300 bg-white text-zinc-700"}`,
            children: hasBackupFolder ? "Trennen" : "Wählen"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2 pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: onExport,
            className: "w-full py-3 bg-zinc-900 dark:bg-zinc-700 text-white font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-600 flex items-center justify-center gap-2 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 18, className: "rotate-180" }),
              " Export"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => importInputRef.current?.click(),
            className: "w-full py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 18 }),
              " Import"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "file",
            ref: importInputRef,
            className: "hidden",
            accept: "application/json",
            onChange: handleFileImport
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-zinc-700 dark:text-white", children: "App & Informationen" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => {
            Haptics.impact({ style: ImpactStyle.Light });
            onCheckUpdate();
          },
          className: "w-full py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 18 }),
            " Auf Updates prüfen"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => {
            Haptics.impact({ style: ImpactStyle.Light });
            setShowHelp(true);
          },
          className: "w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 18 }),
            " Anleitung & Hilfe"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => {
            Haptics.impact({ style: ImpactStyle.Light });
            setShowChangelog(true);
          },
          className: "w-full py-3 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(History, { size: 18 }),
            " Änderungsprotokoll"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "text-red-600 dark:text-red-400", size: 20 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-red-700 dark:text-red-400", children: "Gefahrenzone" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-600/80 dark:text-red-400/80 mb-4 font-medium leading-relaxed", children: "Hier kannst du die App komplett zurücksetzen und alle lokalen Daten unwiderruflich löschen. Das ermöglicht dir einen frischen Start – ideal, wenn du z.B. den Einrichtungs-Assistenten erneut durchlaufen möchtest, um dein Stundenmodell oder deine Arbeitszeiten zu ändern." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => {
            Haptics.impact({ style: ImpactStyle.Medium });
            onDeleteAll();
          },
          className: "w-full py-3 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 18 }),
            " Alles löschen & App zurücksetzen"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-1 pb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-bold text-zinc-400 dark:text-zinc-500", children: [
        "Version ",
        APP_VERSION
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-zinc-300 dark:text-zinc-600 font-medium", children: "Developed with ❤️ by Markus Kainer & Gemini" })
    ] })
  ] });
};
const UpdateModal = ({ updateData, onClose }) => {
  if (!updateData) return null;
  const handleDownload = async () => {
    if (!updateData.downloadUrl) {
      zt.error("Keine Download-URL vorhanden.");
      return;
    }
    const target = "_system";
    const opened = window.open(updateData.downloadUrl, target);
    if (opened) ;
    else {
      console.error("Konnte Browser nicht öffnen");
      try {
        await navigator.clipboard.writeText(updateData.downloadUrl);
        zt.error("Browser-Start fehlgeschlagen. Link in Zwischenablage kopiert!", {
          duration: 5e3,
          icon: "📋"
        });
      } catch (e) {
        zt.error("Fehler beim Starten des Downloads.");
      }
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-[250] flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "absolute inset-0 bg-black/70 backdrop-blur-sm",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { scale: 0.9, opacity: 0, y: 20 },
        animate: { scale: 1, opacity: 1, y: 0 },
        exit: { scale: 0.9, opacity: 0, y: 20 },
        className: "relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Gift, { size: 40, className: "mx-auto mb-2 animate-bounce" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-black uppercase tracking-tight", children: "Update verfügbar!" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-medium opacity-90", children: [
              "Version ",
              updateData.version,
              " ist da."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 max-h-48 overflow-y-auto", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-xs font-bold text-zinc-500 uppercase mb-2", children: [
                "Das ist neu (",
                updateData.date,
                "):"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed", children: updateData.notes })
            ] }),
            Capacitor.getPlatform() === "ios" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 18, className: "shrink-0 mt-0.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Auf dem iPhone erfolgt das Update bitte über TestFlight oder den Administrator." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 pt-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: onClose,
                  className: "flex-1 py-3 font-bold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-xl transition-colors",
                  children: "Später"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: handleDownload,
                  className: "flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 20 }),
                    Capacitor.getPlatform() === "android" ? "Update laden" : "Zu GitHub"
                  ]
                }
              )
            ] })
          ] })
        ]
      }
    )
  ] }) });
};
const LiveTimerOverlay = ({
  timerState,
  onStart,
  onStop,
  onPause,
  onResume,
  targetMinutes = 510
}) => {
  const [displayStatus, setDisplayStatus] = reactExports.useState({ text: "...", isOvertime: false });
  reactExports.useEffect(() => {
    if (!timerState.isRunning) return;
    const update = () => {
      const now = /* @__PURE__ */ new Date();
      const start = new Date(timerState.startTime);
      let currentPause = 0;
      if (timerState.isPaused && timerState.pauseStartTime) {
        currentPause = now - new Date(timerState.pauseStartTime);
      }
      const totalPauseMs = (timerState.accumulatedPause || 0) + currentPause;
      const workedMs = now - start - totalPauseMs;
      const workedMinutes = workedMs / 1e3 / 60;
      const diffMinutes = targetMinutes - workedMinutes;
      if (diffMinutes > 0) {
        const h = Math.floor(diffMinutes / 60);
        const m = Math.floor(diffMinutes % 60);
        setDisplayStatus({ text: `Noch ${h}h ${m}m`, isOvertime: false });
      } else {
        const overMinutes = Math.abs(diffMinutes);
        const h = Math.floor(overMinutes / 60);
        const m = Math.floor(overMinutes % 60);
        setDisplayStatus({ text: `+ ${h}:${String(m).padStart(2, "0")} Std`, isOvertime: true });
      }
    };
    update();
    const interval = setInterval(update, 1e3 * 30);
    return () => clearInterval(interval);
  }, [timerState, targetMinutes]);
  const bottomStyle = { bottom: "calc(3.5rem + env(safe-area-inset-bottom))" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: timerState.isRunning && /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0, y: 10, scale: 0.8 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.8 },
        className: `fixed left-6 z-[89] px-3 py-1.5 rounded-xl shadow-sm border mb-3 text-xs font-bold backdrop-blur-md pointer-events-none ${displayStatus.isOvertime ? "bg-green-500/90 border-green-400 text-white" : "bg-slate-800/90 border-slate-600 text-white"}`,
        style: { bottom: "calc(7rem + env(safe-area-inset-bottom))" },
        children: timerState.isPaused ? "Pausiert" : displayStatus.text
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.button,
      {
        whileTap: { scale: 0.9 },
        onClick: timerState.isRunning ? onStop : onStart,
        onLongPress: timerState.isRunning ? timerState.isPaused ? onResume : onPause : void 0,
        style: bottomStyle,
        className: `
          fixed left-6 w-14 h-14 rounded-full shadow-2xl z-[90] flex flex-col items-center justify-center transition-all border-2
          ${timerState.isRunning ? "bg-white dark:bg-slate-800 border-red-500 text-red-500" : "bg-slate-900 dark:bg-orange-500 border-transparent text-white"}
        `,
        children: timerState.isRunning ? (
          // AUSSTEMPELN DESIGN
          /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { size: 18, fill: "currentColor", className: "mb-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-black leading-none", children: "AUS" })
          ] })
        ) : (
          // EINSTEMPELN DESIGN
          /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 20, fill: "currentColor", className: "ml-0.5 mb-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-black leading-none", children: "EIN" })
          ] })
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: timerState.isRunning && /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.button,
      {
        initial: { scale: 0, x: -20, opacity: 0 },
        animate: { scale: 1, x: 0, opacity: 1 },
        exit: { scale: 0, x: -20, opacity: 0 },
        onClick: timerState.isPaused ? onResume : onPause,
        style: bottomStyle,
        className: `
                    fixed left-24 w-10 h-10 rounded-full shadow-lg z-[88] flex items-center justify-center border
                    ${timerState.isPaused ? "bg-green-100 border-green-300 text-green-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400"}
                `,
        children: timerState.isPaused ? /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 16, fill: "currentColor" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 16, fill: "currentColor" })
      }
    ) })
  ] });
};
const OnboardingWizard = ({ onComplete }) => {
  const [step, setStep] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(false);
  const [isRestoreFlow, setIsRestoreFlow] = reactExports.useState(false);
  const [formData, setFormData] = reactExports.useState({
    name: "",
    company: "",
    // NEU: Firmenname
    role: "",
    photo: null,
    workDays: WORK_MODELS[0].days,
    autoBackup: false,
    localBackupEnabled: false
  });
  const [restoreData, setRestoreData] = reactExports.useState(null);
  const [showConflictModal, setShowConflictModal] = reactExports.useState(false);
  const fileInputRef = reactExports.useRef(null);
  const photoInputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    initGoogleAuth().catch(() => console.log("Google Auth Init failed silently/already initialized"));
  }, []);
  const handleStartNew = () => {
    setIsRestoreFlow(false);
    setStep(1);
  };
  const handleStartRestore = () => {
    setIsRestoreFlow(true);
    setStep(3);
  };
  const nextStep = () => {
    if (step === 1 && !formData.name.trim()) {
      zt.error("Bitte gib deinen Namen ein.");
      return;
    }
    setStep((prev) => prev + 1);
  };
  const prevStep = () => {
    if (step === 3 && isRestoreFlow) {
      setStep(0);
    } else {
      setStep((prev) => prev - 1);
    }
  };
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };
  const handleModelSelect = (model) => {
    const days = model.days || [0, 0, 0, 0, 0, 0, 0];
    setFormData({ ...formData, workDays: days });
  };
  const handleCustomDayChange = (dayIndex, value) => {
    const newDays = [...formData.workDays];
    newDays[dayIndex] = parseInt(value) || 0;
    setFormData({ ...formData, workDays: newDays });
  };
  const minToHours = (m) => (m / 60).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " h";
  const totalWeeklyMinutes = formData.workDays.reduce((a, b) => a + b, 0);
  const handleAutoBackupToggle = async () => {
    const newValue = !formData.autoBackup;
    setFormData((p) => ({ ...p, autoBackup: newValue }));
    if (newValue) {
      try {
        await signInGoogle();
        zt.success("Verknüpfung erfolgreich!");
      } catch (error) {
        console.error(error);
        zt("Bitte melde dich später an, um Backups zu speichern.", { icon: "ℹ️" });
      }
    }
  };
  const handleLocalBackupToggle = async () => {
    if (!formData.localBackupEnabled) {
      try {
        const success = await selectBackupFolder();
        if (success) {
          setFormData((p) => ({ ...p, localBackupEnabled: true }));
          zt.success("Ordner verknüpft!");
        }
      } catch (error) {
        console.error(error);
        zt.error("Auswahl abgebrochen");
      }
    } else {
      setFormData((p) => ({ ...p, localBackupEnabled: false }));
    }
  };
  const finishSetup = () => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
      name: formData.name,
      company: formData.company,
      // NEU: Speichern
      role: formData.role,
      // Bleibt als Fallback oder intern, obwohl App.jsx "position" nutzt. Wir speichern beides sicherheitshalber? 
      // App.jsx nutzt "position". Ich mappe hier role -> position um sicherzugehen.
      position: formData.role,
      photo: formData.photo,
      workDays: formData.workDays,
      settings: {
        autoBackup: formData.autoBackup,
        theme: "system"
      }
    }));
    if (restoreData) {
      applyBackup(restoreData);
      zt.success("Daten wiederhergestellt!");
    } else {
      zt.success("Willkommen!");
    }
    onComplete();
  };
  const handleGoogleDriveRestore = async () => {
    try {
      setLoading(true);
      const user = await signInGoogle();
      if (!user) throw new Error("Anmeldung fehlgeschlagen");
      const token = user.authentication?.accessToken;
      if (!token) throw new Error("Kein Zugriffstoken erhalten");
      const file = await findLatestBackup(token);
      if (!file) throw new Error("Kein Backup gefunden.");
      const content = await downloadFileContent(token, file.id);
      if (!content) throw new Error("Backup leer.");
      const { isValid, data } = analyzeBackupData(content);
      if (isValid) {
        setRestoreData(data);
        zt.success("Backup geladen!");
        setStep(4);
      } else {
        zt.error("Format ungültig.");
      }
    } catch (err) {
      console.error(err);
      zt.error(err.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };
  const handleLocalFileRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const json = await readJsonFile(file);
      const { isValid, data } = analyzeBackupData(json);
      if (isValid) {
        setRestoreData(data);
        zt.success("Backup geladen!");
        setStep(4);
      } else {
        zt.error("Datei ungültig.");
      }
    } catch (err) {
      zt.error("Lesefehler.");
    } finally {
      setLoading(false);
    }
  };
  const handleFolderRestore = async () => {
    try {
      setLoading(true);
      const backupContent = await selectBackupFolder();
      if (backupContent) {
        const { isValid, data } = analyzeBackupData(backupContent);
        if (isValid) {
          setRestoreData(data);
          zt.success("Backup geladen!");
          setStep(4);
        } else {
          zt.error("Ungültiges Backup.");
        }
      }
    } catch (error) {
      zt.error("Fehler beim Zugriff.");
    } finally {
      setLoading(false);
    }
  };
  const isSelected = (modelDays) => {
    const current = JSON.stringify(formData.workDays);
    const target = modelDays ? JSON.stringify(modelDays) : JSON.stringify([0, 0, 0, 0, 0, 0, 0]);
    return current === target;
  };
  const isCustomModelActive = reactExports.useMemo(() => {
    const isStandard = WORK_MODELS.some((m) => m.id !== "custom" && JSON.stringify(m.days) === JSON.stringify(formData.workDays));
    return !isStandard;
  }, [formData.workDays]);
  return (
    // CHANGE: bg-slate-50 -> bg-zinc-50
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 bg-zinc-50 dark:bg-zinc-950 z-50 flex flex-col items-center justify-center p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", children: [
        step > 0 && // CHANGE: bg-slate-100 -> bg-zinc-100
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 bg-zinc-100 dark:bg-zinc-700 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          motion.div,
          {
            className: "h-full bg-emerald-500",
            initial: { width: 0 },
            animate: { width: `${step / 4 * 100}%` }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-6 scrollbar-hide", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AnimatePresence, { mode: "wait", children: [
          step === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            motion.div,
            {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, x: -20 },
              className: "space-y-8 flex flex-col items-center justify-center h-full py-6",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "/icon.png", alt: "Logo", className: "w-12 h-12 brightness-0 invert", onError: (e) => e.target.style.display = "none" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { size: 40, className: "text-white absolute", style: { opacity: 0.2 } })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-black text-zinc-900 dark:text-white tracking-tight", children: "Kogler Zeit" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto", children: "Die moderne Zeiterfassung für Profis. Wie möchtest du starten?" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full space-y-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: handleStartNew,
                      className: "w-full p-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 20, fill: "currentColor" }),
                        "Neu starten"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: handleStartRestore,
                      className: "w-full p-5 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold text-lg hover:border-emerald-200 dark:hover:border-zinc-600 hover:bg-emerald-50/50 dark:hover:bg-zinc-700/50 transition-all flex items-center justify-center gap-3",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 20 }),
                        "Backup laden"
                      ]
                    }
                  )
                ] })
              ]
            },
            "step0"
          ),
          step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            motion.div,
            {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              exit: { opacity: 0, x: -20 },
              className: "space-y-6",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { size: 32 }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-zinc-900 dark:text-white", children: "Dein Profil" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 dark:text-zinc-400", children: "Wer nutzt die App?" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        onClick: () => photoInputRef.current?.click(),
                        className: "w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-700 border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center cursor-pointer overflow-hidden relative group",
                        children: [
                          formData.photo ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: formData.photo, alt: "Profil", className: "w-full h-full object-cover" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "text-zinc-400 group-hover:text-zinc-600 transition-colors" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 20, className: "text-white" }) })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-zinc-400", children: "Profilbild (optional)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", ref: photoInputRef, className: "hidden", accept: "image/*", onChange: handlePhotoUpload })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1", children: "Dein Name" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "text",
                          value: formData.name,
                          onChange: (e) => setFormData({ ...formData, name: e.target.value }),
                          className: "w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-bold text-zinc-900 dark:text-white",
                          placeholder: "Max Mustermann"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1", children: "Firma" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "text",
                            value: formData.company,
                            onChange: (e) => setFormData({ ...formData, company: e.target.value }),
                            className: "w-full p-4 pl-12 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200",
                            placeholder: "Firmenname GmbH"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400", size: 20 })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1", children: "Tätigkeit / Anstellung" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "text",
                          value: formData.role,
                          onChange: (e) => setFormData({ ...formData, role: e.target.value }),
                          className: "w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200",
                          placeholder: "z.B. Monteur, Techniker, Büro..."
                        }
                      )
                    ] })
                  ] })
                ] })
              ]
            },
            "step1"
          ),
          step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            motion.div,
            {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              exit: { opacity: 0, x: -20 },
              className: "space-y-6",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { size: 32 }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-zinc-900 dark:text-white", children: "Arbeitszeit" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 dark:text-zinc-400", children: "Wähle dein Modell." })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 max-h-[400px] overflow-y-auto pr-1", children: [
                  WORK_MODELS.map((model) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: () => handleModelSelect(model),
                      className: `w-full p-4 rounded-xl border-2 text-left transition-all relative ${isSelected(model.days) ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-zinc-800 dark:text-white", children: model.label }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-zinc-500 dark:text-zinc-400", children: model.description }),
                        isSelected(model.days) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-4 right-4 text-blue-500", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 20 }) })
                      ]
                    },
                    model.id
                  )),
                  isCustomModelActive && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-4 animate-in fade-in slide-in-from-top-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-bold text-zinc-400 uppercase mb-3", children: "Tagesstunden anpassen" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((dayName, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-bold w-6 ${idx === 0 || idx === 6 ? "text-red-400" : "text-zinc-500"}`, children: dayName }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "range",
                          min: "0",
                          max: "720",
                          step: "15",
                          value: formData.workDays[idx],
                          onChange: (e) => handleCustomDayChange(idx, e.target.value),
                          className: "flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono font-bold w-12 text-right", children: minToHours(formData.workDays[idx]) })
                    ] }, idx)) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-zinc-600 dark:text-zinc-300", children: "Wochenstunden:" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-bold text-emerald-500", children: minToHours(totalWeeklyMinutes) })
                    ] })
                  ] }) })
                ] })
              ]
            },
            "step2"
          ),
          step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            motion.div,
            {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              exit: { opacity: 0, x: -20 },
              className: "space-y-6",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { size: 32 }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-zinc-900 dark:text-white", children: isRestoreFlow ? "Daten laden" : "Backup & Sicherheit" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 dark:text-zinc-400", children: isRestoreFlow ? "Wo liegt dein Backup?" : "Sichere deine Daten." })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
                  !isRestoreFlow && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        onClick: handleAutoBackupToggle,
                        className: `w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${formData.autoBackup ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2 rounded-lg ${formData.autoBackup ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloudLightning, { size: 20 }) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-zinc-800 dark:text-white", children: "Google Drive Backup" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-zinc-500", children: "Tägliche Sicherung in der Cloud" })
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${formData.autoBackup ? "border-blue-500 bg-blue-500 text-white" : "border-zinc-300 dark:border-zinc-500"}`, children: formData.autoBackup && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 14, strokeWidth: 3 }) })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        onClick: handleLocalBackupToggle,
                        className: `w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${formData.localBackupEnabled ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-2 rounded-lg ${formData.localBackupEnabled ? "bg-green-100 dark:bg-green-900/50 text-green-600" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderInput, { size: 20 }) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-zinc-800 dark:text-white", children: "Lokales Auto-Backup" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-zinc-500", children: "Täglich in Ordner am Handy" })
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${formData.localBackupEnabled ? "border-green-500 bg-green-500 text-white" : "border-zinc-300 dark:border-zinc-500"}`, children: formData.localBackupEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 14, strokeWidth: 3 }) })
                        ]
                      }
                    )
                  ] }),
                  isRestoreFlow && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        onClick: handleGoogleDriveRestore,
                        disabled: loading,
                        className: "w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader, { size: 18, className: "animate-spin text-zinc-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Cloud, { size: 18, className: "text-blue-500" }) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-left flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-sm text-zinc-800 dark:text-white", children: "Aus Google Drive" }) })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "button",
                        {
                          onClick: handleFolderRestore,
                          disabled: loading,
                          className: "p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(FolderInput, { size: 20, className: "text-yellow-500" }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-zinc-700 dark:text-zinc-300", children: "Lokaler Ordner" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", ref: fileInputRef, onChange: handleLocalFileRestore, className: "hidden", accept: ".json" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            onClick: () => fileInputRef.current?.click(),
                            disabled: loading,
                            className: "w-full h-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 20, className: "text-purple-500" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-zinc-700 dark:text-zinc-300", children: "Datei (.json)" })
                            ]
                          }
                        )
                      ] })
                    ] })
                  ] })
                ] })
              ]
            },
            "step3"
          ),
          step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            motion.div,
            {
              initial: { opacity: 0, scale: 0.9 },
              animate: { opacity: 1, scale: 1 },
              className: "space-y-6 text-center py-4",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 40, strokeWidth: 3 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-zinc-900 dark:text-white", children: "Alles bereit!" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 dark:text-zinc-400", children: restoreData ? "Daten erfolgreich wiederhergestellt." : "Dein Profil wurde erfolgreich erstellt." })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: finishSetup,
                    className: "w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3",
                    children: [
                      "App starten ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 20, fill: "currentColor" })
                    ]
                  }
                ) })
              ]
            },
            "step4"
          )
        ] }) }),
        step > 0 && step < 4 && // CHANGE: border-zinc-100, bg-zinc-50/50
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 backdrop-blur-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: prevStep,
              className: "px-4 py-2 font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 18 }),
                " Zurück"
              ]
            }
          ),
          !isRestoreFlow && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: nextStep,
              className: "px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-zinc-900/10",
              children: [
                "Weiter ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 18 })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        ImportConflictModal,
        {
          isOpen: showConflictModal,
          onClose: () => setShowConflictModal(false),
          onConfirm: () => {
            setShowConflictModal(false);
            setStep(4);
          }
        }
      )
    ] })
  );
};
const ExportModal = ({ isOpen, onClose, onSelectFolder, onSelectShare, isPdf = false }) => {
  const handleChoice = (choice) => {
    Haptics.impact({ style: ImpactStyle.Light });
    if (choice === "folder") {
      onSelectFolder();
    } else if (choice === "share") {
      onSelectShare();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: isOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4",
      onClick: onClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { scale: 0.9, opacity: 0, y: 20 },
          animate: { scale: 1, opacity: 1, y: 0 },
          exit: { scale: 0.9, opacity: 0, y: 20 },
          transition: { type: "spring", damping: 25, stiffness: 300 },
          onClick: (e) => e.stopPropagation(),
          className: "bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-5 border-b border-zinc-100 dark:border-zinc-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl", children: isPdf ? (
                  // CHANGE: text-orange-600 -> text-emerald-600
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 22, className: "text-emerald-600 dark:text-emerald-400" })
                ) : (
                  // CHANGE: text-orange-600 -> text-emerald-600
                  /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { size: 22, className: "text-emerald-600 dark:text-emerald-400" })
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-bold text-lg text-zinc-800 dark:text-white", children: isPdf ? "PDF speichern" : "Daten exportieren" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-500 dark:text-zinc-400", children: "Wähle eine Methode" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: onClose,
                  className: "p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 20, className: "text-zinc-400" })
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => handleChoice("folder"),
                  className: "w-full flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl border border-zinc-200 dark:border-zinc-600 transition-all active:scale-[0.98]",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderUp, { size: 24, className: "text-blue-600 dark:text-blue-400" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-bold text-zinc-800 dark:text-white", children: isPdf ? "In Dokumente speichern" : "In Ordner speichern" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-zinc-500 dark:text-zinc-400", children: isPdf ? "Speichert die PDF im Ordner 'Documents'" : "Wähle einen Speicherort (z.B. Downloads)" })
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => handleChoice("share"),
                  className: "w-full flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl border border-zinc-200 dark:border-zinc-600 transition-all active:scale-[0.98]",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-green-100 dark:bg-green-900/30 rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 24, className: "text-green-600 dark:text-green-400" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-bold text-zinc-800 dark:text-white", children: "Teilen / Senden" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs text-zinc-500 dark:text-zinc-400", children: "Per WhatsApp, E-Mail oder andere Apps" })
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onClose,
                className: "w-full py-3 text-zinc-500 dark:text-zinc-400 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-xl transition-colors",
                children: "Abbrechen"
              }
            ) })
          ]
        }
      )
    }
  ) });
};
function useEntries() {
  const [entries, setEntries] = reactExports.useState(
    () => JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES) || "[]")
  );
  reactExports.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  }, [entries]);
  const addEntry = (entry) => {
    setEntries((prev) => [entry, ...prev]);
  };
  const updateEntry = (updatedEntry) => {
    setEntries(
      (prev) => prev.map((e) => e.id === updatedEntry.id ? updatedEntry : e)
    );
  };
  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };
  const deleteAllEntries = () => {
    setEntries([]);
  };
  const importEntries = (newEntries) => {
    setEntries(newEntries);
  };
  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteAllEntries,
    importEntries
  };
}
function useSettings() {
  const [userData, setUserData] = reactExports.useState(
    () => JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || {
      name: "",
      position: "",
      photo: null,
      // Wir nehmen das erste Modell (38.5-classic) als Standard-Referenz
      workDays: [...WORK_MODELS[0].days]
    }
  );
  const [theme, setTheme] = reactExports.useState(
    () => localStorage.getItem(STORAGE_KEYS.THEME) || "system"
  );
  const [autoBackup, setAutoBackup] = reactExports.useState(
    () => localStorage.getItem(STORAGE_KEYS.AUTO_BACKUP) === "true"
  );
  reactExports.useEffect(() => localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData)), [userData]);
  reactExports.useEffect(() => localStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, autoBackup), [autoBackup]);
  reactExports.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    const root = document.documentElement;
    const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      if (theme === "dark") root.classList.add("dark");
      else if (theme === "light") root.classList.remove("dark");
      else if (theme === "system") {
        if (systemQuery.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };
    applyTheme();
    if (theme === "system") {
      systemQuery.addEventListener("change", applyTheme);
      return () => systemQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);
  return {
    userData,
    setUserData,
    theme,
    setTheme,
    autoBackup,
    setAutoBackup
  };
}
const BACKUP_FILENAME = "kogler_backup.json";
function useAutoBackup(entries, userData, isEnabled) {
  const latestDataRef = reactExports.useRef({ entries, userData });
  const lastHash = reactExports.useRef("");
  const debounceTimer = reactExports.useRef(null);
  const isUploading = reactExports.useRef(false);
  reactExports.useEffect(() => {
    latestDataRef.current = { entries, userData };
  }, [entries, userData]);
  const createHash = (data) => JSON.stringify(data).length + "-" + (data.entries?.length || 0);
  const performBackup = async (source) => {
    const { entries: entries2, userData: userData2 } = latestDataRef.current;
    if (!isEnabled || !entries2 || entries2.length === 0) return;
    if (isUploading.current) return;
    const payload = {
      user: userData2,
      entries: entries2,
      lastModified: (/* @__PURE__ */ new Date()).toISOString(),
      note: "Kogler Zeit Auto-Sync"
    };
    const currentHash = createHash(payload);
    if (currentHash === lastHash.current) return;
    isUploading.current = true;
    console.log(`💾 Sync Start (${source})...`);
    try {
      if (Capacitor.isNativePlatform()) {
        let savedLocally = false;
        if (hasBackupTarget()) {
          try {
            await writeBackupFile(BACKUP_FILENAME, payload);
            console.log("✅ Lokal gespeichert (SAF/Benutzer-Ordner).");
            savedLocally = true;
          } catch (safError) {
            console.warn("⚠️ SAF Backup fehlgeschlagen, versuche Fallback:", safError);
          }
        }
        if (!savedLocally) {
          const fallbackDirectory = Capacitor.getPlatform() === "ios" ? Directory.Documents : Directory.External;
          await Filesystem.writeFile({
            path: BACKUP_FILENAME,
            data: JSON.stringify(payload),
            directory: fallbackDirectory,
            encoding: Encoding.UTF8
          });
          console.log(`✅ Lokal gespeichert (Fallback: ${fallbackDirectory}).`);
        }
      }
      const isCloudEnabled = localStorage.getItem("kogler_cloud_sync") === "true";
      if (isCloudEnabled) {
        const authResponse = await GoogleAuth.refresh().catch(() => null);
        if (authResponse?.accessToken) {
          await uploadOrUpdateFile(authResponse.accessToken, BACKUP_FILENAME, payload);
          console.log(`☁️ Cloud Sync OK (${source})`);
          lastHash.current = currentHash;
        }
      }
    } catch (err) {
      console.error("Backup Error:", err);
    } finally {
      isUploading.current = false;
    }
  };
  reactExports.useEffect(() => {
    const setupListener = async () => {
      await App$1.removeAllListeners();
      App$1.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) performBackup("Background");
      });
    };
    setupListener();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performBackup("Auto-Save");
    }, 2e3);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [entries, userData, isEnabled]);
}
const roundToNearest15Minutes = (dateStrOrObj) => {
  if (!dateStrOrObj) return null;
  const date = new Date(dateStrOrObj);
  const minutes = date.getMinutes();
  const remainder = minutes % 15;
  let roundedMinutes = minutes;
  if (remainder < 8) {
    roundedMinutes = minutes - remainder;
  } else {
    roundedMinutes = minutes + (15 - remainder);
  }
  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
};
const useLiveTimer = () => {
  const [timerState, setTimerState] = reactExports.useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LIVE_TIMER);
    return saved ? JSON.parse(saved) : {
      isRunning: false,
      isPaused: false,
      startTime: null,
      pauseStartTime: null,
      accumulatedPause: 0
    };
  });
  const [autoCheckoutData, setAutoCheckoutData] = reactExports.useState(null);
  reactExports.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LIVE_TIMER, JSON.stringify(timerState));
  }, [timerState]);
  reactExports.useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      const startDate = new Date(timerState.startTime);
      const now = /* @__PURE__ */ new Date();
      const isSameDay = startDate.getDate() === now.getDate() && startDate.getMonth() === now.getMonth() && startDate.getFullYear() === now.getFullYear();
      if (!isSameDay) {
        console.log("Auto-Checkout triggered: Start date was in the past.");
        const autoEnd = new Date(startDate);
        autoEnd.setHours(23, 59, 0, 0);
        const pauseMinutes = Math.round((timerState.accumulatedPause || 0) / 1e3 / 60);
        setAutoCheckoutData({
          start: startDate,
          end: autoEnd,
          pause: pauseMinutes,
          isAutoCheckout: true
        });
        setTimerState({
          isRunning: false,
          isPaused: false,
          startTime: null,
          pauseStartTime: null,
          accumulatedPause: 0
        });
      }
    }
  }, []);
  const startTimer = () => {
    setTimerState({
      isRunning: true,
      isPaused: false,
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      pauseStartTime: null,
      accumulatedPause: 0
    });
  };
  const pauseTimer = () => {
    if (!timerState.isRunning || timerState.isPaused) return;
    setTimerState((prev) => ({
      ...prev,
      isPaused: true,
      pauseStartTime: (/* @__PURE__ */ new Date()).toISOString()
    }));
  };
  const resumeTimer = () => {
    if (!timerState.isPaused) return;
    const now = /* @__PURE__ */ new Date();
    const pauseStart = new Date(timerState.pauseStartTime);
    const pauseDiffMs = now - pauseStart;
    setTimerState((prev) => ({
      ...prev,
      isPaused: false,
      pauseStartTime: null,
      accumulatedPause: (prev.accumulatedPause || 0) + pauseDiffMs
    }));
  };
  const stopTimer = () => {
    const now = /* @__PURE__ */ new Date();
    let finalAccumulatedPauseMs = timerState.accumulatedPause || 0;
    if (timerState.isPaused && timerState.pauseStartTime) {
      finalAccumulatedPauseMs += now - new Date(timerState.pauseStartTime);
    }
    const pauseMinutes = Math.round(finalAccumulatedPauseMs / 1e3 / 60);
    const roundedStart = roundToNearest15Minutes(timerState.startTime);
    const roundedEnd = roundToNearest15Minutes(now);
    const result = {
      start: roundedStart,
      end: roundedEnd,
      pause: pauseMinutes
    };
    setTimerState({
      isRunning: false,
      isPaused: false,
      startTime: null,
      pauseStartTime: null,
      accumulatedPause: 0
    });
    return result;
  };
  const cancelTimer = () => {
    setTimerState({
      isRunning: false,
      isPaused: false,
      startTime: null,
      pauseStartTime: null,
      accumulatedPause: 0
    });
  };
  const clearAutoCheckout = () => setAutoCheckoutData(null);
  return {
    timerState,
    autoCheckoutData,
    // NEU exportiert
    clearAutoCheckout,
    // NEU exportiert
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    cancelTimer
  };
};
function usePeriodStats(entries, userData, periodStart, periodEnd) {
  return reactExports.useMemo(() => {
    const start = periodStart instanceof Date ? periodStart : /* @__PURE__ */ new Date();
    const end = periodEnd instanceof Date ? periodEnd : /* @__PURE__ */ new Date();
    return calculatePeriodStats(entries, userData, start, end);
  }, [entries, userData, periodStart, periodEnd]);
}
const PrintReport = React.lazy(() => __vitePreload(() => import("./PrintReport-vb74isOQ.js"), true ? __vite__mapDeps([0,1,2,3,4,5]) : void 0));
const pageVariants = { initial: { opacity: 0, x: 20 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -20 } };
const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 };
const reportVariants = { initial: { y: "100%", opacity: 0 }, in: { y: 0, opacity: 1 }, out: { y: "100%", opacity: 0 } };
function App() {
  const { entries, addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries } = useEntries();
  const { userData, setUserData, theme, setTheme, autoBackup, setAutoBackup } = useSettings();
  const { timerState, autoCheckoutData, clearAutoCheckout, startTimer, pauseTimer, resumeTimer, stopTimer } = useLiveTimer();
  useAutoBackup(entries, userData, autoBackup);
  const [currentDate, setCurrentDate] = reactExports.useState(/* @__PURE__ */ new Date());
  const [view, setView] = reactExports.useState("dashboard");
  const [editingEntry, setEditingEntry] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [updateData, setUpdateData] = reactExports.useState(null);
  const [showExportModal, setShowExportModal] = reactExports.useState(false);
  const exportPayloadRef = reactExports.useRef(null);
  const [isLiveEntry, setIsLiveEntry] = reactExports.useState(false);
  const [showOnboarding, setShowOnboarding] = reactExports.useState(false);
  const fileInputRef = reactExports.useRef(null);
  const [formDate, setFormDate] = reactExports.useState(toLocalDateString(/* @__PURE__ */ new Date()));
  const [entryType, setEntryType] = reactExports.useState("work");
  const [startTime, setStartTime] = reactExports.useState("06:00");
  const [endTime, setEndTime] = reactExports.useState("16:30");
  const [project, setProject] = reactExports.useState("");
  const [code, setCode] = reactExports.useState(WORK_CODES[0].id);
  const [pauseDuration, setPauseDuration] = reactExports.useState(30);
  const [todayTarget, setTodayTarget] = reactExports.useState(510);
  reactExports.useEffect(() => {
    SplashScreen.hide();
  }, []);
  reactExports.useEffect(() => {
    const todayStr = toLocalDateString(/* @__PURE__ */ new Date());
    const target = getTargetMinutesForDate(todayStr, userData?.workDays);
    setTodayTarget(target);
  }, [userData]);
  reactExports.useEffect(() => {
    const isNewUser = userData && !userData.name;
    const isLegacyUser = userData && userData.name && !userData.workDays;
    if (isNewUser || isLegacyUser) {
      setShowOnboarding(true);
    }
  }, [userData]);
  const handleOnboardingFinish = () => {
    const storedUserStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        setUserData(storedUser);
        if (storedUser.settings?.autoBackup !== void 0) {
          setAutoBackup(storedUser.settings.autoBackup);
        }
      } catch (e) {
        console.error("Error loading user data", e);
      }
    }
    const storedEntriesStr = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (storedEntriesStr) {
      try {
        const storedEntries = JSON.parse(storedEntriesStr);
        importEntries(storedEntries);
      } catch (e) {
        console.error("Error loading entries", e);
      }
    }
    setShowOnboarding(false);
    zt.success("Einrichtung abgeschlossen!");
    Haptics.notification({ type: NotificationType.Success });
  };
  reactExports.useEffect(() => {
    if (autoCheckoutData) {
      Haptics.impact({ style: ImpactStyle.Heavy });
      const yyyy = autoCheckoutData.start.getFullYear();
      const mm = String(autoCheckoutData.start.getMonth() + 1).padStart(2, "0");
      const dd = String(autoCheckoutData.start.getDate()).padStart(2, "0");
      setFormDate(`${yyyy}-${mm}-${dd}`);
      setEntryType("work");
      const toLocalHHMM = (dateObj) => {
        const h = String(dateObj.getHours()).padStart(2, "0");
        const m = String(dateObj.getMinutes()).padStart(2, "0");
        return `${h}:${m}`;
      };
      setStartTime(toLocalHHMM(autoCheckoutData.start));
      setEndTime(toLocalHHMM(autoCheckoutData.end));
      setPauseDuration(autoCheckoutData.pause);
      setProject("");
      const lastCode = localStorage.getItem(STORAGE_KEYS.LAST_CODE);
      setCode(lastCode ? Number(lastCode) : WORK_CODES[0].id);
      setEditingEntry(null);
      setIsLiveEntry(true);
      setView("add");
      zt("⚠️ Automatisch ausgestempelt! Bitte prüfen.", {
        duration: 6e3,
        icon: "🌙"
      });
      clearAutoCheckout();
    }
  }, [autoCheckoutData]);
  reactExports.useEffect(() => {
    const runUpdateCheck = async () => {
      if (navigator.onLine) {
        const data = await checkForUpdate();
        if (data) setUpdateData(data);
      }
    };
    const timer = setTimeout(runUpdateCheck, 2e3);
    return () => clearTimeout(timer);
  }, []);
  const handleManualUpdateCheck = async () => {
    if (!navigator.onLine) {
      zt.error("Keine Internetverbindung 🌐");
      return;
    }
    const toastId = zt.loading("Suche nach Updates...");
    try {
      await new Promise((r) => setTimeout(r, 800));
      const data = await checkForUpdate();
      zt.dismiss(toastId);
      if (data) {
        Haptics.impact({ style: ImpactStyle.Medium });
        setUpdateData(data);
      } else {
        Haptics.impact({ style: ImpactStyle.Light });
        zt.success("Alles auf dem neuesten Stand! ✨");
      }
    } catch (e) {
      zt.dismiss(toastId);
      zt.error("Prüfung fehlgeschlagen.");
    }
  };
  const getHeaderTitle = () => {
    switch (view) {
      case "settings":
        return "Einstellungen";
      case "add":
        return editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag";
      case "report":
        return "Bericht";
      default:
        return "eStundnzettl";
    }
  };
  reactExports.useEffect(() => {
    const handler = App$1.addListener("backButton", () => {
      if (view !== "dashboard") {
        setView("dashboard");
        setEditingEntry(null);
      } else App$1.exitApp();
    });
    return () => handler.remove();
  }, [view]);
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();
  const entriesWithHolidays = reactExports.useMemo(() => {
    const holidayMap = getHolidayData(viewYear);
    const holidays = Object.keys(holidayMap);
    const realEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
    const today = /* @__PURE__ */ new Date();
    const todayStr = toLocalDateString(today);
    const holidayEntries = [];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (holidays.includes(dateStr)) {
        if (dateStr <= todayStr) {
          const targetMin = getTargetMinutesForDate(dateStr, userData?.workDays);
          if (targetMin > 0) {
            holidayEntries.push({
              id: `auto-holiday-${dateStr}`,
              type: "public_holiday",
              date: dateStr,
              project: holidayMap[dateStr] || "Gesetzlicher Feiertag",
              netDuration: targetMin
            });
          }
        }
      }
    }
    return [...realEntries, ...holidayEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, viewYear, viewMonth, userData]);
  const groupedByWeek = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    entriesWithHolidays.forEach((e) => {
      const w = getWeekNumber(new Date(e.date));
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(e);
    });
    const arr = Array.from(map.entries());
    arr.forEach(([, list]) => list.sort((a, b) => new Date(b.date) - new Date(a.date)));
    return arr.sort((a, b) => b[0] - a[0]);
  }, [entriesWithHolidays]);
  const periodStart = reactExports.useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const periodEnd = reactExports.useMemo(() => new Date(viewYear, viewMonth + 1, 0), [viewYear, viewMonth]);
  const stats = usePeriodStats(entriesWithHolidays, userData, periodStart, periodEnd);
  const overtime = stats.totalSaldo;
  const progressPercent = Math.min(100, stats.totalIst / (stats.totalTarget || 1) * 100);
  const lastWorkEntry = reactExports.useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).find((e) => e.type === "work");
  }, [entries]);
  const uniqueProjects = reactExports.useMemo(() => {
    const projects = entries.filter((e) => e.type === "work" && e.project?.trim()).map((e) => e.project.trim());
    return [...new Set(projects)].sort();
  }, [entries]);
  const handleStartLive = () => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    startTimer();
    zt.success("⏱️ Stempeluhr gestartet!");
  };
  const handleStopLive = () => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    const result = stopTimer();
    const yyyy = result.start.getFullYear();
    const mm = String(result.start.getMonth() + 1).padStart(2, "0");
    const dd = String(result.start.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setEntryType("work");
    setFormDate(dateStr);
    const toLocalHHMM = (dateObj) => {
      const h = String(dateObj.getHours()).padStart(2, "0");
      const m = String(dateObj.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    };
    setStartTime(toLocalHHMM(result.start));
    setEndTime(toLocalHHMM(result.end));
    setPauseDuration(result.pause);
    setProject("");
    const lastCode = localStorage.getItem(STORAGE_KEYS.LAST_CODE);
    setCode(lastCode ? Number(lastCode) : WORK_CODES[0].id);
    setEditingEntry(null);
    setIsLiveEntry(true);
    setView("add");
    zt("🏁 Zeit wurde übernommen", { icon: "✨" });
  };
  const startNewEntry = () => {
    setEditingEntry(null);
    setEntryType("work");
    setFormDate(toLocalDateString(/* @__PURE__ */ new Date()));
    setStartTime("06:00");
    setEndTime("16:30");
    setPauseDuration(30);
    setProject("");
    const lastCode = localStorage.getItem(STORAGE_KEYS.LAST_CODE);
    setCode(lastCode ? Number(lastCode) : WORK_CODES[0].id);
    setIsLiveEntry(false);
    setView("add");
  };
  const startEdit = (entry) => {
    setEditingEntry(entry);
    const isDrive = entry.type === "work" && entry.code === 19;
    setEntryType(isDrive ? "drive" : entry.type);
    setFormDate(entry.date);
    if (entry.type === "work") {
      setStartTime(entry.start || "06:00");
      setEndTime(entry.end || "16:30");
      setPauseDuration(isDrive ? 0 : entry.pause ?? 0);
      setCode(entry.code ?? WORK_CODES[0].id);
      setProject(entry.project || "");
    } else {
      setPauseDuration(0);
      setProject("");
    }
    setIsLiveEntry(false);
    setView("add");
  };
  const handleSaveEntry = (e) => {
    e.preventDefault();
    const isDrive = entryType === "drive";
    let net = 0;
    let label = "";
    if (entryType === "work" || isDrive) {
      const s = parseTime(startTime);
      const en = parseTime(endTime);
      if (en <= s) {
        zt.error("⚠️ Endzeit muss nach Startzeit liegen!");
        return;
      }
      const hasOverlap = entries.some((existing) => {
        if (existing.date !== formDate) return false;
        if (editingEntry && existing.id === editingEntry.id) return false;
        if (!existing.start || !existing.end) return false;
        const exStart = parseTime(existing.start);
        const exEnd = parseTime(existing.end);
        return s < exEnd && exStart < en;
      });
      if (hasOverlap) {
        Haptics.impact({ style: ImpactStyle.Heavy });
        zt.error("⚠️ Zeitüberschneidung!", { duration: 4e3, icon: "⛔" });
        return;
      }
      const usedPause2 = isDrive ? 0 : pauseDuration;
      const usedCode2 = isDrive ? 19 : code;
      net = en - s - usedPause2;
      label = WORK_CODES.find((c) => c.id === usedCode2)?.label || (isDrive ? "Fahrzeit" : "Arbeit");
    } else {
      net = getTargetMinutesForDate(formDate, userData?.workDays);
      label = entryType === "vacation" ? "Urlaub" : entryType === "sick" ? "Krank" : "Zeitausgleich";
    }
    if (net < 0) net = 0;
    const storedType = isDrive ? "work" : entryType;
    const usedCode = isDrive ? 19 : code;
    const usedPause = storedType === "work" ? isDrive ? 0 : pauseDuration : 0;
    const newEntry = {
      id: editingEntry ? editingEntry.id : Date.now(),
      type: storedType,
      date: formDate,
      start: storedType === "work" ? startTime : null,
      end: storedType === "work" ? endTime : null,
      pause: usedPause,
      project: storedType === "work" ? project : label,
      code: storedType === "work" ? usedCode : null,
      netDuration: net
    };
    if (editingEntry) updateEntry(newEntry);
    else addEntry(newEntry);
    if (storedType === "work" && usedCode && usedCode !== 19 && usedCode !== 190) localStorage.setItem(STORAGE_KEYS.LAST_CODE, usedCode);
    zt.success(editingEntry ? "✏️ Eintrag aktualisiert" : "💾 Eintrag gespeichert");
    setEditingEntry(null);
    setProject("");
    setEntryType("work");
    setView("dashboard");
  };
  const executeDelete = () => {
    if (deleteTarget?.type === "single") {
      deleteEntry(deleteTarget.id);
      zt.success("🗑️ Eintrag gelöscht");
    } else if (deleteTarget?.type === "all") {
      deleteAllEntries();
      const emptyUser = { name: "", position: "", photo: null, workDays: [...WORK_MODELS[0].days] };
      setUserData(emptyUser);
      localStorage.removeItem(STORAGE_KEYS.LAST_CODE);
      zt.success("🧹 App vollständig zurückgesetzt");
    }
    setDeleteTarget(null);
  };
  const changeMonth = (delta) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  };
  const exportData = async () => {
    const exportPayload = {
      user: userData,
      entries,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (Capacitor.isNativePlatform()) {
      exportPayloadRef.current = exportPayload;
      setShowExportModal(true);
    } else {
      const toastId = zt.loading("Exportiere Daten...");
      try {
        const dateStr = toLocalDateString(/* @__PURE__ */ new Date());
        const fileName = `estundnzettl_${dateStr}.json`;
        const json = JSON.stringify(exportPayload, null, 2);
        const file = new File([json], fileName, { type: "application/json" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "Vertel Backup", text: "Backup meiner Stunden" });
            zt.success("📤 Export erfolgreich!", { id: toastId });
            return;
          } catch (shareError) {
            if (shareError.name === "AbortError") {
              zt.dismiss(toastId);
              return;
            }
          }
        }
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        zt.success("💾 Download gestartet!", { id: toastId });
      } catch (e) {
        zt.error(`❌ Export Fehler: ${e.message}`, { id: toastId, duration: 5e3 });
      }
    }
  };
  const handleExportToFolder = async () => {
    setShowExportModal(false);
    const toastId = zt.loading("Exportiere in Ordner...");
    try {
      const dateStr = toLocalDateString(/* @__PURE__ */ new Date());
      const fileName = `estundnzettl_${dateStr}.json`;
      const success = await exportToSelectedFolder(fileName, exportPayloadRef.current);
      if (success) {
        zt.success("✅ Erfolgreich im Ordner gespeichert!", { id: toastId });
      } else {
        zt.dismiss(toastId);
      }
    } catch (e) {
      console.error("Export to folder error:", e);
      zt.error("Export abgebrochen oder fehlgeschlagen", { id: toastId });
    }
  };
  const handleExportShare = async () => {
    setShowExportModal(false);
    const toastId = zt.loading("Bereite Export vor...");
    try {
      const dateStr = toLocalDateString(/* @__PURE__ */ new Date());
      const fileName = `estundnzettl_${dateStr}.json`;
      const json = JSON.stringify(exportPayloadRef.current, null, 2);
      await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true
      });
      const uriResult = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache
      });
      await Share.share({
        title: "eStundnzettl Backup",
        text: `Backup vom ${(/* @__PURE__ */ new Date()).toLocaleDateString("de-DE")}`,
        url: uriResult.uri,
        dialogTitle: "Backup sichern"
      });
      zt.success("📤 Export bereitgestellt!", { id: toastId });
    } catch (e) {
      console.error("Share error:", e);
      if (e.message?.includes("canceled") || e.message?.includes("cancelled")) {
        zt.dismiss(toastId);
      } else {
        zt.error(`❌ Export Fehler: ${e.message}`, { id: toastId, duration: 5e3 });
      }
    }
  };
  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        if (d.entries) importEntries(d.entries);
        if (d.user) setUserData(d.user);
        zt.success("📥 Daten erfolgreich importiert!");
      } catch {
        zt.error("❌ Fehler: Datei ungültig.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen w-screen font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 overflow-x-hidden relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Fe, { position: "bottom-center", containerStyle: { bottom: 40 }, toastOptions: { style: { background: "#27272a", color: "#fff", borderRadius: "12px", fontSize: "14px", fontWeight: "500", padding: "12px 16px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }, success: { iconTheme: { primary: "#10b981", secondary: "#fff" } }, error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } } } }),
    showOnboarding && /* @__PURE__ */ jsxRuntimeExports.jsx(
      OnboardingWizard,
      {
        onComplete: handleOnboardingFinish
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmModal,
      {
        isOpen: !!deleteTarget,
        onClose: () => setDeleteTarget(null),
        onConfirm: executeDelete,
        title: deleteTarget?.type === "all" ? "Alles löschen?" : "Eintrag löschen?",
        message: deleteTarget?.type === "all" ? "Möchtest du wirklich alle Einträge unwiderruflich löschen? Auch dein Profil wird zurückgesetzt." : "Möchtest du diesen Eintrag wirklich entfernen?"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExportModal,
      {
        isOpen: showExportModal,
        onClose: () => setShowExportModal(false),
        onSelectFolder: handleExportToFolder,
        onSelectShare: handleExportShare
      }
    ),
    updateData && /* @__PURE__ */ jsxRuntimeExports.jsx(UpdateModal, { updateData, onClose: () => setUpdateData(null) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", className: "hidden", ref: fileInputRef, accept: "application/json", onChange: handleImport }),
    !showOnboarding && /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "fixed top-0 left-0 right-0 bg-zinc-900 text-white p-4 pb-6 shadow-xl z-50 w-full transition-all", style: { paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        view !== "dashboard" && view !== "report" ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setView("dashboard");
          setEditingEntry(null);
        }, className: "p-2 hover:bg-zinc-700 rounded-full transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 24 }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-800 shadow-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: AppLogo, alt: "Logo", className: "w-full h-full object-contain" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-bold text-xl leading-tight tracking-tight", children: getHeaderTitle() }),
          view === "dashboard" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-400 font-medium mt-0.5", children: "Mobile Zeiterfassung" })
        ] })
      ] }),
      view === "dashboard" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setView("settings"), className: "p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors active:scale-95", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings$1, { size: 20, className: "text-zinc-300" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: () => setView("report"), className: "bg-emerald-600 hover:bg-emerald-700 p-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileChartColumnIncreasing, { size: 20, className: "text-white" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `pt-38 pb-24 px-1 w-full max-w-3xl mx-auto ${showOnboarding ? "pt-0" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AnimatePresence, { mode: "wait", children: [
      view === "dashboard" && !showOnboarding && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, className: "w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Dashboard,
        {
          currentDate,
          onSetCurrentDate: setCurrentDate,
          changeMonth,
          stats,
          overtime,
          progressPercent,
          groupedByWeek,
          viewMonth,
          viewYear,
          onStartNewEntry: startNewEntry,
          onEditEntry: startEdit,
          onDeleteEntry: (id) => setDeleteTarget({ type: "single", id }),
          userData
        }
      ) }, "dashboard"),
      view === "add" && !showOnboarding && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, className: "w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        EntryForm,
        {
          onCancel: () => {
            setView("dashboard");
            setEditingEntry(null);
          },
          onSubmit: handleSaveEntry,
          entryType,
          setEntryType,
          code,
          setCode,
          pauseDuration,
          setPauseDuration,
          formDate,
          setFormDate,
          startTime,
          setStartTime,
          endTime,
          setEndTime,
          project,
          setProject,
          lastWorkEntry,
          existingProjects: uniqueProjects,
          allEntries: entries,
          isEditing: !!editingEntry,
          isLiveEntry,
          userData
        }
      ) }, "add"),
      view === "settings" && !showOnboarding && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: pageVariants, transition: pageTransition, className: "w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Settings,
        {
          userData,
          setUserData,
          theme,
          setTheme,
          autoBackup,
          setAutoBackup,
          onExport: exportData,
          onImport: () => fileInputRef.current?.click(),
          onDeleteAll: () => setDeleteTarget({ type: "all" }),
          onCheckUpdate: handleManualUpdateCheck
        }
      ) }, "settings"),
      view === "report" && !showOnboarding && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: "initial", animate: "in", exit: "out", variants: reportVariants, transition: { type: "spring", damping: 25, stiffness: 200 }, className: "fixed inset-0 z-[200] w-full h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full w-full bg-zinc-900/50 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-xl flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-zinc-700 dark:text-white", children: "Lade PDF-Modul..." })
      ] }) }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        PrintReport,
        {
          entries: entriesWithHolidays,
          monthDate: currentDate,
          employeeName: userData.name,
          userPhoto: userData.photo,
          onClose: () => setView("dashboard"),
          onMonthChange: setCurrentDate,
          userData
        }
      ) }) }, "report")
    ] }) }),
    !showOnboarding && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: view === "dashboard" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.button,
        {
          initial: { scale: 0, rotate: 90 },
          animate: { scale: 1, rotate: 0 },
          exit: { scale: 0, rotate: 90 },
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.9 },
          onClick: (e) => {
            e.stopPropagation();
            startNewEntry();
            Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
            });
          },
          style: { bottom: "calc(3.5rem + env(safe-area-inset-bottom))" },
          className: "fixed right-6 bg-zinc-900 dark:bg-emerald-600 hover:bg-zinc-800 dark:hover:bg-emerald-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors z-[9999] cursor-pointer touch-manipulation",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 28 })
        }
      ) }),
      view === "dashboard" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        LiveTimerOverlay,
        {
          timerState,
          onStart: handleStartLive,
          onStop: handleStopLive,
          onPause: () => {
            Haptics.impact({ style: ImpactStyle.Light });
            pauseTimer();
          },
          onResume: () => {
            Haptics.impact({ style: ImpactStyle.Light });
            resumeTimer();
          },
          targetMinutes: todayTarget
        }
      )
    ] })
  ] });
}
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
export {
  ExportModal as E,
  WORK_CODES as W,
  getWeekRangeInMonth as a,
  getTargetMinutesForDate as b,
  formatSignedTime as c,
  blobToBase64 as d,
  formatTime as f,
  getWeekNumber as g,
  usePeriodStats as u
};
