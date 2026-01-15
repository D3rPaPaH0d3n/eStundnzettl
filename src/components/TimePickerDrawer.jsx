import React, { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const TimePickerDrawer = ({ isOpen, onClose, value, onChange, title }) => {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const dragControls = useDragControls();
  
  const ITEM_HEIGHT = 64; 

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hoursRef.current) {
          const selectedHourEl = hoursRef.current.querySelector('[data-selected="true"]');
          if (selectedHourEl) selectedHourEl.scrollIntoView({ block: "center" });
        }
        if (minutesRef.current) {
          const selectedMinEl = minutesRef.current.querySelector('[data-selected="true"]');
          if (selectedMinEl) selectedMinEl.scrollIntoView({ block: "center" });
        }
      }, 100);
    }
  }, [isOpen]);

  const [selectedHour, selectedMinute] = value ? value.split(":").map(Number) : [6, 0];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const updateTime = (h, m) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const handleScroll = (e, type) => {
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    if (type === 'hour') {
      const newHour = hours[index];
      if (newHour !== undefined && newHour !== selectedHour) {
        Haptics.impact({ style: ImpactStyle.Light });
        updateTime(newHour, selectedMinute);
      }
    } else {
      const newMinute = minutes[index];
      if (newMinute !== undefined && newMinute !== selectedMinute) {
        Haptics.impact({ style: ImpactStyle.Light });
        updateTime(selectedHour, newMinute);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            dragListener={false} 
            dragControls={dragControls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col pb-safe md:max-w-md md:mx-auto md:rounded-3xl md:bottom-4 md:border md:border-zinc-200 dark:md:border-zinc-700"
          >
            <div 
              className="w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            <div className="flex justify-between items-center px-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <button onClick={onClose} className="p-3 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={24} />
              </button>
              <span className="font-bold text-zinc-800 dark:text-white uppercase tracking-wide text-base">
                {title || "Zeit wählen"}
              </span>
              {/* CHANGE: text-green -> text-emerald */}
              <button 
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Medium });
                  onClose();
                }} 
                className="p-3 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold transition-transform active:scale-95"
              >
                <Check size={24} />
              </button>
            </div>

            <div className="flex h-[320px] relative bg-white dark:bg-zinc-900 select-none">
              
              <div className="absolute top-1/2 left-4 right-4 h-[64px] -mt-[32px] bg-zinc-100 dark:bg-zinc-800 pointer-events-none z-0 border border-zinc-200 dark:border-zinc-700 rounded-xl" />

              <div 
                ref={hoursRef}
                onScroll={(e) => handleScroll(e, 'hour')}
                className="flex-1 overflow-y-auto snap-y snap-mandatory py-[128px] text-center z-10 scrollbar-hide"
              >
                {hours.map((h) => (
                  <div 
                    key={h}
                    data-selected={h === selectedHour}
                    onClick={() => updateTime(h, selectedMinute)}
                    /* CHANGE: text-orange -> text-emerald */
                    className={`h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all duration-100 ${
                      h === selectedHour 
                        ? "font-bold text-4xl text-emerald-600 dark:text-emerald-500 scale-110" 
                        : "text-zinc-400 dark:text-zinc-600 text-2xl opacity-60"
                    }`}
                  >
                    {String(h).padStart(2, "0")}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center z-10 text-zinc-300 dark:text-zinc-600 font-bold text-2xl pb-2">:</div>

              <div 
                ref={minutesRef}
                onScroll={(e) => handleScroll(e, 'minute')}
                className="flex-1 overflow-y-auto snap-y snap-mandatory py-[128px] text-center z-10 scrollbar-hide"
              >
                {minutes.map((m) => (
                  <div 
                    key={m}
                    data-selected={m === selectedMinute}
                    onClick={() => updateTime(selectedHour, m)}
                    /* CHANGE: text-orange -> text-emerald */
                    className={`h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all duration-100 ${
                      m === selectedMinute 
                        ? "font-bold text-4xl text-emerald-600 dark:text-emerald-500 scale-110" 
                        : "text-zinc-400 dark:text-zinc-600 text-2xl opacity-60"
                    }`}
                  >
                    {String(m).padStart(2, "0")}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TimePickerDrawer;