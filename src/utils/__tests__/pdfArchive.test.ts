import { describe, it, expect } from "vitest";
import {
  filterEntriesForMonth,
  hashMonthContent,
  buildArchiveFilename,
} from "../pdfArchive";
import type { Entry, UserData } from "../../types";

const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 1,
  type: "work",
  date: "2026-03-15",
  start: "08:00",
  end: "17:00",
  pause: 30,
  code: 1,
  netDuration: 510,
  ...overrides,
});

describe("filterEntriesForMonth", () => {
  it("returns only entries matching the given year and month", () => {
    const entries = [
      makeEntry({ id: 1, date: "2026-03-01" }),
      makeEntry({ id: 2, date: "2026-03-31" }),
      makeEntry({ id: 3, date: "2026-04-01" }),
      makeEntry({ id: 4, date: "2026-02-28" }),
    ];
    const result = filterEntriesForMonth(entries, 2026, 3);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual([1, 2]);
  });

  it("sorts entries by date then by start time", () => {
    const entries = [
      makeEntry({ id: 1, date: "2026-03-15", start: "14:00" }),
      makeEntry({ id: 2, date: "2026-03-10", start: "08:00" }),
      makeEntry({ id: 3, date: "2026-03-15", start: "08:00" }),
    ];
    const result = filterEntriesForMonth(entries, 2026, 3);
    expect(result.map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it("returns empty array for empty input", () => {
    expect(filterEntriesForMonth([], 2026, 3)).toEqual([]);
  });

  it("returns empty array when no entries match", () => {
    const entries = [makeEntry({ date: "2026-04-01" })];
    expect(filterEntriesForMonth(entries, 2026, 3)).toEqual([]);
  });

  it("handles null/undefined entries array gracefully", () => {
    expect(filterEntriesForMonth(null as unknown as Entry[], 2026, 3)).toEqual([]);
    expect(filterEntriesForMonth(undefined as unknown as Entry[], 2026, 3)).toEqual([]);
  });

  it("pads single-digit months correctly (month 1 -> '01')", () => {
    const entries = [
      makeEntry({ id: 1, date: "2026-01-15" }),
      makeEntry({ id: 2, date: "2026-10-15" }),
    ];
    const result = filterEntriesForMonth(entries, 2026, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("filters out entries with non-string dates", () => {
    const entries = [
      makeEntry({ id: 1, date: "2026-03-15" }),
      { ...makeEntry({ id: 2 }), date: undefined as unknown as string },
    ];
    const result = filterEntriesForMonth(entries, 2026, 3);
    expect(result).toHaveLength(1);
  });
});

describe("hashMonthContent", () => {
  const baseParams = {
    entries: [makeEntry({ id: 1, date: "2026-03-15" })],
    userData: { name: "Max", position: "Dev", photo: null, workDays: [0, 510, 510, 510, 510, 270, 0] } as UserData,
    year: 2026,
    month: 3,
  };

  it("returns a deterministic string hash", () => {
    const a = hashMonthContent(baseParams);
    const b = hashMonthContent(baseParams);
    expect(a).toBe(b);
    expect(typeof a).toBe("string");
  });

  it("produces different hashes for different entries", () => {
    const a = hashMonthContent(baseParams);
    const b = hashMonthContent({
      ...baseParams,
      entries: [makeEntry({ id: 2, date: "2026-03-15", netDuration: 600 })],
    });
    expect(a).not.toBe(b);
  });

  it("produces different hashes for different months", () => {
    const a = hashMonthContent(baseParams);
    const b = hashMonthContent({ ...baseParams, month: 4 });
    expect(a).not.toBe(b);
  });

  it("produces different hashes for different user names", () => {
    const a = hashMonthContent(baseParams);
    const b = hashMonthContent({
      ...baseParams,
      userData: { ...baseParams.userData, name: "Anna" },
    });
    expect(a).not.toBe(b);
  });

  it("handles null userData", () => {
    const hash = hashMonthContent({ ...baseParams, userData: null });
    expect(typeof hash).toBe("string");
  });

  it("only considers entries from the specified month", () => {
    const entriesWithOtherMonth = [
      makeEntry({ id: 1, date: "2026-03-15" }),
      makeEntry({ id: 2, date: "2026-04-01" }),
    ];
    const a = hashMonthContent({ ...baseParams, entries: entriesWithOtherMonth });
    const b = hashMonthContent(baseParams);
    // The April entry should be filtered out, so hashes should match
    expect(a).toBe(b);
  });
});

describe("buildArchiveFilename", () => {
  it("builds filename with year, month and user name", () => {
    const result = buildArchiveFilename({
      year: 2026,
      month: 4,
      userData: { name: "Max Mustermann", position: "", photo: null, workDays: [] } as unknown as UserData,
    });
    expect(result).toBe("Stundenzettel_2026-04_Max_Mustermann.pdf");
  });

  it("pads single-digit months", () => {
    const result = buildArchiveFilename({
      year: 2026,
      month: 1,
      userData: { name: "Max", position: "", photo: null, workDays: [] } as unknown as UserData,
    });
    expect(result).toBe("Stundenzettel_2026-01_Max.pdf");
  });

  it("uses 'Stundenzettel' as fallback when name is empty", () => {
    const result = buildArchiveFilename({ year: 2026, month: 3, userData: null });
    expect(result).toBe("Stundenzettel_2026-03_Stundenzettel.pdf");
  });

  it("strips special characters from name", () => {
    const result = buildArchiveFilename({
      year: 2026,
      month: 3,
      userData: { name: "Max@#$%", position: "", photo: null, workDays: [] } as unknown as UserData,
    });
    expect(result).toBe("Stundenzettel_2026-03_Max.pdf");
  });

  it("replaces spaces with underscores", () => {
    const result = buildArchiveFilename({
      year: 2026,
      month: 3,
      userData: { name: "Max  Muster Mann", position: "", photo: null, workDays: [] } as unknown as UserData,
    });
    expect(result).toBe("Stundenzettel_2026-03_Max_Muster_Mann.pdf");
  });
});
