import { describe, it, expect } from "vitest";
import {
  parseTime,
  getDayOfWeek,
  getTargetMinutesForDate,
  getWeekNumber,
  calculateOvertimeSplit,
  adjustSickDuration,
  applyEffectiveDurations,
  calculateEntryNetDuration,
  calculateDisplayedDayMinutes,
  calculatePeriodStats,
  calculateRawDuration,
  isOvernightShift,
  toAbsoluteRange,
  getEntryDayContributions,
} from "../timeCalculations";
import type { Entry, UserData } from "../../types";
import { WORK_CODE } from "../../hooks/constants";

describe("parseTime", () => {
  it("konvertiert HH:MM korrekt in Minuten", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("01:30")).toBe(90);
    expect(parseTime("08:45")).toBe(525);
    expect(parseTime("23:59")).toBe(23 * 60 + 59);
  });
});

describe("calculateRawDuration", () => {
  it("berechnet normale Dauer (Endzeit > Startzeit)", () => {
    expect(calculateRawDuration("08:00", "17:00")).toBe(9 * 60);
    expect(calculateRawDuration("00:00", "12:00")).toBe(12 * 60);
  });

  it("liefert 0 wenn Start- und Endzeit gleich sind", () => {
    expect(calculateRawDuration("08:00", "08:00")).toBe(0);
  });

  it("erkennt Nachtschicht (Endzeit < Startzeit) und rechnet über Mitternacht", () => {
    expect(calculateRawDuration("22:00", "06:00")).toBe(8 * 60);
    expect(calculateRawDuration("23:00", "00:00")).toBe(60);
    expect(calculateRawDuration("18:00", "02:30")).toBe(8 * 60 + 30);
  });
});

describe("isOvernightShift", () => {
  it("ist false für normale Schichten", () => {
    expect(isOvernightShift("08:00", "17:00")).toBe(false);
    expect(isOvernightShift("00:00", "23:59")).toBe(false);
  });

  it("ist false bei gleicher Start- und Endzeit", () => {
    expect(isOvernightShift("12:00", "12:00")).toBe(false);
  });

  it("ist true wenn Endzeit numerisch vor Startzeit liegt", () => {
    expect(isOvernightShift("22:00", "06:00")).toBe(true);
    expect(isOvernightShift("23:30", "00:30")).toBe(true);
  });
});

describe("toAbsoluteRange", () => {
  it("liefert unveränderte Range bei normaler Schicht", () => {
    expect(toAbsoluteRange("08:00", "17:00")).toEqual([8 * 60, 17 * 60]);
  });

  it("verschiebt Ende um 24h bei Nachtschicht", () => {
    expect(toAbsoluteRange("22:00", "06:00")).toEqual([22 * 60, 30 * 60]);
  });

  it("verschiebt Ende auch wenn Endzeit == Startzeit (24h-Schicht)", () => {
    expect(toAbsoluteRange("08:00", "08:00")).toEqual([8 * 60, 32 * 60]);
  });
});

describe("getEntryDayContributions", () => {
  const entry = {
    date: "2026-01-04", // Sonntag
    start: "22:00",
    end: "06:00",
    netDuration: 450, // 8h Roh, 30min Pause
  };

  it("schreibt ohne Split alles dem Beginn-Tag zu", () => {
    expect(getEntryDayContributions(entry, false)).toEqual({
      "2026-01-04": 450,
    });
  });

  it("schreibt ohne Nachtschicht (end > start) alles dem Beginn-Tag zu, auch mit splitEnabled", () => {
    const dayShift = { date: "2026-01-04", start: "08:00", end: "17:00", netDuration: 510 };
    expect(getEntryDayContributions(dayShift, true)).toEqual({
      "2026-01-04": 510,
    });
  });

  it("splittet Nachtschicht proportional zur Roh-Dauer auf Beginn- und Folgetag", () => {
    // 22-24 = 120min von 480min Roh = 25% → 112min, Folgetag bekommt 338min
    const contrib = getEntryDayContributions(entry, true);
    expect(contrib).toEqual({
      "2026-01-04": 112,
      "2026-01-05": 338,
    });
    expect(contrib["2026-01-04"] + contrib["2026-01-05"]).toBe(450);
  });

  it("rollt über Monatsgrenzen korrekt", () => {
    const overMonth = {
      date: "2026-01-31",
      start: "22:00",
      end: "06:00",
      netDuration: 480,
    };
    const contrib = getEntryDayContributions(overMonth, true);
    expect(Object.keys(contrib).sort()).toEqual(["2026-01-31", "2026-02-01"]);
    expect(contrib["2026-01-31"] + contrib["2026-02-01"]).toBe(480);
  });
});

