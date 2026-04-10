import { useMemo } from "react";
import type { Entry, UserData } from '../types';
import { getHolidayData, toLocalDateString } from "../utils";
import { getWeekNumber, getTargetMinutesForDate, applyEffectiveDurations } from "../utils/timeCalculations";
import { usePeriodStats } from "./usePeriodStats";

/**
 * useAppData — Zentralisierte, memoisierte Ableitungen aus
 * `entries` + `userData` für den aktuellen Anzeige-Monat.
 *
 * Bündelt alle von App/Dashboard/Settings benötigten Rechenergebnisse
 * an einer Stelle, sodass teure Berechnungen (Holiday-Synthese,
 * Period-Stats, Überstunden-Split, Projekt-Dedup) pro Render nur
 * einmal durchlaufen und nicht über mehrere Komponenten verstreut
 * wiederholt werden.
 *
 * @param entries — Einträge des aktuellen Anzeige-Monats
 * @param userData — User-Profil mit workDays (für Sollzeit-Berechnung)
 * @param viewMonth — 0-basiert (0 = Januar)
 * @param viewYear — vollständige Jahreszahl
 * @param allEntries — optional alle Einträge aller Monate. Wird für
 *   Wochen an Monatsgrenzen benötigt, um Mehrarbeit/Überstunden aus
 *   der vollständigen Woche zu berechnen (nicht nur dem sichtbaren
 *   Teil im Monat).
 *
 * @returns
 * - `entriesWithHolidays` — Einträge + synthetische public_holiday
 *   Einträge aus `getHolidayData()` (nur vergangene Feiertage)
 * - `groupedByWeek` — Map-Einträge `[weekNumber, Entry[]]` sortiert
 * - `stats` — PeriodStatsResult aus `usePeriodStats`
 * - `overtime` — totalSaldo aus stats (Shortcut)
 * - `progressPercent` — 0-100 für Progress-Bar
 * - `todayTarget` — Soll-Minuten für den heutigen Wochentag
 * - `lastWorkEntry` — letzter Work-Eintrag (für "Wie zuletzt"-Button)
 * - `uniqueProjects` — sortierte Liste aller Projekt-Namen (Autocomplete)
 */
export function useAppData({ entries, userData, viewMonth, viewYear, allEntries }: { entries: Entry[]; userData: UserData; viewMonth: number; viewYear: number; allEntries?: Entry[] }) {
  const todayTarget = useMemo(() => {
    const todayStr = toLocalDateString(new Date());
    return getTargetMinutesForDate(todayStr, userData?.workDays);
  }, [userData]);

  const entriesWithHolidays = useMemo(() => {
    const holidayMap = getHolidayData(viewYear);
    const todayStr = toLocalDateString(new Date());
    const realEntries = entries.filter((entry) => {
      const date = new Date(entry.date);
      return date.getFullYear() === viewYear && date.getMonth() === viewMonth;
    });

    const holidayEntries = [];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (!holidayMap[dateStr] || dateStr > todayStr) continue;

      const targetMin = getTargetMinutesForDate(dateStr, userData?.workDays);
      if (targetMin <= 0) continue;

      holidayEntries.push({
        id: `auto-holiday-${dateStr}`,
        type: "public_holiday" as const,
        date: dateStr,
        project: holidayMap[dateStr] || "Gesetzlicher Feiertag",
        pause: 0,
        netDuration: targetMin,
      });
    }

    const merged = [...realEntries, ...holidayEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // SINGLE SOURCE OF TRUTH: Krank-Korrektur einmal anwenden.
    // Alle Downstream-Funktionen (Stats, Dashboard, PDF) arbeiten mit
    // den korrigierten netDuration-Werten.
    return applyEffectiveDurations(merged, userData);
  }, [entries, viewMonth, viewYear, userData]);

  // Wochen-Nummern die in diesem Monat vorkommen (für Übergangswochen)
  const weekNumbersInMonth = useMemo(() => {
    const weeks = new Set();
    entriesWithHolidays.forEach((entry) => {
      weeks.add(getWeekNumber(new Date(entry.date)));
    });
    return weeks;
  }, [entriesWithHolidays]);

  // allEntries ebenfalls korrigieren (für Boundary-Wochen und Stats)
  const correctedAllEntries = useMemo(
    () => allEntries ? applyEffectiveDurations(allEntries, userData) : undefined,
    [allEntries, userData]
  );

  // Für Übergangswochen: Entries aus Nachbarmonaten ergänzen,
  // damit calculateWeekStats die volle Woche (Mo-So) berechnen kann.
  const groupedByWeek = useMemo(() => {
    const map = new Map();

    // 1. Alle Einträge des aktuellen Monats gruppieren
    entriesWithHolidays.forEach((entry) => {
      const week = getWeekNumber(new Date(entry.date));
      if (!map.has(week)) map.set(week, []);
      map.get(week).push(entry);
    });

    // 2. Für jede Woche im Monat: fehlende Tage aus correctedAllEntries ergänzen
    if (correctedAllEntries && correctedAllEntries.length > 0) {
      const monthEntryIds = new Set(entriesWithHolidays.map((e) => e.id));

      correctedAllEntries.forEach((entry) => {
        if (monthEntryIds.has(entry.id)) return; // Schon enthalten
        const week = getWeekNumber(new Date(entry.date));
        if (!weekNumbersInMonth.has(week)) return; // Woche nicht in diesem Monat
        if (!map.has(week)) map.set(week, []);
        map.get(week).push(entry);
      });
    }

    const groupedEntries = Array.from(map.entries());
    groupedEntries.forEach(([, list]) =>
      list.sort((a: Entry, b: Entry) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );

    return groupedEntries.sort((a: [number, Entry[]], b: [number, Entry[]]) => b[0] - a[0]);
  }, [entriesWithHolidays, correctedAllEntries, weekNumbersInMonth]);

  const periodStart = useMemo(
    () => new Date(viewYear, viewMonth, 1),
    [viewMonth, viewYear]
  );
  const periodEnd = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0),
    [viewMonth, viewYear]
  );

  const stats = usePeriodStats(entriesWithHolidays, userData, periodStart, periodEnd, correctedAllEntries);
  const overtime = stats.totalSaldo;
  const progressPercent = Math.min(
    100,
    (stats.totalIst / (stats.totalTarget || 1)) * 100
  );

  const lastWorkEntry = useMemo(() => {
    let latestEntry: Entry | null = null;

    entries.forEach((entry) => {
      if (entry.type !== "work") return;
      if (!latestEntry) {
        latestEntry = entry;
        return;
      }

      const currentKey = `${entry.date}|${entry.id}`;
      const latestKey = `${latestEntry.date}|${latestEntry.id}`;
      if (currentKey > latestKey) {
        latestEntry = entry;
      }
    });

    return latestEntry;
  }, [entries]);

  const uniqueProjects = useMemo(() => {
    const projects = entries
      .filter((entry) => entry.type === "work" && entry.project?.trim())
      .map((entry) => entry.project!.trim());

    return [...new Set(projects)].sort();
  }, [entries]);

  return {
    entriesWithHolidays,
    groupedByWeek,
    stats,
    overtime,
    progressPercent,
    todayTarget,
    lastWorkEntry,
    uniqueProjects,
  };
}
