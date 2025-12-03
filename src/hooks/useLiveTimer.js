import { useState, useEffect } from "react";

const STORAGE_KEY = "kogler_live_timer";

// Hilfsfunktion: Runden auf 15 Minuten (Gibt Date Objekt zurück!)
const roundToNearest15Minutes = (dateStrOrObj) => {
  if (!dateStrOrObj) return null;
  const date = new Date(dateStrOrObj);
  const minutes = date.getMinutes();
  const remainder = minutes % 15;
  
  // Kaufmännisch runden (7 abrunden, 8 aufrunden)
  let roundedMinutes = minutes;
  if (remainder < 8) {
    roundedMinutes = minutes - remainder;
  } else {
    roundedMinutes = minutes + (15 - remainder);
  }

  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date; 
};

export const useLiveTimer = () => {
  const [timerState, setTimerState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { 
      isRunning: false, 
      isPaused: false,
      startTime: null, 
      pauseStartTime: null,
      accumulatedPause: 0 
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  const startTimer = () => {
    setTimerState({
      isRunning: true,
      isPaused: false,
      startTime: new Date().toISOString(),
      pauseStartTime: null,
      accumulatedPause: 0
    });
  };

  const pauseTimer = () => {
    if (!timerState.isRunning || timerState.isPaused) return;
    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      pauseStartTime: new Date().toISOString()
    }));
  };

  const resumeTimer = () => {
    if (!timerState.isPaused) return;
    const now = new Date();
    const pauseStart = new Date(timerState.pauseStartTime);
    const pauseDiffMs = now - pauseStart;

    setTimerState(prev => ({
      ...prev,
      isPaused: false,
      pauseStartTime: null,
      accumulatedPause: (prev.accumulatedPause || 0) + pauseDiffMs
    }));
  };

  const stopTimer = () => {
    const now = new Date();
    
    // Pause berechnen
    let finalAccumulatedPauseMs = timerState.accumulatedPause || 0;
    if (timerState.isPaused && timerState.pauseStartTime) {
        finalAccumulatedPauseMs += (now - new Date(timerState.pauseStartTime));
    }
    const pauseMinutes = Math.round(finalAccumulatedPauseMs / 1000 / 60);

    // RUNDUNG ANWENDEN
    const roundedStart = roundToNearest15Minutes(timerState.startTime);
    const roundedEnd = roundToNearest15Minutes(now);

    const result = {
      start: roundedStart, // Date Objekt (Lokalzeit-fähig)
      end: roundedEnd,     // Date Objekt (Lokalzeit-fähig)
      pause: pauseMinutes
    };

    setTimerState({ 
      isRunning: false, 
      isPaused: false,
      startTime: null, 
      pauseStartTime: null, 
      accumulatedPause: 0 
    });

    return result;
  };

  const cancelTimer = () => {
    setTimerState({ 
        isRunning: false, 
        isPaused: false,
        startTime: null, 
        pauseStartTime: null, 
        accumulatedPause: 0 
      });
  };

  return {
    timerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    cancelTimer
  };
};