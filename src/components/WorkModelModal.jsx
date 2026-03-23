import React, { useState, useEffect } from "react";
import { X, Check, RotateCcw, Calendar, Clock } from "lucide-react";
import { WORK_MODELS } from "../hooks/constants";
import DecimalDurationPicker from "./DecimalDurationPicker";
import { useSettings } from "../hooks/useSettings";

const WorkModelModal = ({ isOpen, onClose, currentWorkDays, onSave }) => {
  const [days, setDays] = useState(currentWorkDays || [0, 0, 0, 0, 0, 0, 0]);
  const { userData } = useSettings();
  
  const [showPicker, setShowPicker] = useState(false);
  const [activeDayIdx, setActiveDayIdx] = useState(null);
  const [useMinutePrecision, setUseMinutePrecision] = useState(false);

  const FULL_DAY_NAMES = [
    "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"
  ];

  useEffect(() => {
    if (isOpen && currentWorkDays) {
      setDays([...currentWorkDays]);
    }
    // Set minute precision based on user setting
    if (isOpen && userData?.minuteInput !== undefined) {
      setUseMinutePrecision(userData.minuteInput);
    }
  }, [isOpen, currentWorkDays, userData]);

  if (!isOpen) return null;

  const minToHours = (m) => {
    if (m === 0) return "";
    if (useMinutePrecision) {
      // Bei 1-Minuten-Präzision: Stunden mit 2 Dezimalstellen
      return (m / 60).toFixed(2).replace('.', ',');
    } else {
      // Bei 15-Minuten-Schritten: Stunden mit 2 Dezimalstellen (immer .00, .25, .50, .75)
      return (m / 60).toFixed(2).replace('.', ',');
    }
  }; 
  
  const handleDayClick = (index) => {
    setActiveDayIdx(index); 
    setShowPicker(true);
  };

  const handlePickerConfirm = (minutes) => {
    if (activeDayIdx !== null) {
      const newDays = [...days];
      newDays[activeDayIdx] = minutes;
      setDays(newDays);
    }
    setShowPicker(false);
  };

  const applyPreset = (presetDays) => {
    setDays([...presetDays]);
  };

  const weeklySum = days.reduce((a, b) => a + b, 0) / 60;

  const getPickerTitle = () => {
    if (activeDayIdx === null || activeDayIdx === undefined) return "Stunden";
    const dayName = FULL_DAY_NAMES[activeDayIdx];
    return dayName ? `${dayName} SOLL h` : "Stunden";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* CHANGE: bg-white dark:bg-slate-800 -> bg-white dark:bg-zinc-800 */}
      <div className="bg-white dark:bg-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header - CHANGE: border-slate -> border-zinc */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 rounded-t-2xl">
          {/* CHANGE: text-slate -> text-zinc */}
          <h3 className="font-bold text-lg text-zinc-800 dark:text-white flex items-center gap-2">
            {/* CHANGE: text-orange -> text-emerald */}
            <Calendar className="text-emerald-500" size={20} />
            Arbeitszeit Modell
          </h3>
          <div className="flex items-center gap-2">
            {/* Minute Precision Toggle */}
            <button 
              onClick={() => setUseMinutePrecision(!useMinutePrecision)}
              className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
                useMinutePrecision 
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                  : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600"
              }`}
              title={useMinutePrecision ? "1-Minuten-Schritte" : "15-Minuten-Schritte"}
            >
              <Clock size={16} />
              <span className="text-xs font-bold">{useMinutePrecision ? "1'" : "15'"}</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors">
              <X size={20} className="text-zinc-500" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-6">
          
          {/* Vorlagen */}
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Vorlagen</span>
            <div className="grid grid-cols-1 gap-2">
              {WORK_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => applyPreset(model.days)}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-left group"
                >
                  <div>
                    <div className="font-bold text-zinc-700 dark:text-zinc-200">{model.label}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{model.description}</div>
                  </div>
                  {JSON.stringify(days) === JSON.stringify(model.days) && (
                    <Check size={18} className="text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Benutzerdefiniert */}
          <div>
             <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Benutzerdefiniert (Stunden)</span>
                {/* CHANGE: text-orange -> text-emerald, bg-orange -> bg-emerald */}
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">
                    Woche: {weeklySum.toLocaleString('de-DE', { maximumFractionDigits: 2 })} h
                </span>
             </div>
             
             {/* Grid */}
             <div className="grid grid-cols-7 gap-2">
                {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((dayName, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                        <label className={`text-[10px] font-bold text-center uppercase ${idx === 0 || idx === 6 ? 'text-red-400' : 'text-zinc-500'}`}>
                            {dayName}
                        </label>
                        <div 
                            onClick={() => handleDayClick(idx)}
                            className={`w-full h-10 flex items-center justify-center rounded-lg text-sm font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                                days[idx] > 0 
                                ? "bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-white hover:border-emerald-500" 
                                : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent text-zinc-400 hover:border-zinc-300"
                            }`}
                        >
                            {minToHours(days[idx]) || "-"}
                        </div>
                    </div>
                ))}
             </div>
             <p className="text-[10px] text-zinc-400 mt-2 text-center">
                Tippe auf einen Tag, um die Stunden zu ändern.
             </p>
          </div>
        </div>

        {/* Footer - CHANGE: border-slate -> border-zinc, bg-slate -> bg-zinc */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-b-2xl flex gap-3">
          <button 
            onClick={() => setDays(currentWorkDays)} 
            className="px-4 py-3 rounded-xl text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={() => onSave(days)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex justify-center items-center gap-2"
          >
            <Check size={18} />
            Speichern
          </button>
        </div>
      </div>

      <DecimalDurationPicker 
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        initialMinutes={activeDayIdx !== null ? days[activeDayIdx] : 0}
        onConfirm={handlePickerConfirm}
        title={getPickerTitle()}
        minuteInterval={useMinutePrecision ? 1 : 15}
      />
    </div>
  );
};

export default WorkModelModal;
