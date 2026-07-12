import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("../../utils", () => ({
  getHolidayData: vi.fn(() => ({})),
  toLocalDateString: vi.fn(() => "2026-04-07"),
}));

vi.mock("../../utils/timeCalculations", () => ({
  getWeekNumber: vi.fn((d: Date) => {
    // Simplified ISO week: just return a stable week number
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  }),
  getTargetMinutesForDate: vi.fn(() => 510),
  applyEffectiveDurations: vi.fn((entries: unknown[]) => entries),
}));

vi.mock("../usePeriodStats", () => ({
  usePeriodStats: vi.fn(() => ({
    work: 480,
    drive: 60,
    holiday: 0,
    vacation: 0,
    sick: 0,
    timeComp: 0,
    totalIst: 540,
    totalTarget: 510,
    totalSaldo: 30,
    normalstunden: 480,
    overtimeSplit: { mehrarbeit: 30, ueberstunden: 0 },
  })),
}));

import { useAppData } from "../useAppData";
import { getHolidayData } from "../../utils";
import { usePeriodStats } from "../usePeriodStats";
import type { Entry, UserData } from "../../types";

// ─── Helpers ────────────────────────────────────────────────

const USER: UserData = {
  name: "Max",
  position: "Dev",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 270, 0],
};

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    type: "work",
    date: "2026-04-06",
    start: "08:00",
    end: "16:30",
    pause: 30,
    netDuration: 480,
    code: 1,
    project: "Projekt A",
    ...overrides,
  };
}

function mount(overrides: Record<string, unknown> = {}) {
  const defaults = {
    entries: [] as Entry[],
    userData: USER,
    viewMonth: 3, // April (0-indexed)
    viewYear: 2026,
    allEntries: undefined,
  };
  return renderHook(() => useAppData({ ...defaults, ...overrides } as Parameters<typeof useAppData>[0]));
}

// ─── Tests ──────────────────────────────────────────────────

