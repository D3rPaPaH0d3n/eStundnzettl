import React, { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const ITEM_HEIGHT = 64;

const TimePickerDrawer = ({ isOpen, onClose, value, onChange, title, minuteInterval = 15 }) => {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const dragControls = useDragControls();

  const minutes = minuteInterval === 1
    ? Array.from({ length: 60 }, (_, i) => i)
    : [0, 15, 30, 45];

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const emitTime = (hour, minute) => {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const scrollToValue = (ref, val) => {
    if (ref.current) {
      const el = ref.current.querySelector(`[data-value="${val}"]`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const [initialHour, initialMinute] = value ? value.split(":").map(Number) : [6, 0];
    setSelectedHour(initialHour);
    setSelectedMinute(initialMinute);

    setTimeout(() => {
      scrollToValue(hoursRef, initialHour);
      scrollToValue(minutesRef, initialMinute);
    }, 100);
  }, [isOpen, value, minuteInterval]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const handleScroll = (e, type) => {
    const source = type === "hour" ? hours : minutes;
    const index = Math.min(Math.max(0, Math.round(e.target.scrollTop / ITEM_HEIGHT)), source.length - 1);

    if (type === "hour") {
      const hour = source[index];
      if (hour !== undefined && hour !== selectedHour) {
        setSelectedHour(hour);
        emitTime(hour, selectedMinute);
        Haptics.impact({ style: ImpactStyle.Light });
      }
      return;
    }

    const minute = source[index];
    if (minute !== undefined && minute !== selectedMinute) {
      setSelectedMinute(minute);
      emitTime(selectedHour, minute);
      Haptics.impact({ style: ImpactStyle.Light });
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
            className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl overflow-visible flex flex-col overscroll-contain touch-none md:max-w-md md:mx-auto"
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
                {title || "Zeit wählen"}
              </span>

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

            <div className="relative z-10 h-[280px] w-full select-none pb-safe overflow-hidden">
              <div className="absolute top-1/2 left-4 right-4 h-[64px] -mt-[36px] bg-zinc-100 dark:bg-zinc-800 pointer-events-none z-0 border border-zinc-200 dark:border-zinc-700 rounded-xl" />

              <div
                className="relative z-10 h-full w-full flex justify-center items-center"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
                }}
              >
                <div className="flex items-center justify-center">
                  <div
                    ref={hoursRef}
                    onScroll={(e) => handleScroll(e, "hour")}
                    className="h-[280px] w-[86px] overflow-y-auto overscroll-contain snap-y snap-mandatory scrollbar-hide py-[108px] touch-pan-y"
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        data-value={hour}
                        onClick={() => {
                          setSelectedHour(hour);
                          emitTime(hour, selectedMinute);
                          scrollToValue(hoursRef, hour);
                        }}
                        className={`h-[64px] flex items-center justify-end pr-4 snap-center cursor-pointer transition-all duration-150 pt-1 ${
                          hour === selectedHour
                            ? "font-bold text-4xl text-zinc-800 dark:text-white scale-110"
                            : "text-zinc-300 dark:text-zinc-600 text-2xl scale-90"
                        }`}
                      >
                        {String(hour).padStart(2, "0")}
                      </div>
                    ))}
                  </div>

                  <div className="h-[64px] flex items-center justify-center px-2 pt-1">
                    <span className="text-2xl font-bold text-zinc-300 dark:text-zinc-600">:</span>
                  </div>

                  <div
                    ref={minutesRef}
                    onScroll={(e) => handleScroll(e, "minute")}
                    className="h-[280px] w-[86px] overflow-y-auto overscroll-contain snap-y snap-mandatory scrollbar-hide py-[108px] touch-pan-y"
                  >
                    {minutes.map((minute) => (
                      <div
                        key={minute}
                        data-value={minute}
                        onClick={() => {
                          setSelectedMinute(minute);
                          emitTime(selectedHour, minute);
                          scrollToValue(minutesRef, minute);
                        }}
                        className={`h-[64px] flex items-center justify-start pl-4 snap-center cursor-pointer transition-all duration-150 pt-1 ${
                          minute === selectedMinute
                            ? "font-bold text-4xl text-emerald-500 scale-110"
                            : "text-zinc-300 dark:text-zinc-600 text-2xl scale-90"
                        }`}
                      >
                        {String(minute).padStart(2, "0")}
                      </div>
                    ))}
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

export default TimePickerDrawer;
