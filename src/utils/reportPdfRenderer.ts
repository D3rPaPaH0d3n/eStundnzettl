/**
 * reportPdfRenderer — headless PDF-Generator, der die gleiche
 * React-Komponente wie die interaktive Vorschau verwendet
 * (`ReportDocument`). Dadurch sieht das automatische Monats-PDF-Archiv
 * 1:1 wie der vom Nutzer manuell geteilte Stundenzettel aus.
 *
 * Funktionsweise:
 *  1. Einen A4-groessen Offscreen-Container im DOM anlegen (visuell
 *     versteckt, aber vom Browser gelayoutet — `display:none` waere
 *     fatal fuer html2canvas).
 *  2. `ReportDocument` via createRoot dort hineinrendern.
 *  3. Warten, bis alle enthaltenen Bilder (Mitarbeiterfoto) geladen
 *     sind, damit html2canvas nichts leeres uebernimmt.
 *  4. html2pdf.js darauf anwenden → Blob zurueckgeben.
 *  5. Container wieder vollstaendig abraeumen.
 *
 * Die ReportDocument-Komponente bleibt rein Props-basiert; samtliche
 * Statistiken werden hier einmalig vorberechnet (calculatePeriodStats),
 * damit der Renderer keine React-Hooks benoetigt.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import html2pdf from "html2pdf.js";
import ReportDocument from "../components/ReportDocument";
import { calculatePeriodStats, applyEffectiveDurations, getTargetMinutesForDate } from "./timeCalculations";
import { getHolidayData } from "../utils";
import { logger } from "./logger";
import type { Entry, UserData, WorkCode, Attachment, Html2PdfOptions, CalculationConfig } from '../types';
import type { Locale } from "../locales/types";

const log = logger.scope("ReportPdfRenderer");

const A4_WIDTH_PX = 794; // 210mm bei 96dpi — identisch zur Vorschau
const WAIT_FOR_IMAGES_TIMEOUT_MS = 4000;
// Bewusst < 30s vom Aufrufer-Timeout in pdfArchive.generateMonthlyPdfBlob:
// so feuert der innere Timeout zuerst, das try/finally kann den Offscreen-
// Container abräumen, statt dass der äußere Timeout den Aufrufer befreit
// während der host im DOM hängenbleibt.
const HTML2PDF_TIMEOUT_MS = 25000;

/**
 * Erzeugt synthetische public_holiday-Eintraege fuer alle gesetzlichen
 * Feiertage eines Monats, die auf einen Arbeitstag fallen.
 * Identisch zur Logik in useAppData, aber ohne React-Hooks.
 */
function generateHolidayEntries(
  year: number,
  month: number,
  userData: UserData | null,
  locale?: Locale,
  config?: CalculationConfig | null
): Entry[] {
  const holidayMap = getHolidayData(year, locale, config);
  const daysInMonth = new Date(year, month, 0).getDate();
  const holidays: Entry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!holidayMap[dateStr]) continue;

    const targetMin = getTargetMinutesForDate(dateStr, userData?.workDays, locale, config);
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
function filterEntriesForMonth(entries: Entry[], year: number, month: number): Entry[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return (entries || [])
    .filter((e) => typeof e.date === "string" && e.date.startsWith(prefix))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.start || "").localeCompare(b.start || "");
    });
}

/**
 * Legt einen offscreen sichtbaren A4-Container an. Wir positionieren
 * ihn absolut weit ausserhalb des Viewports statt `display:none`, damit
 * html2canvas die Elemente sehen und ausmessen kann.
 */
function createOffscreenContainer(): HTMLDivElement {
  const host = document.createElement("div");
  host.setAttribute("data-role", "report-pdf-host");
  Object.assign(host.style, {
    position: "fixed",
    top: "0",
    left: "-99999px",
    width: `${A4_WIDTH_PX}px`,
    minHeight: "1123px", // 297mm @ 96dpi
    backgroundColor: "#ffffff",
    zIndex: "-1",
    pointerEvents: "none",
    // wichtig: kein "visibility:hidden" → html2canvas rendert sonst nichts
  });
  document.body.appendChild(host);
  return host;
}

/** Wartet, bis alle `<img>`-Elemente im Container fertig geladen (oder fehlgeschlagen) sind. */
function waitForImages(root: HTMLElement): Promise<unknown> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  const promises = imgs.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  });
  return Promise.race([
    Promise.all(promises),
    new Promise((resolve) => setTimeout(resolve, WAIT_FOR_IMAGES_TIMEOUT_MS)),
  ]);
}

/**
 * Erzeugt das Monats-PDF als Blob, optisch identisch zum interaktiven
 * PrintReport. Signatur absichtlich kompatibel zu `generateMonthlyPdfBlob`
 * aus pdfArchive.js, damit Aufrufer 1:1 austauschbar sind.
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
}): Promise<Blob> {
  if (!year || !month) {
    throw new Error("renderMonthlyReportPdfBlob: year/month fehlen");
  }

  // Feiertage ergaenzen, damit Soll/Ist korrekt berechnet werden
  const holidayEntries = generateHolidayEntries(year, month, userData, locale, calculationConfig);
  const entriesWithHolidays = [...entries, ...holidayEntries];

  // Krank-Korrektur einmal anwenden (Single Source of Truth)
  const correctedEntries = applyEffectiveDurations(entriesWithHolidays, userData, locale, calculationConfig);
  const monthEntries = filterEntriesForMonth(correctedEntries, year, month);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  // `correctedEntries` ist die komplette Liste → als allEntries weiter,
  // damit Mehrarbeit/Ueberstunden an Monatsuebergaengen aus der VOLLEN Woche berechnet werden.
  const stats = calculatePeriodStats(monthEntries, userData, periodStart, periodEnd, correctedEntries, locale, calculationConfig);
  const monthDate = new Date(year, month - 1, 1);

  const host = createOffscreenContainer();
  const root = createRoot(host);
  let html2pdfTimeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(ReportDocument, {
          entries: monthEntries,
          userData,
          monthDate,
          filterMode: "month",
          stats,
          workCodes,
          attachments,
          customNote,
          locale,
          calculationConfig,
          allEntries: correctedEntries,
        } as Record<string, unknown>)
      );
      // requestAnimationFrame * 2 stellt sicher, dass React committed
      // und das Layout vom Browser berechnet wurde.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    await waitForImages(host);

    const element = host.querySelector("#report-to-print");
    if (!element) {
      throw new Error("ReportDocument-Container nicht gefunden");
    }

    const opt: Html2PdfOptions = {
      margin: 5,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        windowWidth: A4_WIDTH_PX,
        scrollY: 0,
        backgroundColor: "#ffffff",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: "css" },
    };

    const html2pdfPromise = html2pdf()
      .set(opt)
      .from(element as HTMLElement)
      .output("blob");
    const html2pdfTimeoutPromise = new Promise<never>((_, reject) => {
      html2pdfTimeoutHandle = setTimeout(
        () => reject(new Error(`html2pdf Timeout (${HTML2PDF_TIMEOUT_MS}ms)`)),
        HTML2PDF_TIMEOUT_MS,
      );
    });
    const blob = await Promise.race([html2pdfPromise, html2pdfTimeoutPromise]);
    return blob;
  } catch (err) {
    log.error("renderMonthlyReportPdfBlob failed:", err);
    throw err;
  } finally {
    clearTimeout(html2pdfTimeoutHandle);
    try {
      root.unmount();
    } catch (e) {
      log.warn("root.unmount failed:", e);
    }
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}
