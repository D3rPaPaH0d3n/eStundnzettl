import React, { Suspense, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Paperclip, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Card,
  formatTime,
  formatSignedTime,
} from "../utils";
import {
  getWeekNumber,
  calculateWeekStats,
  calculatePeriodStats,
  calculateDisplayedDayMinutes,
  getTargetMinutesForDate,
} from "../utils/timeCalculations";
import { WORK_CODE } from "../hooks/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import { getIntlLocale } from "../utils/formatLocale";

import type { Entry, UserData, WorkCode, CalculationConfig } from "../types";
import type { PeriodStatsResult } from "../utils/timeCalculations";
import type { Locale } from "../locales/types";
import { calculateMonthlyTargetProgress } from "../utils/monthlyTarget";

const DashboardMonthPicker = React.lazy(() => import("./DashboardMonthPicker"));

interface Props {
  currentDate: Date;
  onSetCurrentDate: (date: Date) => void;
  changeMonth: (delta: number) => void;
  stats: PeriodStatsResult;
  overtime: number;
  progressPercent: number;
  groupedByWeek: [number, Entry[]][];
  viewMonth: number;
  viewYear: number;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: Entry["id"]) => void;
  onManageAttachments?: (entry: Entry) => void;
  attachmentCountByEntryId?: Map<Entry["id"], number>;
  userData: UserData;
  workCodes?: WorkCode[];
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
}

// Mappt einen Entry-Type auf das i18n-Label (genutzt in Dashboard-Einträgen).
function getEntryTypeLabel(type: Entry["type"], t: TFunction): string {
  switch (type) {
    case "public_holiday":
      return t("entryTypes.paidOff");
    case "time_comp":
      return t("entryTypes.timeComp");
    case "vacation":
      return t("entryTypes.vacation");
    case "sick":
      return t("entryTypes.sick");
    default:
      return "";
  }
}

interface EntryRowProps {
  entry: Entry;
  index: number;
  totalEntries: number;
  t: TFunction;
  workCodeLabelMap: Map<number, string>;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: Entry["id"]) => void;
  onManageAttachments?: (entry: Entry) => void;
  attachmentCountByEntryId?: Map<Entry["id"], number>;
}

export const EntryRow: React.FC<EntryRowProps> = ({
  entry,
  index,
  totalEntries,
  t,
  workCodeLabelMap,
  onEditEntry,
  onDeleteEntry,
  onManageAttachments,
  attachmentCountByEntryId,
}) => {
  const isHoliday = entry.type === "public_holiday";
  const isTimeComp = entry.type === "time_comp";
  const hasExplicitTime = !!entry.start && !!entry.end;
  const timeLabel = entry.type === "work"
    ? `${entry.start || ""} - ${entry.end || ""}`
    : hasExplicitTime
      ? `${entry.start} - ${entry.end}`
      : (isHoliday ? t("entryTypes.holiday") : t("entryTypes.allDay"));

  let codeLabel = "";
  if(entry.type === "work") codeLabel = entry.code == null ? "" : workCodeLabelMap.get(entry.code) || "";
  else codeLabel = getEntryTypeLabel(entry.type, t);

  let pauseLabel = "";
  if (entry.type === "work" && entry.code !== WORK_CODE.DRIVE) {
    pauseLabel = entry.pause > 0
      ? ` - ${t("dashboard.pause", { minutes: entry.pause })}`
      : ` - ${t("dashboard.noPause")}`;
  }
  
  let rowClass = `p-3 flex justify-between items-start gap-3 transition-colors cursor-pointer bg-white dark:bg-zinc-800 ${index < totalEntries - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`; 
  if(isHoliday) rowClass = `p-3 flex justify-between items-start gap-3 bg-blue-50/50 dark:bg-blue-900/20 ${index < totalEntries - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`; 
  if(isTimeComp) rowClass = `p-3 flex justify-between items-start gap-3 bg-purple-50/50 dark:bg-purple-900/20 ${index < totalEntries - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`; 
  
  if (isHoliday) { 
    return ( 
      <div key={entry.id} className={rowClass}> 
        <div className="min-w-0 flex-1 flex flex-col gap-1"> 
          <div className="font-bold text-sm leading-none text-blue-600 dark:text-blue-400">{timeLabel}</div> 
          <div className="text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-tight">{entry.project}</div> 
          <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">{codeLabel}</div> 
        </div> 
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-100 dark:border-zinc-700 ml-1"> 
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{formatTime(entry.netDuration)}</span>
        </div>
      </div>
    );
  }

  const attachmentCount = attachmentCountByEntryId?.get(entry.id) || 0;

  return ( 
    <div key={entry.id} className="relative overflow-hidden"> 
      <div className="absolute inset-0 flex items-center justify-end pr-4 text-white bg-red-500"> <Trash2 size={20} /> </div> 
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.5, right: 0.05 }} onDragEnd={(_, info) => { if (info.offset.x < -80) { Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}); onDeleteEntry(entry.id); } }} onClick={() => onEditEntry(entry)} className={`relative z-10 bg-white dark:bg-zinc-800 overflow-hidden ${index < totalEntries - 1 ? "border-b border-zinc-100 dark:border-zinc-700" : ""}`} layout={totalEntries <= 12} > 
        <div className={`p-3 flex justify-between items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors ${isTimeComp ? "bg-purple-50/30 dark:bg-purple-900/10" : ""}`}> 
          <div className="min-w-0 flex-1 flex flex-col gap-1"> 
            <div className={`font-bold text-sm leading-none ${isTimeComp ? "text-purple-700 dark:text-purple-400" : "text-zinc-900 dark:text-zinc-100"}`}> {timeLabel} {pauseLabel && <span className="font-normal opacity-70">{pauseLabel}</span>} </div> 
            <div className="text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-tight">{entry.project}</div> 
            <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400 leading-tight"> {codeLabel && <span>{codeLabel}</span>} </div> 
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageAttachments?.(entry);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <Paperclip size={12} />
                <span>{attachmentCount > 0 ? t("dashboard.documentsCount", { count: attachmentCount }) : t("dashboard.documentsLabel")}</span>
              </button>
            </div>
          </div> 
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-100 dark:border-zinc-700 ml-1"> <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{formatTime(entry.netDuration)}</span> </div> 
        </div> 
      </motion.div> 
    </div> 
  ); 
};

