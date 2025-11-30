import React, { forwardRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Trash2 } from "lucide-react";
import { Card, formatTime, formatSignedTime, WORK_CODES } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics"; // NEU

// REACT DATEPICKER IMPORTIEREN
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import de from "date-fns/locale/de";
registerLocale("de", de);

const CustomMonthInput = forwardRef(({ value, onClick }, ref) => (
  <button 
    className="font-bold text-slate-700 dark:text-slate-100 text-base hover:text-orange-500 transition-colors"
    onClick={onClick} 
    ref={ref}
  >
    {value}
  </button>
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
}) => {
  const [expandedWeeks, setExpandedWeeks] = useState({});

  const toggleWeek = (week) => {
    Haptics.impact({ style: ImpactStyle.Light }); // Klick Feedback
    setExpandedWeeks((prev) => ({ ...prev, [week]: !prev[week] }));
  };

  return (
    <motion.main 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full p-3 space-y-4"
    >
      {/* MONTH SELECTOR */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 shadow-sm">
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"><ChevronLeft size={20} onClick={() => changeMonth(-1)} /></button>
        
        <DatePicker
          selected={currentDate}
          onChange={(date) => {
            const d = new Date(date);
            d.setDate(1); 
            onSetCurrentDate(d);
          }}
          dateFormat="MMMM yyyy"
          showMonthYearPicker
          locale="de"
          withPortal
          customInput={<CustomMonthInput />}
        />

        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"><ChevronRight size={20} onClick={() => changeMonth(1)} /></button>
      </div>

      {/* PROGRESS CARD */}
      <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">IST</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{formatTime(stats.actualMinutes)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">SOLL</p>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{formatTime(stats.targetMinutes)}</p>
            </div>
            <div className={`text-right ${overtime >= 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
              <p className="text-[10px] font-bold uppercase">Saldo</p>
              <p className="font-bold text-lg">{formatSignedTime(overtime)}</p>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-2 rounded-full ${overtime >= 0 ? "bg-green-500" : "bg-orange-500"}`} 
            />
          </div>
          {stats.driveMinutes > 0 && <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1"><span>Fahrzeit (Code 19):</span><span className="font-semibold">{formatTime(stats.driveMinutes)}</span></div>}
        </div>
      </Card>

      {/* LIST */}
      <div className="space-y-3 pb-20">
        <h3 className="font-bold text-slate-500 dark:text-slate-400 text-sm px-1">Letzte Einträge (nach Kalenderwoche)</h3>
        {groupedByWeek.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <Calendar size={32} className="mx-auto mb-2 opacity-20" />
            <p>Keine Einträge vorhanden.</p>
          </div>
        ) : (
          groupedByWeek.map(([week, weekEntries]) => {
            let workMinutes = 0; let driveMinutesKW = 0;
            weekEntries.forEach((e) => { if (e.type === "work" && e.code === 19) driveMinutesKW += e.netDuration; else workMinutes += e.netDuration; });
            const anyDate = new Date(weekEntries[0].date); const currentDay = anyDate.getDay() || 7; const monday = new Date(anyDate); monday.setDate(anyDate.getDate() - (currentDay - 1)); const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
            let dynamicTarget = 0; for (let i = 0; i < 5; i++) { const check = new Date(monday); check.setDate(monday.getDate() + i); if (check.getMonth() === viewMonth && check.getFullYear() === viewYear) dynamicTarget += i === 4 ? 270 : 510; }
            const diff = workMinutes - dynamicTarget; const expanded = expandedWeeks[week];
            const daysMap = new Map(); weekEntries.forEach((e) => { if (!daysMap.has(e.date)) daysMap.set(e.date, []); daysMap.get(e.date).push(e); });
            const sortedDays = Array.from(daysMap.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0]));

            return (
              <div key={week} className="mb-3">
                <button className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors" onClick={() => toggleWeek(week)}>
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Kalenderwoche</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          KW {week}{" "}
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">({monday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – {sunday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })})</span>
                        </span>
                        <div className="mt-1 text-sm flex gap-4">
                            <span className={workMinutes >= dynamicTarget ? "text-green-600 dark:text-green-400 font-bold" : "text-slate-700 dark:text-slate-300 font-bold"}>{formatTime(workMinutes)}</span>
                            <span className={diff >= 0 ? "text-green-600 dark:text-green-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"}>{diff >= 0 ? "+" : "-"}{formatTime(Math.abs(diff))}</span>
                        </div>
                    </div>
                    <ChevronRight size={18} className={`text-slate-500 dark:text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
                </button>
                
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <div className="mt-2 space-y-3">
                                {sortedDays.map(([dateStr, dayEntries]) => {
                                    const daySum = dayEntries.reduce((acc, curr) => (curr.type === "work" && curr.code === 19) ? acc : acc + curr.netDuration, 0);
                                    const d = new Date(dateStr);
                                    const sortedEntries = [...dayEntries].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
                                    
                                    return (
                                        <motion.div 
                                            key={dateStr}
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                                        >
                                            <div className="flex">
                                                <div className="bg-slate-800 dark:bg-slate-900 w-12 flex flex-col items-center justify-center text-white flex-shrink-0 z-20 relative">
                                                    <span className="text-xs font-bold opacity-80">{d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2)}</span>
                                                    <span className="text-sm font-bold">{d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <AnimatePresence initial={false}>
                                                        {sortedEntries.map((entry, idx) => {
                                                            const isHoliday = entry.type === "public_holiday";
                                                            let timeLabel = entry.type === "work" ? `${entry.start} - ${entry.end}` : (isHoliday ? "Feiertag" : "Ganztags");
                                                            let codeLabel = "";
                                                            if(entry.type === "work") codeLabel = WORK_CODES.find(c => c.id === entry.code)?.label;
                                                            else if(isHoliday) codeLabel = "Bezahlt frei";
                                                            else codeLabel = entry.type === "vacation" ? "Urlaub" : "Krank";
                                                            
                                                            let rowClass = `p-3 flex justify-between items-start gap-3 transition-colors cursor-pointer bg-white dark:bg-slate-800 ${idx < sortedEntries.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""}`;
                                                            if(isHoliday) rowClass = `p-3 flex justify-between items-start gap-3 bg-blue-50/50 dark:bg-blue-900/20 ${idx < sortedEntries.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""}`;

                                                            if (isHoliday) {
                                                                // Feiertage sind nicht swipeable
                                                                return (
                                                                    <div key={entry.id} className={rowClass}>
                                                                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                                                                            <div className="font-bold text-sm leading-none text-blue-600 dark:text-blue-400">{timeLabel}</div>
                                                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-tight">{entry.project}</div>
                                                                            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{codeLabel}</div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 pl-2 border-l border-slate-100 dark:border-slate-700 ml-1">
                                                                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatTime(entry.netDuration)}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            // SWIPEABLE ROW
                                                            return (
                                                                <div key={entry.id} className="relative overflow-hidden bg-red-500">
                                                                    {/* Background TRASH ICON */}
                                                                    <div className="absolute inset-0 flex items-center justify-end pr-4 text-white">
                                                                        <Trash2 size={20} />
                                                                    </div>

                                                                    {/* Foreground CONTENT */}
                                                                    <motion.div 
                                                                        drag="x"
                                                                        dragConstraints={{ left: 0, right: 0 }} // Schnappt zurück
                                                                        dragElastic={{ left: 0.5, right: 0.05 }} // Nach rechts schwerer
                                                                        onDragEnd={(_, info) => {
                                                                            // Wenn weit genug gezogen (> 80px), löschen auslösen
                                                                            if (info.offset.x < -80) {
                                                                                Haptics.impact({ style: ImpactStyle.Heavy });
                                                                                onDeleteEntry(entry.id);
                                                                            }
                                                                        }}
                                                                        onClick={() => onEditEntry(entry)} 
                                                                        className={`relative z-10 bg-white dark:bg-slate-800 ${idx < sortedEntries.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""}`}
                                                                        layout
                                                                    >
                                                                        <div className="p-3 flex justify-between items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                                            <div className="min-w-0 flex-1 flex flex-col gap-1">
                                                                                <div className="font-bold text-sm leading-none text-slate-900 dark:text-slate-100">{timeLabel}</div>
                                                                                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-tight">{entry.project}</div>
                                                                                {codeLabel && <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{codeLabel}</div>}
                                                                            </div>
                                                                            <div className="flex items-center gap-2 pl-2 border-l border-slate-100 dark:border-slate-700 ml-1">
                                                                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatTime(entry.netDuration)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                </div>
                                                            );
                                                        })}
                                                    </AnimatePresence>
                                                </div>
                                                
                                                <div className="bg-slate-50 dark:bg-slate-700/50 w-20 border-l border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center flex-shrink-0 px-1 z-20 relative">
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-0.5">Gesamt</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-sm">{formatTime(daySum)}</span>
                                                </div>
                                            </div>
                                        </motion.div>
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

export default Dashboard;