describe("useAppData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty entriesWithHolidays when there are no entries and no holidays", () => {
    const { result } = mount();
    expect(result.current.entriesWithHolidays).toEqual([]);
  });

  it("filters entries to the current viewMonth/viewYear", () => {
    const aprilEntry = makeEntry({ id: 1, date: "2026-04-06" });
    const marchEntry = makeEntry({ id: 2, date: "2026-03-15" });
    const { result } = mount({ entries: [aprilEntry, marchEntry] });
    // Only the April entry should appear
    expect(result.current.entriesWithHolidays).toHaveLength(1);
    expect(result.current.entriesWithHolidays[0].id).toBe(1);
  });

  it("merges holiday entries from getHolidayData into the list", () => {
    vi.mocked(getHolidayData).mockReturnValue({
      "2026-04-06": "Ostermontag",
    });
    const { result } = mount();
    const holidays = result.current.entriesWithHolidays.filter(
      (e: Entry) => e.type === "public_holiday"
    );
    expect(holidays).toHaveLength(1);
    expect(holidays[0].project).toBe("Ostermontag");
    expect(holidays[0].id).toBe("auto-holiday-2026-04-06");
  });

  it("does not add holiday entries for future dates", () => {
    // toLocalDateString returns "2026-04-07" (mocked as today)
    vi.mocked(getHolidayData).mockReturnValue({
      "2026-04-10": "Feiertag in Zukunft",
    });
    const { result } = mount();
    const holidays = result.current.entriesWithHolidays.filter(
      (e: Entry) => e.type === "public_holiday"
    );
    expect(holidays).toHaveLength(0);
  });

  it("sorts entriesWithHolidays by date descending", () => {
    const e1 = makeEntry({ id: 1, date: "2026-04-01" });
    const e2 = makeEntry({ id: 2, date: "2026-04-05" });
    const { result } = mount({ entries: [e1, e2] });
    expect(result.current.entriesWithHolidays[0].id).toBe(2);
    expect(result.current.entriesWithHolidays[1].id).toBe(1);
  });

  it("groups entries by week number in groupedByWeek", () => {
    const e1 = makeEntry({ id: 1, date: "2026-04-06" });
    const e2 = makeEntry({ id: 2, date: "2026-04-07" });
    const { result } = mount({ entries: [e1, e2] });
    expect(result.current.groupedByWeek.length).toBeGreaterThanOrEqual(1);
    // Each group is [weekNumber, entries[]]
    result.current.groupedByWeek.forEach(([weekNum, entries]: [number, Entry[]]) => {
      expect(typeof weekNum).toBe("number");
      expect(Array.isArray(entries)).toBe(true);
    });
  });

  it("exposes stats from usePeriodStats", () => {
    const { result } = mount();
    expect(result.current.stats.totalIst).toBe(540);
    expect(result.current.stats.totalTarget).toBe(510);
    expect(result.current.stats.totalSaldo).toBe(30);
  });

  it("computes overtime from stats.totalSaldo", () => {
    const { result } = mount();
    expect(result.current.overtime).toBe(30);
  });

  it("computes progressPercent capped at 100", () => {
    vi.mocked(usePeriodStats).mockReturnValue({
      work: 600,
      drive: 0,
      holiday: 0,
      vacation: 0,
      sick: 0,
      timeComp: 0,
      totalIst: 600,
      totalTarget: 500,
      totalSaldo: 100,
      normalstunden: 600,
      overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
    });
    const { result } = mount();
    expect(result.current.progressPercent).toBe(100);
  });

  it("derives monthly target progress from totalIst in simple mode", () => {
    vi.mocked(usePeriodStats).mockReturnValue({
      work: 540,
      drive: 0,
      holiday: 0,
      vacation: 0,
      sick: 0,
      timeComp: 0,
      totalIst: 540,
      totalTarget: 510,
      totalSaldo: 30,
      normalstunden: 540,
      overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
    });
    const { result } = mount({
      userData: { ...USER, simpleMode: true, monthlyTargetMinutes: 720 },
    });

    expect(result.current.monthlyTargetProgress).toMatchObject({
      targetMinutes: 720,
      actualMinutes: 540,
      remainingMinutes: 180,
      exceededMinutes: 0,
      progressPercent: 75,
    });
    expect(result.current.progressPercent).toBe(75);
  });

  it("ignores monthly target outside simple mode", () => {
    const { result } = mount({
      userData: { ...USER, simpleMode: false, monthlyTargetMinutes: 720 },
    });

    expect(result.current.monthlyTargetProgress).toBeNull();
    expect(result.current.progressPercent).toBe(100);
  });

  it("finds lastWorkEntry as the latest work entry by date|id", () => {
    const e1 = makeEntry({ id: 10, type: "work", date: "2026-04-01" });
    const e2 = makeEntry({ id: 20, type: "work", date: "2026-04-05" });
    const e3 = makeEntry({ id: 30, type: "vacation", date: "2026-04-06" });
    const { result } = mount({ entries: [e1, e2, e3] });
    expect(result.current.lastWorkEntry).not.toBeNull();
    expect(result.current.lastWorkEntry!.id).toBe(20);
  });

  it("returns null for lastWorkEntry when no work entries exist", () => {
    const e1 = makeEntry({ id: 1, type: "vacation", date: "2026-04-01" });
    const { result } = mount({ entries: [e1] });
    expect(result.current.lastWorkEntry).toBeNull();
  });

  it("extracts uniqueProjects sorted alphabetically", () => {
    const entries = [
      makeEntry({ id: 1, project: "Zebra" }),
      makeEntry({ id: 2, project: "Alpha" }),
      makeEntry({ id: 3, project: "Zebra" }),
      makeEntry({ id: 4, project: "  " }), // blank trimmed
    ];
    const { result } = mount({ entries });
    expect(result.current.uniqueProjects).toEqual(["Alpha", "Zebra"]);
  });

  it("skips holiday entries on non-workdays (targetMinutes=0)", async () => {
    const { getTargetMinutesForDate } = await import("../../utils/timeCalculations");
    vi.mocked(getTargetMinutesForDate).mockReturnValue(0);
    vi.mocked(getHolidayData).mockReturnValue({
      "2026-04-05": "Sonntags-Feiertag",
    });
    const { result } = mount();
    const holidays = result.current.entriesWithHolidays.filter(
      (e: Entry) => e.type === "public_holiday"
    );
    expect(holidays).toHaveLength(0);
  });
});