interface DayCardProps {
  dateStr: string;
  dayEntries: Entry[];
  intlLocale: string;
  t: TFunction;
  workCodeLabelMap: Map<number, string>;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: Entry["id"]) => void;
  onManageAttachments?: (entry: Entry) => void;
  attachmentCountByEntryId?: Map<Entry["id"], number>;
  simpleMode?: boolean;
  userData: UserData;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
}

export const DayCard: React.FC<DayCardProps> = ({
  dateStr,
  dayEntries,
  intlLocale,
  t,
  workCodeLabelMap,
  onEditEntry,
  onDeleteEntry,
  onManageAttachments,
  attachmentCountByEntryId,
  simpleMode = false,
  userData,
  locale,
  calculationConfig,
}) => {
  const daySum = calculateDisplayedDayMinutes(dayEntries);
  const dayTarget = !simpleMode
    ? getTargetMinutesForDate(dateStr, userData?.workDays, locale, calculationConfig)
    : 0;
  const dayBalance = dayTarget > 0 ? daySum - dayTarget : null;
  const dayBalanceClass = dayBalance !== null && dayBalance > 0
    ? "text-emerald-500 dark:text-emerald-400"
    : "text-orange-500 dark:text-orange-400";
  const d = new Date(dateStr); 
  const sortedEntries = [...dayEntries].sort((a, b) => (a.start || "").localeCompare(b.start || "")); 

  return ( 
    <motion.div key={dateStr} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden"> 
      <div className="flex"> 
        <div className="material-you-day-strip bg-zinc-800 dark:bg-zinc-900 w-12 flex flex-col items-center justify-center text-white flex-shrink-0 z-20 relative"> 
          <span className="text-xs font-bold opacity-80">{d.toLocaleDateString(intlLocale, { weekday: "short" }).slice(0, 2)}</span> 
          <span className="text-sm font-bold">{d.toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit" })}</span> 
        </div> 
        <div className="flex-1 min-w-0"> 
          <AnimatePresence initial={false}> 
            {sortedEntries.map((entry, idx) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                index={idx}
                totalEntries={sortedEntries.length}
                t={t}
                workCodeLabelMap={workCodeLabelMap}
                onEditEntry={onEditEntry}
                onDeleteEntry={onDeleteEntry}
                onManageAttachments={onManageAttachments}
                attachmentCountByEntryId={attachmentCountByEntryId}
              />
            ))} 
          </AnimatePresence> 
        </div> 
        <div className="bg-zinc-50 dark:bg-zinc-700/50 w-20 border-l border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center flex-shrink-0 px-1 z-20 relative"> 
          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wide mb-0.5">{t("dashboard.total")}</span>
          <span className="font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap text-sm">{formatTime(daySum)}</span>
          {dayBalance !== null && dayBalance !== 0 && (
            <span className={`text-[9px] font-medium leading-none mt-0.5 ${dayBalanceClass}`}>
              {formatSignedTime(dayBalance)}
            </span>
          )}
        </div> 
      </div> 
    </motion.div> 
  ); 
};

