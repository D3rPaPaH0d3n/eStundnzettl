import React, { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface DecimalDurationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMinutes?: number;
  onConfirm: (minutes: number) => void;
  title?: string;
  minuteInterval?: number;
}

const DecimalDurationPicker: React.FC<DecimalDurationPickerProps> = ({ 
  isOpen, 
  onClose, 
  initialMinutes, 
  onConfirm, 
  title = "Dauer wählen", 
  minuteInterval = 15 
}) => {
  const hoursRef = useRef<HTMLDivElement>(null);
  const decimalsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  
  const ITEM_HEIGHT = 64; 

  const getInitialValues = (mins: number | undefined | null) => {
    if (mins === undefined || mins === null) return { h: 8, d: 0 };
    
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    
    let d = 0;
    if (minuteInterval === 1) {
      // 1-Minuten-Schritte: Minuten als Dezimalbruch (z.B. 30 Minuten = 0.5)
      d = m / 60;
      // Auf nächsten Schritt runden
      const step = 1 / 60; // 1 Minute = 0.016666...
      d = Math.round(d / step) * step;
    } else {
      // 15-Minuten-Schritte (default)
      if (m >= 45) d = 0.75;
      else if (m >= 30) d = 0.5;
      else if (m >= 15) d = 0.25;
      else d = 0;
    }
    
    return { h, d };
  };

  const [selected, setSelected] = useState(() => getInitialValues(initialMinutes));
  const [hours, setHours] = useState<number[]>([]);
  const [decimals, setDecimals] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelected(getInitialValues(initialMinutes));
      
      // Stunden (0–24)
      const hArr = Array.from({ length: 25 }, (_, i) => i);
      setHours(hArr);
      
      // Dezimalbrüche
      let dArr: number[] = [];
      if (minuteInterval === 1) {
        // 1-Minuten-Schritte: 0.00 bis 0.98 (59 Minuten)
        dArr = Array.from({ length: 60 }, (_, i) => i / 60);
      } else {
        // 15-Minuten-Schritte
        dArr = [0, 0.25, 0.5, 0.75];
      }
      setDecimals(dArr);
      
      // Scroll zu initialen Werten
      setTimeout(() => {
        if (hoursRef.current) {
          const hIndex = hArr.indexOf(selected.h);
          if (hIndex !== -1) {
            hoursRef.current.scrollTop = hIndex * ITEM_HEIGHT;
          }
        }
        if (decimalsRef.current) {
          const dIndex = dArr.indexOf(selected.d);
          if (dIndex !== -1) {
            decimalsRef.current.scrollTop = dIndex * ITEM_HEIGHT;
          }
        }
      }, 100);
    }
  }, [isOpen, initialMinutes, minuteInterval]);

  const handleHourSelect = (h: number) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setSelected(prev => ({ ...prev, h }));
  };

  const handleDecimalSelect = (d: number) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setSelected(prev => ({ ...prev, d }));
  };

  const handleConfirm = () => {
    const totalMinutes = selected.h * 60 + selected.d * 60;
    onConfirm(Math.round(totalMinutes));
    onClose();
  };

  const formatDecimal = (d: number) => {
    if (minuteInterval === 1) {
      // 1-Minuten-Schritte: Minuten anzeigen
      const minutes = Math.round(d * 60);
      return `${minutes} min`;
    } else {
      // 15-Minuten-Schritte
      if (d === 0) return "00";
      if (d === 0.25) return "15";
      if (d === 0.5) return "30";
      if (d === 0.75) return "45";
      return "00";
    }
  };

  const getDisplayText = () => {
    const totalMinutes = selected.h * 60 + selected.d * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (minutes === 0) return `${hours} Stunden`;
    return `${hours} Stunden ${minutes} Minuten`;
  };

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
            onDragEnd={(_, info) => {
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

            {/* Content */}
            <div className="h-[calc(80vh-140px)] flex">
              {/* Stunden */}
              <div className="flex-1 border-r border-zinc-100 dark:border-zinc-700">
                <div className="h-full flex flex-col">
                  <div className="p-4 text-center border-b border-zinc-100 dark:border-zinc-700">
                    <div className="text-sm font-medium">Stunden</div>
                  </div>
                  <div 
                    ref={hoursRef}
                    className="flex-1 overflow-y-auto"
                  >
                    <div className="py-32">
                      {hours.map((h) => (
                        <button
                          key={h}
                          onClick={() => handleHourSelect(h)}
                          className={`w-full py-4 text-center text-lg transition-colors ${
                            selected.h === h
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Minuten/Dezimal */}
              <div className="flex-1">
                <div className="h-full flex flex-col">
                  <div className="p-4 text-center border-b border-zinc-100 dark:border-zinc-700">
                    <div className="text-sm font-medium">
                      {minuteInterval === 1 ? "Minuten" : "Minuten"}
                    </div>
                  </div>
                  <div 
                    ref={decimalsRef}
                    className="flex-1 overflow-y-auto"
                  >
                    <div className="py-32">
                      {decimals.map((d) => (
                        <button
                          key={d}
                          onClick={() => handleDecimalSelect(d)}
                          className={`w-full py-4 text-center text-lg transition-colors ${
                            selected.d === d
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {formatDecimal(d)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <div className="mb-4">
                <div className="text-center text-2xl font-bold">
                  {getDisplayText()}
                </div>
                <div className="text-center text-sm text-zinc-500">
                  {Math.round(selected.h * 60 + selected.d * 60)} Minuten gesamt
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Bestätigen
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DecimalDurationPicker;