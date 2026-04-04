import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const ITEM_H = 56;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;
const DECEL = 0.95;      // Momentum-Abbremsfaktor
const MIN_VELOCITY = 0.3; // Stopp-Schwelle

// ─── Touch-basierte Wheel-Spalte ───────────────────────────────

const WheelColumn = ({ items, selected, onSelect, align }) => {
  const offsetRef = useRef(0);       // aktueller Y-Offset in px
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animRef = useRef(null);
  const touchActiveRef = useRef(false);
  const containerRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const prevSelectedRef = useRef(null);

  const maxOffset = 0;
  const minOffset = -(items.length - 1) * ITEM_H;

  const clamp = (v) => Math.max(minOffset, Math.min(maxOffset, v));
  const getIndex = (off) => Math.round(-off / ITEM_H);

  // Snap to nearest item with spring animation
  const snapTo = useCallback((targetOffset, immediate = false) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const target = clamp(Math.round(targetOffset / ITEM_H) * ITEM_H);

    if (immediate) {
      offsetRef.current = target;
      setOffset(target);
      const idx = getIndex(target);
      if (idx >= 0 && idx < items.length) onSelect(items[idx]);
      return;
    }

    const animate = () => {
      const current = offsetRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 0.5) {
        offsetRef.current = target;
        setOffset(target);
        const idx = getIndex(target);
        if (idx >= 0 && idx < items.length) onSelect(items[idx]);
        return;
      }
      // Spring-like ease
      offsetRef.current = current + diff * 0.25;
      setOffset(offsetRef.current);
      // Emit selection when crossing item boundary
      const idx = getIndex(offsetRef.current);
      if (idx >= 0 && idx < items.length && items[idx] !== prevSelectedRef.current) {
        prevSelectedRef.current = items[idx];
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, [items, minOffset, onSelect]);

  // Momentum-Animation nach Touch-Ende
  const startMomentum = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    let vel = velocityRef.current;

    const tick = () => {
      vel *= DECEL;
      if (Math.abs(vel) < MIN_VELOCITY) {
        snapTo(offsetRef.current);
        return;
      }
      offsetRef.current = clamp(offsetRef.current + vel);
      setOffset(offsetRef.current);
      const idx = getIndex(offsetRef.current);
      if (idx >= 0 && idx < items.length && items[idx] !== prevSelectedRef.current) {
        prevSelectedRef.current = items[idx];
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [items, minOffset, snapTo]);

  // Initialisierung wenn selected sich ändert (von außen)
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      const target = -idx * ITEM_H;
      offsetRef.current = target;
      setOffset(target);
      prevSelectedRef.current = selected;
    }
  }, [selected, items]);

  // Cleanup
  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const onTouchStart = (e) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    touchActiveRef.current = true;
    const y = e.touches[0].clientY;
    lastYRef.current = y;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  };

  const onTouchMove = (e) => {
    if (!touchActiveRef.current) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const now = Date.now();
    const dy = y - lastYRef.current;
    const dt = Math.max(1, now - lastTimeRef.current);

    offsetRef.current = clamp(offsetRef.current + dy);
    setOffset(offsetRef.current);
    velocityRef.current = dy / dt * 16; // Normalisieren auf ~16ms frame

    lastYRef.current = y;
    lastTimeRef.current = now;
  };

  const onTouchEnd = () => {
    touchActiveRef.current = false;
    if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
      startMomentum();
    } else {
      snapTo(offsetRef.current);
    }
  };

  const handleClick = (val) => {
    const idx = items.indexOf(val);
    if (idx >= 0) snapTo(-idx * ITEM_H);
  };

  const centerY = PICKER_H / 2 - ITEM_H / 2;
  const justifyClass = align === "right" ? "justify-end pr-4" : "justify-start pl-4";

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden touch-none select-none"
      style={{ height: PICKER_H, width: 90 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="absolute left-0 right-0 will-change-transform"
        style={{ transform: `translateY(${offset + centerY}px)` }}
      >
        {items.map((val, i) => {
          const itemY = i * ITEM_H + offset + centerY;
          const distFromCenter = Math.abs(itemY - centerY);
          const scale = Math.max(0.65, 1 - distFromCenter / (PICKER_H * 0.6));
          const opacity = Math.max(0.2, 1 - distFromCenter / (PICKER_H * 0.45));
          const isSelected = val === selected;

          return (
            <div
              key={val}
              onClick={() => handleClick(val)}
              className={`flex items-center cursor-pointer ${justifyClass}`}
              style={{
                height: ITEM_H,
                transform: `scale(${scale})`,
                opacity,
                transition: "none",
              }}
            >
              <span
                className={`tabular-nums ${
                  isSelected
                    ? `font-bold text-3xl ${align === "right" ? "text-zinc-800 dark:text-white" : "text-emerald-500"}`
                    : "text-xl text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {String(val).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Haupt-Komponente ──────────────────────────────────────────

const TimePickerDrawer = ({ isOpen, onClose, value, onChange, title, minuteInterval = 15 }) => {
  const dragControls = useDragControls();
  const selectedHourRef = useRef(6);
  const selectedMinuteRef = useRef(0);

  const minutes = useMemo(
    () => (minuteInterval === 1 ? Array.from({ length: 60 }, (_, i) => i) : [0, 15, 30, 45]),
    [minuteInterval],
  );
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => { selectedHourRef.current = selectedHour; }, [selectedHour]);
  useEffect(() => { selectedMinuteRef.current = selectedMinute; }, [selectedMinute]);

  const emitTime = useCallback((h, m) => {
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }, [onChange]);

  // Init bei Öffnen
  useEffect(() => {
    if (!isOpen) return;
    const [h, m] = value ? value.split(":").map(Number) : [6, 0];
    setSelectedHour(h);
    setSelectedMinute(m);
    selectedHourRef.current = h;
    selectedMinuteRef.current = m;
  }, [isOpen, value]);

  // Body-Scroll sperren
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.touchAction = prevTouch;
    };
  }, [isOpen]);

  const onSelectHour = useCallback((h) => {
    setSelectedHour(h);
    selectedHourRef.current = h;
    emitTime(h, selectedMinuteRef.current);
  }, [emitTime]);

  const onSelectMinute = useCallback((m) => {
    setSelectedMinute(m);
    selectedMinuteRef.current = m;
    emitTime(selectedHourRef.current, m);
  }, [emitTime]);

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
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={title || "Zeit wählen"}
            className="fixed bottom-0 left-0 right-0 z-[101] w-full md:w-[min(28rem,calc(100vw-2rem))] rounded-t-3xl overflow-visible flex flex-col overscroll-contain touch-none md:mx-auto md:bottom-4 md:rounded-3xl"
          >
            <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl z-0" style={{ bottom: "-100px" }} />

            {/* Drag-Handle */}
            <div
              className="relative z-10 w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="relative z-20 flex justify-between items-center px-4 sm:px-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-t-3xl">
              <button
                type="button"
                aria-label="Abbrechen"
                onClick={onClose}
                className="p-3 text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-full transition-transform active:scale-95 shrink-0"
              >
                <X size={24} />
              </button>

              <span className="font-bold text-zinc-800 dark:text-white tracking-wide text-sm sm:text-base text-center px-3">
                {title || "Zeit wählen"}
              </span>

              <button
                type="button"
                aria-label="Auswahl bestätigen"
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
                  onClose();
                }}
                className="p-3 text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold transition-transform active:scale-95 shrink-0"
              >
                <Check size={24} />
              </button>
            </div>

            {/* Picker-Area */}
            <div className="relative z-10 w-full select-none overflow-hidden" style={{ height: PICKER_H }}>
              {/* Highlight-Band */}
              <div
                className="absolute left-3 right-3 sm:left-4 sm:right-4 bg-zinc-100 dark:bg-zinc-800 pointer-events-none z-0 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                style={{ top: "50%", height: ITEM_H, transform: "translateY(-50%)" }}
              />

              {/* Fade-Mask + Columns */}
              <div
                className="relative z-10 h-full w-full flex justify-center items-center"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                }}
              >
                <div className="flex items-center justify-center">
                  <WheelColumn items={hours} selected={selectedHour} onSelect={onSelectHour} align="right" />

                  <div className="flex items-center justify-center px-1" style={{ height: ITEM_H }}>
                    <span className="font-bold text-2xl text-zinc-400 dark:text-zinc-600">:</span>
                  </div>

                  <WheelColumn items={minutes} selected={selectedMinute} onSelect={onSelectMinute} align="left" />
                </div>
              </div>
            </div>

            {/* Safe-Area-Spacer (separat, damit der fix-hohe Picker-Bereich oben mittig bleibt) */}
            <div className="relative z-10" style={{ height: "env(safe-area-inset-bottom)" }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TimePickerDrawer;
