import React, { forwardRef, useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Save, Info, Calendar as CalIcon, Clock, List, Wand2, History, Hourglass, Plus, ChevronDown } from "lucide-react";
import { Card, getHolidayData, toLocalDateString } from "../utils";
import { WORK_CODE } from "../hooks/constants";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useTranslation } from "react-i18next";

import DatePicker, { registerLocale, CalendarContainer } from "react-datepicker";
// @ts-ignore
import "react-datepicker/dist/react-datepicker.css";
import { de, enUS } from "date-fns/locale";
import { getDatePickerLocale } from "../utils/formatLocale";
import TimePickerDrawer from "./TimePickerDrawer";
import SelectionDrawer from "./SelectionDrawer";

import type { Entry, EntryType, UserData, WorkCode } from "../types";
import type { Locale } from "../locales/types";
import type { CalculationConfig } from "../types";

registerLocale("de", de);
registerLocale("en", enUS);

interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

const CustomInput = forwardRef<HTMLButtonElement, CustomInputProps>(({ value, onClick, icon: Icon }, ref) => (
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
CustomInput.displayName = "CustomInput";

interface CalendarContainerAnimationProps {
  className?: string;
  children: React.ReactNode;
}

const CalendarContainerAnimation: React.FC<CalendarContainerAnimationProps> = ({ className, children }) => {
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

interface Props {
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  entryType: string;
  setEntryType: (type: string) => void;
  code: number;
  setCode: (code: number) => void;
  pauseDuration: number;
  setPauseDuration: (duration: number) => void;
  formDate: string;
  setFormDate: (date: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  project: string;
  setProject: (project: string) => void;
  lastWorkEntry: Entry | null;
  existingProjects?: string[];
  allEntries?: Entry[];
  isEditing?: boolean;
  isLiveEntry?: boolean;
  userData: UserData & { minuteInput?: boolean };
  specialManualMode?: boolean;
  setSpecialManualMode?: (mode: boolean) => void;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
  workCodes?: WorkCode[];
  hasAnyCodes?: boolean;
  addCode?: (label: string) => boolean;
}

const EntryForm: React.FC<Props> = ({
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
  userData,
  specialManualMode = false,
  setSpecialManualMode = () => {},
  locale,
  calculationConfig,
  workCodes = [],
  hasAnyCodes = false,
  addCode = () => false,
}) => {
  const { t } = useTranslation();
  const isSpecialType =
    entryType === "vacation" || entryType === "sick" || entryType === "time_comp";
  const showTimeInputs =
    entryType === "work" || entryType === "drive" || (isSpecialType && specialManualMode);
  
  const [activeTimeField, setActiveTimeField] = useState<string | null>(null);

  const openTimePicker = useCallback((field: string) => {
    setActiveTimeField(field);
  }, []);
  const [isWorkCodeOpen, setIsWorkCodeOpen] = useState(false);
  const [showPausePicker, setShowPausePicker] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [viewYear, setViewYear] = useState(new Date(formDate).getFullYear());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- viewYear has two sources (formDate + DatePicker navigation), needs sync
    setViewYear(new Date(formDate).getFullYear());
  }, [formDate]);

  useEffect(() => {
    if (isEditing || isLiveEntry) return; 
    if (entryType !== 'work' && entryType !== 'drive') return;
    
    const dayEntries = allEntries.filter(e => e.date === formDate && e.type === 'work' && e.end);
    
    if (dayEntries.length > 0) {
      const sorted = [...dayEntries].sort((a, b) => (a.end || "").localeCompare(b.end || ""));
      const lastEnd = sorted[sorted.length - 1].end;
      if (lastEnd) {
        setStartTime(lastEnd);
        setEndTime(lastEnd);
      }
      return;
    }

    setStartTime("06:00");
    setEndTime("16:30");
  }, [formDate, allEntries, entryType, isEditing, isLiveEntry, setStartTime, setEndTime]); 

  const holidayData = useMemo(() => {
      return {
        ...getHolidayData(viewYear - 1, locale, calculationConfig),
        ...getHolidayData(viewYear, locale, calculationConfig),
        ...getHolidayData(viewYear + 1, locale, calculationConfig)
      };
  }, [viewYear, locale, calculationConfig]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  };

  const handleCopyLastEntry = () => {
    if (!lastWorkEntry) {
      toast.error(t("entryForm.copyLastError"));
      return;
    }
    setStartTime(lastWorkEntry.start || "06:00");
    setEndTime(lastWorkEntry.end || "16:30");
    setPauseDuration(lastWorkEntry.pause || 0);
    setProject(lastWorkEntry.project || "");
    if (lastWorkEntry.code) setCode(lastWorkEntry.code);
    toast.success(t("entryForm.copyLastSuccess"), { icon: "🪄" });
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const selectSuggestion = (suggestion: string) => {
    setProject(suggestion);
    setShowSuggestions(false);
  };

  const changeDate = (days: number) => {
    const d = new Date(formDate);
    d.setDate(d.getDate() + days);
    setFormDate(toLocalDateString(d));
  };

  // Code-Label aus den User-Codes holen
  const currentCodeLabel = workCodes.find(c => c.id === code)?.label || t("entryForm.codePlaceholder");
  
  // Erster verfügbarer Code für Default
  const defaultCode = hasAnyCodes ? workCodes[0].id : 1;

  return (
    <main className="w-full p-3 pb-20">
      
      <TimePickerDrawer 
        isOpen={!!activeTimeField}
        onClose={() => setActiveTimeField(null)}
        title={activeTimeField === 'start' ? t("entryForm.startTime") : t("entryForm.endTime")}
        value={activeTimeField === 'start' ? startTime : endTime}
        onChange={(val) => activeTimeField === 'start' ? setStartTime(val) : setEndTime(val)}
        minuteInterval={userData?.minuteInput ? 1 : 15}
      />

      <SelectionDrawer
        isOpen={isWorkCodeOpen}
        onClose={() => setIsWorkCodeOpen(false)}
        title={t("entryForm.selectActivity")}
        options={workCodes.filter((c) => c.id !== WORK_CODE.ARRIVAL && c.id !== WORK_CODE.DRIVE)}
        value={code}
        onChange={(id: string | number) => setCode(id as number)}
      />

      <Card>
        <form onSubmit={handleFormSubmit} className="p-4 space-y-5">
          
          <div className="flex justify-between items-center mb-1">
             <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("entryForm.entryTypeLabel")}</div>
             
             {entryType === 'work' && code !== WORK_CODE.ARRIVAL && lastWorkEntry && (
               <motion.button
                 type="button"
                 whileTap={{ scale: 0.9 }}
                 onClick={() => {
                   handleCopyLastEntry();
                   Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                 }}
                 className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50"
               >
                 <Wand2 size={12} />
                 <span>{t("entryForm.asLast")}</span>
               </motion.button>
             )}
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-700 p-1 rounded-xl grid grid-cols-5 gap-1">
            {/* WORK */}
            <button type="button" onClick={() => { setEntryType("work"); setCode(defaultCode); }} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "work" && code !== WORK_CODE.ARRIVAL ? "bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>{t("entryForm.types.work")}</button>
            {/* FAHRT (Bleibt Orange als Kategorie-Farbe) */}
            <button type="button" onClick={() => { setEntryType("drive"); setCode(WORK_CODE.DRIVE); setPauseDuration(0); }} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "drive" || code === WORK_CODE.ARRIVAL ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>{t("entryForm.types.drive")}</button>
            {/* KRANK (Rot) */}
            <button type="button" onClick={() => setEntryType("sick")} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "sick" ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>{t("entryForm.types.sick")}</button>
            {/* URLAUB (Blau) */}
            <button type="button" onClick={() => setEntryType("vacation")} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "vacation" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>{t("entryForm.types.vacation")}</button>
            {/* ZA (Lila) */}
            <button type="button" onClick={() => setEntryType("time_comp")} className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${entryType === "time_comp" ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`}>{t("entryForm.types.timeCompShort")}</button>
          </div>

          {(entryType === "drive" || code === WORK_CODE.ARRIVAL) && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button type="button" onClick={() => { setEntryType("work"); setCode(WORK_CODE.ARRIVAL); setPauseDuration(0); setProject(""); }} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${code === WORK_CODE.ARRIVAL ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 ring-2 ring-green-500 ring-offset-1" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300"}`}>
                <span>{t("entryForm.driveSubtype.arrival")}</span><span className="text-[10px] uppercase bg-green-200 dark:bg-green-800 px-1 rounded text-green-800 dark:text-green-200">{t("entryForm.driveSubtype.arrivalBadge")}</span>
              </button>
              <button type="button" onClick={() => { setEntryType("drive"); setCode(WORK_CODE.DRIVE); setPauseDuration(0); setProject(""); }} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${entryType === "drive" && code === WORK_CODE.DRIVE ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 ring-2 ring-emerald-500 ring-offset-1" : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300"}`}>
                <span>{t("entryForm.driveSubtype.driveTime")}</span><span className="text-[10px] uppercase bg-zinc-200 dark:bg-zinc-600 px-1 rounded text-zinc-600 dark:text-zinc-300">{t("entryForm.driveSubtype.driveTimeBadge")}</span>
              </button>
            </div>
          )}
            
          {isSpecialType && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              {!specialManualMode && (
                <div className={`border rounded-lg p-3 flex items-start gap-3 ${entryType === "sick" ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-800 dark:text-red-300" : entryType === "vacation" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300" : "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-800 dark:text-purple-300"}`}>
                  {entryType === "time_comp" ? <Hourglass size={18} className="mt-0.5" /> : <Info size={18} className="mt-0.5" />}
                  <div className="text-sm">
                    <span className="font-bold block mb-1">{t("entryForm.autoCalc.title")}</span>
                    {t("entryForm.autoCalc.message", {
                      type:
                        entryType === "vacation"
                          ? t("entryForm.autoCalc.vacationType")
                          : entryType === "sick"
                            ? t("entryForm.autoCalc.sickType")
                            : t("entryForm.autoCalc.timeCompType"),
                    })}
                  </div>
                </div>
              )}
              <div className="bg-zinc-100 dark:bg-zinc-700 p-1 rounded-xl grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setSpecialManualMode(false)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${!specialManualMode ? "bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  {t("entryForm.mode.auto")}
                </button>
                <button
                  type="button"
                  onClick={() => setSpecialManualMode(true)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${specialManualMode ? "bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  {t("entryForm.mode.manual")}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{t("entryForm.date")}</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeDate(-1)} className="p-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><ChevronLeft size={20} /></button>
              <div className="flex-1">
                <DatePicker
                  selected={new Date(formDate)}
                  onChange={(date: Date | null) => { if (date) setFormDate(toLocalDateString(date)); }}
                  onMonthChange={(date) => setViewYear(date.getFullYear())}
                  onYearChange={(date) => setViewYear(date.getFullYear())}
                  dateFormat="eee, dd.MM.yyyy" 
                  locale={getDatePickerLocale()}
                  withPortal
                  calendarContainer={CalendarContainerAnimation}
                  customInput={<CustomInput icon={CalIcon} />}
                  dayClassName={(date: Date) => {
                    const dateStr = toLocalDateString(date);
                    return holidayData[dateStr] ? "!text-red-600 !font-bold" : "";
                  }}
                />
              </div>
              <button type="button" onClick={() => changeDate(1)} className="p-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><ChevronRight size={20} /></button>
            </div>
          </div>

          {showTimeInputs && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{t("entryForm.start")}</label>

                  <button type="button" onClick={() => openTimePicker('start')} className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors">
                    <span className="flex-1 text-center text-lg">{startTime}</span>
                    <Clock size={18} className="text-zinc-400 ml-2" />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{t("entryForm.end")}</label>
                  <button type="button" onClick={() => openTimePicker('end')} className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none active:border-emerald-500 transition-colors">
                    <span className="flex-1 text-center text-lg">{endTime}</span>
                    <Clock size={18} className="text-zinc-400 ml-2" />
                  </button>
                </div>
              </div>

              {entryType === "work" && code !== WORK_CODE.ARRIVAL && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{t("entryForm.pause")}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPauseDuration(0)} className={`flex-1 p-3 rounded-lg border text-sm font-bold ${pauseDuration === 0 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300"}`}>{t("entryForm.noPause")}</button>
                    <button
                      type="button"
                      onClick={() => setShowPausePicker(true)}
                      className={`flex-1 p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-1 ${pauseDuration > 0 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300"}`}
                    >
                      {pauseDuration > 0
                        ? pauseDuration >= 60
                          ? `${Math.floor(pauseDuration / 60)}h ${pauseDuration % 60 > 0 ? `${pauseDuration % 60}m` : ""}`
                          : t("entryForm.pauseMinutes", { minutes: pauseDuration })
                        : t("entryForm.pauseMinutes", { minutes: 30 })}
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <TimePickerDrawer
                    isOpen={showPausePicker}
                    onClose={() => setShowPausePicker(false)}
                    title={t("entryForm.pause")}
                    value={`${String(Math.floor((pauseDuration || 30) / 60)).padStart(2, "0")}:${String((pauseDuration || 30) % 60).padStart(2, "0")}`}
                    onChange={(val) => {
                      const [h, m] = val.split(":").map(Number);
                      setPauseDuration(h * 60 + m);
                    }}
                    minuteInterval={userData?.minuteInput ? 1 : 15}
                  />
                </div>
              )}

              {entryType === "work" && code !== WORK_CODE.ARRIVAL && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{t("entryForm.activity")}</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddOpen(!quickAddOpen)}
                      className="text-xs text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <Plus size={12} />
                      <span>{t("entryForm.newActivity")}</span>
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
                            placeholder={t("entryForm.quickAddPlaceholder")}
                            className="flex-1 p-2 text-sm bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none dark:text-white focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (quickAddValue.trim()) {
                                addCode(quickAddValue.trim());
                                toast.success(t("entryForm.quickAddSuccess"));
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

              {(entryType === "work" || entryType === "drive") && (
                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">{entryType === "drive" || code === WORK_CODE.ARRIVAL ? t("entryForm.distanceOrNote") : t("entryForm.project")}</label>
                  <input
                    type="text"
                    value={project}
                    onChange={handleProjectChange}
                    onFocus={() => { if(project) handleProjectChange({target: {value: project}} as React.ChangeEvent<HTMLInputElement>) }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none dark:text-white focus:border-emerald-500 transition-colors"
                    placeholder={t("entryForm.projectPlaceholder")}
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
                          <History size={10} /> {t("entryForm.knownProjects")}
                        </div>
                        {suggestions.map((s, idx) => (
                          <div
                            key={idx}
                            onMouseDown={() => selectSuggestion(s)}
                            className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer border-b border-zinc-50 dark:border-zinc-700 last:border-0"
                          >
                            {s}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 py-3 font-bold text-zinc-500 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-xl">{t("common.cancel")}</button>

            <button type="submit" className="flex-[2] py-3 font-bold text-white bg-zinc-900 dark:bg-emerald-600 hover:bg-zinc-800 dark:hover:bg-emerald-700 rounded-xl shadow-lg flex items-center justify-center gap-2"><Save size={18} /> {t("common.save")}</button>
          </div>
        </form>
      </Card>
    </main>
  );
};

export default EntryForm;
