import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const VISIBLE_ITEMS = 5;
const DEFAULT_ITEM_HEIGHT = 64;

const TimePickerDrawer = ({ isOpen, onClose, value, onChange, title, minuteInterval = 15 }) => {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const scrollFrameRef = useRef({ hour: null, minute: null });
  const scrollTimeoutRef = useRef({ hour: null, minute: null });
  const selectedHourRef = useRef(6);
  const selectedMinuteRef = useRef(0);
  const dragControls = useDragControls();

  const minutes = useMemo(
    () => (minuteInterval === 1 ? Array.from({ length: 60 }, (_, i) => i) : [0, 15, 30, 45]),
    [minuteInterval],
  );
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => {
    selectedHourRef.current = selectedHour;
  }, [selectedHour]);

  useEffect(() => {
    selectedMinuteRef.current = selectedMinute;
  }, [selectedMinute]);

  const emitTime = (hour, minute) => {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const getItemHeight = (element) => {
    if (!element || typeof window === "undefined") return DEFAULT_ITEM_HEIGHT;
    const rawValue = window.getComputedStyle(element).getPropertyValue("--picker-item-height").trim();
    const parsed = Number.parseFloat(rawValue);
    return Number.isFinite(parsed) ? parsed : DEFAULT_ITEM_HEIGHT;
  };

  const getScrollTopForValue = (source, val, element) => {
    const index = source.indexOf(val);
    const itemHeight = getItemHeight(element);
    return index >= 0 ? index * itemHeight : 0;
  };

  const scrollToValue = (ref, val) => {
    const source = ref === hoursRef ? hours : minutes;
    ref.current?.scrollTo({
      top: getScrollTopForValue(source, val, ref.current),
      behavior: "smooth",
    });
  };

  const syncSelectionFromScroll = (element, type) => {
    const source = type === "hour" ? hours : minutes;
    const itemHeight = getItemHeight(element);
    const index = Math.min(Math.max(0, Math.round(element.scrollTop / itemHeight)), source.length - 1);
    const nextValue = source[index];

    if (nextValue === undefined) return;

    if (type === "hour") {
      setSelectedHour((currentHour) => {
        if (currentHour === nextValue) return currentHour;
        emitTime(nextValue, selectedMinuteRef.current);
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        return nextValue;
      });
      return;
    }

    setSelectedMinute((currentMinute) => {
      if (currentMinute === nextValue) return currentMinute;
      emitTime(selectedHourRef.current, nextValue);
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      return nextValue;
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const [initialHour, initialMinute] = value ? value.split(":").map(Number) : [6, 0];
    setSelectedHour(initialHour);
    setSelectedMinute(initialMinute);
    selectedHourRef.current = initialHour;
    selectedMinuteRef.current = initialMinute;

    const timer = setTimeout(() => {
      hoursRef.current?.scrollTo({
        top: getScrollTopForValue(hours, initialHour, hoursRef.current),
        behavior: "auto",
      });
      minutesRef.current?.scrollTo({
        top: getScrollTopForValue(minutes, initialMinute, minutesRef.current),
        behavior: "auto",
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [hours, isOpen, minutes, value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      if (scrollFrameRef.current.hour) cancelAnimationFrame(scrollFrameRef.current.hour);
      if (scrollFrameRef.current.minute) cancelAnimationFrame(scrollFrameRef.current.minute);
      if (scrollTimeoutRef.current.hour) clearTimeout(scrollTimeoutRef.current.hour);
      if (scrollTimeoutRef.current.minute) clearTimeout(scrollTimeoutRef.current.minute);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const handleScroll = (e, type) => {
    const element = e.target;

    if (scrollFrameRef.current[type]) {
      cancelAnimationFrame(scrollFrameRef.current[type]);
    }

    scrollFrameRef.current[type] = requestAnimationFrame(() => {
      syncSelectionFromScroll(element, type);
      scrollFrameRef.current[type] = null;
    });

    if (scrollTimeoutRef.current[type]) {
      clearTimeout(scrollTimeoutRef.current[type]);
    }

    scrollTimeoutRef.current[type] = setTimeout(() => {
      const ref = type === "hour" ? hoursRef : minutesRef;
      const source = type === "hour" ? hours : minutes;
      if (!ref.current) return;
      const itemHeight = getItemHeight(ref.current);
      const index = Math.min(Math.max(0, Math.round(ref.current.scrollTop / itemHeight)), source.length - 1);
      ref.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      });
      scrollTimeoutRef.current[type] = null;
    }, 90);
  };

  const pickerMetrics = {
    "--picker-item-height": "clamp(52px, 8dvh, 64px)",
    "--picker-height": `calc(clamp(52px, 8dvh, 64px) * ${VISIBLE_ITEMS})`,
    "--picker-side-width": "clamp(74px, 20vw, 86px)",
  };

  const pickerColumnStyle = {
    height: "var(--picker-height)",
    paddingTop: "calc((var(--picker-height) - var(--picker-item-height)) / 2)",
    paddingBottom: "calc((var(--picker-height) - var(--picker-item-height)) / 2)",
  };

  const pickerItemStyle = {
    height: "var(--picker-item-height)",
    minHeight: "var(--picker-item-height)",
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
            className="fixed bottom-0 left-0 right-0 z-[101] w-full md:w-[min(28rem,calc(100vw-2rem))] rounded-t-3xl overflow-visible flex flex-col overscroll-contain touch-none md:mx-auto md:bottom-4 md:rounded-3xl"
            style={pickerMetrics}
          >
            <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl z-0" style={{ bottom: "-100px" }} />

            <div
              className="relative z-10 w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            <div className="relative z-20 flex justify-between items-center px-4 sm:px-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-t-3xl">
              <button
                onClick={onClose}
                className="p-3 text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-full transition-transform active:scale-95 shrink-0"
              >
                <X size={24} />
              </button>

              <span className="font-bold text-zinc-800 dark:text-white tracking-wide text-sm sm:text-base text-center px-3">
                {title || "Zeit wÃ¤hlen"}
              </span>

              <button
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Medium });
                  onClose();
                }}
                className="p-3 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold transition-transform active:scale-95 shrink-0"
              >
                <Check size={24} />
              </button>
            </div>

            <div className="relative z-10 w-full select-none pb-safe overflow-hidden" style={{ height: "var(--picker-height)" }}>
              <div
                className="absolute left-3 right-3 sm:left-4 sm:right-4 bg-zinc-100 dark:bg-zinc-800 pointer-events-none z-0 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                style={{ top: "50%", height: "var(--picker-item-height)", transform: "translateY(-50%)" }}
              />

              <div
                className="relative z-10 h-full w-full flex justify-center items-center"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
                }}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <div
                    ref={hoursRef}
                    role="listbox"
                    aria-label="Stunden"
                    onScroll={(e) => handleScroll(e, "hour")}
                    className="overflow-y-auto overscroll-contain snap-y snap-mandatory scrollbar-hide touch-pan-y"
                    style={{ ...pickerColumnStyle, width: "var(--picker-side-width)" }}
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        role="option"
                        aria-selected={hour === selectedHour}
                        aria-label={`${String(hour).padStart(2, "0")} Uhr`}
                        data-value={hour}
                        onClick={() => {
                          setSelectedHour(hour);
                          emitTime(hour, selectedMinuteRef.current);
                          scrollToValue(hoursRef, hour);
                        }}
                        className={`flex items-center justify-end pr-3 sm:pr-4 snap-center cursor-pointer transition-all duration-150 leading-none ${
                          hour === selectedHour
                            ? "font-bold text-[clamp(2rem,6vw,2.35rem)] text-zinc-800 dark:text-white"
                            : "text-zinc-300 dark:text-zinc-600 text-[clamp(1.35rem,4vw,1.7rem)]"
                        }`}
                        style={pickerItemStyle}
                      >
                        {String(hour).padStart(2, "0")}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center px-1 text-zinc-300 dark:text-zinc-600 leading-none" style={pickerItemStyle}>
                    <span className="font-bold text-[clamp(1.5rem,4vw,2rem)]">:</span>
                  </div>

                  <div
                    ref={minutesRef}
                    role="listbox"
                    aria-label="Minuten"
                    onScroll={(e) => handleScroll(e, "minute")}
                    className="overflow-y-auto overscroll-contain snap-y snap-mandatory scrollbar-hide touch-pan-y"
                    style={{ ...pickerColumnStyle, width: "var(--picker-side-width)" }}
                  >
                    {minutes.map((minute) => (
                      <div
                        key={minute}
                        role="option"
                        aria-selected={minute === selectedMinute}
                        aria-label={`${String(minute).padStart(2, "0")} Minuten`}
                        data-value={minute}
                        onClick={() => {
                          setSelectedMinute(minute);
                          emitTime(selectedHourRef.current, minute);
                          scrollToValue(minutesRef, minute);
                        }}
                        className={`flex items-center justify-start pl-3 sm:pl-4 snap-center cursor-pointer transition-all duration-150 leading-none ${
                          minute === selectedMinute
                            ? "font-bold text-[clamp(2rem,6vw,2.35rem)] text-emerald-500"
                            : "text-zinc-300 dark:text-zinc-600 text-[clamp(1.35rem,4vw,1.7rem)]"
                        }`}
                        style={pickerItemStyle}
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
