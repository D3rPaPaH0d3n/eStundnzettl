import React, { forwardRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Trash2 } from "lucide-react";
import { 
  Card, 
  formatTime, 
  formatSignedTime, 
  getWeekNumber, 
  // calculateWeekStats NEU importiert, die alten Helfer entfernt da nicht mehr hier benötigt
  calculateWeekStats 
} from "../utils"; 
import { WORK_CODES } from "../hooks/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import de from "date-fns/locale/de";

registerLocale("de", de);

// Stylt den Monatsnamen jetzt etwas größer als Überschrift
const CustomMonthInput = forwardRef(({ value, onClick }, ref) => (
  <button 
    className="font-bold text-slate-800 dark:text-white text-lg hover:text-orange-500 transition-colors capitalize"
    onClick={onClick} 
    ref={ref}
  >
    {value}
  </button>
));

const Dashboard = ({
  currentDate, onSetCurrentDate, changeMonth,
  stats, 
  overtime, progressPercent, groupedByWeek, viewMonth, viewYear, onEditEntry, onDeleteEntry, userData
}) => {
  
  const [expandedWeeks, setExpandedWeeks] = useState(() => {
    const currentWeek = getWeekNumber(new Date());
    return { [currentWeek]: true };
  });

  const toggleWeek = (week) => { 
    Haptics.impact({ style: ImpactStyle.Light }); 
    setExpandedWeeks((prev) => ({ ...prev, [week]: !prev[week] })); 
  };

  const monthlyOvertimeSplit = stats.overtimeSplit || { mehrarbeit: 0, ueberstunden: 0 };

  // FIX 1: Sortierung der Wochen nach Datum (Startdatum der Einträge), nicht nach KW-Nummer.
  const sortedWeeks = [...groupedByWeek].sort((a, b) => {
    // a und b sind Arrays: [weekNum, entriesArray]
    const dateA = new Date(a[1][0].date);
    const dateB = new Date(b[1][0].date);
    return dateB - dateA; // Absteigend (neueste oben)
  });

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full p-3 space-y-4">
      
      {/* --- KOMPAKTE KARTE MIT INTEGRIERTEM MONATS-WÄHLER --- */}
      <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
        
        {/* HEADER: MONATS-NAVIGATION */}
        <div className="flex items-center justify-between p-3 px-4 border-b border-slate-100 dark:border-slate-700/50">
            <button 
                className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" 
                onClick={() => changeMonth(-1)}
            >
                <ChevronLeft size={24} />
            </button>
            
            <div className="flex justify-center">
                <DatePicker 
                    selected={currentDate} 
                    onChange={(date) => { const d = new Date(date); d.setDate(1); onSetCurrentDate(d); }} 
                    dateFormat="MMMM yyyy" 
                    showMonthYearPicker 
                    locale="de" 
                    withPortal 
                    customInput={<CustomMonthInput />} 
                />
            </div>

            <button 
                className="p-2 -mr-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" 
                onClick={() => changeMonth(1)}
            >
                <ChevronRight size={24} />
            </button>
        </div>

        {/* BODY: STATISTIKEN */}
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-end">
            {/* IST */}
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">IST</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{formatTime(stats.totalIst)}</p>
            </div>
            
            {/* SOLL & SALDO RECHTS */}
            <div className="flex gap-6 text-right">
                <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">SOLL</p>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">{formatTime(stats.totalTarget)}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">Saldo</p>
                    <p className={`font-bold text-xl leading-none ${overtime >= 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                        {formatSignedTime(overtime)}
                    </p>
                </div>
            </div>
          </div>
          
          {/* PROGRESS BAR */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${overtime >= 0 ? "bg-green-500" : "bg-orange-500"}`} />
          </div>

          {/* FOOTER INFO */}
          <div className="flex flex-wrap justify-between items-center text-xs pt-1">
             <div className="text-slate-500 dark:text-slate-400">
               {stats.drive > 0 && (
                 <> <span>Fahrzeit (19): </span> <span className="font-semibold">{formatTime(stats.drive)}</span> </>
               )}
             </div>

             {(monthlyOvertimeSplit.mehrarbeit > 0 || monthlyOvertimeSplit.ueberstunden > 0) && (
                <div className="text-right flex items-center gap-3 ml-auto">
                    {monthlyOvertimeSplit.mehrarbeit > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {formatTime(monthlyOvertimeSplit.mehrarbeit)} <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">MA</span>
                        </span>
                    )}
                    
                    {monthlyOvertimeSplit.ueberstunden > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                            {formatTime(monthlyOvertimeSplit.ueberstunden)} <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">ÜS</span>
                        </span>
                    )}
                </div>
             )}
          </div>
        </div>
      </Card>

      {/* 3. LISTE DER EINTRÄGE */}
      <div className="space-y-3 pb-20">
        <h3 className="font-bold text-slate-500 dark:text-slate-400 text-sm px-1">Letzte Einträge (nach Kalenderwoche)</h3>
        {sortedWeeks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <Calendar size={32} className="mx-auto mb-2 opacity-20" /> <p>Keine Einträge vorhanden.</p>
          </div>
        ) : (
          sortedWeeks.map(([week, weekEntries]) => {
            
            // FIX 2: Berechnung komplett zentralisiert!
            // calculateWeekStats kümmert sich um den Monats-Schnitt und liefert Soll/Ist/Saldo.
            const weekStats = calculateWeekStats(weekEntries, userData, currentDate);
            
            // Werte für die Anzeige extrahieren
            // totalIst enthält alle Arbeitszeiten + Urlaub/Krank/Feiertag (aber ohne Code 19 Fahrtzeit)
            const workMinutes = weekStats.totalIst; 
            const diff = weekStats.totalSaldo;
            const { mehrarbeit, ueberstunden } = weekStats.overtimeSplit;
            
            // Dynamisches Wochen-Ziel berechnen (basierend auf den Tagen in dieser Woche)
            const anyDate = new Date(weekEntries[0].date); 
            const currentDay = anyDate.getDay() || 7; 
            const monday = new Date(anyDate); monday.setDate(anyDate.getDate() - (currentDay - 1)); 
            const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
            
            const expanded = expandedWeeks[week];
            let balanceColorClass = diff < 0 ? "text-red-600 dark:text-red-400 font-bold" : (ueberstunden > 0 ? "text-green-600 dark:text-green-400 font-bold" : "text-blue-600 dark:text-blue-400 font-bold");

            // Einträge nach Datum sortieren
            const daysMap = new Map(); 
            weekEntries.forEach((e) => { 
                if (!daysMap.has(e.date)) daysMap.set(e.date, []); 
                daysMap.get(e.date).push(e); 
            });
            const sortedDays = Array.from(daysMap.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0]));

            return (
              <div key={week} className="mb-3">
                <button className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors" onClick={() => toggleWeek(week)}>
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Kalenderwoche</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200"> KW {week}{" "} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">({monday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – {sunday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })})</span> </span>
                        
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="text-sm flex gap-3">
                                <span className={weekStats.work >= weekStats.totalTarget ? "text-green-600 dark:text-green-400 font-bold" : "text-slate-700 dark:text-slate-300 font-bold"}>{formatTime(workMinutes)}</span>
                                <span className={balanceColorClass}> {diff >= 0 ? "+" : "-"}{formatTime(Math.abs(diff))} </span>
                            </div>

                            {diff > 0 && (mehrarbeit > 0 || ueberstunden > 0) && (
                                <div className="text-[10px] flex items-center gap-2 opacity-80">
                                    {mehrarbeit > 0 && (
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                            {formatTime(mehrarbeit)} MA
                                        </span>
                                    )}
                                    {mehrarbeit > 0 && ueberstunden > 0 && (
                                        <span className="text-slate-300 dark:text-slate-600">|</span>
                                    )}
                                    {ueberstunden > 0 && (
                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                            {formatTime(ueberstunden)} ÜS
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <ChevronRight size={18} className={`text-slate-500 dark:text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
                </button>
                
                <AnimatePresence> 
                  {expanded && ( 
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden"> 
                      <div className="mt-2 space-y-3"> 
                        {sortedDays.map(([dateStr, dayEntries]) => { 
                            const daySum = dayEntries.reduce((acc, curr) => (curr.type === "work" && curr.code === 19) ? acc : acc + curr.netDuration, 0); 
                            const d = new Date(dateStr); 
                            const sortedEntries = [...dayEntries].sort((a, b) => (a.start || "").localeCompare(b.start || "")); 
                            
                            return ( 
                              <motion.div key={dateStr} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"> 
                                <div className="flex"> 
                                  <div className="bg-slate-800 dark:bg-slate-900 w-12 flex flex-col items-center justify-center text-white flex-shrink-0 z-20 relative"> 
                                    <span className="text-xs font-bold opacity-80">{d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2)}</span> 
                                    <span className="text-sm font-bold">{d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span> 
                                  </div> 
                                  <div className="flex-1 min-w-0"> 
                                    <AnimatePresence initial={false}> 
                                      {sortedEntries.map((entry, idx) => { 
                                          const isHoliday = entry.type === "public_holiday"; 
                                          const isTimeComp = entry.type === "time_comp"; 
                                          let timeLabel = entry.type === "work" ? `${entry.start} - ${entry.end}` : (isHoliday ? "Feiertag" : "Ganztags"); 
                                          
                                          let codeLabel = ""; 
                                          if(entry.type === "work") codeLabel = WORK_CODES.find(c => c.id === entry.code)?.label; 
                                          else if(isHoliday) codeLabel = "Bezahlt frei"; 
                                          else if(isTimeComp) codeLabel = "Zeitausgleich"; 
                                          else codeLabel = entry.type === "vacation" ? "Urlaub" : "Krank"; 
                                          
                                          let pauseLabel = ""; 
                                          if (entry.type === "work" && entry.code !== 19) { pauseLabel = entry.pause > 0 ? ` - Pause: ${entry.pause} Min` : " - Keine Pause"; } 
                                          
                                          let rowClass = `p-3 flex justify-between items-start gap-3 transition-colors cursor-pointer bg-white dark:bg-slate-800 ${idx < sortedEntries.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""}`; 
                                          if(isHoliday) rowClass = `p-3 flex justify-between items-start gap-3 bg-blue-50/50 dark:bg-blue-900/20 ${idx < sortedEntries.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""}`; 
                                          if(isTimeComp) rowClass = `p-3 flex justify-between items-start gap-3 bg-purple-50/50 dark:bg-purple-900/20 ${idx < sortedEntries.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""}`; 
                                          
                                          if (isHoliday) { 
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

                                          return ( 
                                            <div key={entry.id} className="relative overflow-hidden bg-red-500"> 
                                              <div className="absolute inset-0 flex items-center justify-end pr-4 text-white"> <Trash2 size={20} /> </div> 
                                              <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.5, right: 0.05 }} onDragEnd={(_, info) => { if (info.offset.x < -80) { Haptics.impact({ style: ImpactStyle.Heavy }); onDeleteEntry(entry.id); } }} onClick={() => onEditEntry(entry)} className={`relative z-10 bg-white dark:bg-slate-800 ${idx < sortedEntries.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""}`} layout > 
                                                <div className={`p-3 flex justify-between items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isTimeComp ? "bg-purple-50/30 dark:bg-purple-900/10" : ""}`}> 
                                                  <div className="min-w-0 flex-1 flex flex-col gap-1"> 
                                                    <div className={`font-bold text-sm leading-none ${isTimeComp ? "text-purple-700 dark:text-purple-400" : "text-slate-900 dark:text-slate-100"}`}> {timeLabel} {pauseLabel && <span className="font-normal opacity-70">{pauseLabel}</span>} </div> 
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-tight">{entry.project}</div> 
                                                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400 leading-tight"> {codeLabel && <span>{codeLabel}</span>} </div> 
                                                  </div> 
                                                  <div className="flex items-center gap-2 pl-2 border-l border-slate-100 dark:border-slate-700 ml-1"> <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatTime(entry.netDuration)}</span> </div> 
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