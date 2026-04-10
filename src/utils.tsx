/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { APP_VERSION } from "./hooks/constants";
import {
  parseTime,
  getTargetMinutesForDate,
  getWeekNumber,
  calculateOvertimeSplit,
  calculatePeriodStats,
  getWeekRangeInMonth,
  calculateWeekStats,
} from "./utils/timeCalculations";
import type { Locale } from "./locales/types";
import { getLocale } from "./locales";

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
  title?: string;
  icon?: React.ReactNode;
}

export const Card = ({ children, className = "" }: CardProps) => (
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
// FEIERTAGE (delegiert an das Locale-System)
// -------------------------------------------------------
/**
 * Liefert die Feiertage eines Jahres für eine Locale.
 * Ohne Locale-Parameter wird die Default-Locale (Österreich) genutzt,
 * damit bestehende Aufrufer unverändert funktionieren.
 */
export const getHolidayData = (
  year: number,
  locale?: Locale
): Record<string, string> => {
  return (locale ?? getLocale(undefined)).getHolidays(year);
};

// -------------------------------------------------------
// UPDATE CHECKER
// -------------------------------------------------------

const _compareVersions = (v1: string, v2: string): number => {
  const cleanV1 = v1.replace(/[^0-9.]/g, "");
  const cleanV2 = v2.replace(/[^0-9.]/g, "");

  const parts1 = cleanV1.split(".").map(Number);
  const parts2 = cleanV2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }
  return 0;
};

export const checkForUpdate = async (): Promise<null> => {
  return null;
};
