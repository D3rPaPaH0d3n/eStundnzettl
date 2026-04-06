import React, { useEffect, useRef, useState } from "react";
import { Play, Square, Pause, Plus, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useTranslation } from "react-i18next";
import type { TimerState } from "../types";

const LONG_PRESS_MS = 260;
const SWIPE_THRESHOLD = 28;

interface Props {
  timerState: TimerState;
  onCreateEntry: () => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  targetMinutes?: number;
}

const LiveTimerOverlay = ({
  timerState,
  onCreateEntry,
  onStart,
  onStop,
  onPause,
  onResume,
  targetMinutes = 510,
}: Props) => {
  const { t } = useTranslation();
  const [displayStatus, setDisplayStatus] = useState<{ text: string; tone: string }>({ text: "...", tone: "blue" });
  const [isSwipeReady, setIsSwipeReady] = useState(false);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartYRef = useRef<number | null>(null);
  const gestureTriggeredRef = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!timerState.isRunning) return;

    const update = () => {
      const now = new Date();
      const start = new Date(timerState.startTime!);

      let currentPause = 0;
      if (timerState.isPaused && timerState.pauseStartTime) {
        currentPause = now.getTime() - new Date(timerState.pauseStartTime).getTime();
      }

      const totalPauseMs = (timerState.accumulatedPause || 0) + currentPause;
      const workedMs = now.getTime() - start.getTime() - totalPauseMs;
      const workedMinutes = workedMs / 1000 / 60;
      const roundedWorkedMinutes = Math.max(0, Math.floor(workedMinutes));
      const h = Math.floor(roundedWorkedMinutes / 60);
      const m = roundedWorkedMinutes % 60;

      let tone = "blue";
      if (targetMinutes > 0) {
        const progress = workedMinutes / targetMinutes;
        if (progress >= 1) tone = "green";
        else if (progress >= 0.6) tone = "blue";
        else tone = "red";
      }

      setDisplayStatus({ text: `${h}:${String(m).padStart(2, "0")} Std`, tone });
    };

    update();
    const interval = setInterval(update, 1000 * 30);
    return () => clearInterval(interval);
  }, [timerState, targetMinutes]);

  useEffect(() => {
    if (timerState.isRunning) {
      setIsSwipeReady(false);
      gestureTriggeredRef.current = false;
    }
  }, [timerState.isRunning]);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  const bottomStyle = { bottom: "calc(3.5rem + env(safe-area-inset-bottom))" };

  const resetGestureState = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    pointerStartYRef.current = null;
    gestureTriggeredRef.current = false;
    setIsSwipeReady(false);
  };

  const triggerTimerStart = async () => {
    if (gestureTriggeredRef.current || timerState.isRunning) return;
    gestureTriggeredRef.current = true;
    setIsSwipeReady(false);
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    onStart();
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (timerState.isRunning) return;
    event.preventDefault();
    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    pointerStartYRef.current = event.clientY;
    gestureTriggeredRef.current = false;

    longPressTimeoutRef.current = setTimeout(() => {
      setIsSwipeReady(true);
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (timerState.isRunning || !isSwipeReady || pointerStartYRef.current == null) return;
    event.preventDefault();
    const deltaY = pointerStartYRef.current - event.clientY;
    if (deltaY >= SWIPE_THRESHOLD) {
      triggerTimerStart();
    }
  };

  const handlePointerEnd = (event: React.PointerEvent) => {
    if (timerState.isRunning) return;
    event.preventDefault();
    if (event.currentTarget?.releasePointerCapture && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const hadSwipeReady = isSwipeReady;
    const gestureTriggered = gestureTriggeredRef.current;
    resetGestureState();

    if (!gestureTriggered && !hadSwipeReady) {
      onCreateEntry();
    }
  };

  return (
    <>
      <AnimatePresence>
        {(timerState.isRunning || isSwipeReady) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className={`fixed right-6 z-[89] px-3 py-1.5 rounded-xl shadow-sm border mb-3 text-xs font-bold backdrop-blur-md pointer-events-none ${
              timerState.isRunning
                ? (displayStatus.tone === "green"
                  ? "bg-green-500/90 border-green-400 text-white"
                  : displayStatus.tone === "red"
                    ? "bg-red-500/90 border-red-400 text-white"
                    : "bg-blue-500/90 border-blue-400 text-white")
                : "bg-emerald-500/95 border-emerald-400 text-white"
            }`}
            style={{ bottom: "calc(7rem + env(safe-area-inset-bottom))" }}
          >
            {timerState.isRunning ? (timerState.isPaused ? "Pausiert" : displayStatus.text) : "Nach oben wischen zum Einstempeln"}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        data-tour="fab"
        aria-label={timerState.isRunning ? t("timer.stop") : t("timer.start")}
        whileTap={{ scale: 0.92 }}
        onClick={timerState.isRunning ? onStop : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={resetGestureState}
        style={bottomStyle}
        ref={fabRef}
        className={`
          fixed right-6 w-14 h-14 rounded-full shadow-2xl z-[90] flex flex-col items-center justify-center transition-all border-2 touch-none select-none
          ${timerState.isRunning
            ? "bg-white dark:bg-zinc-800 border-red-500 text-red-500"
            : isSwipeReady
              ? "bg-emerald-600 border-emerald-400 text-white"
              : "bg-zinc-900 dark:bg-emerald-600 border-transparent text-white"}
        `}
      >
        {timerState.isRunning ? (
          <>
            <Square size={18} fill="currentColor" className="mb-0.5" />
            <span className="text-[9px] font-black leading-none">AUS</span>
          </>
        ) : isSwipeReady ? (
          <>
            <ArrowUp size={18} className="mb-0.5" />
            <span className="text-[8px] font-black leading-none">TIMER</span>
          </>
        ) : (
          <Plus size={28} />
        )}
      </motion.button>

      <AnimatePresence>
        {timerState.isRunning && (
          <motion.button
            type="button"
            aria-label={timerState.isPaused ? t("timer.resume") : t("timer.pause")}
            initial={{ scale: 0, x: 20, opacity: 0 }}
            animate={{ scale: 1, x: 0, opacity: 1 }}
            exit={{ scale: 0, x: 20, opacity: 0 }}
            onClick={timerState.isPaused ? onResume : onPause}
            style={bottomStyle}
            className={`
              fixed right-24 w-10 h-10 rounded-full shadow-lg z-[88] flex items-center justify-center border
              ${timerState.isPaused
                ? "bg-green-100 border-green-300 text-green-600"
                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-600 text-zinc-400"}
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
