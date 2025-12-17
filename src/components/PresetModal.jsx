import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { WORK_MODELS } from "../hooks/constants";

const PresetModal = ({ isOpen, onClose, onSelect, currentModelId }) => {
  const [selectedId, setSelectedId] = useState(currentModelId || 'custom');

  // Scroll-Lock für den Hintergrund
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Vorlage wählen</h3>
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
                        
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                            ${isSelected 
                                ? "border-orange-500 bg-orange-500 text-white" 
                                : "border-slate-300 dark:border-slate-600 text-transparent"
                            }
                        `}>
                            <Check size={14} strokeWidth={3} />
                        </div>
                    </div>
                );
            })}
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
                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
            >
                Übernehmen
            </button>
        </div>
      </div>
    </div>
  );
};

export default PresetModal;