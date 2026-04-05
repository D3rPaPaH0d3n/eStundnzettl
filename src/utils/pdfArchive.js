/**
 * pdfArchive.js — Headless monatlicher PDF-Generator (pdfmake-basiert).
 *
 * Erzeugt ein A4-Portrait-PDF mit echtem, durchsuchbarem Text fuer die
 * automatische Langzeit-Archivierung (useAutoPdfArchive).
 *
 * Wichtig: Diese Datei ist komplett unabhaengig vom interaktiven
 * PrintReport.jsx (der weiterhin html2pdf.js nutzt). Layout bewusst
 * schlicht & tabellarisch — Ziel ist gerichtsverwertbare Lesbarkeit,
 * nicht Bildschirm-Parity.
 *
 * Dynamischer Import (`await import('pdfmake/...')`) haelt die ~1.1 MB
 * Bundle-Kosten aus dem Haupt-Bundle heraus; sie werden nur geladen,
 * wenn das Feature tatsaechlich laeuft.
 */

import { calculatePeriodStats, getTargetMinutesForDate, buildDayBalanceMetaMap } from "./timeCalculations";
import { WORK_CODE } from "../hooks/constants";

// ───────────── Helpers ─────────────

const pad2 = (n) => String(n).padStart(2, "0");

const minutesToHHMM = (mins) => {
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(Math.round(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${pad2(h)}:${pad2(m)}`;
};

const monthLabelDe = (year, month /* 1-12 */) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
};

const entryTypeLabel = (type) => {
  switch (type) {
    case "work": return "Arbeit";
    case "vacation": return "Urlaub";
    case "sick": return "Krank";
    case "public_holiday": return "Feiertag";
    case "time_comp": return "Zeitausgleich";
    default: return type || "";
  }
};

/** Filtert alle Entries auf den angegebenen Kalendermonat (YYYY-MM-Prefix). */
export function filterEntriesForMonth(entries, year, month) {
  const prefix = `${year}-${pad2(month)}`;
  return (entries || [])
    .filter((e) => typeof e.date === "string" && e.date.startsWith(prefix))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const ak = a.start || "";
      const bk = b.start || "";
      return ak.localeCompare(bk);
    });
}

/**
 * Deterministischer Hash ueber alle Inhalte, die sich im PDF niederschlagen.
 * Gleicher Algorithmus wie in useAutoBackup (djb2), damit das Muster
 * konsistent bleibt.
 */
export function hashMonthContent({ entries, userData, year, month }) {
  const relevant = {
    ym: `${year}-${pad2(month)}`,
    name: userData?.name || "",
    workDays: userData?.workDays || null,
    workModel: userData?.workModel || null,
    entries: filterEntriesForMonth(entries, year, month).map((e) => ({
      id: e.id,
      t: e.type,
      d: e.date,
      s: e.start || null,
      e: e.end || null,
      p: e.pause || 0,
      pr: e.project || null,
      c: e.code ?? null,
      n: e.netDuration || 0,
    })),
  };
  const str = JSON.stringify(relevant);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}

/** Baut den filename: Stundenzettel_YYYY-MM_Name.pdf (slug-safe). */
export function buildArchiveFilename({ year, month, userData }) {
  const rawName = (userData?.name || "Stundenzettel").trim();
  const clean = rawName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "") || "Stundenzettel";
  return `Stundenzettel_${year}-${pad2(month)}_${clean}.pdf`;
}

// ───────────── Document Definition ─────────────

const TABLE_HEADER_FILL = "#1f2937";

const buildEntryRows = (entries, userData, workCodeLabelMap, dayMetaMap) => {
  const rows = [
    [
      { text: "Datum", style: "tableHeader" },
      { text: "Typ", style: "tableHeader" },
      { text: "Start", style: "tableHeader" },
      { text: "Ende", style: "tableHeader" },
      { text: "Pause", style: "tableHeader" },
      { text: "Projekt / Code", style: "tableHeader" },
      { text: "Netto", style: "tableHeader", alignment: "right" },
      { text: "Tagessaldo", style: "tableHeader", alignment: "right" },
    ],
  ];

  if (entries.length === 0) {
    rows.push([
      { text: "Keine Eintraege in diesem Monat.", colSpan: 8, alignment: "center", italics: true, color: "#6b7280" },
      {}, {}, {}, {}, {}, {}, {},
    ]);
    return rows;
  }

  entries.forEach((e) => {
    const codeLabel = e.code != null ? (workCodeLabelMap.get(e.code) || `Code ${e.code}`) : "";
    const projectLabel = [e.project, codeLabel].filter(Boolean).join(" · ");
    const meta = dayMetaMap[e.id];
    const dayBalance = meta?.showBalance ? minutesToHHMM(meta.balance) : "";

    rows.push([
      { text: e.date, style: "tableCell" },
      { text: entryTypeLabel(e.type), style: "tableCell" },
      { text: e.start || "—", style: "tableCell" },
      { text: e.end || "—", style: "tableCell" },
      { text: e.pause ? `${e.pause} min` : "—", style: "tableCell" },
      { text: projectLabel || "—", style: "tableCell" },
      { text: minutesToHHMM(e.netDuration || 0), style: "tableCell", alignment: "right" },
      { text: dayBalance, style: "tableCell", alignment: "right" },
    ]);
  });

  return rows;
};

const buildSummary = (stats) => {
  const rows = [
    ["Arbeitsstunden", minutesToHHMM(stats.work)],
    ["Fahrzeit", minutesToHHMM(stats.drive)],
    ["Urlaub", minutesToHHMM(stats.vacation)],
    ["Krankenstand", minutesToHHMM(stats.sick)],
    ["Feiertag", minutesToHHMM(stats.holiday)],
    ["Zeitausgleich", minutesToHHMM(stats.timeComp)],
    ["Soll", minutesToHHMM(stats.totalTarget)],
    ["Ist (ohne Fahrzeit)", minutesToHHMM(stats.totalIst)],
    ["Saldo", minutesToHHMM(stats.totalSaldo)],
    ["Mehrarbeit (< 40h/Wo)", minutesToHHMM(stats.overtimeSplit.mehrarbeit)],
    ["Überstunden (> 40h/Wo)", minutesToHHMM(stats.overtimeSplit.ueberstunden)],
  ];
  return rows.map(([k, v]) => [
    { text: k, style: "summaryKey" },
    { text: v, style: "summaryValue", alignment: "right" },
  ]);
};

function buildDocDefinition({ year, month, entries, userData, workCodes }) {
  const monthEntries = filterEntriesForMonth(entries, year, month);

  const workCodeLabelMap = new Map((workCodes || []).map((c) => [c.id, c.label]));
  const dayMetaMap = buildDayBalanceMetaMap(monthEntries, userData);

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0); // letzter Tag des Monats
  const stats = calculatePeriodStats(monthEntries, userData, periodStart, periodEnd);

  const generatedAt = new Date().toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const workModelLabel = userData?.workModel?.label
    || (Array.isArray(userData?.workDays)
      ? `${userData.workDays.reduce((a, b) => a + b, 0)} Min/Woche`
      : "—");

  // Info-Zeile: Soll fuer den Monat (fuer Vergleich mit Lohnabrechnung)
  let monthTargetMinutes = 0;
  for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
    const ds = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    monthTargetMinutes += getTargetMinutesForDate(ds, userData?.workDays);
  }

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [28, 40, 28, 40],
    info: {
      title: `Stundenzettel ${monthLabelDe(year, month)}`,
      author: userData?.name || "eStundnzettl",
      subject: "Automatisch generiertes Monatsarchiv",
      creator: "eStundnzettl",
    },
    defaultStyle: {
      fontSize: 8,
      lineHeight: 1.15,
    },
    content: [
      {
        columns: [
          [
            { text: "Stundenzettel", style: "title" },
            { text: monthLabelDe(year, month), style: "subtitle" },
          ],
          [
            { text: userData?.name || "—", style: "nameRight" },
            { text: `Arbeitszeitmodell: ${workModelLabel}`, style: "metaRight" },
            { text: `Soll im Monat: ${minutesToHHMM(monthTargetMinutes)}`, style: "metaRight" },
            { text: `Erstellt: ${generatedAt}`, style: "metaRight" },
          ],
        ],
        columnGap: 10,
        marginBottom: 14,
      },

      { text: "Einträge", style: "sectionHeader", marginBottom: 4 },
      {
        table: {
          headerRows: 1,
          widths: [52, 48, 32, 32, 32, "*", 40, 46],
          body: buildEntryRows(monthEntries, userData, workCodeLabelMap, dayMetaMap),
        },
        layout: {
          hLineWidth: (i) => (i === 0 || i === 1 ? 0.8 : 0.3),
          vLineWidth: () => 0,
          hLineColor: (i) => (i === 1 ? "#374151" : "#d1d5db"),
          fillColor: (rowIndex) => (rowIndex === 0 ? TABLE_HEADER_FILL : null),
        },
        marginBottom: 14,
      },

      { text: "Monats-Zusammenfassung", style: "sectionHeader", marginBottom: 4 },
      {
        table: {
          widths: ["*", 70],
          body: buildSummary(stats),
        },
        layout: {
          hLineWidth: () => 0.3,
          vLineWidth: () => 0,
          hLineColor: () => "#e5e7eb",
        },
      },

      {
        text: "Dieses PDF wird automatisch vom eStundnzettl erzeugt und dient der " +
              "gesetzlich gefor­derten Langzeit-Aufbewahrung. Inhalte sind durchsuchbarer Text.",
        style: "footnote",
        marginTop: 18,
      },
    ],
    footer: (currentPage, pageCount) => ({
      text: `Seite ${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: 7,
      color: "#6b7280",
      margin: [0, 10, 0, 0],
    }),
    styles: {
      title: { fontSize: 18, bold: true, color: "#111827" },
      subtitle: { fontSize: 12, color: "#4b5563", marginTop: 2 },
      nameRight: { fontSize: 12, bold: true, alignment: "right", color: "#111827" },
      metaRight: { fontSize: 8, alignment: "right", color: "#6b7280" },
      sectionHeader: { fontSize: 10, bold: true, color: "#111827", marginTop: 6 },
      tableHeader: { fontSize: 8, bold: true, color: "#ffffff", margin: [2, 4, 2, 4] },
      tableCell: { fontSize: 8, color: "#1f2937", margin: [2, 3, 2, 3] },
      summaryKey: { fontSize: 9, color: "#374151", margin: [4, 3, 4, 3] },
      summaryValue: { fontSize: 9, bold: true, color: "#111827", margin: [4, 3, 4, 3] },
      footnote: { fontSize: 7, italics: true, color: "#9ca3af" },
    },
  };
}

