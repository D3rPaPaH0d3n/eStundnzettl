import React, { useState, useEffect } from "react";
import { X, Check, Calendar, Save, AlertTriangle } from "lucide-react";
import { WORK_MODELS } from "../hooks/constants";

const PresetModal = ({ isOpen, onClose, onSelect, currentModelId }) => {
  const [selectedId, setSelectedId] = useState(currentModelId || 'custom');

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentModelId || 'custom');
    }
  }, [isOpen, currentModelId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const model = WORK_MODELS.find(m => m.id === selectedId);
    if (model) {
      onSelect(model);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="text-orange-500" size={20} />
            Vorlage wählen
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Liste der Presets */}
        <div className="overflow-y-auto p-4 space-y-2">
            {WORK_MODELS.map((model) => {
              const isActive = selectedId === model.id;
              return (
                <button
                    key={model.id}
                    onClick={() => setSelectedId(model.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group
                      ${isActive 
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-500" 
                        : "border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-slate-500"
                      }`}
                >
                    <div>
                        <div className={`font-bold ${isActive ? "text-orange-700 dark:text-orange-400" : "text-slate-700 dark:text-slate-200"}`}>
                          {model.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{model.description}</div>
                    </div>
                    {isActive && (
                        <Check size={18} className="text-orange-500" />
                    )}
                </button>
              );
            })}
        </div>
        
        {/* Warnung & Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl space-y-3">
            
            {/* Warnhinweis */}
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                <AlertTriangle className="text-red-600 dark:text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-red-800 dark:text-red-200 leading-tight font-medium">
                    Achtung: Das Ändern der Vorlage berechnet die Überstunden aller vergangenen Einträge neu!
                </p>
            </div>

            <div className="flex gap-3 pt-1">
                <button 
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex justify-center items-center gap-2"
                >
                  <Save size={18} />
                  Übernehmen
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PresetModal;