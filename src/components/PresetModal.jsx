import React, { useState, useEffect } from "react";
import { X, Check, Calendar, Save, AlertTriangle } from "lucide-react";
import { WORK_MODELS } from "../hooks/constants";

const PresetModal = ({ isOpen, onClose, onSelect, currentModelId }) => {
  const [selectedId, setSelectedId] = useState(currentModelId || 'custom');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* CHANGE: bg-white dark:bg-slate-800 -> bg-white dark:bg-zinc-800 */}
      <div className="bg-white dark:bg-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header - CHANGE: border-slate -> border-zinc, bg-slate -> bg-zinc */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800 rounded-t-2xl">
            {/* CHANGE: text-slate -> text-zinc */}
            <h3 className="font-bold text-lg text-zinc-800 dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-zinc-600 dark:text-zinc-400" />
                Vorlage wählen
            </h3>
            <button 
                onClick={onClose}
                // CHANGE: hover:bg-slate -> hover:bg-zinc, text-slate -> text-zinc
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"
            >
                <X size={20} />
            </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto p-4 space-y-2">
            {WORK_MODELS.map((model) => {
                const isSelected = selectedId === model.id;
                return (
                    <div 
                        key={model.id}
                        onClick={() => setSelectedId(model.id)}
                        // CHANGE: border-orange -> border-emerald, bg-orange -> bg-emerald
                        // CHANGE: border-slate -> border-zinc, hover:border-orange -> hover:border-emerald
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group
                            ${isSelected 
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                                : "border-zinc-100 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-700/50"
                            }
                        `}
                    >
                        <div>
                            {/* CHANGE: text-orange -> text-emerald */}
                            <div className={`font-bold ${isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-200"}`}>
                                {model.label}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                                {model.description}
                            </div>
                        </div>
                        
                        {isSelected && (
                            // CHANGE: text-orange -> text-emerald
                            <Check size={22} strokeWidth={3} className="text-emerald-500" />
                        )}
                    </div>
                );
            })}
        </div>

        {/* Warnhinweis - HIER BLEIBT ORANGE/RED ALS WARNFARBE, ABER MIT ZINC BASIS */}
        <div className="px-4 pb-2">
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Achtung: Das Ändern der Vorlage berechnet die Überstunden aller vergangenen Einträge neu!
                </p>
            </div>
        </div>

        {/* Footer */}
        {/* CHANGE: border-slate -> border-zinc, bg-slate -> bg-zinc */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-b-2xl flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-3 rounded-xl text-zinc-500 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
                Abbrechen
            </button>
            <button 
                onClick={handleSave}
                // CHANGE: bg-slate-900 -> bg-emerald-600 (Primary Action)
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
            >
                <Save size={18} />
                Übernehmen
            </button>
        </div>
      </div>
    </div>
  );
};

export default PresetModal;