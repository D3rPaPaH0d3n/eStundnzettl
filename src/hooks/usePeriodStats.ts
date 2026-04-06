import { useMemo } from "react";
import { calculatePeriodStats } from "../utils/timeCalculations";
import type { Entry, UserData } from "../types";

/**
 * Custom Hook zur Berechnung der Zeit-Statistiken für einen Zeitraum.
 * Nutzt 'calculatePeriodStats' aus utils und cached das Ergebnis.
 *
 * @param allEntries optional — Roh-Liste aller Eintraege (ueber alle
 *                   Monate hinweg). Wird fuer Wochen verwendet, die
 *                   ueber die Periodengrenze hinausragen, damit
 *                   Mehrarbeit/Ueberstunden aus der VOLLEN Woche
 *                   berechnet werden.
 */
export function usePeriodStats(
  entries: Entry[], 
  userData: UserData | null, 
  periodStart: Date, 
  periodEnd: Date, 
  allEntries?: Entry[]
) {
  return useMemo(() => {
    // Sicherstellen, dass Dates gültig sind, sonst Fallback auf heute
    const start = periodStart instanceof Date ? periodStart : new Date();
    const end = periodEnd instanceof Date ? periodEnd : new Date();

    // Convert Entry[] to EntryForCalculation[]
    const entriesForCalc: any[] = entries.map(e => ({
      ...e,
      date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date, // Convert Date to YYYY-MM-DD
      type: e.type || 'work', // Default to 'work' if undefined
      code: e.code ?? undefined,
      netDuration: e.netDuration,
      start: e.start instanceof Date ? e.start.toISOString().split('T')[1].substring(0, 5) : e.start ?? undefined, // Convert Date to HH:MM
      end: e.end instanceof Date ? e.end.toISOString().split('T')[1].substring(0, 5) : e.end ?? undefined, // Convert Date to HH:MM
      pauseMinutes: 0, // Default value
      workCodeId: null,
      description: '',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    const allEntriesForCalc = allEntries?.map(e => ({
      ...e,
      date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date, // Convert Date to YYYY-MM-DD
      type: e.type || 'work', // Default to 'work' if undefined
      code: e.code ?? undefined,
      netDuration: e.netDuration,
      start: e.start instanceof Date ? e.start.toISOString().split('T')[1].substring(0, 5) : e.start ?? undefined, // Convert Date to HH:MM
      end: e.end instanceof Date ? e.end.toISOString().split('T')[1].substring(0, 5) : e.end ?? undefined, // Convert Date to HH:MM
      pauseMinutes: 0,
      workCodeId: null,
      description: '',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    return calculatePeriodStats(entriesForCalc, userData || undefined, start, end, allEntriesForCalc);
  }, [entries, userData, periodStart, periodEnd, allEntries]);
}
