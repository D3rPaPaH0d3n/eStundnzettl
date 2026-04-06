import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const ITEM_H = 56;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;
const DECEL = 0.95;      // Momentum-Abbremsfaktor
const MIN_VELOCITY = 0.3; // Stopp-Schwelle

// ─── Touch-basierte Wheel-Spalte ───────────────────────────────

interface WheelColumnProps {
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
  align: "left" | "center" | "right";
}

const WheelColumn: React.FC<WheelColumnProps> = ({ items, selected, onSelect, align }) => {
  const offsetRef = useRef(0);       // aktueller Y-Offset in px
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const touchActiveRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const prevSelectedRef = useRef<string | null>(null);

  const maxOffset = 0;
  const minOffset = -(items.length - 1) * ITEM_H;

  const clamp = (v: number) => Math.max(minOffset, Math.min(maxOffset, v));
  const getIndex = (off: number) => Math.round(-off / ITEM_H);

  const animate = () => {
    if (!touchActiveRef.current) {
      velocityRef.current *= DECEL;
      offsetRef.current += velocityRef.current;
      
      if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
        // Snap zum nächsten Item
        const targetIdx = getIndex(offsetRef.current);
        const targetOffset = -targetIdx * ITEM_H;
        const diff = targetOffset - offsetRef.current;
        offsetRef.current += diff * 0.3;
        
        if (Math.abs(diff) < 0.5) {
          offsetRef.current = targetOffset;
          velocityRef.current = 0;
          if (animRef.current) {
            cancelAnimationFrame(animRef.current);
            animRef.current = null;
          }
        }
      }
      
      setOffset(offsetRef.current);
      
      if (Math.abs(velocityRef.current) >= MIN_VELOCITY) {
        animRef.current = requestAnimationFrame(animate);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchActiveRef.current = true;
    lastYRef.current = e.touches[0].clientY;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
    
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchActiveRef.current) return;
    
    const y = e.touches[0].clientY;
    const delta = y - lastYRef.current;
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    
    if (dt > 0) {
      velocityRef.current = delta / dt * 16; // px/frame (60fps)
    }
    
    offsetRef.current = clamp(offsetRef.current + delta);
    setOffset(offsetRef.current);
    
    lastYRef.current = y;
    lastTimeRef.current = now;
  };

  const handleTouchEnd = () => {
    touchActiveRef.current = false;
    if (Math.abs(velocityRef.current) >= MIN_VELOCITY) {
      animRef.current = requestAnimationFrame(animate);
    } else {
      // Snap sofort
      const targetIdx = getIndex(offsetRef.current);
      offsetRef.current = -targetIdx * ITEM_H;
      setOffset(offsetRef.current);
    }
    
    // Index auswählen
    const idx = getIndex(offsetRef.current);
    if (idx >= 0 && idx < items.length) {
      const value = items[idx];
      if (value !== prevSelectedRef.current) {
        prevSelectedRef.current = value;
        Haptics.impact({ style: ImpactStyle.Light });
        onSelect(value);
      }
    }
  };

  useEffect(() => {
    // Initial auf selected setzen
    const idx = items.indexOf(selected);
    if (idx !== -1) {
      offsetRef.current = -idx * ITEM_H;
      setOffset(offsetRef.current);
      prevSelectedRef.current = selected;
    }
  }, [items, selected]);

  useEffect(() => {
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  const textAlign = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div 
        className="absolute inset-0"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {items.map((item, idx) => {
          const itemOffset = idx * ITEM_H;
          const center = PICKER_H / 2;
          const distance = Math.abs(offset + itemOffset + ITEM_H/2 - center);
          const scale = Math.max(0.5, 1 - distance / (PICKER_H * 0.8));
          const opacity = Math.max(0.3, 1 - distance / (PICKER_H * 0.6));
          
          return (
            <div
              key={idx}
              className={`absolute left-0 right-0 h-[${ITEM_H}px] flex items-center justify-center transition-all duration-150 ${textAlign}`}
              style={{
                top: `${itemOffset}px`,
                transform: `scale(${scale})`,
                opacity,
                fontSize: scale > 0.9 ? "1.25rem" : "1rem",
                fontWeight: scale > 0.9 ? "bold" : "normal",
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
      
      {/* Auswahl-Linie */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-emerald-500 -translate-y-1/2" />
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-emerald-300/50 -translate-y-1/2 -mt-1" />
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-emerald-300/50 -translate-y-1/2 mt-1" />
    </div>
  );
};

// ─── Hauptkomponente ───────────────────────────────────────────

interface TimePickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTime?: string; // "HH:MM"
  onConfirm: (time: string) => void;
  title?: string;
}

const TimePickerDrawer: React.FC<TimePickerDrawerProps> = ({ 
  isOpen, 
  onClose, 
  initialTime = "09:00", 
  onConfirm, 
  title = "Uhrzeit wählen" 
}) => {
  const dragControls = useDragControls();
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const hours = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")), 
    []
  );
  
  const minutes = useMemo(() => 
    Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")), 
    []
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      
      // Initialzeit parsen
      const [h, m] = initialTime.split(":");
      if (h && hours.includes(h)) setSelectedHour(h);
      if (m && minutes.includes(m)) setSelectedMinute(m);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, initialTime, hours, minutes]);

  const handleConfirm = () => {
    onConfirm(`${selectedHour}:${selectedMinute}`);
    onClose();
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
            className="fixed left-0 bottom-0 w-screen h-[70vh] bg-white dark:bg-zinc-800 rounded-t-3xl shadow-2xl z-[101] overflow-hidden"
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

            {/* Time Picker */}
            <div className="h-[calc(70vh-140px)] flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="w-24 h-64">
                  <WheelColumn
                    items={hours}
                    selected={selectedHour}
                    onSelect={setSelectedHour}
                    align="right"
                  />
                </div>
                
                <div className="text-2xl font-bold text-zinc-400">:</div>
                
                <div className="w-24 h-64">
                  <WheelColumn
                    items={minutes}
                    selected={selectedMinute}
                    onSelect={setSelectedMinute}
                    align="left"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <div className="mb-4">
                <div className="text-center text-3xl font-bold">
                  {selectedHour}:{selectedMinute}
                </div>
                <div className="text-center text-sm text-zinc-500">
                  Gewählte Uhrzeit
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

export default TimePickerDrawer;