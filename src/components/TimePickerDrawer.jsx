import React, { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const TimePickerDrawer = ({ isOpen, onClose, value, onChange, title }) => {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  
  // Die Höhe eines einzelnen Items in Pixeln (wichtig für die Berechnung)
  // Entspricht der h-[64px] Klasse im CSS unten
  const ITEM_HEIGHT = 64; 

  // Initiales Scrollen zur richtigen Zeit beim Öffnen
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
  }, [isOpen]); // Feuert nur beim Öffnen des Drawers

  // Aktuelle Werte parsen (Fallback auf 06:00)
  const [selectedHour, selectedMinute] = value ? value.split(":").map(Number) : [6, 0];

  // Daten-Arrays
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  // Helper zum Senden der Zeit nach oben
  const updateTime = (h, m) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  // --- DIE NEUE SMARTE SCROLL LOGIK ---
  const handleScroll = (e, type) => {
    const scrollTop = e.target.scrollTop;
    // Berechnet welcher Index gerade in der Mitte ist
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    if (type === 'hour') {
      const newHour = hours[index];
      // Nur aktualisieren und vibrieren, wenn sich die Stunde wirklich geändert hat
      if (newHour !== undefined && newHour !== selectedHour) {
        Haptics.impact({ style: ImpactStyle.Light }); // VIBRATION
        updateTime(newHour, selectedMinute);
      }
    } else {
      const newMinute = minutes[index];
      // Nur aktualisieren und vibrieren, wenn sich die Minute wirklich geändert hat
      if (newMinute !== undefined && newMinute !== selectedMinute) {
        Haptics.impact({ style: ImpactStyle.Light }); // VIBRATION
        updateTime(selectedHour, newMinute);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BACKDROP */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
            onClick={onClose}
          />

          {/* DRAWER CONTAINER */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* DRAG HANDLE (Grauer Strich oben) */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-center px-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <button onClick={onClose} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
              <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-base">
                {title || "Zeit wählen"}
              </span>
              <button 
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Medium }); // Feedback beim Bestätigen
                  onClose();
                }} 
                className="p-3 text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-full font-bold transition-transform active:scale-95"
              >
                <Check size={24} />
              </button>
            </div>

            {/* PICKER AREA */}
            <div className="flex h-[320px] relative bg-white dark:bg-slate-900 select-none">
              
              {/* Highlight Balken (Mitte) */}
              <div className="absolute top-1/2 left-4 right-4 h-[64px] -mt-[32px] bg-slate-100 dark:bg-slate-800 pointer-events-none z-0 border border-slate-200 dark:border-slate-700 rounded-xl" />

              {/* STUNDEN SPALTE */}
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
                    className={`h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all duration-100 ${
                      h === selectedHour 
                        ? "font-bold text-4xl text-orange-600 dark:text-orange-500 scale-110" 
                        : "text-slate-400 dark:text-slate-600 text-2xl opacity-60"
                    }`}
                  >
                    {String(h).padStart(2, "0")}
                  </div>
                ))}
              </div>

              {/* TRENNZEICHEN */}
              <div className="flex items-center justify-center z-10 text-slate-300 dark:text-slate-600 font-bold text-2xl pb-2">:</div>

              {/* MINUTEN SPALTE */}
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
                    className={`h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all duration-100 ${
                      m === selectedMinute 
                        ? "font-bold text-4xl text-orange-600 dark:text-orange-500 scale-110" 
                        : "text-slate-400 dark:text-slate-600 text-2xl opacity-60"
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