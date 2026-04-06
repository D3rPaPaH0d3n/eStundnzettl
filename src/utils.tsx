/* eslint-disable react-refresh/only-export-components */
import React from "react";

import {
  parseTime,
  getTargetMinutesForDate,
  getWeekNumber,
  calculateOvertimeSplit,
  calculatePeriodStats,
  getWeekRangeInMonth,
  calculateWeekStats,
} from "./utils/timeCalculations";

// -------------------------------------------------------
// HELPER-FUNKTIONEN
// -------------------------------------------------------

export const toLocalHHMM = (dateObj: Date): string => {
  const h = String(dateObj.getHours()).padStart(2, '0');
  const m = String(dateObj.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div
    className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

export const formatTime = (minutes: number): string => {
  const abs = Math.max(0, Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

export const formatSignedTime = (minutes: number): string => {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
};

export { parseTime, getTargetMinutesForDate, getWeekNumber };

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export { calculateOvertimeSplit, calculatePeriodStats };

// -------------------------------------------------------
// -------------------------------------------------------

/**
 * Berechnet den Start- und End-Tag einer Woche (Mo-So)
 * und kappt das Ganze, falls es über die Monatsgrenze des 'viewDate' hinausgeht.
 */
export { getWeekRangeInMonth, calculateWeekStats };

// -------------------------------------------------------
// FEIERTAGE
// -------------------------------------------------------
export const getHolidayData = (year: number): Record<string, string> => {
  const addDays = (date: Date, days: number): string => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return toLocalDateString(d);
  };

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(year, month - 1, day);

  const holidays: Record<string, string> = {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-01-06`]: "Heilige Drei Könige",
    [addDays(easterDate, 1)]: "Ostermontag",
    [`${year}-05-01`]: "Staatsfeiertag",
    [addDays(easterDate, 39)]: "Christi Himmelfahrt",
    [addDays(easterDate, 50)]: "Pfingstmontag",
    [addDays(easterDate, 60)]: "Fronleichnam",
    [`${year}-08-15`]: "Mariä Himmelfahrt",
    [`${year}-10-26`]: "Nationalfeiertag",
    [`${year}-11-01`]: "Allerheiligen",
    [`${year}-12-08`]: "Mariä Empfängnis",
    [`${year}-12-25`]: "Christtag",
    [`${year}-12-26`]: "Stefanitag",
  };

  return holidays;
};

// -------------------------------------------------------
// UPDATE CHECKER
// -------------------------------------------------------

// _compareVersions function removed - unused

export const checkForUpdate = async (): Promise<null> => {
  return null;
};