const Dashboard: React.FC<Props> = ({
  currentDate, onSetCurrentDate, changeMonth,
  stats,
  overtime, progressPercent, groupedByWeek, viewMonth: _viewMonth, viewYear: _viewYear, onEditEntry, onDeleteEntry, onManageAttachments, attachmentCountByEntryId, userData, workCodes = [],
  locale,
  calculationConfig,
}) => {
  const { t } = useTranslation();
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>(() => {
    const currentWeek = getWeekNumber(new Date());
    return { [currentWeek]: true };
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const toggleWeek = (week: number) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    setExpandedWeeks((prev) => ({ ...prev, [week]: !prev[week] })); 
  };

  const monthlyOvertimeSplit = stats.overtimeSplit || { mehrarbeit: 0, ueberstunden: 0 };
  const simpleMode = !!userData?.simpleMode;
  const monthlyTarget = calculateMonthlyTargetProgress(stats.totalIst, userData);
  const intlLocale = getIntlLocale();
  const monthLabel = currentDate.toLocaleDateString(intlLocale, {
    month: "long",
    year: "numeric",
  });

  // FIX 1: Sortierung der Wochen nach Datum (Startdatum der Einträge), nicht nach KW-Nummer.
  const workCodeLabelMap = useMemo<Map<number, string>>(
    () => new Map(workCodes.map((code) => [code.id, code.label])),
    [workCodes]
  );

  const sortedWeeks = useMemo(
    () => [...groupedByWeek].sort((a, b) => {
      const dateA = new Date(a[1][0].date);
      const dateB = new Date(b[1][0].date);
      return dateB.getTime() - dateA.getTime();
    }),
    [groupedByWeek]
  );

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full p-3 space-y-4">
      
      {/* --- KOMPAKTE KARTE MIT INTEGRIERTEM MONATS-WÄHLER --- */}
      <Card className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 border-zinc-200 dark:border-zinc-700">
        
        {/* HEADER: MONATS-NAVIGATION */}
        <div className="flex items-center justify-between p-3 px-4 border-b border-zinc-100 dark:border-zinc-700/50">
            <button
                type="button"
                aria-label={t("dashboard.prevMonth")}
                className="p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                onClick={() => changeMonth(-1)}
            >
                <ChevronLeft size={24} />
            </button>
            
            <div className="flex justify-center">
                <button
                    type="button"
                    aria-label={t("dashboard.monthPickerAria", { value: monthLabel })}
                    className="font-bold text-zinc-800 dark:text-white text-lg hover:text-emerald-600 transition-colors capitalize"
                    onClick={() => setIsMonthPickerOpen(true)}
                >
                    {monthLabel}
                </button>
            </div>

            <button
                type="button"
                aria-label={t("dashboard.nextMonth")}
                className="p-2 -mr-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                onClick={() => changeMonth(1)}
            >
                <ChevronRight size={24} />
            </button>
        </div>

        {isMonthPickerOpen && (
          <Suspense fallback={null}>
            <DashboardMonthPicker
              selectedDate={currentDate}
              onSelectMonth={onSetCurrentDate}
              onClose={() => setIsMonthPickerOpen(false)}
            />
          </Suspense>
        )}

        {/* BODY: STATISTIKEN */}
        <div className="p-4 space-y-4">
          <div className={`flex justify-between items-end ${monthlyTarget ? "flex-wrap gap-4" : ""}`}>
            {/* IST */}
            <div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-0.5">{t("dashboard.actual")}</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">{formatTime(stats.totalIst)}</p>
            </div>
            
            {/* SOLL & SALDO RECHTS (nur im Vollmodus) */}
            {!simpleMode && (
            <div className="flex gap-6 text-right">
                <div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-0.5">{t("dashboard.target")}</p>
                    <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mt-1">{formatTime(stats.totalTarget)}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-zinc-500 dark:text-zinc-400">{t("dashboard.balance")}</p>
                    <p className={`font-bold text-xl leading-none ${overtime >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
                        {formatSignedTime(overtime)}
                    </p>
                </div>
            </div>
            )}
            {monthlyTarget && (
              <div className="flex gap-4 text-right ml-auto">
                <div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-0.5">{t("dashboard.monthlyTarget")}</p>
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mt-1">{formatTime(monthlyTarget.targetMinutes)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-zinc-500 dark:text-zinc-400">
                    {monthlyTarget.remainingMinutes > 0 ? t("dashboard.monthlyRemaining") : monthlyTarget.exceededMinutes > 0 ? t("dashboard.monthlyExceeded") : t("dashboard.monthlyReached")}
                  </p>
                  <p className={`font-bold text-xl leading-none ${monthlyTarget.remainingMinutes > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatTime(monthlyTarget.remainingMinutes || monthlyTarget.exceededMinutes)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* PROGRESS BAR (nur im Vollmodus) */}
          {!simpleMode && (
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${overtime >= 0 ? "bg-emerald-500" : "bg-orange-500"}`} />
          </div>
          )}
          {monthlyTarget && (
            <div
              className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden"
              role="progressbar"
              aria-label={t("dashboard.monthlyProgress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(monthlyTarget.progressPercent)}
            >
              <motion.div initial={{ width: 0 }} animate={{ width: `${monthlyTarget.progressPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${monthlyTarget.remainingMinutes > 0 ? "bg-orange-500" : "bg-emerald-500"}`} />
            </div>
          )}

          {/* FOOTER INFO */}
          <div className="flex flex-wrap justify-between items-center text-xs pt-1">
             <div className="text-zinc-500 dark:text-zinc-400">
               {stats.drive > 0 && (
                 <> <span>{t("dashboard.driveTime", { code: WORK_CODE.DRIVE })}: </span> <span className="font-semibold">{formatTime(stats.drive)}</span> </>
               )}
             </div>

             {!simpleMode && (
             <div className="text-right flex items-center gap-3 ml-auto">
                    {monthlyOvertimeSplit.mehrarbeit > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {formatTime(monthlyOvertimeSplit.mehrarbeit)} <span className="text-zinc-400 dark:text-zinc-500 font-normal text-[10px]">{t("dashboard.overtimeShort.extra")}</span>
                        </span>
                    )}
                    {monthlyOvertimeSplit.ueberstunden > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatTime(monthlyOvertimeSplit.ueberstunden)} <span className="text-zinc-400 dark:text-zinc-500 font-normal text-[10px]">{t("dashboard.overtimeShort.overtime")}</span>
                        </span>
                    )}
             </div>
             )}
          </div>
        </div>
      </Card>

      {/* 3. LISTE DER EINTRÄGE */}
      <div className="space-y-3 pb-20">
        <h3 className="font-bold text-zinc-500 dark:text-zinc-400 text-sm px-1">{t("dashboard.recentEntries")}</h3>
        {sortedWeeks.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
            <Calendar size={32} className="mx-auto mb-2 opacity-20" /> <p>{t("dashboard.noEntries")}</p>
          </div>
        ) : (
          sortedWeeks.map(([week, weekEntries]) => {

            // Dynamisches Wochen-Ziel berechnen (basierend auf den Tagen in dieser Woche)
            const anyDate = new Date(weekEntries[0].date);
            const currentDay = anyDate.getDay() || 7;
            const monday = new Date(anyDate); monday.setDate(anyDate.getDate() - (currentDay - 1));
            const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);

            // Boundary-Wochen auf den angezeigten Monat clippen:
            // Datumsbereich, sichtbare Einträge und Stats beschränken.
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const clippedMonday = monday < monthStart ? monthStart : monday;
            const clippedSunday = sunday > monthEnd ? monthEnd : sunday;
            const clippedStartStr = [clippedMonday.getFullYear(), String(clippedMonday.getMonth() + 1).padStart(2, "0"), String(clippedMonday.getDate()).padStart(2, "0")].join("-");
            const clippedEndStr = [clippedSunday.getFullYear(), String(clippedSunday.getMonth() + 1).padStart(2, "0"), String(clippedSunday.getDate()).padStart(2, "0")].join("-");
            const visibleEntries = weekEntries.filter((e) => e.date >= clippedStartStr && e.date <= clippedEndStr);

            // Volle Woche → volle MA/ÜS auf 40h-Basis.
            // Gebrochene Woche → nur tägliche ÜS, keine MA.
            const isBoundaryWeek = monday < monthStart || sunday > monthEnd;
            const weekStats = isBoundaryWeek
              ? calculatePeriodStats(visibleEntries, userData, clippedMonday, clippedSunday, undefined, locale, calculationConfig)
              : calculateWeekStats(weekEntries, userData, locale, calculationConfig);

            const workMinutes = weekStats.totalIst;
            const diff = weekStats.totalSaldo;
            const { mehrarbeit, ueberstunden } = weekStats.overtimeSplit;
            
            const expanded = expandedWeeks[week];
            const balanceColorClass = diff < 0
                ? "text-red-600 dark:text-red-400 font-bold"
                : (ueberstunden > 0
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-blue-600 dark:text-blue-400 font-bold");
            const totalHoursColorClass = diff < 0
                ? "text-red-600 dark:text-red-400 font-bold"
                : (ueberstunden > 0
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : (mehrarbeit > 0
                        ? "text-blue-600 dark:text-blue-400 font-bold"
                        : "text-zinc-700 dark:text-zinc-300 font-bold"));

            // Einträge nach Datum sortieren (nur sichtbare Tage des Monats)
            const daysMap = new Map();
            visibleEntries.forEach((e) => {
                if (!daysMap.has(e.date)) daysMap.set(e.date, []);
                daysMap.get(e.date).push(e);
            });
            const sortedDays = Array.from(daysMap.entries()).sort((a: [string, Entry[]], b: [string, Entry[]]) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

            return (
              <div key={week} className="mb-3">
                <button type="button" className="material-you-week-button w-full flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl px-3 py-2 transition-colors" onClick={() => toggleWeek(week)}>
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{t("dashboard.calendarWeek")}</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200"> {t("dashboard.calendarWeekShort", { week })}{" "} <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">({clippedMonday.toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit" })} – {clippedSunday.toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit" })})</span> </span>
                        
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="text-sm flex gap-3">
                                <span className={simpleMode ? "text-zinc-700 dark:text-zinc-300 font-bold" : totalHoursColorClass}>{formatTime(workMinutes)}</span>
                                {!simpleMode && <span className={balanceColorClass}> {diff >= 0 ? "+" : "-"}{formatTime(Math.abs(diff))} </span>}
                            </div>

                            {!simpleMode && diff > 0 && (mehrarbeit > 0 || ueberstunden > 0) && (
                                <div className="text-[10px] flex items-center gap-2 opacity-80">
                                    {mehrarbeit > 0 && (
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                            {formatTime(mehrarbeit)} {t("dashboard.overtimeShort.extra")}
                                        </span>
                                    )}
                                    {mehrarbeit > 0 && ueberstunden > 0 && (
                                        <span className="text-zinc-300 dark:text-zinc-600">|</span>
                                    )}
                                    {ueberstunden > 0 && (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                            {formatTime(ueberstunden)} {t("dashboard.overtimeShort.overtime")}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <ChevronRight size={18} className={`text-zinc-500 dark:text-zinc-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
                </button>
                
                <AnimatePresence> 
                  {expanded && ( 
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} className="overflow-hidden"> 
                      <div className="mt-2 space-y-3"> 
                        {sortedDays.map(([dateStr, dayEntries]) => { 
                            return ( 
                              <DayCard
                                key={dateStr}
                                dateStr={dateStr}
                                dayEntries={dayEntries}
                                intlLocale={intlLocale}
                                t={t}
                                workCodeLabelMap={workCodeLabelMap}
                                onEditEntry={onEditEntry}
                                onDeleteEntry={onDeleteEntry}
                                onManageAttachments={onManageAttachments}
                                attachmentCountByEntryId={attachmentCountByEntryId}
                                simpleMode={simpleMode}
                                userData={userData}
                                locale={locale}
                                calculationConfig={calculationConfig}
                              />
                            ); 
                        })} 
                      </div> 
                    </motion.div> 
                  )} 
                </AnimatePresence> 
              </div> 
            ); 
          }) 
        )} 
      </div>
    </motion.main>
  );
};

export default React.memo(Dashboard);
