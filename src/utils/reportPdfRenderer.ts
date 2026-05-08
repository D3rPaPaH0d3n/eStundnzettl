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
} from "./timeCalculations";
import { logger } from "./logger";
import { generateHolidayEntries } from "./holidayEntries";
export { generateHolidayEntries } from "./holidayEntries";
import type {
  Entry,
  UserData,
  WorkCode,
  Attachment,
  CalculationConfig,
} from "../types";
import type { Locale } from "../locales/types";

const log = logger.scope("ReportPdfRenderer");

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
