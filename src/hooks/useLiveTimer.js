import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "./constants";

// Hilfsfunktion: Runden auf 15 Minuten
const roundToNearest15Minutes = (dateStrOrObj) => {
  if (!dateStrOrObj) return null;
  const date = new Date(dateStrOrObj);
  const minutes = date.getMinutes();
  const remainder = minutes % 15;
  
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
    const saved = localStorage.getItem(STORAGE_KEYS.LIVE_TIMER);
    return saved ? JSON.parse(saved) : { 
      isRunning: false, 
      isPaused: false,
      startTime: null, 
      pauseStartTime: null,
      accumulatedPause: 0 
    };
  });

  // NEU: State für das automatische Ausstempeln
  const [autoCheckoutData, setAutoCheckoutData] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LIVE_TIMER, JSON.stringify(timerState));
  }, [timerState]);

  // --- NEU: AUTO-CHECKOUT CHECK BEIM LADEN ---
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      const startDate = new Date(timerState.startTime);
      const now = new Date();

      // Prüfen, ob der Start-Tag NICHT heute ist (Tag, Monat oder Jahr anders)
      const isSameDay = startDate.getDate() === now.getDate() &&
                        startDate.getMonth() === now.getMonth() &&
                        startDate.getFullYear() === now.getFullYear();

      if (!isSameDay) {
        // AUTOMATISCHER STOPP!
        console.log("Auto-Checkout triggered: Start date was in the past.");
        
        // Endzeit auf 23:59 des Start-Tages setzen
        const autoEnd = new Date(startDate);
        autoEnd.setHours(23, 59, 0, 0);

        // Pause berechnen (falls wir über Nacht pausiert hätten, was unwahrscheinlich ist, aber sicher ist sicher)
        const pauseMinutes = Math.round((timerState.accumulatedPause || 0) / 1000 / 60);

        // Daten für die App bereitstellen
        setAutoCheckoutData({
          start: startDate,
          end: autoEnd,
          pause: pauseMinutes,
          isAutoCheckout: true
        });

        // Timer zurücksetzen
        setTimerState({ 
          isRunning: false, 
          isPaused: false,
          startTime: null, 
          pauseStartTime: null, 
          accumulatedPause: 0 
        });
      }
    }
  }, []); // Läuft nur einmal beim Mounten (App Start)

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
    
    let finalAccumulatedPauseMs = timerState.accumulatedPause || 0;
    if (timerState.isPaused && timerState.pauseStartTime) {
        finalAccumulatedPauseMs += (now - new Date(timerState.pauseStartTime));
    }
    const pauseMinutes = Math.round(finalAccumulatedPauseMs / 1000 / 60);

    const roundedStart = roundToNearest15Minutes(timerState.startTime);
    const roundedEnd = roundToNearest15Minutes(now);

    const result = {
      start: roundedStart, 
      end: roundedEnd,
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

  // Hilfsfunktion um die Daten zu "konsumieren" (damit der Effekt nicht looped)
  const clearAutoCheckout = () => setAutoCheckoutData(null);

  return {
    timerState,
    autoCheckoutData, // NEU exportiert
    clearAutoCheckout, // NEU exportiert
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    cancelTimer
  };
};