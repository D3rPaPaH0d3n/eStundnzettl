// @ts-nocheck
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
import { calculatePeriodStats } from "./timeCalculations";
import { TimeEntry } from "../types";
import { logger } from "./logger";
import { Entry, UserData, WorkCode, Attachment } from "../types";

const log = logger.scope("ReportPdfRenderer");

const A4_WIDTH_PX = 794; // 210mm bei 96dpi — identisch zur Vorschau
const WAIT_FOR_IMAGES_TIMEOUT_MS = 4000;

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
function waitForImages(root: HTMLElement): Promise<void> {
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
    Promise.all(promises).then(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, WAIT_FOR_IMAGES_TIMEOUT_MS)),
  ]);
}

interface RenderMonthlyReportPdfBlobParams {
  year: number;
  month: number;
  entries: Entry[];
  userData?: UserData;
  workCodes?: WorkCode[];
  attachments?: Attachment[];
  customNote?: string;
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
}: RenderMonthlyReportPdfBlobParams): Promise<Blob> {
  if (!year || !month) {
    throw new Error("renderMonthlyReportPdfBlob: year/month fehlen");
  }

  const monthEntries = filterEntriesForMonth(entries, year, month);
  // Konvertiere Entry zu TimeEntry (was calculatePeriodStats erwartet)
  const entriesForCalc: TimeEntry[] = monthEntries.map(entry => ({
    id: entry.id,
    date: new Date(entry.date),
    start: entry.start ? new Date(`1970-01-01T${entry.start}:00`) : new Date(),
    end: entry.end ? new Date(`1970-01-01T${entry.end}:00`) : new Date(),
    pauseMinutes: entry.pause,
    workCodeId: entry.code?.toString() || null,
    description: "",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const stats = calculatePeriodStats(entriesForCalc as any, userData);

  const host = createOffscreenContainer();
  const root = createRoot(host);

  try {
    // React-Komponente rendern
    root.render(
      React.createElement(ReportDocument, {
        year,
        month,
        entries: monthEntries,
        userData,
        workCodes,
        attachments,
        stats,
        customNote,
        isPreview: false,
      })
    );

    // Warten, bis React den DOM aktualisiert hat
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    // Auf Bilder warten
    await waitForImages(host);

    // PDF generieren
    const pdfBlob = await new Promise<Blob>((resolve, reject) => {
      const opt = {
        margin: 0,
        filename: `Stundenzettel_${year}-${String(month).padStart(2, "0")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      html2pdf()
        .from(host)
        .set(opt)
        .toPdf()
        .get("pdf")
        .then((pdf: any) => {
          const blob = pdf.output("blob");
          resolve(blob);
        })
        .catch((err: any) => {
          log.error("html2pdf fehlgeschlagen:", err);
          reject(new Error(`PDF-Generierung fehlgeschlagen: ${err?.message || err}`));
        });
    });

    return pdfBlob;
  } finally {
    // Aufraeumen
    root.unmount();
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}