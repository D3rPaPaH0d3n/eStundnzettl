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
import { logger } from "./logger";

const log = logger.scope("ReportPdfRenderer");

const A4_WIDTH_PX = 794; // 210mm bei 96dpi — identisch zur Vorschau
const WAIT_FOR_IMAGES_TIMEOUT_MS = 4000;

/** Sortiert und filtert Eintraege fuer den angegebenen Kalendermonat. */
function filterEntriesForMonth(entries, year, month) {
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
function createOffscreenContainer() {
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
function waitForImages(root) {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  const promises = imgs.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
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
}) {
  if (!year || !month) {
    throw new Error("renderMonthlyReportPdfBlob: year/month fehlen");
  }

  const monthEntries = filterEntriesForMonth(entries, year, month);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  const stats = calculatePeriodStats(monthEntries, userData, periodStart, periodEnd);
  const monthDate = new Date(year, month - 1, 1);

  const host = createOffscreenContainer();
  const root = createRoot(host);

  try {
    await new Promise((resolve) => {
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
        })
      );
      // requestAnimationFrame * 2 stellt sicher, dass React committed
      // und das Layout vom Browser berechnet wurde.
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    await waitForImages(host);

    const element = host.querySelector("#report-to-print");
    if (!element) {
      throw new Error("ReportDocument-Container nicht gefunden");
    }

    const opt = {
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

    const blob = await html2pdf().set(opt).from(element).output("blob");
    return blob;
  } catch (err) {
    log.error("renderMonthlyReportPdfBlob failed:", err);
    throw err;
  } finally {
    try {
      root.unmount();
    } catch (e) {
      log.warn("root.unmount failed:", e);
    }
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}
