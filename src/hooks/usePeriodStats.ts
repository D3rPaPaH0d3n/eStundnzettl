import { useMemo } from "react";
import type { Entry, UserData, CalculationConfig } from '../types';
import { calculatePeriodStats } from "../utils/timeCalculations";
import type { Locale } from "../locales/types";

/**
 * usePeriodStats — Memoisierter Wrapper um `calculatePeriodStats()`.
 *
 * Die teure Statistik-Berechnung (Arbeitszeit, Fahrtzeit, Urlaub,
 * Krank, Feiertage, Soll/Ist/Saldo, Mehrarbeit/Überstunden) wird
 * nur neu ausgeführt, wenn sich `entries`, `userData`,
 * `periodStart`, `periodEnd` oder `allEntries` ändern. Beim Rendern
 * von Dashboard+Report liefert das erhebliche Performance-Vorteile.
 *
 * Eingebaute Safety: wenn `periodStart`/`periodEnd` aus irgendeinem
 * Grund kein `Date` sind, wird auf `new Date()` (heute) gefallen.
 *
 * @param entries — Einträge des Zeitraums (bereits gefiltert)
 * @param userData — User-Profil mit workDays
 * @param periodStart — Start des Zeitraums (inklusive)
 * @param periodEnd — Ende des Zeitraums (inklusive)
 * @param allEntries — optional Roh-Liste aller Einträge über alle
 *   Monate. Wird für Wochen verwendet, die über die Periodengrenze
 *   hinausragen, damit Mehrarbeit/Überstunden aus der VOLLEN Woche
 *   berechnet werden.
 *
 * @returns `PeriodStatsResult` mit work, drive, holiday, vacation,
 * sick, timeComp, totalIst, totalTarget, totalSaldo, normalstunden,
 * overtimeSplit.
 */
export function usePeriodStats(
  entries: Entry[],
  userData: UserData,
  periodStart: Date,
  periodEnd: Date,
  allEntries?: Entry[],
  locale?: Locale,
  config?: CalculationConfig | null
) {
  return useMemo(() => {
    // Sicherstellen, dass Dates gültig sind, sonst Fallback auf heute
    const start = periodStart instanceof Date ? periodStart : new Date();
    const end = periodEnd instanceof Date ? periodEnd : new Date();

    return calculatePeriodStats(entries, userData, start, end, allEntries, locale, config);
  }, [entries, userData, periodStart, periodEnd, allEntries, locale, config]);
}