describe("getDayOfWeek", () => {
  it("erkennt Wochentag aus YYYY-MM-DD (0=So..6=Sa)", () => {
    // 2024-01-01 war ein Montag
    expect(getDayOfWeek("2024-01-01")).toBe(1);
    // 2024-01-07 war ein Sonntag
    expect(getDayOfWeek("2024-01-07")).toBe(0);
    // 2024-01-06 war ein Samstag
    expect(getDayOfWeek("2024-01-06")).toBe(6);
  });
});

describe("getTargetMinutesForDate", () => {
  it("nutzt Default 510 min Mo-Do und 270 min Fr ohne customWorkDays", () => {
    expect(getTargetMinutesForDate("2024-01-01")).toBe(510); // Mo
    expect(getTargetMinutesForDate("2024-01-02")).toBe(510); // Di
    expect(getTargetMinutesForDate("2024-01-03")).toBe(510); // Mi
    expect(getTargetMinutesForDate("2024-01-04")).toBe(510); // Do
    expect(getTargetMinutesForDate("2024-01-05")).toBe(270); // Fr
    expect(getTargetMinutesForDate("2024-01-06")).toBe(0);   // Sa
    expect(getTargetMinutesForDate("2024-01-07")).toBe(0);   // So
  });

  it("respektiert customWorkDays (7er-Array, So..Sa)", () => {
    const custom = [0, 480, 480, 480, 480, 480, 0]; // Mo-Fr je 8h
    expect(getTargetMinutesForDate("2024-01-05", custom)).toBe(480);
    expect(getTargetMinutesForDate("2024-01-06", custom)).toBe(0);
  });

  it("halbiert an HALF_DAYS (24.12., 31.12.)", () => {
    // 2024-12-24 = Dienstag → 510/2 = 255
    expect(getTargetMinutesForDate("2024-12-24")).toBe(255);
    // 2024-12-31 = Dienstag → 255
    expect(getTargetMinutesForDate("2024-12-31")).toBe(255);
  });
});

describe("getWeekNumber", () => {
  it("liefert ISO-Wochennummer", () => {
    // 2024-01-01 = Montag = KW 1
    expect(getWeekNumber(new Date(2024, 0, 1))).toBe(1);
    // 2023-01-01 = Sonntag, gehört noch zu KW 52/2022
    expect(getWeekNumber(new Date(2023, 0, 1))).toBe(52);
    // 2024-12-30 = Montag = KW 1 von 2025
    expect(getWeekNumber(new Date(2024, 11, 30))).toBe(1);
  });
});

