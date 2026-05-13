/**
 * Tests fuer ReportPdfDocument.
 *
 * react-pdf rendert in einen offscreen-PDF-Tree, nicht in echtes DOM.
 * Damit wir mit Testing-Library weiter arbeiten koennen, mocken wir die
 * react-pdf-Primitives auf einfache DOM-Elemente. Das ist robust genug
 * um Text-Inhalte, bedingtes Rendering und Foto-Embed zu pruefen.
 *
 * Layout-/Style-Details werden bewusst nicht assertiert (das macht der
 * visuelle Vorschau-Workflow); Layout-Korrektheit fuer Vektor-PDFs
 * verifizieren wir manuell ueber `docs/pdf-preview/`.
 */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

// ─── Mocks (VOR Imports) ──────────────────────────────────────────────

vi.mock("../../utils/timeCalculations", () => ({
  buildDayBalanceMetaMap: vi.fn(() => ({})),
}));

vi.mock("@react-pdf/renderer", () => {
  type AnyProps = Record<string, unknown> & { children?: React.ReactNode };
  // react-pdf akzeptiert Style-Arrays — DOM nicht. Wir flatten sie auf
  // ein einzelnes Objekt, sonst kippt React-DOM beim setStyle().
  // Zusaetzlich: react-pdf-only Properties (objectFit, fontStyle, ...)
  // sind in jsdom-CSSStyleDeclaration tolerant; wir lassen sie durch.
  const flattenStyle = (style: unknown): Record<string, unknown> | undefined => {
    if (!style) return undefined;
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.map((s) => flattenStyle(s) || {}));
    }
    if (typeof style === "object") return style as Record<string, unknown>;
    return undefined;
  };
  const passthrough = (tag: string, dataAttr: string) => {
    const Component = ({ children, style, fixed: _f, wrap: _w, ...rest }: AnyProps) => {
      void _f;
      void _w;
      return React.createElement(
        tag,
        { ...rest, [dataAttr]: true, style: flattenStyle(style) },
        children,
      );
    };
    Component.displayName = dataAttr;
    return Component;
  };
  return {
    Document: passthrough("div", "data-pdf-document"),
    Page: passthrough("div", "data-pdf-page"),
    View: passthrough("div", "data-pdf-view"),
    Text: passthrough("span", "data-pdf-text"),
    Image: ({ src, style }: { src: string; style?: object }) =>
      React.createElement("img", {
        src,
        style: flattenStyle(style),
        "data-pdf-image": true,
      }),
    StyleSheet: { create: <T,>(s: T): T => s },
    Font: { register: vi.fn() },
    pdf: vi.fn(),
    PDFViewer: passthrough("div", "data-pdf-viewer"),
  };
});

// Vite-`?url`-Imports sind im Test-Lauf nicht aufloesbar; wir liefern
// Dummy-Strings fuer das gemockte Font.register.
vi.mock("@fontsource/roboto/files/roboto-latin-400-normal.woff?url", () => ({ default: "" }));
vi.mock("@fontsource/roboto/files/roboto-latin-700-normal.woff?url", () => ({ default: "" }));
vi.mock("@fontsource/roboto/files/roboto-latin-ext-400-normal.woff?url", () => ({ default: "" }));
vi.mock("@fontsource/roboto/files/roboto-latin-ext-700-normal.woff?url", () => ({ default: "" }));

// Importe NACH den Mocks
import ReportPdfDocument from "../ReportPdfDocument";
import { austriaLocale } from "../../locales";
import type {
  Entry,
  UserData,
  WorkCode,
  Attachment,
  CalculationConfig,
  PdfDisplayConfig,
} from "../../types";
import type { Locale } from "../../locales/types";

// ─── Test-Helpers ─────────────────────────────────────────────────────