// ───────────── Public API ─────────────

let pdfMakeInstance = null;

/**
 * vfs_fonts laedt je nach pdfmake-Version unterschiedlich:
 *
 * - pdfmake 0.2.x: `module.exports = { pdfMake: { vfs: {...} } }`
 *   → Registrierung via `pdfMake.vfs = vfs`
 *
 * - pdfmake 0.3.x (aktuell in package.json): `module.exports = vfs` direkt
 *   (flaches Objekt mit Font-Dateinamen als Keys). Bevorzugte Registrierung
 *   ueber die neue API `pdfMake.addVirtualFileSystem(vfs)`; als Fallback
 *   funktioniert `pdfMake.vfs = vfs` weiterhin.
 */
async function getPdfMake() {
  if (pdfMakeInstance) return pdfMakeInstance;
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfMakeModule.default || pdfMakeModule;

  // 1) 0.2.x verschachteltes Format
  let vfs =
    pdfFontsModule?.default?.pdfMake?.vfs ??
    pdfFontsModule?.pdfMake?.vfs ??
    null;

  // 2) 0.3.x flaches Format: module.exports IS the vfs object.
  //    Heuristik: hat Font-Dateinamen als Keys (z.B. "Roboto-Regular.ttf").
  if (!vfs) {
    const candidate = pdfFontsModule?.default ?? pdfFontsModule;
    if (candidate && typeof candidate === "object") {
      const keys = Object.keys(candidate);
      const looksLikeVfs = keys.some((k) => /\.(ttf|otf|woff2?)$/i.test(k));
      if (looksLikeVfs) {
        vfs = candidate;
      }
    }
  }

  if (vfs) {
    if (typeof pdfMake.addVirtualFileSystem === "function") {
      pdfMake.addVirtualFileSystem(vfs);
    } else {
      pdfMake.vfs = vfs;
    }
  }

  pdfMakeInstance = pdfMake;
  return pdfMake;
}

/**
 * Erzeugt das Monats-PDF als Blob. Reine Funktion — kein DOM, kein React.
 *
 * Hard-Timeout von 30 s, damit ein potentiell hangender getBlob-Callback
 * (z.B. durch fehlende VFS-Fonts) nicht die UI dauerhaft blockiert.
 */
export async function generateMonthlyPdfBlob({ year, month, entries, userData, workCodes }) {
  if (!year || !month) throw new Error("generateMonthlyPdfBlob: year/month fehlen");
  const pdfMake = await getPdfMake();
  const docDefinition = buildDocDefinition({ year, month, entries, userData, workCodes });
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("PDF-Generierung Timeout (30s) — vermutlich fehlen VFS-Fonts"));
      }
    }, 30000);
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(blob);
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    }
  });
}

// Re-exports fuer Tests
export { buildDocDefinition, WORK_CODE as _WORK_CODE };
