import React, { useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SelectionDrawer = ({ isOpen, onClose, title, options, value, onChange }) => {
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (listRef.current) {
          const selectedEl = listRef.current.querySelector('[data-selected="true"]');
          if (selectedEl) selectedEl.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 300);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            <div className="flex justify-between items-center px-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <button onClick={onClose} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
              <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-base">{title || "Auswählen"}</span>
              <div className="w-12" />
            </div>

            <div ref={listRef} className="overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
              {options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <div
                    key={option.id}
                    data-selected={isSelected}
                    onClick={() => { onChange(option.id); onClose(); }}
                    className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${isSelected ? "bg-white dark:bg-slate-800 border-orange-500 shadow-md transform scale-[1.01]" : "bg-white dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                  >
                    <span className={`text-base font-bold ${isSelected ? "text-orange-600 dark:text-orange-500" : "text-slate-700 dark:text-slate-300"}`}>{option.label}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300 dark:border-slate-600"}`}>
                      {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SelectionDrawer;