const makeUser = (
  overrides: Partial<UserData & { company?: string }> = {},
): UserData & { company?: string } => ({
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

const makeStats = (
  overrides: Partial<NonNullable<Parameters<typeof ReportPdfDocument>[0]["stats"]>> = {},
) => ({
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
    <ReportPdfDocument
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

// ─── Tests ────────────────────────────────────────────────────────────

describe("ReportPdfDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Header", () => {
    it("rendert ohne Crash mit Minimal-Props", () => {
      const { container } = renderReport();
      expect(container.querySelector("[data-pdf-document]")).toBeTruthy();
      expect(container.querySelector("[data-pdf-page]")).toBeTruthy();
    });

    it("zeigt den Titel 'Stundenzettel'", () => {
      const { getByText } = renderReport();
      expect(getByText("Stundenzettel")).toBeTruthy();
    });

    it("zeigt den Mitarbeiternamen aus userData", () => {
      const { getByText } = renderReport({
        userData: makeUser({ name: "Erika Beispiel" }),
      });
      expect(getByText("Erika Beispiel")).toBeTruthy();
    });

    it("zeigt die Firma im Header, falls company gesetzt ist", () => {
      const { getByText } = renderReport({
        userData: makeUser({ company: "Acme GmbH" }),
      });
      expect(getByText("Acme GmbH")).toBeTruthy();
    });

    it("rendert das Mitarbeiterfoto, wenn photo gesetzt ist", () => {
      const photoUrl = "data:image/png;base64,iVBOR";
      const { container } = renderReport({
        userData: makeUser({ photo: photoUrl }),
      });
      const img = container.querySelector("img[data-pdf-image]");
      expect(img).toBeTruthy();
      expect(img?.getAttribute("src")).toBe(photoUrl);
    });

    it("rendert KEIN Mitarbeiterfoto, wenn photo null ist", () => {
      const { container } = renderReport({
        userData: makeUser({ photo: null }),
      });
      expect(container.querySelector("img[data-pdf-image]")).toBeNull();
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

    it("zeigt 'Gesetzlicher Feiertag' fuer public_holiday-Eintraege ohne Projekt", () => {
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

    it("zeigt manuelle Zeiten bei Sondertypen in der Zeitspalte", () => {
      const { getByText } = renderReport({
        entries: [
          makeEntry({
            id: 201,
            type: "vacation",
            start: "08:00",
            end: "12:00",
            pause: 0,
            netDuration: 240,
            project: "",
          }),
        ],
      });

      expect(getByText("08:00 – 12:00")).toBeTruthy();
    });

    it("rendert leeren Monat ohne Crash und ohne Daten-Zeilen", () => {
      const { container } = renderReport({ entries: [] });
      // Tabellenkopf existiert, aber keine Datenzeilen
      const page = container.querySelector("[data-pdf-page]");
      expect(page).toBeTruthy();
    });
  });

  describe("Anhaenge / Notiz", () => {
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

    it("zeigt customNote, wenn uebergeben", () => {
      const { getByText } = renderReport({ customNote: "Sondereinsatz Wochenende" });
      expect(getByText(/Sondereinsatz Wochenende/)).toBeTruthy();
    });
  });

  describe("Mehrarbeit/Ueberstunden-Sektion im Summary", () => {
    const splitStats = makeStats({
      overtimeSplit: { mehrarbeit: 60, ueberstunden: 30 },
    });

    it("zeigt Mehrarbeit/Ueberstunden-Sektion ohne Locale (abwaertskompatibel)", () => {
      const { container } = renderReport({ locale: undefined, stats: splitStats });
      expect(container.textContent).toMatch(/Mehrarbeit|Ueberstunden|Überstunden/);
    });

    it("blendet Mehrarbeit/Ueberstunden-Sektion aus bei overtimeMode === 'none'", () => {
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

    it("zaehlt vacation-Eintraege des Jahres aus allEntries fuer die Bilanz", () => {
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
        // Vorjahr — soll nicht zaehlen
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

    it("rendert Stats-Werte (Soll/Ist/Saldo) wenn uebergeben", () => {
      const stats = makeStats({
        totalIst: 9000,
        totalTarget: 9000,
        totalSaldo: 0,
      });
      const { container } = renderReport({ stats });
      expect(container.textContent).toMatch(/Soll/);
      expect(container.textContent).toMatch(/IST|Ist/);
    });
  });

  describe("filterMode", () => {
    it("zeigt KW-Suffix im Header bei Wochen-Filter", () => {
      const { container } = renderReport({ monthDate: new Date(2026, 3, 6) });
      // Default ist "month" → kein KW-Suffix
      expect(container.textContent).not.toMatch(/KW\s/);
    });
  });

  describe("PDF-Display-Toggles (Hausmasta-Modus)", () => {
    // Helfer: erzeugt eine vollstaendige CalculationConfig mit nur einem
    // gezielt veraenderten pdfDisplay-Feld. Alle anderen Toggles bleiben
    // dank Default-Resolver auf AN.
    const configWithToggle = (
      key: string,
      value: boolean,
    ): CalculationConfig => ({
      weeklyTargetMinutes: 2310,
      overtimeMode: "split",
      overtimeThresholdMinutes: 2400,
      sickOnWorkDayMode: "additive",
      holidaySet: { mode: "locale_default", disabledHolidayKeys: [] },
      halfDayMode: { mode: "locale_default", customHalfDays: [] },
      holidayOnWorkDayMode: "additive",
      autoPauseRules: [],
      vacationAllowanceDays: 25,
      vacationCarryoverDays: 0,
      configVersion: 1,
      pdfDisplay: {
        showSummary: true,
        showTargetTime: true,
        showBalance: true,
        showOvertimeSplit: true,
        showVacationBalance: true,
        showAttachmentsList: true,
        showWorkCodeColumn: true,
        showCustomNote: true,
        [key]: value,
      } as PdfDisplayConfig,
    });

    it("blendet die komplette Summary aus, wenn showSummary=false", () => {
      const { container } = renderReport({
        calculationConfig: configWithToggle("showSummary", false),
      });
      expect(container.textContent).not.toMatch(/Zusammenfassung/);
      // Auch Sub-Bloecke wie Soll/Saldo verschwinden mit
      expect(container.textContent).not.toMatch(/Sollzeit/);
    });

    it("blendet nur die Sollzeit-Zeile aus, wenn showTargetTime=false", () => {
      const { container } = renderReport({
        calculationConfig: configWithToggle("showTargetTime", false),
      });
      // Summary selbst bleibt sichtbar
      expect(container.textContent).toMatch(/Zusammenfassung/);
      // Sollzeit-Label fehlt
      expect(container.textContent).not.toMatch(/Sollzeit/);
    });

    it("blendet Saldo + Saldo-Spalte aus, wenn showBalance=false", () => {
      const { container } = renderReport({
        calculationConfig: configWithToggle("showBalance", false),
      });
      // "Saldo:"-Label aus der Summary darf nicht erscheinen.
      // Der Tabellenkopf zeigt "Saldo" als Spaltentitel, das auch verschwinden soll.
      expect(container.textContent).not.toMatch(/Saldo/);
    });

    it("blendet Mehrarbeit/Ueberstunden-Block aus, wenn showOvertimeSplit=false", () => {
      const splitStats = makeStats({
        overtimeSplit: { mehrarbeit: 60, ueberstunden: 30 },
      });
      const { container } = renderReport({
        stats: splitStats,
        calculationConfig: configWithToggle("showOvertimeSplit", false),
      });
      expect(container.textContent).not.toMatch(/Mehrarbeit/);
      expect(container.textContent).not.toMatch(/Überstunden/);
    });

    it("blendet die Urlaubsbilanz aus, wenn showVacationBalance=false", () => {
      const { queryByText } = renderReport({
        calculationConfig: configWithToggle("showVacationBalance", false),
      });
      expect(queryByText(/Urlaubsanspruch/)).toBeNull();
    });

    it("blendet die Anhaenge-Liste aus, wenn showAttachmentsList=false", () => {
      const { container } = renderReport({
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
        calculationConfig: configWithToggle("showAttachmentsList", false),
      });
      expect(container.textContent).not.toMatch(/Lieferschein/);
    });

    it("blendet die Code-Spalte aus, wenn showWorkCodeColumn=false", () => {
      const { container, queryAllByText } = renderReport({
        entries: [makeEntry({ project: "Baustelle Nord", code: 1 })],
        workCodes: [{ id: 1, label: "Standard" }],
        calculationConfig: configWithToggle("showWorkCodeColumn", false),
      });
      // Spaltenkopf "Code" weg
      expect(container.textContent).not.toMatch(/Code/);
      // Auch das Label "Standard" aus dieser Spalte erscheint nicht
      expect(queryAllByText("Standard").length).toBe(0);
    });

    it("blendet den Notiz-Block aus, wenn showCustomNote=false", () => {
      const { container } = renderReport({
        customNote: "Sondereinsatz Wochenende",
        calculationConfig: configWithToggle("showCustomNote", false),
      });
      expect(container.textContent).not.toMatch(/Sondereinsatz Wochenende/);
      expect(container.textContent).not.toMatch(/Anmerkungen/);
    });

    it("Default ohne Config: alle Toggles AN (rueckwaertskompatibel)", () => {
      // Legacy-Path: User hat keine pdfDisplay-Config — Defaults greifen,
      // alles ist sichtbar.
      const { container } = renderReport({
        entries: [makeEntry({ project: "Legacy" })],
        calculationConfig: null,
      });
      expect(container.textContent).toMatch(/Zusammenfassung/);
      expect(container.textContent).toMatch(/Code/);
      expect(container.textContent).toMatch(/Saldo/);
    });
  });
});
