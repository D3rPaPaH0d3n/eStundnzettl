import React, { forwardRef, useState } from "react";
import { ChevronLeft, ChevronRight, Save, Info, Calendar as CalIcon, Clock, List, Wand2, History } from "lucide-react";
import { Card, WORK_CODES } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import DatePicker, { registerLocale, CalendarContainer } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import de from "date-fns/locale/de";
import TimePickerDrawer from "./TimePickerDrawer";
import SelectionDrawer from "./SelectionDrawer";

registerLocale("de", de);

// Custom Input für DatePicker
const CustomInput = forwardRef(({ value, onClick, icon: Icon }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-800 dark:text-white outline-none focus:border-orange-500 transition-colors"
  >
    <span className="flex-1 text-center">{value}</span>
    {Icon && <Icon size={18} className="text-slate-400 ml-2" />}
  </button>
));

// Container für die Zoom-Animation des Kalenders
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
  existingProjects = []
}) => {
  
  const [activeTimeField, setActiveTimeField] = useState(null);
  const [isWorkCodeOpen, setIsWorkCodeOpen] = useState(false);
  
  // --- AUTOCOMPLETE STATE ---
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- FIX FÜR SUBMIT (Logik vor Haptik) ---
  const handleFormSubmit = (e) => {
    e.preventDefault();
    // 1. Erst speichern
    onSubmit(e);
    // 2. Dann vibrieren (Fehler ignorieren)
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  };

  // --- FUNKTION: LETZTEN EINTRAG KOPIEREN ---
  const handleCopyLastEntry = () => {
    if (!lastWorkEntry) {
      toast.error("Kein vorheriger Eintrag gefunden.");
      return;
    }
    
    // Werte übernehmen
    setStartTime(lastWorkEntry.start || "06:00");
    setEndTime(lastWorkEntry.end || "16:30");
    setPauseDuration(lastWorkEntry.pause || 0);
    setProject(lastWorkEntry.project || "");
    if (lastWorkEntry.code) setCode(lastWorkEntry.code);

    // Feedback Animation/Toast
    toast.success("Daten vom letzten Eintrag übernommen!", {
      icon: "🪄",
      style: { borderRadius: '10px', background: '#333', color: '#fff' }
    });
  };

  // --- FUNKTION: AUTOCOMPLETE LOGIK ---
  const handleProjectChange = (e) => {
    const val = e.target.value;
    setProject(val);

    if (val.length > 0) {
      // Filtern: Case-insensitive Suche
      const filtered = existingProjects.filter(p => 
        p.toLowerCase().includes(val.toLowerCase()) && p !== val
      ).slice(0, 4); // Max 4 Vorschläge anzeigen
      
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

  // Datum ändern helper
  const changeDate = (days) => {
    const d = new Date(formDate);
    d.setDate(d.getDate() + days);
    setFormDate(d.toISOString().split("T")[0]);
  };

  const currentCodeLabel = WORK_CODES.find(c => c.id === code)?.label || "Bitte wählen";

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
        options={WORK_CODES.filter((c) => c.id !== 190 && c.id !== 19)}
        value={code}
        onChange={setCode}
      />

      <Card>
        {/* HIER VERWENDEN WIR JETZT handleFormSubmit STATT onSubmit DIREKT */}
        <form onSubmit={handleFormSubmit} className="p-4 space-y-5">
          
          {/* HEADER MIT KOPIER-BUTTON */}
          <div className="flex justify-between items-center mb-1">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eintragstyp</div>
             
             {/* DER MAGISCHE KNOPF (Nur bei Arbeit sichtbar und wenn Daten da sind) */}
             {entryType === 'work' && lastWorkEntry && (
               <motion.button
                 type="button"
                 whileTap={{ scale: 0.9 }}
                 onClick={() => {
                   // Logik zuerst
                   handleCopyLastEntry();
                   // Haptik als Bonus
                   Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                 }}
                 className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-100 dark:border-orange-800/50"
               >
                 <Wand2 size={12} />
                 <span>Wie zuletzt</span>
               </motion.button>
             )}
          </div>

          {/* ENTRY TYPE SELECT */}
          <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl grid grid-cols-4 gap-1">
            <button type="button" onClick={() => { setEntryType("work"); setCode(WORK_CODES[0].id); }} className={`py-2 rounded-lg text-xs font-bold transition-all ${entryType === "work" && code !== 190 ? "bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>Arbeit</button>
            <button type="button" onClick={() => { setEntryType("drive"); setCode(19); setPauseDuration(0); }} className={`py-2 rounded-lg text-xs font-bold transition-all ${entryType === "drive" || code === 190 ? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>Fahrt</button>
            <button type="button" onClick={() => setEntryType("sick")} className={`py-2 rounded-lg text-xs font-bold transition-all ${entryType === "sick" ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>Krank</button>
            <button type="button" onClick={() => setEntryType("vacation")} className={`py-2 rounded-lg text-xs font-bold transition-all ${entryType === "vacation" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>Urlaub</button>
          </div>

          {(entryType === "drive" || code === 190) && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button type="button" onClick={() => { setEntryType("work"); setCode(190); setPauseDuration(0); setProject(""); }} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${code === 190 ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 ring-2 ring-green-500 ring-offset-1" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`}>
                <span>An/Abreise</span><span className="text-[10px] uppercase bg-green-200 dark:bg-green-800 px-1 rounded text-green-800 dark:text-green-200">Bezahlt</span>
              </button>
              <button type="button" onClick={() => { setEntryType("drive"); setCode(19); setPauseDuration(0); setProject(""); }} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${entryType === "drive" && code === 19 ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-400 ring-2 ring-orange-500 ring-offset-1" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`}>
                <span>Fahrtzeit</span><span className="text-[10px] uppercase bg-slate-200 dark:bg-slate-600 px-1 rounded text-slate-600 dark:text-slate-300">Unbezahlt</span>
              </button>
            </div>
          )}
            
          {(entryType === "vacation" || entryType === "sick") && (
            <div className={`border rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${entryType === "sick" ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-800 dark:text-red-300" : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300"}`}>
              <Info className={`flex-shrink-0 mt-0.5 ${entryType === "sick" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} size={18} />
              <div className="text-sm"><span className="font-bold block mb-1">Automatische Berechnung</span>Für {entryType === "vacation" ? "Urlaubstage" : "Krankenstand"} wird automatisch die tägliche Sollzeit gutgeschrieben.</div>
            </div>
          )}

          {/* DATE PICKER */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Datum</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeDate(-1)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"><ChevronLeft size={20} /></button>
              <div className="flex-1">
                <DatePicker
                  selected={new Date(formDate)}
                  onChange={(date) => setFormDate(date.toISOString().split("T")[0])}
                  dateFormat="eee, dd.MM.yyyy" 
                  locale="de"
                  withPortal
                  calendarContainer={CalendarContainerAnimation}
                  customInput={<CustomInput icon={CalIcon} />}
                />
              </div>
              <button type="button" onClick={() => changeDate(1)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"><ChevronRight size={20} /></button>
            </div>
          </div>

          {/* TIME FIELDS */}
          {(entryType === "work" || entryType === "drive") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Start</label>
                  <button type="button" onClick={() => setActiveTimeField('start')} className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-800 dark:text-white outline-none active:border-orange-500 transition-colors">
                    <span className="flex-1 text-center text-lg">{startTime}</span>
                    <Clock size={18} className="text-slate-400 ml-2" />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ende</label>
                  <button type="button" onClick={() => setActiveTimeField('end')} className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-800 dark:text-white outline-none active:border-orange-500 transition-colors">
                    <span className="flex-1 text-center text-lg">{endTime}</span>
                    <Clock size={18} className="text-slate-400 ml-2" />
                  </button>
                </div>
              </div>

              {entryType === "work" && code !== 190 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pause</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPauseDuration(0)} className={`flex-1 p-3 rounded-lg border text-sm font-bold ${pauseDuration === 0 ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300"}`}>Keine</button>
                    <button type="button" onClick={() => setPauseDuration(30)} className={`flex-1 p-3 rounded-lg border text-sm font-bold ${pauseDuration === 30 ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300"}`}>30 Min</button>
                  </div>
                </div>
              )}

              {/* TÄTIGKEIT SELECTION */}
              {entryType === "work" && code !== 190 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tätigkeit</label>
                  <button 
                    type="button" 
                    onClick={() => setIsWorkCodeOpen(true)}
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-800 dark:text-white outline-none active:border-orange-500 transition-colors text-left"
                  >
                    <span className="truncate pr-2">{currentCodeLabel}</span>
                    <List size={18} className="text-slate-400 flex-shrink-0" />
                  </button>
                </div>
              )}

              {/* PROJEKT MIT AUTOCOMPLETE (RELATIVE POSITION) */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{entryType === "drive" || code === 190 ? "Strecke / Notiz" : "Projekt"}</label>
                <input 
                  type="text" 
                  value={project} 
                  onChange={handleProjectChange} 
                  onFocus={() => { if(project) handleProjectChange({target: {value: project}}) }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg outline-none dark:text-white" 
                  placeholder="..." 
                />
                
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden overflow-y-auto"
                    >
                      <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 flex items-center gap-1">
                        <History size={10} /> Bekannte Projekte
                      </div>
                      {suggestions.map((s, idx) => (
                        <div 
                          key={idx}
                          onMouseDown={() => selectSuggestion(s)}
                          className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0"
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
            <button type="button" onClick={onCancel} className="flex-1 py-3 font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl">Abbrechen</button>
            <button type="submit" className="flex-[2] py-3 font-bold text-white bg-slate-900 dark:bg-orange-500 hover:bg-slate-800 dark:hover:bg-orange-600 rounded-xl shadow-lg flex items-center justify-center gap-2"><Save size={18} /> Speichern</button>
          </div>
        </form>
      </Card>
    </main>
  );
};

export default EntryForm;