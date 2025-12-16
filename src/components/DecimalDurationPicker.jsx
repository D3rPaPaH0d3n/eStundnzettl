import React, { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const DecimalDurationPicker = ({ isOpen, onClose, initialMinutes, onConfirm, title }) => {
  const hoursRef = useRef(null);
  const decimalsRef = useRef(null);
  const dragControls = useDragControls();
  
  const ITEM_HEIGHT = 64; 

  const getInitialValues = (mins) => {
    if (!mins) return { h: 8, d: 0.5 };
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    
    // Runden auf die nächsten 15min
    let d = 0;
    if (m >= 45) d = 0.75;
    else if (m >= 30) d = 0.5;
    else if (m >= 15) d = 0.25;
    
    return { h, d };
  };

  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedDecimal, setSelectedDecimal] = useState(0);

  // Sync beim Öffnen
  useEffect(() => {
    if (isOpen) {
      const { h, d } = getInitialValues(initialMinutes);
      setSelectedHour(h);
      setSelectedDecimal(d);

      // Timeout für DOM-Mounting
      setTimeout(() => {
        scrollToValue(hoursRef, h);
        scrollToValue(decimalsRef, d);
      }, 100);
    }
  }, [isOpen, initialMinutes]);

  const scrollToValue = (ref, val) => {
    if (ref.current) {
      const el = ref.current.querySelector(`[data-value="${val}"]`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  const hours = Array.from({ length: 25 }, (_, i) => i); 
  const decimals = [0, 0.25, 0.5, 0.75]; 

  const handleScroll = (e, type) => {
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    // Einfache Haptik beim Scrollen
    if (type === 'hour') {
      const val = hours[index];
      if (val !== undefined && val !== selectedHour) {
         setSelectedHour(val);
         Haptics.impact({ style: ImpactStyle.Light });
      }
    } else {
      const val = decimals[index];
      if (val !== undefined && val !== selectedDecimal) {
         setSelectedDecimal(val);
         Haptics.impact({ style: ImpactStyle.Light });
      }
    }
  };

  const handleConfirm = () => {
    const minutesFromDecimal = selectedDecimal * 60;
    const totalMinutes = (selectedHour * 60) + minutesFromDecimal;
    onConfirm(totalMinutes);
    onClose();
  };

  const formatDecimal = (d) => {
    if (d === 0) return ",00";
    if (d === 0.5) return ",50";
    return String(d).replace("0.", ","); 
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" 
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
            className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-3xl overflow-visible flex flex-col md:max-w-md md:mx-auto"
          >
            {/* HINTERGRUND-LAYER (Extra Div gegen Durchscheinen) */}
            <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl z-0" style={{ bottom: "-100px" }} />

            {/* DRAG HANDLE */}
            <div 
              className="relative z-10 w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* HEADER */}
            <div className="relative z-10 flex justify-between items-center px-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <button onClick={onClose} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
              <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-base">
                {title || "Stunden"}
              </span>
              <button 
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Medium });
                  handleConfirm();
                }} 
                className="p-3 text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-full font-bold transition-transform active:scale-95"
              >
                <Check size={24} />
              </button>
            </div>

            {/* PICKER AREA (GRID LAYOUT gegen Überschneiden) */}
            <div className="relative z-10 h-[280px] w-full select-none pb-safe">
              
              {/* Highlight Bar (Mittig fixiert) */}
              <div className="absolute top-1/2 left-4 right-4 h-[64px] -mt-[32px] bg-slate-100 dark:bg-slate-800 pointer-events-none z-0 border border-slate-200 dark:border-slate-700 rounded-xl" />

              {/* Grid Container */}
              <div className="grid grid-cols-2 h-full w-full max-w-[280px] mx-auto relative z-10">
                  
                  {/* LINKS: STUNDEN */}
                  <div 
                    ref={hoursRef}
                    onScroll={(e) => handleScroll(e, 'hour')}
                    className="overflow-y-auto snap-y snap-mandatory py-[108px] scrollbar-hide text-right pr-6"
                  >
                    {hours.map((h) => (
                      <div 
                        key={h}
                        data-value={h}
                        onClick={() => {
                            setSelectedHour(h);
                            scrollToValue(hoursRef, h);
                        }}
                        className={`h-[64px] flex items-center justify-end snap-center cursor-pointer transition-all duration-100 ${
                          h === selectedHour 
                            ? "font-bold text-4xl text-slate-800 dark:text-white scale-110" 
                            : "text-slate-300 dark:text-slate-600 text-2xl"
                        }`}
                      >
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* RECHTS: DEZIMALSTELLEN */}
                  <div 
                    ref={decimalsRef}
                    onScroll={(e) => handleScroll(e, 'decimal')}
                    className="overflow-y-auto snap-y snap-mandatory py-[108px] scrollbar-hide text-left pl-2"
                  >
                    {decimals.map((d) => (
                      <div 
                        key={d}
                        data-value={d}
                        onClick={() => {
                            setSelectedDecimal(d);
                            scrollToValue(decimalsRef, d);
                        }}
                        className={`h-[64px] flex items-center justify-start snap-center cursor-pointer transition-all duration-100 ${
                          d === selectedDecimal 
                            ? "font-bold text-4xl text-orange-500 scale-110" 
                            : "text-slate-300 dark:text-slate-600 text-2xl"
                        }`}
                      >
                        {formatDecimal(d)} <span className="text-sm ml-1 text-slate-400 font-normal mt-3">h</span>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DecimalDurationPicker;