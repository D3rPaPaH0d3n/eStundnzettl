import React, { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

const TimePickerDrawer = ({ isOpen, onClose, value, onChange, title }) => {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);

  // Scrollt zur ausgewählten Zeit, wenn der Drawer öffnet
  useEffect(() => {
    if (isOpen) {
      // Kleiner Timeout, damit das DOM fertig gerendert ist (wegen Animation)
      setTimeout(() => {
        // Stunden scrollen
        if (hoursRef.current) {
          const selectedHourEl = hoursRef.current.querySelector('[data-selected="true"]');
          if (selectedHourEl) {
            selectedHourEl.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
        // Minuten scrollen (WICHTIG für 16:30)
        if (minutesRef.current) {
          const selectedMinEl = minutesRef.current.querySelector('[data-selected="true"]');
          if (selectedMinEl) {
            selectedMinEl.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      }, 100);
    }
  }, [isOpen, value]); // Re-run wenn er öffnet

  if (!isOpen) return null;

  const [selectedHour, selectedMinute] = value ? value.split(":").map(Number) : [6, 0];

  // Arrays generieren
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const updateTime = (h, m) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop (Klick schließt) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative bg-white dark:bg-slate-900 w-full rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button onClick={onClose} className="p-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
          <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-base">
            {title || "Zeit wählen"}
          </span>
          <button onClick={onClose} className="p-3 text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-full font-bold transition-transform active:scale-95">
            <Check size={24} />
          </button>
        </div>

        {/* Picker Columns */}
        {/* HÖHE ANGEPASST: h-[320px] für mehr Platz */}
        <div className="flex h-[320px] relative bg-white dark:bg-slate-900">
          
          {/* Auswahl-Indikator (der graue Balken in der Mitte) */}
          {/* HÖHE ANGEPASST: h-[64px] passend zu den Items */}
          <div className="absolute top-1/2 left-4 right-4 h-[64px] -mt-[32px] bg-slate-100 dark:bg-slate-800 pointer-events-none z-0 border border-slate-200 dark:border-slate-700 rounded-xl" />

          {/* STUNDEN */}
          <div 
            ref={hoursRef}
            className="flex-1 overflow-y-auto snap-y snap-mandatory py-[128px] text-center z-10 scrollbar-hide"
          >
            {hours.map((h) => (
              <div
                key={h}
                data-selected={h === selectedHour}
                onClick={() => updateTime(h, selectedMinute)}
                className={`h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all ${
                  h === selectedHour 
                    ? "font-bold text-4xl text-orange-600 dark:text-orange-500 scale-110" 
                    : "text-slate-400 dark:text-slate-600 text-2xl"
                }`}
              >
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* TRENNER */}
          <div className="flex items-center justify-center z-10 text-slate-300 dark:text-slate-600 font-bold text-2xl pb-2">:</div>

          {/* MINUTEN */}
          <div 
            ref={minutesRef}
            className="flex-1 overflow-y-auto snap-y snap-mandatory py-[128px] text-center z-10 scrollbar-hide"
          >
            {minutes.map((m) => (
              <div
                key={m}
                data-selected={m === selectedMinute}
                onClick={() => updateTime(selectedHour, m)}
                className={`h-[64px] flex items-center justify-center snap-center cursor-pointer transition-all ${
                  m === selectedMinute 
                    ? "font-bold text-4xl text-orange-600 dark:text-orange-500 scale-110" 
                    : "text-slate-400 dark:text-slate-600 text-2xl"
                }`}
              >
                {String(m).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimePickerDrawer;