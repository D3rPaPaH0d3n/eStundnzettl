import React, { forwardRef, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Paperclip, Trash2 } from "lucide-react";
import { 
  Card, 
  formatTime, 
  formatSignedTime, 
} from "../utils";
import {
  getWeekNumber,
  calculateWeekStats,
  calculateDisplayedDayMinutes,
} from "../utils/timeCalculations";

import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { de } from "date-fns/locale";
import { TimeEntry, WorkCode, Attachment, UserData } from "../types";
import type { EntryForCalculation } from "../utils/timeCalculations";

// @ts-ignore - date-fns locale type mismatch with react-datepicker
registerLocale("de", de);

interface DashboardProps {
  currentDate: Date;
  onSetCurrentDate: (date: Date) => void;
  changeMonth: (delta: number) => void;
  stats: {
    work: number;
    drive: number;
    holiday: number;
    vacation: number;
    sick: number;
    timeComp: number;
    totalIst: number;
    totalTarget: number;
    totalSaldo: number;
    overtimeSplit: { mehrarbeit: number; ueberstunden: number };
  };
  overtime: number;
  progressPercent: number;
  groupedByWeek: Record<string, TimeEntry[]>;
  viewMonth: number;
  viewYear: number;
  onEditEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (entry: TimeEntry) => void;
  onManageAttachments: (entry: TimeEntry) => void;
  getAttachmentsForEntry: (entryId: number) => Array<Attachment>;
  onStartNewEntry: () => void;
  userData: UserData;

  workCodes?: WorkCode[];
}

// Stylt den Monatsnamen jetzt etwas größer als Überschrift
const CustomMonthInput = forwardRef<HTMLButtonElement, { value: string; onClick: () => void }>(({ value, onClick }, ref) => (
  <button
    type="button"
    aria-label={`Monat wählen (aktuell ${value})`}
    className="font-bold text-zinc-800 dark:text-white text-lg hover:text-emerald-600 transition-colors capitalize"
    onClick={onClick}
    ref={ref}
  >
    {value}
  </button>
));
CustomMonthInput.displayName = "CustomMonthInput";

const Dashboard: React.FC<DashboardProps> = ({
  currentDate, onSetCurrentDate, changeMonth,
  stats, 
  overtime, progressPercent, groupedByWeek, viewMonth, viewYear, onEditEntry, onDeleteEntry, onManageAttachments, getAttachmentsForEntry, workCodes = []
}) => {
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>(() => {
    const currentWeek = getWeekNumber(new Date());
    return { [currentWeek]: true };
  });

  const toggleWeek = (week: string) => { 
    Haptics.impact({ style: ImpactStyle.Light }); 
    setExpandedWeeks((prev) => ({ ...prev, [week]: !prev[week] })); 
  };

  const weeks = useMemo(() => {
    return Object.entries(groupedByWeek)
      .map(([week, entries]) => {
        const weekStats = calculateWeekStats(entries as unknown as EntryForCalculation[]);
        const weekNumber = parseInt(week.split("-")[1] || week);
        const year = parseInt(week.split("-")[0] || new Date().getFullYear().toString());
        return {
          week,
          weekNumber,
          year,
          entries,
          stats: weekStats,
          isExpanded: !!expandedWeeks[week],
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      });
  }, [groupedByWeek, expandedWeeks]);

  const getWorkCodeLabel = (codeId: string | null) => {
    if (!codeId) return "Kein Code";
    const code = workCodes.find((c) => c.id === codeId);
    return code ? code.code : `Code ${codeId}`;
  };

  const getWorkCodeColor = (codeId: string | null) => {
    if (!codeId) return "#6b7280";
    const code = workCodes.find((c) => c.id === codeId);
    return code ? code.color : "#6b7280";
  };

  const formatWeekRange = (week: string) => {
    const [yearStr, weekStr] = week.split("-");
    const year = parseInt(yearStr);
    const weekNum = parseInt(weekStr);
    
    // Simple calculation for week start (Monday)
    const janFirst = new Date(year, 0, 1);
    const daysOffset = (weekNum - 1) * 7;
    const startDate = new Date(janFirst);
    startDate.setDate(janFirst.getDate() + daysOffset - janFirst.getDay() + 1);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const format = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    return `${format(startDate)} – ${format(endDate)}`;
  };

  const formatMonthYear = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  };

  const handlePrevMonth = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    changeMonth(-1);
  };

  const handleNextMonth = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    changeMonth(1);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      Haptics.impact({ style: ImpactStyle.Light });
      onSetCurrentDate(date);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header mit Monatsauswahl */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-zinc-500" />
          <DatePicker
            selected={currentDate}
            onChange={handleDateChange}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            locale="de"
            customInput={React.createElement(CustomMonthInput)}
            className="text-center"
          />
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Monats-Statistiken */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-zinc-500">Gesamtstunden</div>
          <div className="text-2xl font-bold">{formatTime(stats.totalIst)}</div>
          <div className="text-sm text-zinc-500 mt-1">
            {/* TODO: totalDays und averagePerDay berechnen */}
            Ø {formatTime(stats.totalIst / (Object.values(groupedByWeek).flat().length || 1))}/Tag
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-zinc-500">Überstunden</div>
          <div className={`text-2xl font-bold ${overtime >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatSignedTime(overtime)}
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            {progressPercent.toFixed(0)}% vom Monat
          </div>
        </Card>
      </div>

      {/* Wochen-Übersicht */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Wochenübersicht</h3>
        
        <AnimatePresence>
          {weeks.map((week) => (
            <motion.div
              key={week.week}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleWeek(week.week)}
                className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="text-left">
                  <div className="font-medium">
                    KW {week.weekNumber} · {formatWeekRange(week.week)}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {week.entries.length} Einträge · {formatTime(week.stats.totalIst)}
                  </div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 transition-transform ${week.isExpanded ? "rotate-90" : ""}`}
                />
              </button>

              {week.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <div className="p-4 space-y-3">
                    {week.entries.map((entry) => {
                      const attachments = getAttachmentsForEntry(entry.id);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getWorkCodeColor(entry.workCodeId) }}
                              />
                              <span className="font-medium">
                                {getWorkCodeLabel(entry.workCodeId)}
                              </span>
                            </div>
                            <div className="text-sm text-zinc-500 mt-1">
                              {new Date(entry.date).toLocaleDateString("de-DE", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              })} · {formatTime(calculateDisplayedDayMinutes([entry as any]))}
                            </div>
                            {entry.description && (
                              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-1">
                                {entry.description}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {attachments.length > 0 && (
                              <button
                                onClick={() => onManageAttachments(entry)}
                                className="p-2 text-zinc-500 hover:text-emerald-600 transition-colors"
                                aria-label="Anhänge verwalten"
                              >
                                <Paperclip className="w-4 h-4" />
                                <span className="text-xs ml-1">{attachments.length}</span>
                              </button>
                            )}
                            <button
                              onClick={() => onEditEntry(entry)}
                              className="p-2 text-zinc-500 hover:text-emerald-600 transition-colors"
                              aria-label="Eintrag bearbeiten"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteEntry(entry)}
                              className="p-2 text-zinc-500 hover:text-red-600 transition-colors"
                              aria-label="Eintrag löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Monats-Fortschritt */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-zinc-500">Monatsfortschritt</div>
          <div className="text-sm font-medium">{progressPercent.toFixed(0)}%</div>
        </div>
        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
        <div className="text-sm text-zinc-500 mt-2">
          {formatMonthYear(viewMonth, viewYear)} · Ziel: {formatTime(stats.totalTarget || 0)}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;