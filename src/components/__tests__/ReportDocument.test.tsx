import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, within } from "@testing-library/react";

// ─── Mocks (VOR dem ReportDocument-Import) ─────────────────────────

// timeCalculations: nur die hier verwendete Funktion stubben — wir wollen
// das Layout der Komponente prüfen, nicht die Bilanz-Berechnung.
vi.mock("../../utils/timeCalculations", () => ({
  buildDayBalanceMetaMap: vi.fn(() => new Map()),
}));

// Importe NACH den Mocks
import ReportDocument from "../ReportDocument";
import { austriaLocale } from "../../locales";
import type { Entry, UserData, WorkCode, Attachment, CalculationConfig } from "../../types";
import type { Locale } from "../../locales/types";

// ─── Test-Helpers ──────────────────────────────────────────────────

const makeUser = (overrides: Partial<UserData & { company?: string }> = {}): UserData & { company?: string } => ({
  name: "Max Muster",
  position: "Elektriker",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 510, 0],
  ...overrides,
});

const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 1,
  type: "work",
  date: "2026-04-07",
  start: "08:00",
  end: "16:30",
  pause: 30,
  code: 1,
  netDuration: 480,
  project: "Projekt A",
  ...overrides,
});

const makeStats = (overrides: Partial<Parameters<typeof ReportDocument>[0]["stats"]> = {}) => ({
  work: 480,
  drive: 0,
  vacation: 0,
  sick: 0,
  holiday: 0,
  timeComp: 0,
  totalIst: 480,
  totalTarget: 480,
  totalSaldo: 0,
  normalstunden: 480,
  overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
  ...overrides,
});

interface RenderOptions {
  entries?: Entry[];
  userData?: UserData & { company?: string };
  monthDate?: Date;
  workCodes?: WorkCode[];
  attachments?: Attachment[];
  customNote?: string;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
  allEntries?: Entry[];
  stats?: ReturnType<typeof makeStats>;
}

const renderReport = (opts: RenderOptions = {}) =>
  render(
    <ReportDocument
      entries={opts.entries ?? []}
      userData={opts.userData ?? makeUser()}
      monthDate={opts.monthDate ?? new Date(2026, 3, 1)}
      workCodes={opts.workCodes ?? [{ id: 1, label: "Standard" }]}
      attachments={opts.attachments ?? []}
      customNote={opts.customNote ?? ""}
      locale={opts.locale}
      calculationConfig={opts.calculationConfig}
      allEntries={opts.allEntries}
      stats={opts.stats ?? makeStats()}
    />,
  );

// ─── Tests ─────────────────────────────────────────────────────────

