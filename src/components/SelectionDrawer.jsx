import React, { useEffect, useRef } from "react";
import { X, Check } from "lucide-react";

const SelectionDrawer = ({ isOpen, onClose, title, options, value, onChange }) => {
  const listRef = useRef(null);

  // Scrollt automatisch zum ausgewählten Eintrag beim Öffnen
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (listRef.current) {
          const selectedEl = listRef.current.querySelector('[data-selected="true"]');
          if (selectedEl) {
            selectedEl.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative bg-white dark:bg-slate-900 w-full rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
          <button onClick={onClose} className="p-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
          <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-base">
            {title || "Auswählen"}
          </span>
          <div className="w-12" /> {/* Platzhalter für Symmetrie */}
        </div>

        {/* List Content */}
        <div 
          ref={listRef}
          className="overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950"
        >
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <div
                key={option.id}
                data-selected={isSelected}
                onClick={() => {
                  onChange(option.id);
                  onClose();
                }}
                className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-white dark:bg-slate-800 border-orange-500 shadow-md transform scale-[1.01]"
                    : "bg-white dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <span className={`text-base font-bold ${isSelected ? "text-orange-600 dark:text-orange-500" : "text-slate-700 dark:text-slate-300"}`}>
                  {option.label}
                </span>
                
                {/* Custom Radio Button Look */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected 
                    ? "border-orange-500 bg-orange-500" 
                    : "border-slate-300 dark:border-slate-600"
                }`}>
                  {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SelectionDrawer;