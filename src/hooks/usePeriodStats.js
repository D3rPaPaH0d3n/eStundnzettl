import { useMemo } from "react";
import { calculatePeriodStats } from "../utils";

/**
 * Custom Hook zur Berechnung der Zeit-Statistiken für einen Zeitraum.
 * Nutzt 'calculatePeriodStats' aus utils und cached das Ergebnis.
 */
export function usePeriodStats(entries, userData, periodStart, periodEnd) {
  return useMemo(() => {
    // Sicherstellen, dass Dates gültig sind, sonst Fallback auf heute
    const start = periodStart instanceof Date ? periodStart : new Date();
    const end = periodEnd instanceof Date ? periodEnd : new Date();
    
    return calculatePeriodStats(entries, userData, start, end);
  }, [entries, userData, periodStart, periodEnd]);
}