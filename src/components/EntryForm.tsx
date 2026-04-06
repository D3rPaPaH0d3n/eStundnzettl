import React, { forwardRef, useState, useEffect, useMemo, useCallback } from "react";
import { ChevronRight, Save, Info, Calendar as CalIcon, Clock, List, Wand2, History, LucideIcon } from "lucide-react";
import { getHolidayData } from "../utils";
import { WORK_CODE } from "../hooks/constants";
import { useWorkCodes } from "../hooks/useWorkCodes";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import DatePicker, { registerLocale, CalendarContainer } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { de } from "date-fns/locale";
import TimePickerDrawer from "./TimePickerDrawer";
import SelectionDrawer from "./SelectionDrawer";
import { TimeEntry } from "../types";

// @ts-ignore - date-fns locale type mismatch with react-datepicker
registerLocale("de", de);

interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  icon?: LucideIcon;
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

const CalendarContainerAnimation: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
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

interface EntryFormProps {
  onCancel: () => void;
  onSubmit: (entry: Partial<TimeEntry>) => void;
  initialData?: Partial<TimeEntry>;
  isEditing?: boolean;
  isQuickAdd?: boolean;
  entryType?: string;
  setEntryType?: (type: string) => void;
  code?: number;
  setCode?: (code: number) => void;
  pauseDuration?: number;
  setPauseDuration?: (duration: number) => void;
  formDate?: Date;
  setFormDate?: (date: Date) => void;
  startTime?: string;
  setStartTime?: (time: string) => void;
  endTime?: string;
  setEndTime?: (time: string) => void;
  project?: string;
  setProject?: (project: string) => void;
  lastWorkEntry?: TimeEntry | null;
  existingProjects?: string[];
  allEntries?: TimeEntry[];
  isLiveEntry?: boolean;
  userData?: any;
  specialManualMode?: boolean;
  setSpecialManualMode?: (mode: boolean) => void;
}

