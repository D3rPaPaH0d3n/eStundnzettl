import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("../../utils/timeCalculations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/timeCalculations")>();
  return {
    ...actual,
    // We keep the real calculatePeriodStats to test integration
  };
});

import { usePeriodStats } from "../usePeriodStats";
import type { Entry, UserData } from "../../types";

// ─── Helpers ────────────────────────────────────────────────

const USER: UserData = {
  name: "Max",
  position: "Dev",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 270, 0], // So=0, Mo-Do=510, Fr=270, Sa=0
};

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    type: "work",
    date: "2026-04-06", // Monday
    start: "08:00",
    end: "16:30",
    pause: 30,
    netDuration: 480,
    code: 1,
    project: null,
    ...overrides,
  };
}

const PERIOD_START = new Date(2026, 3, 1); // April 1
const PERIOD_END = new Date(2026, 3, 30);  // April 30

// ─── Tests ──────────────────────────────────────────────────

describe("usePeriodStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zero stats for empty entries", () => {
    const { result } = renderHook(() =>
      usePeriodStats([], USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.work).toBe(0);
    expect(result.current.drive).toBe(0);
    expect(result.current.vacation).toBe(0);
    expect(result.current.sick).toBe(0);
    expect(result.current.totalIst).toBe(0);
    expect(result.current.totalTarget).toBeGreaterThan(0); // April has work days
  });

  it("aggregates work minutes correctly", () => {
    const entries = [
      makeEntry({ id: 1, date: "2026-04-06", netDuration: 480 }), // Mon
      makeEntry({ id: 2, date: "2026-04-07", netDuration: 510 }), // Tue
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.work).toBe(990);
  });

  it("counts vacation minutes", () => {
    const entries = [
      makeEntry({ id: 1, type: "vacation", date: "2026-04-06", netDuration: 510 }),
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.vacation).toBe(510);
    expect(result.current.totalIst).toBe(510);
  });

  it("counts sick minutes", () => {
    const entries = [
      makeEntry({ id: 1, type: "sick", date: "2026-04-06", netDuration: 510 }),
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.sick).toBe(510);
    expect(result.current.totalIst).toBe(510);
  });

  it("categorizes drive code as drive, not work", () => {
    const entries = [
      makeEntry({ id: 1, type: "work", code: 19, date: "2026-04-06", netDuration: 60 }),
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.drive).toBe(60);
    expect(result.current.work).toBe(0);
  });

  it("calculates totalSaldo as totalIst - totalTarget", () => {
    // Single Monday entry, target for Mon = 510
    const entries = [
      makeEntry({ id: 1, date: "2026-04-06", netDuration: 480 }),
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.totalSaldo).toBe(
      result.current.totalIst - result.current.totalTarget
    );
  });

  it("computes totalTarget from workDays over the full period", () => {
    const { result } = renderHook(() =>
      usePeriodStats([], USER, PERIOD_START, PERIOD_END)
    );
    // April 2026: 4 full weeks + extra days
    // Should have workdays with positive targets
    expect(result.current.totalTarget).toBeGreaterThan(0);
  });

  it("handles invalid periodStart gracefully (falls back to Date)", () => {
    const { result } = renderHook(() =>
      usePeriodStats([], USER, "invalid" as unknown as Date, PERIOD_END)
    );
    // Should not throw — falls back to new Date()
    expect(result.current).toBeDefined();
    expect(typeof result.current.totalTarget).toBe("number");
  });

  it("counts public_holiday minutes", () => {
    const entries = [
      makeEntry({ id: 1, type: "public_holiday", date: "2026-04-06", netDuration: 510 }),
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.holiday).toBe(510);
    expect(result.current.totalIst).toBe(510);
  });

  it("counts time_comp minutes", () => {
    const entries = [
      makeEntry({ id: 1, type: "time_comp", date: "2026-04-06", netDuration: 510 }),
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.timeComp).toBe(510);
    expect(result.current.totalIst).toBe(510);
  });

  it("excludes entries outside the period range", () => {
    const entries = [
      makeEntry({ id: 1, date: "2026-03-31", netDuration: 480 }), // outside
      makeEntry({ id: 2, date: "2026-04-06", netDuration: 510 }), // inside
      makeEntry({ id: 3, date: "2026-05-01", netDuration: 480 }), // outside
    ];
    const { result } = renderHook(() =>
      usePeriodStats(entries, USER, PERIOD_START, PERIOD_END)
    );
    expect(result.current.work).toBe(510);
  });
});
