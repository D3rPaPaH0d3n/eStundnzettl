import React, { useState, useEffect } from "react";
import { Play, Square, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LiveTimerOverlay = ({ 
  timerState, 
  onStart, 
  onStop, 
  onPause, 
  onResume,
  targetMinutes = 510 
}) => {
  const [displayStatus, setDisplayStatus] = useState({ text: "...", isOvertime: false });

  // Update Logik für die Anzeige
  useEffect(() => {
    if (!timerState.isRunning) return;

    const update = () => {
      const now = new Date();
      const start = new Date(timerState.startTime);
      
      let currentPause = 0;
      if (timerState.isPaused && timerState.pauseStartTime) {
        currentPause = now - new Date(timerState.pauseStartTime);
      }
      
      const totalPauseMs = (timerState.accumulatedPause || 0) + currentPause;
      const workedMs = now - start - totalPauseMs;
      const workedMinutes = workedMs / 1000 / 60;
      
      const diffMinutes = targetMinutes - workedMinutes;

      if (diffMinutes > 0) {
        const h = Math.floor(diffMinutes / 60);
        const m = Math.floor(diffMinutes % 60);
        setDisplayStatus({ text: `Noch ${h}h ${m}m`, isOvertime: false });
      } else {
        const overMinutes = Math.abs(diffMinutes);
        const h = Math.floor(overMinutes / 60);
        const m = Math.floor(overMinutes % 60);
        setDisplayStatus({ text: `+ ${h}:${String(m).padStart(2, '0')} Std`, isOvertime: true });
      }
    };

    update();
    const interval = setInterval(update, 1000 * 30);
    return () => clearInterval(interval);
  }, [timerState, targetMinutes]);

  // Design identisch zu FAB in App.jsx
  const bottomStyle = { bottom: "calc(3.5rem + env(safe-area-inset-bottom))" };

  return (
    <>
      {/* 1. STATUS BLASE (Schwebt über dem Button) */}
      <AnimatePresence>
        {timerState.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className={`fixed left-6 z-[89] px-3 py-1.5 rounded-xl shadow-sm border mb-3 text-xs font-bold backdrop-blur-md pointer-events-none ${
              displayStatus.isOvertime 
                ? "bg-green-500/90 border-green-400 text-white" 
                : "bg-slate-800/90 border-slate-600 text-white"
            }`}
            style={{ bottom: "calc(7rem + env(safe-area-inset-bottom))" }} // Etwas über dem Button
          >
             {timerState.isPaused ? "Pausiert" : displayStatus.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DER BUTTON (FAB STYLE - LINKS) */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={timerState.isRunning ? onStop : onStart}
        onLongPress={timerState.isRunning ? (timerState.isPaused ? onResume : onPause) : undefined} 
        style={bottomStyle}
        className={`
          fixed left-6 w-14 h-14 rounded-full shadow-2xl z-[90] flex flex-col items-center justify-center transition-all border-2
          ${timerState.isRunning 
            ? "bg-white dark:bg-slate-800 border-red-500 text-red-500" // AUS-Zustand
            : "bg-slate-900 dark:bg-orange-500 border-transparent text-white" // EIN-Zustand
          }
        `}
      >
        {timerState.isRunning ? (
            // AUSSTEMPELN DESIGN
            <>
                <Square size={18} fill="currentColor" className="mb-0.5" />
                <span className="text-[9px] font-black leading-none">AUS</span>
            </>
        ) : (
            // EINSTEMPELN DESIGN
            <>
                <Play size={20} fill="currentColor" className="ml-0.5 mb-0.5" />
                <span className="text-[9px] font-black leading-none">EIN</span>
            </>
        )}
      </motion.button>
      
      {/* 3. MINI PAUSE BUTTON (Rechts am Button klebend) */}
      <AnimatePresence>
        {timerState.isRunning && (
            <motion.button
                initial={{ scale: 0, x: -20, opacity: 0 }}
                animate={{ scale: 1, x: 0, opacity: 1 }}
                exit={{ scale: 0, x: -20, opacity: 0 }}
                onClick={timerState.isPaused ? onResume : onPause}
                style={bottomStyle}
                className={`
                    fixed left-24 w-10 h-10 rounded-full shadow-lg z-[88] flex items-center justify-center border
                    ${timerState.isPaused 
                        ? "bg-green-100 border-green-300 text-green-600" 
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400"}
                `}
            >
                {timerState.isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveTimerOverlay;