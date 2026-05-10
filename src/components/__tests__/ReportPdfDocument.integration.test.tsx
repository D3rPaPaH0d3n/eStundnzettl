/// <reference types="node" />
/**
 * Integration-Smoke fuer ReportPdfDocument:
 * Ruft die ECHTE @react-pdf/renderer-Pipeline (`pdf().toBlob()`) auf und
 * verifiziert, dass dabei ein gueltiger PDF-Blob entsteht. Dieser Test
 * gilt explizit OHNE Mocks der react-pdf-Primitives — er fuengt also
 * Regressionen ab, die der ueblicheren Mock-Test-Suite entgehen
 * (Yoga-Layout, Page-Wrapping, Font-Embedding, ...).
 *
 * Hintergrund: die Standard-Tests in `ReportPdfDocument.test.tsx`
 * mocken Document/Page/View/Text auf DOM-Elemente, damit Testing-
 * Library funktioniert. Dabei werden `fixed`/`wrap`-Props ignoriert
 * und `pdf()` ist ein Stub. Hier rufen wir die echte Engine auf.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";

// Vite-only `?url`-Suffixe lassen sich im Node-Test-Lauf nicht
// aufloesen — wir mappen sie auf die echten Dateipfade in
// node_modules, damit fontkit sie direkt lesen kann.
const { fontsDir } = vi.hoisted(() => {
  const path = require("path");
  return {
    fontsDir: path.resolve(
      process.cwd(),
      "node_modules/@fontsource/roboto/files",
    ),
  };
});
vi.mock("@fontsource/roboto/files/roboto-latin-400-normal.woff?url", () => ({
  default: `${fontsDir}/roboto-latin-400-normal.woff`,
}));
vi.mock("@fontsource/roboto/files/roboto-latin-700-normal.woff?url", () => ({
  default: `${fontsDir}/roboto-latin-700-normal.woff`,
}));
vi.mock("@fontsource/roboto/files/roboto-latin-ext-400-normal.woff?url", () => ({
  default: `${fontsDir}/roboto-latin-ext-400-normal.woff`,
}));
vi.mock("@fontsource/roboto/files/roboto-latin-ext-700-normal.woff?url", () => ({
  default: `${fontsDir}/roboto-latin-ext-700-normal.woff`,
}));

import { pdf } from "@react-pdf/renderer";
import ReportPdfDocument from "../ReportPdfDocument";
import type { Entry, UserData } from "../../types";

const userData: UserData & { company?: string } = {
  name: "Integration Tester",
  position: "QA",
  photo: null,
  workDays: [0, 480, 480, 480, 480, 480, 0],
  company: "Smoke GmbH",
};

const entries: Entry[] = [
  {
    id: 1,
    type: "work",
    date: "2026-04-07",
    start: "08:00",
    end: "16:30",
    pause: 30,
    code: 1,
    netDuration: 480,
    project: "Integration",
  },
  {
    id: 2,
    type: "vacation",
    date: "2026-04-08",
    pause: 0,
    netDuration: 480,
  } as Entry,
];

const stats = {
  work: 480,
  drive: 0,
  vacation: 480,
  sick: 0,
  holiday: 0,
  timeComp: 0,
  totalIst: 960,
  totalTarget: 960,
  totalSaldo: 0,
  normalstunden: 960,
  overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
};

describe("ReportPdfDocument — react-pdf Integration", () => {
  it("erzeugt einen gueltigen PDF-Blob mit dem %PDF-Magic-Header", async () => {
    const element = React.createElement(ReportPdfDocument, {
      entries,
      userData,
      monthDate: new Date(2026, 3, 1),
      filterMode: "month" as const,
      stats,
      workCodes: [{ id: 1, label: "Standard" }],
      attachments: [],
      customNote: "Integration-Test-Notiz",
      allEntries: entries,
    });

    // pdf() erwartet ein <Document>-ReactElement; ReportPdfDocument
    // gibt genau das zurueck (TypeScript verliert die Verfeinerung
    // ueber FunctionComponentElement-Indirection).
    const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe("application/pdf");

    // Magic-Header pruefen, damit garantiert ein valides PDF entstanden ist
    const head = await blob.slice(0, 5).text();
    expect(head).toBe("%PDF-");
  }, 30000);
});
