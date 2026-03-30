import { useState, useEffect, useMemo } from "react";
import { getHolidayData, toLocalDateString } from "../utils";
import { getWeekNumber, getTargetMinutesForDate } from "../utils/timeCalculations";
import { usePeriodStats } from "./usePeriodStats";

/**
 * Zentralisiert alle abgeleiteten/rechene Daten aus App.jsx
 * Logik 1:1 verschoben, keine funktionalen Änderungen.
 */
export function useAppData({ entries, userData, viewMonth, viewYear }) {

  // Sollzeit für HEUTE berechnen (für das Overlay)
  const [todayTarget, setTodayTarget] = useState(510);

  useEffect(() => {
    const todayStr = toLocalDateString(new Date());
    const target = getTargetMinutesForDate(todayStr, userData?.workDays);
    setTodayTarget(target);
  }, [userData]);

  // --- ENTRIES MIT FEIERTAGEN ---
  const entriesWithHolidays = useMemo(() => {
    const holidayMap = getHolidayData(viewYear);
    const holidays = Object.keys(holidayMap);
    const realEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
    const today = new Date();
    const todayStr = toLocalDateString(today);

    const holidayEntries = [];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (holidays.includes(dateStr)) {
        if (dateStr <= todayStr) {
          const targetMin = getTargetMinutesForDate(dateStr, userData?.workDays);
          if (targetMin > 0) {
            holidayEntries.push({
              id: `auto-holiday-${dateStr}`,
              type: "public_holiday",
              date: dateStr,
              project: holidayMap[dateStr] || "Gesetzlicher Feiertag",
              netDuration: targetMin,
            });
          }
        }
      }
    }
    return [...realEntries, ...holidayEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, viewYear, viewMonth, userData]);

  // --- NACH WOCHEN GRUPPIERT ---
  const groupedByWeek = useMemo(() => {
    const map = new Map();
    entriesWithHolidays.forEach((e) => {
      const w = getWeekNumber(new Date(e.date));
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(e);
    });
    const arr = Array.from(map.entries());
    arr.forEach(([, list]) => list.sort((a, b) => new Date(b.date) - new Date(a.date)));
    return arr.sort((a, b) => b[0] - a[0]);
  }, [entriesWithHolidays]);

  // --- STATISTIK ---
  const periodStart = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const periodEnd = useMemo(() => new Date(viewYear, viewMonth + 1, 0), [viewYear, viewMonth]);

  const stats = usePeriodStats(entriesWithHolidays, userData, periodStart, periodEnd);

  const overtime = stats.totalSaldo;
  const progressPercent = Math.min(100, (stats.totalIst / (stats.totalTarget || 1)) * 100);

  // --- LETZTER WORK-EINTRAG ---
  const lastWorkEntry = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).find((e) => e.type === "work");
  }, [entries]);

  // --- UNIQUE PROJECTS ---
  const uniqueProjects = useMemo(() => {
    const projects = entries
      .filter((e) => e.type === "work" && e.project?.trim())
      .map((e) => e.project.trim());
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