describe("calculateOvertimeSplit", () => {
  it("gibt 0/0 bei nicht-positivem Saldo", () => {
    expect(calculateOvertimeSplit(0, 2400)).toEqual({ mehrarbeit: 0, ueberstunden: 0 });
    expect(calculateOvertimeSplit(-60, 2400)).toEqual({ mehrarbeit: 0, ueberstunden: 0 });
  });

  it("ordnet Plus-Saldo zunächst der Mehrarbeit bis zur 40h-Grenze zu", () => {
    // Wochenziel 38.5h = 2310 min, +30 min Plus → alles Mehrarbeit (Puffer bis 2400)
    expect(calculateOvertimeSplit(30, 2310)).toEqual({ mehrarbeit: 30, ueberstunden: 0 });
    // Wochenziel 38.5h, +120 min → 90 min Mehrarbeit, 30 min Überstunden
    expect(calculateOvertimeSplit(120, 2310)).toEqual({ mehrarbeit: 90, ueberstunden: 30 });
  });

  it("legt alles als Überstunden an, wenn Ziel schon ≥ 40h ist", () => {
    expect(calculateOvertimeSplit(60, 2400)).toEqual({ mehrarbeit: 0, ueberstunden: 60 });
    expect(calculateOvertimeSplit(60, 2500)).toEqual({ mehrarbeit: 0, ueberstunden: 60 });
  });
});

describe("calculateEntryNetDuration", () => {
  it("zieht Pause bei Arbeitseinträgen ab", () => {
    const mins = calculateEntryNetDuration({
      entryType: "work",
      startTime: "08:00",
      endTime: "17:00",
      pauseDuration: 30,
      formDate: "2026-04-04",
      userData: null,
      code: WORK_CODE.OFFICE,
    });
    expect(mins).toBe(8 * 60 + 30);
  });

  it("ignoriert Pause bei Fahrzeit (Code 19)", () => {
    const mins = calculateEntryNetDuration({
      entryType: "work",
      startTime: "08:00",
      endTime: "10:00",
      pauseDuration: 60,
      formDate: "2026-04-04",
      userData: null,
      code: WORK_CODE.DRIVE,
    });
    expect(mins).toBe(120);
  });

  it("interpretiert end < start als Nachtschicht über Mitternacht", () => {
    // 10:00 → 09:00 = 23h Nachtschicht
    const mins = calculateEntryNetDuration({
      entryType: "work",
      startTime: "10:00",
      endTime: "09:00",
      pauseDuration: 0,
      formDate: "2026-04-04",
      userData: null,
      code: WORK_CODE.OFFICE,
    });
    expect(mins).toBe(23 * 60);
  });

  it("liefert 0 wenn Start- und Endzeit gleich sind", () => {
    const mins = calculateEntryNetDuration({
      entryType: "work",
      startTime: "10:00",
      endTime: "10:00",
      pauseDuration: 0,
      formDate: "2026-04-04",
      userData: null,
      code: WORK_CODE.OFFICE,
    });
    expect(mins).toBe(0);
  });

  it("berechnet Nachtschicht 22:00–06:00 mit 30min Pause korrekt", () => {
    const mins = calculateEntryNetDuration({
      entryType: "work",
      startTime: "22:00",
      endTime: "06:00",
      pauseDuration: 30,
      formDate: "2026-04-04",
      userData: null,
      code: WORK_CODE.OFFICE,
    });
    expect(mins).toBe(8 * 60 - 30);
  });

  it("nutzt für Nicht-Arbeit (Urlaub/Krank) das Tagessoll", () => {
    const mins = calculateEntryNetDuration({
      entryType: "vacation",
      startTime: "",
      endTime: "",
      pauseDuration: 0,
      formDate: "2024-01-01", // Montag → 510
      userData: null,
      code: 0,
    });
    expect(mins).toBe(510);
  });
});

describe("calculateDisplayedDayMinutes", () => {
  it("summiert netDuration, ignoriert aber Fahrzeit-Einträge", () => {
    const entries = [
      { type: "work", code: WORK_CODE.OFFICE, netDuration: 480 },
      { type: "work", code: WORK_CODE.DRIVE, netDuration: 60 },
      { type: "vacation", code: 0, netDuration: 510 },
    ] as unknown as Entry[];
    expect(calculateDisplayedDayMinutes(entries)).toBe(480 + 510);
  });
});

