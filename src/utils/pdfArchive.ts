/**
 * pdfArchive.js — Headless monatlicher PDF-Generator.
 *
 * Erzeugt ein A4-Portrait-PDF fuer die automatische Langzeit-Archivierung
 * (useAutoPdfArchive). Das Layout wird jetzt von `ReportDocument` (der
 * gleichen React-Komponente wie die interaktive Vorschau in PrintReport)
 * produziert — dadurch sieht das automatische Monats-PDF 1:1 wie der
 * vom Nutzer manuell geteilte Stundenzettel aus.
 *
 * Die Archiv-spezifische Logik (Dateinamen, Content-Hash fuer das
 * Upload-Skip) bleibt hier erhalten, damit `useAutoPdfArchive` und
 * `pdfArchiveTargets` ihre API nicht aendern muessen.
 */

import { renderMonthlyReportPdfBlob } from "./reportPdfRenderer";
import { WORK_CODE } from "../hooks/constants";
import type { Entry, UserData, WorkCode, Attachment, CalculationConfig } from '../types';
import type { Locale } from '../locales/types';

// ───────────── Helpers ─────────────

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Filtert alle Entries auf den angegebenen Kalendermonat (YYYY-MM-Prefix). */
export function filterEntriesForMonth(entries: Entry[], year: number, month: number): Entry[] {
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
export function hashMonthContent({ entries, userData, year, month }: { entries: Entry[]; userData: UserData | null; year: number; month: number }): string {
  const relevant = {
    ym: `${year}-${pad2(month)}`,
    name: userData?.name || "",
    workDays: userData?.workDays || null,
    workModel: (userData as UserData & { workModel?: unknown })?.workModel || null,
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
export function buildArchiveFilename({ year, month, userData }: { year: number; month: number; userData: UserData | null }): string {
  const rawName = (userData?.name || "Stundenzettel").trim();
  const clean = rawName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "") || "Stundenzettel";
  return `Stundenzettel_${year}-${pad2(month)}_${clean}.pdf`;
}

// ───────────── Public API ─────────────

/**
 * Erzeugt das Monats-PDF als Blob. Interne Delegation an
 * `renderMonthlyReportPdfBlob`, damit automatisches Archiv und manuell
 * geteiltes PDF optisch identisch sind.
 *
 * Safety-Timeout via Promise.race: wenn der Renderer wider Erwarten
 * haengen sollte, bekommt der Aufrufer nach 30 s eine klare
 * Fehlermeldung statt eines dauerhaft blockierten UI-Zustands.
 */
export async function generateMonthlyPdfBlob({ year, month, entries, userData, workCodes, attachments, locale, calculationConfig }: { year: number; month: number; entries: Entry[]; userData: UserData | null; workCodes: WorkCode[]; attachments?: Attachment[]; locale?: Locale; calculationConfig?: CalculationConfig | null }): Promise<Blob> {
  if (!year || !month) throw new Error("generateMonthlyPdfBlob: year/month fehlen");

  const blobPromise = renderMonthlyReportPdfBlob({
    year,
    month,
    entries,
    userData,
    workCodes,
    attachments,
    locale,
    calculationConfig,
  });

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("PDF-Generierung Timeout (30s)")),
      30000,
    );
  });

  try {
    return await Promise.race([blobPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

// Re-export fuer Tests
export { WORK_CODE as _WORK_CODE };
