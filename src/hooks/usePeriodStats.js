import { useMemo } from "react";
import { calculatePeriodStats } from "../utils/timeCalculations";

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
export function usePeriodStats(entries, userData, periodStart, periodEnd, allEntries) {
  return useMemo(() => {
    // Sicherstellen, dass Dates gültig sind, sonst Fallback auf heute
    const start = periodStart instanceof Date ? periodStart : new Date();
    const end = periodEnd instanceof Date ? periodEnd : new Date();

    return calculatePeriodStats(entries, userData, start, end, allEntries);
  }, [entries, userData, periodStart, periodEnd, allEntries]);
}
