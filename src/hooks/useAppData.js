import { useMemo } from "react";
import { getHolidayData, toLocalDateString } from "../utils";
import { getWeekNumber, getTargetMinutesForDate } from "../utils/timeCalculations";
import { usePeriodStats } from "./usePeriodStats";

/**
 * Zentralisiert alle abgeleiteten/rechene Daten aus App.jsx
 * Logik bleibt gleich, aber mit weniger Rechenarbeit pro Render.
 */
export function useAppData({ entries, userData, viewMonth, viewYear }) {
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
        type: "public_holiday",
        date: dateStr,
        project: holidayMap[dateStr] || "Gesetzlicher Feiertag",
        netDuration: targetMin,
      });
    }

    return [...realEntries, ...holidayEntries].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, [entries, viewMonth, viewYear, userData]);

  const groupedByWeek = useMemo(() => {
    const map = new Map();

    entriesWithHolidays.forEach((entry) => {
      const week = getWeekNumber(new Date(entry.date));
      if (!map.has(week)) map.set(week, []);
      map.get(week).push(entry);
    });

    const groupedEntries = Array.from(map.entries());
    groupedEntries.forEach(([, list]) =>
      list.sort((a, b) => new Date(b.date) - new Date(a.date))
    );

    return groupedEntries.sort((a, b) => b[0] - a[0]);
  }, [entriesWithHolidays]);

  const periodStart = useMemo(
    () => new Date(viewYear, viewMonth, 1),
    [viewMonth, viewYear]
  );
  const periodEnd = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0),
    [viewMonth, viewYear]
  );

  const stats = usePeriodStats(entriesWithHolidays, userData, periodStart, periodEnd);
  const overtime = stats.totalSaldo;
  const progressPercent = Math.min(
    100,
    (stats.totalIst / (stats.totalTarget || 1)) * 100
  );

  const lastWorkEntry = useMemo(() => {
    let latestEntry = null;

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
      .map((entry) => entry.project.trim());

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
