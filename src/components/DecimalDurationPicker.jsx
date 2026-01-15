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
    if (mins === undefined || mins === null) return { h: 8, d: 0 };
    
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    
    let d = 0;
    if (m >= 45) d = 0.75;
    else if (m >= 30) d = 0.5;
    else if (m >= 15) d = 0.25;
    
    return { h, d };
  };

  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedDecimal, setSelectedDecimal] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const { h, d } = getInitialValues(initialMinutes);
      setSelectedHour(h);
      setSelectedDecimal(d);

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
    const totalMinutes = (selectedHour * 60) + (selectedDecimal * 60);
    onConfirm(totalMinutes);
    onClose();
  };

  const formatDecimal = (d) => {
    if (d === 0) return ", 00";
    if (d === 0.25) return ", 25";
    if (d === 0.5) return ", 50";
    if (d === 0.75) return ", 75";
    return String(d).replace("0.", ", "); 
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
            <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl z-0" style={{ bottom: "-100px" }} />

            <div 
              className="relative z-10 w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            <div className="relative z-20 flex justify-between items-center px-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-3xl">
              <button 
                onClick={onClose} 
                className="p-3 text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-full transition-transform active:scale-95"
              >
                <X size={24} />
              </button>

              <span className="font-bold text-zinc-800 dark:text-white tracking-wide text-base">
                {title || "Stunden"}
              </span>

              {/* CHANGE: text-green-600 -> text-emerald-600 */}
              <button 
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Medium });
                  handleConfirm();
                }} 
                className="p-3 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold transition-transform active:scale-95"
              >
                <Check size={24} />
              </button>
            </div>

            <div className="relative z-10 h-[280px] w-full select-none pb-safe overflow-hidden">
              
              <div className="absolute top-1/2 left-4 right-4 h-[64px] -mt-[36px] bg-zinc-100 dark:bg-zinc-800 pointer-events-none z-0 border border-zinc-200 dark:border-zinc-700 rounded-xl" />

              <div 
                className="relative z-10 h-full w-full flex justify-center items-center"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
                }}
              >
                  <div className="flex items-center justify-center">
                      
                      {/* SPALTE 1: STUNDEN */}
                      <div 
                        ref={hoursRef}
                        onScroll={(e) => handleScroll(e, 'hour')}
                        className="h-[280px] w-[80px] overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[108px]"
                      >
                        {hours.map((h) => (
                          <div 
                            key={h}
                            data-value={h}
                            onClick={() => {
                                setSelectedHour(h);
                                scrollToValue(hoursRef, h);
                            }}
                            className={`h-[64px] flex items-center justify-end pr-2 snap-center cursor-pointer transition-all duration-150 pt-1 ${
                              h === selectedHour 
                                ? "font-bold text-4xl text-zinc-800 dark:text-white scale-110" 
                                : "text-zinc-300 dark:text-zinc-600 text-2xl scale-90"
                            }`}
                          >
                            {h}
                          </div>
                        ))}
                      </div>

                      {/* SPALTE 2: DEZIMAL */}
                      <div 
                        ref={decimalsRef}
                        onScroll={(e) => handleScroll(e, 'decimal')}
                        className="h-[280px] w-[90px] overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[108px]"
                      >
                        {decimals.map((d) => (
                          <div 
                            key={d}
                            data-value={d}
                            onClick={() => {
                                setSelectedDecimal(d);
                                scrollToValue(decimalsRef, d);
                            }}
                            /* CHANGE: text-orange-500 -> text-emerald-500 */
                            className={`h-[64px] flex items-center justify-start pl-0 snap-center cursor-pointer transition-all duration-150 pt-1 ${
                              d === selectedDecimal 
                                ? "font-bold text-4xl text-emerald-500 scale-110" 
                                : "text-zinc-300 dark:text-zinc-600 text-2xl scale-90"
                            }`}
                          >
                            {formatDecimal(d)}
                          </div>
                        ))}
                      </div>

                      <div className="h-[64px] flex items-center justify-start pl-1 pt-3">
                        <span className="text-xl text-zinc-400 font-semibold">h</span>
                      </div>

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