import React, { useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

interface Option {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface SelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
}

const SelectionDrawer: React.FC<SelectionDrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  options, 
  value, 
  onChange 
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls(); 

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
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 bottom-0 w-screen h-[80vh] bg-white dark:bg-zinc-800 rounded-t-3xl shadow-2xl z-[101] overflow-hidden"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            {/* Drag Handle */}
            <div 
              className="w-full py-3 flex justify-center cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-2 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                  aria-label="Schließen"
                >
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Options List */}
            <div 
              ref={listRef}
              className="h-[calc(80vh-80px)] overflow-y-auto px-5 py-4"
            >
              <div className="space-y-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      onClose();
                    }}
                    data-selected={value === option.value}
                    className={`w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between ${
                      value === option.value
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {option.icon && (
                        <div className="text-zinc-500">{option.icon}</div>
                      )}
                      <div className="font-medium">{option.label}</div>
                    </div>
                    {value === option.value && (
                      <Check size={20} className="text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SelectionDrawer;