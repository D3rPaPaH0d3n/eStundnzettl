import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

// ─── Mocks (müssen VOR dem Dashboard-Import stehen) ─────────

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

// framer-motion auf passthrough stellen, damit jsdom keine
// Animation-Interna ausführt.
vi.mock("framer-motion", () => {
  const passthrough = (props: Record<string, unknown>) => {
    const {
      // Framer-Motion-Props, die wir auf dem DOM-Element nicht brauchen
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      whileDrag: _whileDrag,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      onDragEnd: _onDragEnd,
      layout: _layout,
      layoutId: _layoutId,
      ...rest
    } = props;
    return rest;
  };
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
          React.createElement(tag, passthrough(props), children);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

// react-datepicker in jsdom vereinfacht: nur Custom-Input rendern,
// damit wir den Header nicht brauchen (wir testen ihn nicht).
vi.mock("react-datepicker", () => {
  const DatePicker = ({ customInput }: { customInput?: React.ReactElement }) => {
    return customInput ?? <div data-testid="datepicker-stub" />;
  };
  return {
    __esModule: true,
    default: DatePicker,
    registerLocale: vi.fn(),
  };
});

// Importe NACH den Mocks
import Dashboard from "../Dashboard";
import type { Entry, UserData } from "../../types";
import type { PeriodStatsResult } from "../../utils/timeCalculations";

// ─── Test-Helpers ───────────────────────────────────────────

const makeStats = (overrides: Partial<PeriodStatsResult> = {}): PeriodStatsResult => ({
  work: 0,
  drive: 0,
  holiday: 0,
  vacation: 0,
  sick: 0,
  timeComp: 0,
  totalIst: 0,
  totalTarget: 0,
  totalSaldo: 0,
  normalstunden: 0,
  overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
  ...overrides,
});

const makeUser = (overrides: Partial<UserData> = {}): UserData => ({
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
  project: "Projekt A",
  code: 1,
  netDuration: 480,
  ...overrides,
});

interface RenderOptions {
  groupedByWeek?: [number, Entry[]][];
  stats?: Partial<PeriodStatsResult>;
  userData?: Partial<UserData>;
  overtime?: number;
  progressPercent?: number;
  onEditEntry?: (entry: Entry) => void;
  onDeleteEntry?: (id: Entry["id"]) => void;
  onManageAttachments?: (entry: Entry) => void;
  changeMonth?: (delta: number) => void;
  onSetCurrentDate?: (date: Date) => void;
}

const renderDashboard = (opts: RenderOptions = {}) => {
  const changeMonth = opts.changeMonth ?? vi.fn();
  const onSetCurrentDate = opts.onSetCurrentDate ?? vi.fn();
  const onEditEntry = opts.onEditEntry ?? vi.fn();
  const onDeleteEntry = opts.onDeleteEntry ?? vi.fn();
  const onManageAttachments = opts.onManageAttachments ?? vi.fn();

  const result = render(
    <Dashboard
      currentDate={new Date("2026-04-15T00:00:00Z")}
      onSetCurrentDate={onSetCurrentDate}
      changeMonth={changeMonth}
      stats={makeStats(opts.stats)}
      overtime={opts.overtime ?? 0}
      progressPercent={opts.progressPercent ?? 0}
      groupedByWeek={opts.groupedByWeek ?? []}
      viewMonth={3}
      viewYear={2026}
      onEditEntry={onEditEntry}
      onDeleteEntry={onDeleteEntry}
      onManageAttachments={onManageAttachments}
      getAttachmentsForEntry={() => []}
      userData={makeUser(opts.userData)}
      workCodes={[{ id: 1, label: "Standard" }]}
    />,
  );

  return { ...result, changeMonth, onSetCurrentDate, onEditEntry, onDeleteEntry, onManageAttachments };
};

// ─── Tests ──────────────────────────────────────────────────

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert ohne Crash mit Minimal-Props", () => {
    const { container } = renderDashboard();
    expect(container.querySelector("main")).toBeTruthy();
  });

  it("zeigt Leer-Hinweis bei fehlenden Einträgen", () => {
    const { getByText } = renderDashboard();
    expect(getByText("Keine Einträge vorhanden.")).toBeTruthy();
  });

  it("ruft changeMonth(-1) bei Click auf 'Vorheriger Monat'", () => {
    const { getByLabelText, changeMonth } = renderDashboard();
    fireEvent.click(getByLabelText("Vorheriger Monat"));
    expect(changeMonth).toHaveBeenCalledTimes(1);
    expect(changeMonth).toHaveBeenCalledWith(-1);
  });

  it("ruft changeMonth(1) bei Click auf 'Nächster Monat'", () => {
    const { getByLabelText, changeMonth } = renderDashboard();
    fireEvent.click(getByLabelText("Nächster Monat"));
    expect(changeMonth).toHaveBeenCalledTimes(1);
    expect(changeMonth).toHaveBeenCalledWith(1);
  });

  it("zeigt IST/SOLL/Saldo im Vollmodus", () => {
    const { getByText } = renderDashboard({
      stats: { totalIst: 480, totalTarget: 510 },
      overtime: -30,
    });
    expect(getByText("IST")).toBeTruthy();
    expect(getByText("SOLL")).toBeTruthy();
    expect(getByText("Saldo")).toBeTruthy();
  });

  it("versteckt SOLL/Saldo im Simple-Modus", () => {
    const { queryByText } = renderDashboard({
      userData: { simpleMode: true },
      stats: { totalIst: 480, totalTarget: 510 },
    });
    expect(queryByText("SOLL")).toBeNull();
    expect(queryByText("Saldo")).toBeNull();
  });

  it("ruft onEditEntry mit dem richtigen Entry bei Click auf einen Eintrag", () => {
    const entry = makeEntry({ id: 42, project: "Projekt Alpha" });
    const onEditEntry = vi.fn();
    // Platziere den Eintrag in KW 15 (Apr 2026) — stimmt mit currentDate überein,
    // Woche wird Dashboard-intern expandiert. Wir klicken direkt auf die Zeile.
    const { getByText } = renderDashboard({
      groupedByWeek: [[15, [entry]]],
      onEditEntry,
    });

    // Der Eintrag wird durch den Projekt-Text repräsentiert.
    // Wir gehen zur klickbaren Zeile (Parent-Row mit onClick).
    const projectText = getByText("Projekt Alpha");
    const row = projectText.closest("[class*='cursor-pointer']") ?? projectText;
    fireEvent.click(row);

    expect(onEditEntry).toHaveBeenCalledTimes(1);
    expect(onEditEntry.mock.calls[0][0]).toMatchObject({ id: 42, project: "Projekt Alpha" });
  });
});