const EntryForm: React.FC<EntryFormProps> = ({
  onCancel,
  onSubmit,
  initialData = {},
  isEditing = false,
  isQuickAdd = false,
  // @ts-ignore - Props for external control (not used internally)
  entryType,
  // @ts-ignore
  setEntryType,
  // @ts-ignore
  code,
  // @ts-ignore
  setCode,
  // @ts-ignore
  pauseDuration,
  // @ts-ignore
  setPauseDuration,
  // @ts-ignore
  formDate,
  // @ts-ignore
  setFormDate,
  // @ts-ignore
  startTime: propStartTime,
  // @ts-ignore
  setStartTime: propSetStartTime,
  // @ts-ignore
  endTime: propEndTime,
  // @ts-ignore
  setEndTime: propSetEndTime,
  // @ts-ignore
  project: propProject,
  // @ts-ignore
  setProject: propSetProject,
  // @ts-ignore
  lastWorkEntry,
  // @ts-ignore
  existingProjects,
  // @ts-ignore
  allEntries,
  // @ts-ignore
  isLiveEntry,
  // @ts-ignore
  userData,
  // @ts-ignore
  specialManualMode,
  // @ts-ignore
  setSpecialManualMode,
}) => {
  const { workCodes } = useWorkCodes();
  
  const [date, setDate] = useState<Date>(() => {
    if (initialData.date) {
      return new Date(initialData.date);
    }
    return new Date();
  });
  
  const [startTime, setStartTime] = useState<string>(() => {
    if (initialData.start) {
      // Convert Date to HH:mm string
      const date = new Date(initialData.start);
      return date.toTimeString().slice(0, 5);
    }
    // Default: 09:00
    return "09:00";
  });
  
  const [endTime, setEndTime] = useState<string>(() => {
    if (initialData.end) {
      // Convert Date to HH:mm string
      const date = new Date(initialData.end);
      return date.toTimeString().slice(0, 5);
    }
    // Default: 17:00
    return "17:00";
  });
  
  const [workCode, setWorkCode] = useState<string>(() => {
    if (initialData.workCodeId) {
      return initialData.workCodeId;
    }
    return WORK_CODE.DEFAULT.toString();
  });
  
  const [description, setDescription] = useState<string>(() => {
    if (initialData.description) {
      return initialData.description;
    }
    return "";
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showWorkCodePicker, setShowWorkCodePicker] = useState(false);
  
  const holidayData = useMemo(() => getHolidayData(date.getFullYear()), [date]);
  
  const handleWorkCodeChange = useCallback((value: string | number) => {
    setWorkCode(value.toString());
  }, []);
  
  const workCodeOptions = useMemo(() => {
    const options = workCodes.map(code => ({
      value: code.code,
      label: `${code.code} - ${code.description}`,
      icon: <List size={16} className="text-zinc-500" />,
    }));
    
    // Add default option
    options.unshift({
      value: WORK_CODE.DEFAULT.toString(),
      label: "Keine Tätigkeit",
      icon: <List size={16} className="text-zinc-500" />,
    });
    
    return options;
  }, [workCodes]);
  
  const calculateDuration = useCallback((start: string, end: string): number => {
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    
    // Handle overnight (e.g., 23:00 to 01:00)
    let duration = endTotal - startTotal;
    if (duration < 0) {
      duration += 24 * 60; // Add 24 hours
    }
    
    return duration;
  }, []);
  
  const duration = useMemo(() => {
    return calculateDuration(startTime, endTime);
  }, [startTime, endTime, calculateDuration]);
  
  const formatDuration = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }, []);
  
  const handleSubmit = useCallback(() => {
    if (duration <= 0) {
      toast.error("Endzeit muss nach Startzeit liegen");
      Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }
    
    // Convert time strings to Date objects
    const startDate = new Date(date);
    const [startHour, startMinute] = startTime.split(":").map(Number);
    startDate.setHours(startHour, startMinute, 0, 0);
    
    const endDate = new Date(date);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    endDate.setHours(endHour, endMinute, 0, 0);
    
    const entry: Partial<TimeEntry> = {
      date: date,
      start: startDate,
      end: endDate,
      workCodeId: workCode === WORK_CODE.DEFAULT.toString() ? null : workCode,
      description: description.trim(),
      // Note: pauseMinutes is not set here, would need to be calculated or added as a field
    };
    
    if (initialData.id) {
      entry.id = initialData.id;
    }
    
    onSubmit(entry);
    Haptics.impact({ style: ImpactStyle.Light });
  }, [date, startTime, endTime, workCode, description, duration, holidayData, initialData.id, onSubmit]);
  
  const handleQuickFill = useCallback(() => {
    // Set to standard work day: 09:00 - 17:00 (8 hours)
    setStartTime("09:00");
    setEndTime("17:00");
    toast.success("Standard-Arbeitstag eingefügt");
    Haptics.impact({ style: ImpactStyle.Light });
  }, []);
  
  const handleCopyPrevious = useCallback(() => {
    // In a real app, this would fetch the previous entry
    // For now, we'll just copy the current start time and add 8 hours
    const [hour, minute] = startTime.split(":").map(Number);
    let endHour = hour + 8;
    if (endHour >= 24) endHour -= 24;
    
    setEndTime(`${endHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
    toast.success("Endzeit basierend auf Startzeit gesetzt");
    Haptics.impact({ style: ImpactStyle.Light });
  }, [startTime]);
  
  const handleSwapTimes = useCallback(() => {
    const temp = startTime;
    setStartTime(endTime);
    setEndTime(temp);
    toast.success("Start- und Endzeit getauscht");
    Haptics.impact({ style: ImpactStyle.Light });
  }, [startTime, endTime]);
  
  useEffect(() => {
    if (isQuickAdd) {
      // Auto-fill for quick add
      handleQuickFill();
    }
  }, [isQuickAdd, handleQuickFill]);
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className={`p-4 text-white flex items-center justify-between ${
          holidayData?.isHoliday ? "bg-purple-500" : "bg-emerald-500"
        }`}>
          <div className="flex items-center gap-3">
            <CalIcon size={24} className="text-white" />
            <h3 className="font-bold text-lg">
              {isEditing ? "Eintrag bearbeiten" : "Neuer Eintrag"}
            </h3>
          </div>
          {holidayData?.isHoliday && (
            <div className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
              {holidayData.name}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Datum
              </label>
              <DatePicker
                selected={date}
                onChange={(date: Date | null) => {
                  if (date) {
                    setDate(date);
                    setShowDatePicker(false);
                  }
                }}
                customInput={<CustomInput icon={CalIcon} />}
                locale="de"
                dateFormat="dd.MM.yyyy"
                calendarContainer={CalendarContainerAnimation}
                open={showDatePicker}
                onCalendarOpen={() => setShowDatePicker(true)}
                onCalendarClose={() => setShowDatePicker(false)}
                onClickOutside={() => setShowDatePicker(false)}
              />
            </div>
            
            {/* Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Start
                </label>
                <button
                  onClick={() => setShowStartTimePicker(true)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                >
                  <span className="flex-1 text-center">{startTime}</span>
                  <Clock size={18} className="text-zinc-400 ml-2" />
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Ende
                </label>
                <button
                  onClick={() => setShowEndTimePicker(true)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                >
                  <span className="flex-1 text-center">{endTime}</span>
                  <Clock size={18} className="text-zinc-400 ml-2" />
                </button>
              </div>
            </div>
            
            {/* Duration */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="font-medium">Dauer</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatDuration(duration)}
                </div>
              </div>
              <div className="text-sm text-zinc-500 mt-1">
                {duration} Minuten gesamt
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleQuickFill}
                className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-1 text-sm"
              >
                <Wand2 size={14} />
                Standard
              </button>
              
              <button
                onClick={handleCopyPrevious}
                className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-1 text-sm"
              >
                <History size={14} />
                Kopieren
              </button>
              
              <button
                onClick={handleSwapTimes}
                className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-1 text-sm"
              >
                <ChevronRight size={14} />
                Tauschen
              </button>
            </div>
            
            {/* Work Code */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Tätigkeit
              </label>
              <button
                onClick={() => setShowWorkCodePicker(true)}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              >
                <span className="flex-1 text-left">
                  {workCode === WORK_CODE.DEFAULT.toString() 
                    ? "Keine Tätigkeit" 
                    : workCodeOptions.find(opt => opt.value === workCode)?.label || workCode}
                </span>
                <ChevronRight size={18} className="text-zinc-400" />
              </button>
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Beschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Was hast du gemacht?"
                className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors min-h-[80px] resize-none"
              />
            </div>
            
            {/* Holiday Info */}
            {holidayData?.isHoliday && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-800 dark:text-purple-300">
                      {holidayData.name}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-400">
                      Dieser Tag ist ein Feiertag in {holidayData.state || "Deutschland"}.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isEditing ? "Speichern" : "Hinzufügen"}
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Time Pickers */}
      <TimePickerDrawer
        isOpen={showStartTimePicker}
        onClose={() => setShowStartTimePicker(false)}
        initialTime={startTime}
        onConfirm={setStartTime}
        title="Startzeit wählen"
      />
      
      <TimePickerDrawer
        isOpen={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        initialTime={endTime}
        onConfirm={setEndTime}
        title="Endzeit wählen"
      />
      
      <SelectionDrawer
        isOpen={showWorkCodePicker}
        onClose={() => setShowWorkCodePicker(false)}
        title="Tätigkeit wählen"
        options={workCodeOptions}
        value={workCode}
        onChange={handleWorkCodeChange}
      />
    </div>
  );
};

export default EntryForm;