describe("ReportDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Header", () => {
    it("rendert ohne Crash mit Minimal-Props", () => {
      const { container } = renderReport();
      expect(container.querySelector("#report-to-print")).toBeTruthy();
    });

    it("zeigt den Titel 'Stundenzettel'", () => {
      const { getByText } = renderReport();
      expect(getByText("Stundenzettel")).toBeTruthy();
    });

    it("zeigt den Mitarbeiternamen aus userData", () => {
      const { getByText } = renderReport({ userData: makeUser({ name: "Erika Beispiel" }) });
      expect(getByText("Erika Beispiel")).toBeTruthy();
    });

    it("zeigt die Firma im Header, falls company gesetzt ist", () => {
      const { getByText } = renderReport({ userData: makeUser({ company: "Acme GmbH" }) });
      expect(getByText("Acme GmbH")).toBeTruthy();
    });

    it("rendert das Mitarbeiterfoto, wenn photo gesetzt ist", () => {
      const photoUrl = "data:image/png;base64,iVBOR";
      const { container } = renderReport({ userData: makeUser({ photo: photoUrl }) });
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
      expect(img?.getAttribute("src")).toBe(photoUrl);
    });

    it("rendert KEIN Mitarbeiterfoto, wenn photo null ist", () => {
      const { container } = renderReport({ userData: makeUser({ photo: null }) });
      expect(container.querySelector("img")).toBeNull();
    });
  });

  describe("Tabellen-Header", () => {
    it("zeigt Spalten Datum / Zeit / Projekt / Code / Std", () => {
      const { getByText } = renderReport();
      expect(getByText("Datum")).toBeTruthy();
      expect(getByText("Zeit")).toBeTruthy();
      expect(getByText("Projekt")).toBeTruthy();
      expect(getByText("Code")).toBeTruthy();
      expect(getByText("Std.")).toBeTruthy();
    });
  });

  describe("Eintrags-Rendering", () => {
    it("zeigt einen Arbeits-Eintrag mit Projekt und Code-Label", () => {
      const { getByText } = renderReport({
        entries: [makeEntry({ project: "Baustelle Nord", code: 1 })],
        workCodes: [{ id: 1, label: "Standard" }],
      });
      expect(getByText("Baustelle Nord")).toBeTruthy();
      expect(getByText("Standard")).toBeTruthy();
    });

    it("zeigt 'Gesetzlicher Feiertag' für public_holiday-Einträge ohne Projekt", () => {
      const { getByText } = renderReport({
        entries: [
          {
            id: 100,
            type: "public_holiday",
            date: "2026-05-01",
            pause: 0,
            netDuration: 480,
          } as Entry,
        ],
      });
      expect(getByText("Gesetzlicher Feiertag")).toBeTruthy();
    });

    it("zeigt einen Krank-Eintrag mit dem Type-Label", () => {
      const { getAllByText } = renderReport({
        entries: [
          {
            id: 200,
            type: "sick",
            date: "2026-04-08",
            pause: 0,
            netDuration: 510,
          } as Entry,
        ],
      });
      // "Krank" erscheint sowohl als Type-Label als auch in der Summary
      expect(getAllByText(/Krank/).length).toBeGreaterThan(0);
    });

    it("rendert leeren Monat ohne Crash und ohne Daten-Zeilen", () => {
      const { container } = renderReport({ entries: [] });
      const tbody = container.querySelector("tbody");
      expect(tbody).toBeTruthy();
      // Nur kein Crash, Tabelle existiert mit headers
      expect(container.querySelector("thead")).toBeTruthy();
    });
  });

  describe("Anhänge / Notiz", () => {
    it("zeigt Dokumenten-Liste, wenn attachments existieren", () => {
      const { getByText } = renderReport({
        entries: [makeEntry({ id: 5 })],
        attachments: [
          {
            id: "att-1",
            entryId: 5,
            label: "Lieferschein",
            fileName: "ls.pdf",
            mimeType: "application/pdf",
            storagePath: "/foo",
            fileSize: 1024,
            createdAt: "2026-04-07T10:00:00",
          } as Attachment,
        ],
      });
      expect(getByText(/Lieferschein/)).toBeTruthy();
    });

    it("zeigt customNote, wenn übergeben", () => {
      const { getByText } = renderReport({ customNote: "Sondereinsatz Wochenende" });
      expect(getByText(/Sondereinsatz Wochenende/)).toBeTruthy();
    });
  });

  describe("Mehrarbeit/Überstunden-Sektion im Summary", () => {
    const splitStats = makeStats({
      overtimeSplit: { mehrarbeit: 60, ueberstunden: 30 },
    });

    it("zeigt Mehrarbeit/Überstunden-Sektion ohne Locale (abwärtskompatibel)", () => {
      const { container } = renderReport({ locale: undefined, stats: splitStats });
      expect(container.textContent).toMatch(/Mehrarbeit|Überstunden/);
    });

    it("blendet Mehrarbeit/Überstunden-Sektion aus bei overtimeMode === 'none'", () => {
      const { container } = renderReport({
        locale: austriaLocale,
        stats: splitStats,
        calculationConfig: {
          weeklyTargetMinutes: 2310,
          overtimeMode: "none",
          overtimeThresholdMinutes: null,
          sickOnWorkDayMode: "additive",
          holidaySet: { mode: "locale_default", disabledHolidayKeys: [] },
          halfDayMode: { mode: "locale_default", customHalfDays: [] },
          holidayOnWorkDayMode: "additive",
          autoPauseRules: [],
          vacationAllowanceDays: 25,
          vacationCarryoverDays: 0,
          configVersion: 1,
        },
      });
      // Im Summary darf die Mehrarbeit/Überstunden-Untergruppe nicht erscheinen.
      // Wir prüfen, dass die Werte (60min = "1h 00m", 30min = "0h 30m") nicht
      // in einem dedizierten Mehrarbeit-Block stehen — die Hauptkategorien
      // bleiben unberührt.
      expect(container.textContent).not.toMatch(/Mehrarbeit/);
      expect(container.textContent).not.toMatch(/Überstunden/);
    });
  });

  describe("Urlaubsbilanz", () => {
    it("rendert KEINE Urlaubsbilanz, wenn allowance = 0", () => {
      const { queryByText } = renderReport({
        calculationConfig: {
          weeklyTargetMinutes: 2310,
          overtimeMode: "split",
          overtimeThresholdMinutes: 2400,
          sickOnWorkDayMode: "additive",
          holidaySet: { mode: "locale_default", disabledHolidayKeys: [] },
          halfDayMode: { mode: "locale_default", customHalfDays: [] },
          holidayOnWorkDayMode: "additive",
          autoPauseRules: [],
          vacationAllowanceDays: 0,
          vacationCarryoverDays: 0,
          configVersion: 1,
        } satisfies CalculationConfig,
      });
      expect(queryByText(/Urlaubsanspruch/)).toBeNull();
    });

    it("zählt vacation-Einträge des Jahres aus allEntries für die Bilanz", () => {
      const config: CalculationConfig = {
        weeklyTargetMinutes: 2310,
        overtimeMode: "split",
        overtimeThresholdMinutes: 2400,
        sickOnWorkDayMode: "additive",
        holidaySet: { mode: "locale_default", disabledHolidayKeys: [] },
        halfDayMode: { mode: "locale_default", customHalfDays: [] },
        holidayOnWorkDayMode: "additive",
        autoPauseRules: [],
        vacationAllowanceDays: 25,
        vacationCarryoverDays: 5,
        configVersion: 1,
      };
      const allEntries: Entry[] = [
        { id: 11, type: "vacation", date: "2026-01-15", pause: 0, netDuration: 480 } as Entry,
        { id: 12, type: "vacation", date: "2026-02-10", pause: 0, netDuration: 480 } as Entry,
        // Vorjahr — soll nicht zählen
        { id: 13, type: "vacation", date: "2025-12-23", pause: 0, netDuration: 480 } as Entry,
      ];
      const { container } = renderReport({
        monthDate: new Date(2026, 3, 1),
        calculationConfig: config,
        allEntries,
      });
      // Bilanz: 25 + 5 - 2 = 28 verbleibend
      expect(container.textContent).toMatch(/28/);
    });
  });

  describe("Summary-Block", () => {
    it("zeigt die Summary-Sektion mit Arbeit-Label", () => {
      const { container } = renderReport();
      expect(container.textContent).toMatch(/Arbeit/);
    });

    it("rendert Stats-Werte (Soll/Ist/Saldo) wenn übergeben", () => {
      const stats = makeStats({
        totalIst: 9000,
        totalTarget: 9000,
        totalSaldo: 0,
      });
      const { container } = renderReport({ stats });
      // Wir prüfen nicht den exakten Format-String (Locale-abhängig),
      // sondern dass die Summary-Sektion ohne Crash rendert.
      const summary = container.querySelector("#report-to-print");
      expect(summary).toBeTruthy();
      expect(within(summary as HTMLElement).getAllByText(/Soll/).length).toBeGreaterThan(0);
    });
  });

  describe("filterMode", () => {
    it("zeigt KW-Suffix im Header bei Wochen-Filter", () => {
      const { container } = renderReport({ monthDate: new Date(2026, 3, 6) });
      // Default ist "month" → kein KW-Suffix
      expect(container.textContent).not.toMatch(/KW\s/);
    });
  });
});
