import { useState, useEffect } from "react";
import type { TimerState, AutoCheckoutData } from '../types';
import { STORAGE_KEYS } from "./constants";

const toMinutePrecision = (dateStrOrObj: string | Date | null): Date | null => {
  if (!dateStrOrObj) return null;
  const date = new Date(dateStrOrObj);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date; 
};

/**
 * useLiveTimer — Live-Zeiterfassung mit Pause/Resume/Auto-Checkout.
 *
 * Verwaltet den Zustand einer laufenden Arbeitszeitmessung (Start/Pause/Stopp)
 * und persistiert ihn in localStorage unter `STORAGE_KEYS.LIVE_TIMER`, damit
 * ein App-Restart den Timer nicht vergisst. Start- und End-Zeit werden beim
 * Abschluss minutengenau gespeichert.
 *
 * ### Auto-Checkout
 * Wird die App über mehrere Tage vergessen (Timer läuft noch), erzeugt
 * `stopTimer` statt eines normalen Ergebnisses ein `AutoCheckoutData`-Objekt
 * mit `isAutoCheckout: true`. `useAutoCheckoutHandler` konsumiert das,
 * befüllt das Formular und navigiert zur Eingabe-Ansicht. Der Verbraucher
 * muss `clearAutoCheckout()` aufrufen, sobald er die Daten übernommen hat —
 * sonst loopt der Effekt.
 *
 * ### Return
 * - `timerState` — aktueller Zustand (isRunning, isPaused, startTime,
 *   pauseStartTime, accumulatedPause)
 * - `autoCheckoutData` — nicht-null wenn ein Auto-Checkout fällig ist
 * - `clearAutoCheckout()` — setzt autoCheckoutData auf null
 * - `startTimer()` — startet einen neuen Timer (Start = jetzt)
 * - `pauseTimer()` — pausiert einen laufenden Timer
 * - `resumeTimer()` — setzt einen pausierten Timer fort, akkumuliert Pause
 * - `stopTimer()` — beendet Timer, gibt { start, end, pause } in Minuten
 *   zurück oder liefert AutoCheckoutData bei mehreren Tagen Laufzeit
 * - `cancelTimer()` — verwirft laufenden Timer ohne Rückgabe
 *
 * @remarks
 * Der Hook nimmt bewusst keine Props entgegen — er ist ein reiner
 * State-Container und kennt weder Einträge noch UserData.
 */
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
    // Läuft nur einmal beim Mounten (App Start). Re-running this when
    // timerState changes would risk re-triggering auto-checkout on a fresh
    // timer start — we only want to detect the "started on a past day"
    // case once, on hydration from localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!timerState.isPaused || !timerState.pauseStartTime) return;
    const now = new Date();
    const pauseStart = new Date(timerState.pauseStartTime);
    const pauseDiffMs = now.getTime() - pauseStart.getTime();

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
        finalAccumulatedPauseMs += (now.getTime() - new Date(timerState.pauseStartTime).getTime());
    }
    const pauseMinutes = Math.round(finalAccumulatedPauseMs / 1000 / 60);

    const roundedStart = toMinutePrecision(timerState.startTime);
    const roundedEnd = toMinutePrecision(now);

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
