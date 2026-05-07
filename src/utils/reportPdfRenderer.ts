/**
 * reportPdfRenderer — headless Vector-PDF-Generator.
 *
 * Erzeugt das Monats-PDF ueber `@react-pdf/renderer` (`pdf().toBlob()`)
 * mit der gleichen React-Komponente wie die interaktive Vorschau
 * (`ReportPdfDocument`). Dadurch sieht das automatische Monats-PDF-
 * Archiv 1:1 wie der vom Nutzer manuell geteilte Stundenzettel aus.
 *
 * Vorteile gegenueber der vorherigen html2pdf.js+html2canvas-Pipeline:
 *  - kein Offscreen-DOM-Container, kein react-dom-Mount/Unmount
 *  - keine `requestAnimationFrame`-Wartezyklen, kein `waitForImages`
 *  - kein Memory-/Canvas-Limit auf Mobile (Vektor statt Raster)
 *  - kein Safety-Timeout-Pyramid (innerer + aeusserer)
 *
 * Die Archiv-spezifische Vorberechnung (Feiertags-Eintraege, Krank-
 * Korrektur, Stats) bleibt hier, damit `useAutoPdfArchive` die gleichen
 * Inputs wie zuvor weiterleiten kann.
 */

import React from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import ReportPdfDocument from "../components/ReportPdfDocument";
import {
  calculatePeriodStats,
  applyEffectiveDurations,
  getTargetMinutesForDate,
} from "./timeCalculations";
import { getHolidayData } from "../utils";
import { logger } from "./logger";
import type {
  Entry,
  UserData,
  WorkCode,
  Attachment,
  CalculationConfig,
} from "../types";
import type { Locale } from "../locales/types";

const log = logger.scope("ReportPdfRenderer");

/**
 * Erzeugt synthetische public_holiday-Eintraege fuer alle gesetzlichen
 * Feiertage eines Monats, die auf einen Arbeitstag fallen.
 * Identisch zur Logik in useAppData, aber ohne React-Hooks.
 */
const localDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function generateHolidayEntries(
  year: number,
  month: number,
  userData: UserData | null,
  locale?: Locale,
  config?: CalculationConfig | null,
  currentDate: Date = new Date(),
): Entry[] {
  const holidayMap = getHolidayData(year, locale, config);
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = localDateString(currentDate);
  const holidays: Entry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!holidayMap[dateStr] || dateStr > todayStr) continue;

    const targetMin = getTargetMinutesForDate(
      dateStr,
      userData?.workDays,
      locale,
      config,
    );
    if (targetMin <= 0) continue;

    holidays.push({
      id: `auto-holiday-${dateStr}`,
      type: "public_holiday" as const,
      date: dateStr,
      project: holidayMap[dateStr] || "Gesetzlicher Feiertag",
      pause: 0,
      netDuration: targetMin,
    } as Entry);
  }

  return holidays;
}

/** Sortiert und filtert Eintraege fuer den angegebenen Kalendermonat. */
function filterEntriesForMonth(
  entries: Entry[],
  year: number,
  month: number,
): Entry[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return (entries || [])
    .filter((e) => typeof e.date === "string" && e.date.startsWith(prefix))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.start || "").localeCompare(b.start || "");
    });
}

/**
 * Erzeugt das Monats-PDF als Blob ueber den react-pdf-Renderer.
 * Signatur kompatibel zur vorherigen Implementierung — Aufrufer
 * (pdfArchive.generateMonthlyPdfBlob) sind 1:1 austauschbar.
 */
export async function renderMonthlyReportPdfBlob({
  year,
  month,
  entries,
  userData,
  workCodes,
  attachments = [],
  customNote = "",
  locale,
  calculationConfig,
  currentDate,
}: {
  year: number;
  month: number;
  entries: Entry[];
  userData: UserData | null;
  workCodes: WorkCode[];
  attachments?: Attachment[];
  customNote?: string;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
  currentDate?: Date;
}): Promise<Blob> {
  if (!year || !month) {
    throw new Error("renderMonthlyReportPdfBlob: year/month fehlen");
  }

  // Feiertage ergaenzen, damit Soll/Ist korrekt berechnet werden
  const holidayEntries = generateHolidayEntries(
    year,
    month,
    userData,
    locale,
    calculationConfig,
    currentDate,
  );
  const entriesWithHolidays = [...entries, ...holidayEntries];

  // Krank-Korrektur einmal anwenden (Single Source of Truth)
  const correctedEntries = applyEffectiveDurations(
    entriesWithHolidays,
    userData,
    locale,
    calculationConfig,
  );
  const monthEntries = filterEntriesForMonth(correctedEntries, year, month);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  // `correctedEntries` ist die komplette Liste → als allEntries weiter,
  // damit Mehrarbeit/Ueberstunden an Monatsuebergaengen aus der VOLLEN
  // Woche berechnet werden.
  const stats = calculatePeriodStats(
    monthEntries,
    userData,
    periodStart,
    periodEnd,
    correctedEntries,
    locale,
    calculationConfig,
  );
  const monthDate = new Date(year, month - 1, 1);

  try {
    const element = React.createElement(ReportPdfDocument, {
      entries: monthEntries,
      userData: userData ?? undefined,
      monthDate,
      filterMode: "month",
      stats,
      workCodes,
      attachments,
      customNote,
      locale,
      calculationConfig,
      allEntries: correctedEntries,
    }) as React.ReactElement<DocumentProps>;
    const blob = await pdf(element).toBlob();
    return blob;
  } catch (err) {
    log.error("renderMonthlyReportPdfBlob failed:", err);
    throw err;
  }
}
