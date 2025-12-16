import React, { useState, useEffect } from "react";
import { X, Check, RotateCcw, Calendar } from "lucide-react";
import { WORK_MODELS } from "../hooks/constants";

const WorkModelModal = ({ isOpen, onClose, currentWorkDays, onSave }) => {
  // Lokaler State für die 7 Tage (in Minuten)
  const [days, setDays] = useState(currentWorkDays || [0, 0, 0, 0, 0, 0, 0]);
  
  // Wenn Modal öffnet, aktuelle Werte laden
  useEffect(() => {
    if (isOpen && currentWorkDays) {
      setDays([...currentWorkDays]);
    }
  }, [isOpen, currentWorkDays]);

  if (!isOpen) return null;

  // Hilfsfunktion: Minuten in Stunden (Komma) für Anzeige input
  const minToHours = (m) => (m === 0 ? "" : Number(m / 60).toFixed(2)); 
  
  // Input Änderung: Stunden -> Minuten
  const handleInputChange = (index, val) => {
    const newDays = [...days];
    // Komma zu Punkt, parse, runden
    const floatVal = parseFloat(val.replace(",", "."));
    newDays[index] = isNaN(floatVal) ? 0 : Math.round(floatVal * 60);
    setDays(newDays);
  };

  // Preset anwenden
  const applyPreset = (presetDays) => {
    setDays([...presetDays]);
  };

  // Summe berechnen für Anzeige
  const weeklySum = days.reduce((a, b) => a + b, 0) / 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="text-orange-500" size={20} />
            Arbeitszeit Modell
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-6">
          
          {/* 1. PRESETS */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Vorlagen</span>
            <div className="grid grid-cols-1 gap-2">
              {WORK_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => applyPreset(model.days)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all text-left group"
                >
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">{model.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{model.description}</div>
                  </div>
                  {/* Einfacher Check, ob dieses Modell gerade aktiv ist */}
                  {JSON.stringify(days) === JSON.stringify(model.days) && (
                    <Check size={18} className="text-orange-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2. CUSTOM EDITOR */}
          <div>
             <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Benutzerdefiniert (Stunden)</span>
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                    Woche: {weeklySum.toLocaleString('de-DE', { maximumFractionDigits: 1 })} h
                </span>
             </div>
             
             <div className="grid grid-cols-7 gap-2">
                {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((dayName, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                        <label className={`text-[10px] font-bold text-center uppercase ${idx === 0 || idx === 6 ? 'text-red-400' : 'text-slate-500'}`}>
                            {dayName}
                        </label>
                        <input 
                            type="number" 
                            inputMode="decimal"
                            step="0.5"
                            value={minToHours(days[idx])}
                            onChange={(e) => handleInputChange(idx, e.target.value)}
                            placeholder="-"
                            className={`w-full text-center p-2 rounded-lg text-sm font-bold outline-none border focus:border-orange-500 transition-colors ${
                                days[idx] > 0 
                                ? "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white" 
                                : "bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-400"
                            }`}
                        />
                    </div>
                ))}
             </div>
             <p className="text-[10px] text-slate-400 mt-2 text-center">
                Tippe Stunden ein (z.B. 8,5). Leere Felder gelten als "Frei".
             </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl flex gap-3">
          <button 
            onClick={() => setDays(currentWorkDays)} // Reset auf Startwert
            className="px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={() => onSave(days)}
            className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex justify-center items-center gap-2"
          >
            <Check size={18} />
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkModelModal;