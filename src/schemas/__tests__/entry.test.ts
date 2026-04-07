import { describe, it, expect } from "vitest";
import {
  entrySchema,
  parseEntrySafe,
  filterValidEntries,
  dateString,
  timeString,
  entryTypeSchema,
} from "../entry";

describe("dateString", () => {
  it("akzeptiert YYYY-MM-DD", () => {
    expect(dateString.safeParse("2026-04-04").success).toBe(true);
  });
  it("lehnt andere Formate ab", () => {
    expect(dateString.safeParse("04.04.2026").success).toBe(false);
    expect(dateString.safeParse("2026-4-4").success).toBe(false);
    expect(dateString.safeParse("not a date").success).toBe(false);
  });
});

describe("timeString", () => {
  it("akzeptiert HH:MM", () => {
    expect(timeString.safeParse("08:45").success).toBe(true);
    expect(timeString.safeParse("23:59").success).toBe(true);
  });
  it("lehnt andere Formate ab", () => {
    expect(timeString.safeParse("8:45").success).toBe(false);
    expect(timeString.safeParse("24:00:00").success).toBe(false);
  });
});

describe("entryTypeSchema", () => {
  it("akzeptiert alle bekannten Typen", () => {
    for (const t of ["work", "vacation", "sick", "public_holiday", "time_comp"]) {
      expect(entryTypeSchema.safeParse(t).success).toBe(true);
    }
  });
  it("lehnt unbekannte Typen ab", () => {
    expect(entryTypeSchema.safeParse("drive").success).toBe(false);
    expect(entryTypeSchema.safeParse("").success).toBe(false);
  });
});

describe("entrySchema — Arbeit", () => {
  it("akzeptiert einen vollständigen Arbeits-Eintrag", () => {
    const ok = entrySchema.safeParse({
      id: 1,
      type: "work",
      date: "2026-04-04",
      start: "08:00",
      end: "17:00",
      pause: 30,
      project: "Baustelle A",
      code: 70,
      netDuration: 510,
    });
    expect(ok.success).toBe(true);
  });

  it("lehnt einen Arbeits-Eintrag ohne start/end ab", () => {
    const bad = entrySchema.safeParse({
      id: 1,
      type: "work",
      date: "2026-04-04",
      pause: 0,
      netDuration: 0,
    });
    expect(bad.success).toBe(false);
  });

  it("füllt Default-Werte für pause und netDuration ein", () => {
    const ok = entrySchema.safeParse({
      id: 1,
      type: "work",
      date: "2026-04-04",
      start: "08:00",
      end: "17:00",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.pause).toBe(0);
      expect(ok.data.netDuration).toBe(0);
    }
  });
});

describe("entrySchema — Urlaub/Krank", () => {
  it("akzeptiert einen Urlaubstag ohne start/end", () => {
    const ok = entrySchema.safeParse({
      id: 2,
      type: "vacation",
      date: "2026-04-04",
      netDuration: 510,
    });
    expect(ok.success).toBe(true);
  });
});

describe("parseEntrySafe", () => {
  it("liefert das Objekt bei validem Input", () => {
    const e = parseEntrySafe({ id: 1, type: "work", date: "2026-01-01", start: "08:00", end: "16:00" });
    expect(e).not.toBeNull();
    expect(e!.id).toBe(1);
  });
  it("liefert null bei invalidem Input", () => {
    expect(parseEntrySafe(null)).toBeNull();
    expect(parseEntrySafe({})).toBeNull();
    expect(parseEntrySafe({ id: 1, type: "work", date: "kaputt" })).toBeNull();
  });
});

describe("filterValidEntries", () => {
  it("filtert invalide Entries aus einer Mix-Liste", () => {
    const input = [
      { id: 1, type: "work", date: "2026-01-01", start: "08:00", end: "16:00" }, // ok
      { id: 2, type: "work", date: "keindatum", start: "08:00", end: "16:00" }, // bad
      null, // bad
      { id: 3, type: "vacation", date: "2026-01-02" }, // ok
      "string", // bad
    ];
    const valid = filterValidEntries(input);
    expect(valid).toHaveLength(2);
    expect(valid[0].id).toBe(1);
    expect(valid[1].id).toBe(3);
  });

  it("gibt ein leeres Array zurück bei Nicht-Array-Input", () => {
    expect(filterValidEntries(null)).toEqual([]);
    expect(filterValidEntries({})).toEqual([]);
    expect(filterValidEntries(undefined)).toEqual([]);
  });
});
