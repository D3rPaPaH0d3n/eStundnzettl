import React, { forwardRef, useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Save, Info, Calendar as CalIcon, Clock, List, Wand2, History, Hourglass, Plus } from "lucide-react";
import { Card, getHolidayData, toLocalDateString } from "../utils"; 
import { useWorkCodes } from "../hooks/useWorkCodes";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import DatePicker, { registerLocale, CalendarContainer } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { de } from "date-fns/locale";
import TimePickerDrawer from "./TimePickerDrawer";
import SelectionDrawer from "./SelectionDrawer";

registerLocale("de", de);

// CHANGE: slate -> zinc, focus:border-orange -> focus:border-emerald
const CustomInput = forwardRef(({ value, onClick, icon: Icon }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
  >
    <span className="flex-1 text-center">{value}</span>
    {Icon && <Icon size={18} className="text-zinc-400 ml-2" />}
  </button>
));

const CalendarContainerAnimation = ({ className, children }) => {
  return (
    <div className={className} style={{ background: "transparent", border: "none", padding: 0 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.3 }}
      >
        <CalendarContainer className={className}>
          {children}
        </CalendarContainer>
      </motion.div>
    </div>
  );
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
  
  // Work Codes aus dem Hook laden
  const { workCodes, hasAnyCodes, addCode } = useWorkCodes();
  
  const [activeTimeField, setActiveTimeField] = useState(null);
  const [isWorkCodeOpen, setIsWorkCodeOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [viewYear, setViewYear] = useState(new Date(formDate).getFullYear());

  useEffect(() => {
    setViewYear(new Date(formDate).getFullYear());
  }, [formDate]);

  useEffect(() => {
    if (isEditing || isLiveEntry) return; 
    if (entryType !== 'work' && entryType !== 'drive') return;
    
    const dayEntries = allEntries.filter(e => e.date === formDate && e.type === 'work' && e.end);
    
    if (dayEntries.length > 0) {
      const sorted = [...dayEntries].sort((a, b) => (a.end || "").localeCompare(b.end || ""));
      const lastEnd = sorted[sorted.length - 1].end;
      if (lastEnd) setStartTime(lastEnd);
    }
  }, [formDate, allEntries, entryType, isEditing, isLiveEntry]); 

  const holidayData = useMemo(() => {
      return {
        ...getHolidayData(viewYear - 1),
        ...getHolidayData(viewYear),
        ...getHolidayData(viewYear + 1)
      };
  }, [viewYear]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  };

  const handleCopyLastEntry = () => {
    if (!lastWorkEntry) {
      toast.error("Kein vorheriger Eintrag gefunden.");
      return;
    }
    setStartTime(lastWorkEntry.start || "06:00");
    setEndTime(lastWorkEntry.end || "16:30");
    setPauseDuration(lastWorkEntry.pause || 0);
    setProject(lastWorkEntry.project || "");
    if (lastWorkEntry.code) setCode(lastWorkEntry.code);
    toast.success("Daten übernommen!", { icon: "🪄" });
  };

  const handleProjectChange = (e) => {
    const val = e.target.value;
    setProject(val);
    if (val.length > 0) {
      const filtered = existingProjects.filter(p => 
        p.toLowerCase().includes(val.toLowerCase()) && p !== val
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

  // Code-Label aus den User-Codes holen
  const currentCodeLabel = workCodes.find(c => c.id === code)?.label || "Bitte wählen";
  
  // Erster verfügbarer Code für Default
  const defaultCode = hasAnyCodes ? workCodes[0].id : 1;

  return (
    <main className="w-full p-3 pb-20">
      
      <TimePickerDrawer 
        isOpen={!!activeTimeField}
        onClose={() => setActiveTimeField(null)}
        title={activeTimeField === 'start' ? "Startzeit" : "Endzeit"}
        value={activeTimeField === 'start' ? startTime : endTime}
        onChange={(val) => activeTimeField === 'start' ? setStartTime(val) : setEndTime(val)}
      />

      <SelectionDrawer
        isOpen={isWorkCodeOpen}
        onClose={() => setIsWorkCodeOpen(false)}
        title="Tätigkeit wählen"
        options={workCodes.filter((c) => c.id !== 190 && c.id !== 19)}
        value={code}
        onChange={setCode}
      />

      <Card>
        <form onSubmit={handleFormSubmit} className="p-4 space-y-5">
          
          <div className="flex justify-between items-center mb-1">
             <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Eintragstyp</div>
             
             {entryType === 'work' && code !== 190 && lastWorkEntry && (
               <motion.button
                 type="button"
                 whileTap={{ scale: 0.9 }}
                 onClick={() => {
                   handleCopyLastEntry();
                   Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                 }}
                 // CHANGE: Orange -> Emerald für diesen "Action Button"
                 className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50"
               >
                 <Wand2 size={12} />
                 <span>Wie zuletzt</span>
               </motion.button>
             )}
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-700 p-1 rounded-xl grid grid-cols-5 gap-1">
            {/* WORK */}
            <button type="button" onClick={() => { setEntryType("work"); setCode(defaultCode); }} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "work" && code !== 190 ? "bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>Arbeit</button>
            {/* FAHRT (Bleibt Orange als Kategorie-Farbe) */}
            <button type="button" onClick={() => { setEntryType("drive"); setCode(19); setPauseDuration(0); }} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "drive" || code === 190 ? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>Fahrt</button>
            {/* KRANK (Rot) */}
            <button type="button" onClick={() => setEntryType("sick")} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "sick" ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>Krank</button>
            {/* URLAUB (Blau) */}
            <button type="button" onClick={() => setEntryType("vacation")} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "vacation" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>Urlaub</button>
            {/* ZA (Lila) */}
            <button type="button" onClick={() => setEntryType("time_comp")} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "time_comp" ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>ZA</button>
          </div>

          {(entryType === "drive" || code === 190) && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button type="button" onClick={() => { setEntryType("work"); setCode(190); setPauseDuration(0); setProject(""); }} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${code === 190 ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 ring-2 ring-green-500 ring-offset-1" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300"}`}>
                <span>An/Abreise</span><span className="text-[10px] uppercase bg-green-200 dark:bg-green-800 px-1 rounded text-green-800 dark:text-green-200">Bezahlt</span>
              </button>
              <button type="button" onClick={() => { setEntryType("drive"); setCode(19); setPauseDuration(0); setProject(""); }} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${entryType === "drive" && code === 19 ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-400 ring-2 ring-orange-500 ring-offset-1" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300"}`}>
                <span>Fahrtzeit</span><span className="text-[10px] uppercase bg-zinc-200 dark:bg-zinc-600 px-1 rounded text-zinc-600 dark:text-zinc-300">Unbezahlt</span>
              </button>
            </div>
          )}
            
          {(entryType === "vacation" || entryType === "sick" || entryType === "time_comp") && (
            <div className={`border rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${entryType === "sick" ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-800 dark:text-red-300" : entryType === "vacation" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300" : "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-800 dark:text-purple-300"}`}>
              {entryType === "time_comp" ? <Hourglass size={18} className="mt-0.5" /> : <Info size={18} className="mt-0.5" />}
              <div className="text-sm"><span className="font-bold block mb-1">Automatische Berechnung</span>Für {entryType === "vacation" ? "Urlaubstage" : entryType === "sick" ? "Krankenstand" : "Zeitausgleich"} wird automatisch die tägliche Sollzeit gutgeschrieben.</div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Datum</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeDate(-1)} className="p-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><ChevronLeft size={20} /></button>
              <div className="flex-1">
                <DatePicker
                  selected={new Date(formDate)}
                  onChange={(date) => setFormDate(toLocalDateString(date))}
                  onMonthChange={(date) => setViewYear(date.getFullYear())}
                  onYearChange={(date) => setViewYear(date.getFullYear())}
                  dateFormat="eee, dd.MM.yyyy" 
                  locale="de"
                  withPortal
                  calendarContainer={CalendarContainerAnimation}
                  customInput={<CustomInput icon={CalIcon} />}
                  dayClassName={(date) => {
                    const dateStr = toLocalDateString(date);
                    return holidayData[dateStr] ? "!text-red-600 !font-bold" : undefined;
                  }}
                />
              </div>
              <button type="button" onClick={() => changeDate(1)} className="p-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><ChevronRight size={20} /></button>
            </div>
          </div>

          {(entryType === "work" || entryType === "drive") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Start</label>
                  {/* CHANGE: active:border-orange -> active:border-emerald */}
                  <button type="button" onClick={() => setActiveTimeField('start')} className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors">
                    <span className="flex-1 text-center text-lg">{startTime}</span>
                    <Clock size={18} className="text-zinc-400 ml-2" />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Ende</label>
                  <button type="button" onClick={() => setActiveTimeField('end')} className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors">
                    <span className="flex-1 text-center text-lg">{endTime}</span>
                    <Clock size={18} className="text-zinc-400 ml-2" />
                  </button>
                </div>
              </div>

              {entryType === "work" && code !== 190 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Pause</label>
                  <div className="flex gap-2">
                    {/* CHANGE: active styles Emerald */}
                    <button type="button" onClick={() => setPauseDuration(0)} className={`flex-1 p-3 rounded-lg border text-sm font-bold ${pauseDuration === 0 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300"}`}>Keine</button>
                    <button type="button" onClick={() => setPauseDuration(30)} className={`flex-1 p-3 rounded-lg border text-sm font-bold ${pauseDuration === 30 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300"}`}>30 Min</button>
                  </div>
                </div>
              )}

              {entryType === "work" && code !== 190 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Tätigkeit</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddOpen(!quickAddOpen)}
                      className="text-xs text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <Plus size={12} />
                      <span>Neue</span>
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {quickAddOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={quickAddValue}
                            onChange={(e) => setQuickAddValue(e.target.value)}
                            placeholder="z.B. 99 - Sonstiges"
                            className="flex-1 p-2 text-sm bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none dark:text-white focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (quickAddValue.trim()) {
                                addCode(quickAddValue.trim());
                                toast.success("Tätigkeit hinzugefügt!");
                                setQuickAddValue("");
                                setQuickAddOpen(false);
                              }
                            }}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    type="button" 
                    onClick={() => setIsWorkCodeOpen(true)}
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors text-left"
                  >
                    <span className="truncate pr-2">{currentCodeLabel}</span>
                    <List size={18} className="text-zinc-400 flex-shrink-0" />
                  </button>
                </div>
              )}

              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{entryType === "drive" || code === 190 ? "Strecke / Notiz" : "Projekt"}</label>
                <input 
                  type="text" 
                  value={project} 
                  onChange={handleProjectChange} 
                  onFocus={() => { if(project) handleProjectChange({target: {value: project}}) }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none dark:text-white focus:border-emerald-500 transition-colors" 
                  placeholder="..." 
                />
                
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative z-50 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden overflow-y-auto"
                    >
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-100 dark:border-zinc-700 flex items-center gap-1">
                        <History size={10} /> Bekannte Projekte
                      </div>
                      {suggestions.map((s, idx) => (
                        <div 
                          key={idx}
                          onMouseDown={() => selectSuggestion(s)}
                          // CHANGE: hover:bg-orange -> hover:bg-emerald
                          className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer border-b border-zinc-50 dark:border-zinc-700 last:border-0"
                        >
                          {s}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 py-3 font-bold text-zinc-500 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-xl">Abbrechen</button>
            {/* CHANGE: bg-slate-900/orange-500 -> bg-zinc-900 / bg-emerald-600 */}
            <button type="submit" className="flex-[2] py-3 font-bold text-white bg-zinc-900 dark:bg-emerald-600 hover:bg-zinc-800 dark:hover:bg-emerald-700 rounded-xl shadow-lg flex items-center justify-center gap-2"><Save size={18} /> Speichern</button>
          </div>
        </form>
      </Card>
    </main>
  );
};

export default EntryForm;