import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "./constants";
import type { TimerResult } from "../types";

// Hilfsfunktion: Runden auf 15 Minuten
const roundToNearest15Minutes = (dateStrOrObj: string | Date | null): Date | null => {
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

type TimerState = {
  isRunning: boolean;
  isPaused: boolean;
  startTime: string | null;
  pauseStartTime: string | null;
  accumulatedPause: number;
};

type AutoCheckoutData = {
  start: Date;
  end: Date;
  pause: number;
  isAutoCheckout: boolean;
  daysMissed: number;
};

export const useLiveTimer = () => {
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LIVE_TIMER);
    return saved ? JSON.parse(saved) : { 
      isRunning: false, 
      isPaused: false,
      startTime: null, 
      pauseStartTime: null,
      accumulatedPause: 0 
    };
  });

  const [autoCheckoutData, setAutoCheckoutData] = useState<AutoCheckoutData | null>(null);

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
        // Auto-stop: timer started on a past day — close it out at 23:59
        const autoEnd = new Date(startDate);
        autoEnd.setHours(23, 59, 0, 0);

        const pauseMinutes = Math.round((timerState.accumulatedPause || 0) / 1000 / 60);

        // Berechne wie viele Tage übersprungen wurden
        const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        setAutoCheckoutData({
          start: startDate,
          end: autoEnd,
          pause: pauseMinutes,
          isAutoCheckout: true,
          daysMissed: daysDiff, // Ermöglicht UI-Hinweis wenn > 1 Tag übersprungen
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

  const startTimer = (): void => {
    setTimerState({
      isRunning: true,
      isPaused: false,
      startTime: new Date().toISOString(),
      pauseStartTime: null,
      accumulatedPause: 0
    });
  };

  const pauseTimer = (): void => {
    if (!timerState.isRunning || timerState.isPaused) return;
    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      pauseStartTime: new Date().toISOString()
    }));
  };

  const resumeTimer = (): void => {
    if (!timerState.isPaused) return;
    const now = new Date();
    const pauseStart = new Date(timerState.pauseStartTime!);
    const pauseDiffMs = now.getTime() - pauseStart.getTime();

    setTimerState(prev => ({
      ...prev,
      isPaused: false,
      pauseStartTime: null,
      accumulatedPause: (prev.accumulatedPause || 0) + pauseDiffMs
    }));
  };

  const stopTimer = (): TimerResult => {
    const now = new Date();
    
    let finalAccumulatedPauseMs = timerState.accumulatedPause || 0;
    if (timerState.isPaused && timerState.pauseStartTime) {
        finalAccumulatedPauseMs += (now.getTime() - new Date(timerState.pauseStartTime).getTime());
    }
    const pauseMinutes = Math.round(finalAccumulatedPauseMs / 1000 / 60);

    const roundedStart = roundToNearest15Minutes(timerState.startTime);
    const roundedEnd = roundToNearest15Minutes(now);

    const result: TimerResult = {
      start: roundedStart!, 
      end: roundedEnd!,
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

  const cancelTimer = (): void => {
    setTimerState({ 
        isRunning: false, 
        isPaused: false,
        startTime: null, 
        pauseStartTime: null, 
        accumulatedPause: 0 
      });
  };

  // Hilfsfunktion um die Daten zu "konsumieren" (damit der Effekt nicht looped)
  const clearAutoCheckout = (): void => setAutoCheckoutData(null);

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