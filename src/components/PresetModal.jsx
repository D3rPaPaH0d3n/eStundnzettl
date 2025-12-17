import React, { useState, useEffect } from "react";
import { X, Check, Calendar, Save, AlertTriangle } from "lucide-react";
import { WORK_MODELS } from "../hooks/constants";

const PresetModal = ({ isOpen, onClose, onSelect, currentModelId }) => {
  const [selectedId, setSelectedId] = useState(currentModelId || 'custom');

  // Scroll-Lock und modal-open Klasse für den Hintergrund
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

  // Sync state beim Öffnen
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

  // WICHTIG: z-[10000] damit die Bottom-Navbar verdeckt wird
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800 rounded-t-2xl">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-slate-600 dark:text-slate-400" />
                Vorlage wählen
            </h3>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
            >
                <X size={20} />
            </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto p-4 space-y-2">
            {/* Alle Modelle anzeigen, auch Custom */}
            {WORK_MODELS.map((model) => {
                const isSelected = selectedId === model.id;
                return (
                    <div 
                        key={model.id}
                        onClick={() => setSelectedId(model.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group
                            ${isSelected 
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" 
                                : "border-slate-100 dark:border-slate-700 hover:border-orange-300 dark:hover:border-slate-600 bg-white dark:bg-slate-700/50"
                            }
                        `}
                    >
                        <div>
                            <div className={`font-bold ${isSelected ? "text-orange-700 dark:text-orange-400" : "text-slate-700 dark:text-slate-200"}`}>
                                {model.label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                {model.description}
                            </div>
                        </div>
                        
                        {/* Einfacher Checkmark ohne Kreis */}
                        {isSelected && (
                            <Check size={22} strokeWidth={3} className="text-orange-500" />
                        )}
                    </div>
                );
            })}
        </div>

        {/* Warnhinweis */}
        <div className="px-4 pb-2">
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 dark:bg-orange-900/30 rounded-xl">
                <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Achtung: Das Ändern der Vorlage berechnet die Überstunden aller vergangenen Einträge neu!
                </p>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                Abbrechen
            </button>
            <button 
                onClick={handleSave}
                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
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