describe("calculatePeriodStats", () => {
  it("aggregiert Ist/Soll/Saldo für eine Woche korrekt", () => {
    const userData = { workDays: null } as unknown as UserData;
    // Mo-Fr 2024-01-01..05 alle voll gearbeitet
    const entries = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-04", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-05", type: "work", code: WORK_CODE.OFFICE, netDuration: 270 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      entries,
      userData,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7)
    );
    expect(stats.work).toBe(510 * 4 + 270);
    expect(stats.totalTarget).toBe(510 * 4 + 270);
    expect(stats.totalSaldo).toBe(0);
    expect(stats.normalstunden).toBe(510 * 4 + 270);
  });

  it("trägt Fahrzeit in `drive`, nicht in `work`", () => {
    const entries = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 480 },
      { date: "2024-01-01", type: "work", code: WORK_CODE.DRIVE, netDuration: 60 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null } as unknown as UserData,
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    expect(stats.work).toBe(480);
    expect(stats.drive).toBe(60);
  });

  it("Gebrochene Woche unter Wochen-Soll: nur tägliche ÜS, keine MA", () => {
    // KW14: Mo 30.03 + Di 31.03 im März (IST=1230=20h30m < 2310=38h30m)
    // Unter Wochen-Soll → tägliche ÜS: Mo (600-510=90) + Di (630-510=120) = 210
    const userData = { workDays: null } as unknown as UserData;
    const marchEntries = [
      { date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 630 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      marchEntries,
      userData,
      new Date(2026, 2, 30),
      new Date(2026, 2, 31)
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(210);
  });

  it("Gebrochene Woche unter Wochen-Soll am Monatsanfang: nur tägliche ÜS", () => {
    // KW14: Mi-Fr im April (IST=1500=25h < 2310=38h30m)
    // Tägliche ÜS: Mi (600-510=90) + Do (600-510=90) + Fr (300-270=30) = 210
    const userData = { workDays: null } as unknown as UserData;
    const aprilEntries = [
      { date: "2026-04-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { date: "2026-04-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { date: "2026-04-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      aprilEntries,
      userData,
      new Date(2026, 3, 1),
      new Date(2026, 3, 5)
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(210);
  });

  it("Gebrochene Woche über Wochen-Soll: MA/ÜS-Split greift", () => {
    // 5 Tage gebrochene Woche, IST=2440 > Wochen-Soll 2310
    // calculateOvertimeSplit(130, 2310): Puffer=90, MA=90, ÜS=40
    const userData = { workDays: null } as unknown as UserData;
    const entries = [
      { date: "2025-07-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2025-07-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2025-07-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2025-07-04", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2025-07-05", type: "work", code: WORK_CODE.OFFICE, netDuration: 400 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      entries,
      userData,
      new Date(2025, 6, 1),
      new Date(2025, 6, 5)
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(90);
    expect(stats.overtimeSplit.ueberstunden).toBe(40);
  });

  it("Gebrochene Woche ohne täglichen Überschuss → keine MA/ÜS", () => {
    const userData = { workDays: null } as unknown as UserData;
    const entries = [
      { date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      entries,
      userData,
      new Date(2026, 2, 30),
      new Date(2026, 2, 31)
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
  });

  it("split Plus-Saldo korrekt in Mehrarbeit und Überstunden", () => {
    // Mo-Do je 9h = 540 (+30 pro Tag), Fr 270 → Woche: Ist = 540*4 + 270 = 2430, Soll 2310, Diff 120
    // 40h-Grenze 2400, Puffer 90, also 90 MA + 30 ÜS
    const entries = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 540 },
      { date: "2024-01-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 540 },
      { date: "2024-01-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 540 },
      { date: "2024-01-04", type: "work", code: WORK_CODE.OFFICE, netDuration: 540 },
      { date: "2024-01-05", type: "work", code: WORK_CODE.OFFICE, netDuration: 270 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null } as unknown as UserData,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7)
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(90);
    expect(stats.overtimeSplit.ueberstunden).toBe(30);
    // Normalstunden = IST - MA - ÜS → 2430 - 90 - 30 = 2310
    expect(stats.normalstunden).toBe(2430 - 90 - 30);
  });

  it("normalstunden = IST - MA - ÜS, gemischte Woche", () => {
    const entries = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 }, // Mo: >510
      { date: "2024-01-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 400 }, // Di: <510
      { date: "2024-01-06", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 }, // Sa: soll=0
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null } as unknown as UserData,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7)
    );
    // IST = 600+400+300 = 1300, Saldo = 1300-2310 = -1010 → MA=0, ÜS=0
    // Normalstunden = IST - 0 - 0 = 1300
    expect(stats.normalstunden).toBe(1300);
  });

  it("März 2026: 4 volle Wochen + gebrochene KW14 tageweise", () => {
    // KW10-13 jeweils Mo-Do 10h (600), Fr 4.5h (270) → Woche 44.5h IST
    // Soll 38.5h, Diff 6h, MA 1.5h, ÜS 4.5h pro volle Woche
    // KW14 gebrochene Woche: Mo 30.03 + Di 31.03 je 10h (600) → tägliche ÜS
    const userData = { workDays: null } as unknown as UserData;
    const makeWeek = (mondayDate: string) => {
      const [y, m, d] = mondayDate.split("-").map(Number);
      const entries = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(y, m - 1, d + i);
        const dateStr = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
        entries.push({
          id: `${dateStr}-work`,
          date: dateStr,
          type: "work",
          code: WORK_CODE.OFFICE,
          netDuration: i < 4 ? 600 : 270, // Mo-Do 10h, Fr 4.5h
        });
      }
      return entries;
    };

    const allEntries = [
      ...makeWeek("2026-03-02"),  // KW10 (volle Woche)
      ...makeWeek("2026-03-09"),  // KW11 (volle Woche)
      ...makeWeek("2026-03-16"),  // KW12 (volle Woche)
      ...makeWeek("2026-03-23"),  // KW13 (volle Woche)
      ...makeWeek("2026-03-30"),  // KW14 (gebrochen: nur Mo+Di im März)
    ];
    const marchEntries = allEntries.filter((e) => e.date.startsWith("2026-03"));
    const stats = calculatePeriodStats(
      marchEntries as unknown as Entry[],
      userData,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31)
    );
    // 4 volle Wochen × 90min MA = 360min
    // KW14 gebrochen: IST=1200 < Wochen-Soll 2310 → 0 MA
    expect(stats.overtimeSplit.mehrarbeit).toBe(360);
    // 4 volle Wochen × 270min ÜS = 1080
    // + KW14 tägliche ÜS: Mo (600-510=90) + Di (600-510=90) = 180
    expect(stats.overtimeSplit.ueberstunden).toBe(1080 + 180);
  });

  it("splittet Nachtschicht über ISO-Wochengrenze auf beide Wochen (overtimeMode=split)", () => {
    // KW8-2026 = Mo 2026-02-16 bis So 2026-02-22
    // KW9-2026 = Mo 2026-02-23 bis So 2026-03-01
    // Nachtschicht So 22:00 → Mo 06:00 = 480min Roh, davon 120min am
    // Sonntag (KW8) und 360min am Montag (KW9).
    const userData = { workDays: null } as unknown as UserData;
    const entries = [
      // KW8 Mo-Fr volle Arbeit (Mo-Do 510 = 8.5h, Fr 270 = 4.5h)
      { id: "a", date: "2026-02-16", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "b", date: "2026-02-17", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "c", date: "2026-02-18", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "d", date: "2026-02-19", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "e", date: "2026-02-20", type: "work", code: WORK_CODE.OFFICE, netDuration: 270 },
      // Sonntags-Nachtschicht über Wochengrenze (Roh 480min, ohne Pause)
      {
        id: "night",
        date: "2026-02-22",
        type: "work",
        code: WORK_CODE.OFFICE,
        start: "22:00",
        end: "06:00",
        netDuration: 480,
      },
      // KW9 Mo-Fr volle Arbeit
      { id: "f", date: "2026-02-23", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "g", date: "2026-02-24", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "h", date: "2026-02-25", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "i", date: "2026-02-26", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: "j", date: "2026-02-27", type: "work", code: WORK_CODE.OFFICE, netDuration: 270 },
    ] as unknown as Entry[];
    const stats = calculatePeriodStats(
      entries,
      userData,
      new Date(2026, 1, 16),
      new Date(2026, 2, 1)
    );
    // Beide Wochen sind voll im Zeitraum, kein Halbtag.
    // weekTarget = 2310min für beide Wochen.
    // KW8: 4*510 + 270 + 120 = 2430min Ist → +120 → 90 MA + 30 ÜS
    // KW9: 4*510 + 270 + 360 = 2670min Ist → +360 → 90 MA + 270 ÜS
    expect(stats.overtimeSplit.mehrarbeit).toBe(180);
    expect(stats.overtimeSplit.ueberstunden).toBe(300);
    // Gesamtwerk-Stunden bleiben unverändert (8x510 + 2x270 + 480)
    expect(stats.work).toBe(8 * 510 + 2 * 270 + 480);
  });

});

describe("adjustSickDuration", () => {
  it("füllt Krank nur bis Sollzeit auf", () => {
    expect(adjustSickDuration(510, 300, 510)).toBe(210);
  });

  it("gibt 0 wenn bereits genug gearbeitet", () => {
    expect(adjustSickDuration(510, 600, 510)).toBe(0);
  });

  it("voller Kranktag ohne Arbeit → volle Sollzeit", () => {
    expect(adjustSickDuration(510, 0, 510)).toBe(510);
  });

  it("kein Target → keine Krankzeit", () => {
    expect(adjustSickDuration(510, 0, 0)).toBe(0);
  });

  it("Krankzeit kleiner als Rest → nur Krankzeit", () => {
    expect(adjustSickDuration(100, 300, 510)).toBe(100);
  });
});

describe("applyEffectiveDurations + calculatePeriodStats — gemischte Krank-Tage", () => {
  it("Arbeit + Krank am selben Tag → keine Doppelzählung", () => {
    const raw = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 },
      { date: "2024-01-01", type: "sick", code: null, netDuration: 510 },
    ] as unknown as Entry[];
    const corrected = applyEffectiveDurations(raw, { workDays: null } as unknown as UserData);
    const stats = calculatePeriodStats(
      corrected,
      { workDays: null } as unknown as UserData,
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    // sick korrigiert: max(0, 510-300) = 210
    expect(stats.sick).toBe(210);
    expect(stats.work).toBe(300);
    expect(stats.totalIst).toBe(510);
    expect(stats.totalSaldo).toBe(0);
    expect(stats.normalstunden).toBe(510);
  });

  it("Arbeit >= Soll + Krank → Krankzeit = 0", () => {
    const raw = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { date: "2024-01-01", type: "sick", code: null, netDuration: 510 },
    ] as unknown as Entry[];
    const corrected = applyEffectiveDurations(raw, { workDays: null } as unknown as UserData);
    const stats = calculatePeriodStats(
      corrected,
      { workDays: null } as unknown as UserData,
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    expect(stats.sick).toBe(0);
    expect(stats.work).toBe(600);
    expect(stats.totalIst).toBe(600);
  });

  it("voller Kranktag ohne Arbeit → unverändert", () => {
    const raw = [
      { date: "2024-01-01", type: "sick", code: null, netDuration: 510 },
    ] as unknown as Entry[];
    const corrected = applyEffectiveDurations(raw, { workDays: null } as unknown as UserData);
    const stats = calculatePeriodStats(
      corrected,
      { workDays: null } as unknown as UserData,
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    expect(stats.sick).toBe(510);
    expect(stats.totalIst).toBe(510);
    expect(stats.totalSaldo).toBe(0);
  });
});
