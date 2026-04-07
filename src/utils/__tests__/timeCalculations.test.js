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
} from "../timeCalculations";
import { WORK_CODE } from "../../hooks/constants";

describe("parseTime", () => {
  it("konvertiert HH:MM korrekt in Minuten", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("01:30")).toBe(90);
    expect(parseTime("08:45")).toBe(525);
    expect(parseTime("23:59")).toBe(23 * 60 + 59);
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
      code: WORK_CODE.DRIVE,
    });
    expect(mins).toBe(120);
  });

  it("liefert 0 statt negativer Dauer", () => {
    const mins = calculateEntryNetDuration({
      entryType: "work",
      startTime: "10:00",
      endTime: "09:00",
      pauseDuration: 0,
      code: WORK_CODE.OFFICE,
    });
    expect(mins).toBe(0);
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
    ];
    expect(calculateDisplayedDayMinutes(entries)).toBe(480 + 510);
  });
});

describe("calculatePeriodStats", () => {
  it("aggregiert Ist/Soll/Saldo für eine Woche korrekt", () => {
    const userData = { workDays: null };
    // Mo-Fr 2024-01-01..05 alle voll gearbeitet
    const entries = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-04", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2024-01-05", type: "work", code: WORK_CODE.OFFICE, netDuration: 270 },
    ];
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
    ];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null },
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    expect(stats.work).toBe(480);
    expect(stats.drive).toBe(60);
  });

  it("Gebrochene Woche: unter Wochen-Soll → keine MA/ÜS", () => {
    // KW14: Mo 30.03 + Di 31.03 im März (19h IST)
    // 19h < 38,5h Wochen-Soll → keine MA, keine ÜS
    const userData = { workDays: null };
    const marchEntries = [
      { date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 540 },
    ];
    const stats = calculatePeriodStats(
      marchEntries,
      userData,
      new Date(2026, 2, 30),
      new Date(2026, 2, 31)
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
  });

  it("Gebrochene Woche: über Wochen-Soll → MA greift", () => {
    // 5 Tage in gebrochener Woche, IST=2400 (40h), Wochen-Soll=2310 (38,5h)
    // Saldo gegen Wochen-Soll: +90 → MA=90, ÜS=0
    const userData = { workDays: null };
    const entries = [
      { date: "2026-04-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2026-04-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { date: "2026-04-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 360 },
      // Mo+Di aus Vormonat nicht im Zeitraum, aber Wochen-Soll bleibt 2310
      // IST nur für April-Tage: 510+510+360 = 1380 → 1380 < 2310 → 0/0
    ];
    // Für diesen Test brauchen wir genug IST: Nehmen wir eine volle Woche
    // die zufällig am Monatsanfang liegt (alle 5 Arbeitstage im April)
    // Nutzen wir KW15: Mo 06.04 - Fr 10.04 (volle Woche? Nein, So 12.04 im April)
    // Besser: Simulieren mit Monat der am Montag beginnt
    // Jan 2024: Mo 01.01 - So 07.01 = KW1. Aber 01.01 = Feiertag...
    // Nehmen wir Juli 2025: Di 01.07 - So gehört zu KW27 (Mo 30.06)
    // → gebrochene Woche mit Di-So im Juli
    const entries2 = [
      { date: "2025-07-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 }, // Di
      { date: "2025-07-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 }, // Mi
      { date: "2025-07-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 }, // Do
      { date: "2025-07-04", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 }, // Fr
      { date: "2025-07-05", type: "work", code: WORK_CODE.OFFICE, netDuration: 400 }, // Sa (extra)
    ];
    // IST=2440, Wochen-Soll=2310, Diff=+130, Puffer=90
    // MA=90, ÜS=40
    const stats2 = calculatePeriodStats(
      entries2,
      userData,
      new Date(2025, 6, 1),
      new Date(2025, 6, 5)
    );
    expect(stats2.overtimeSplit.mehrarbeit).toBe(90);
    expect(stats2.overtimeSplit.ueberstunden).toBe(40);
  });

  it("Gebrochene Woche: unter Tages-Soll → keine MA/ÜS", () => {
    // Rand-Tage mit IST < Tages-SOLL → weit unter Wochen-Soll
    const userData = { workDays: null };
    const entries = [
      { date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
    ];
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
    ];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null },
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
    ];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null },
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
    const userData = { workDays: null };
    const makeWeek = (mondayDate) => {
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
      marchEntries,
      userData,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31)
    );
    // 4 volle Wochen × 90min MA = 360min
    // KW14 gebrochen: IST=1200 (2×600) < Wochen-Soll 2310 → 0 MA
    expect(stats.overtimeSplit.mehrarbeit).toBe(360);
    // 4 volle Wochen × 270min ÜS = 1080
    // KW14 gebrochen: IST < Wochen-Soll → 0 ÜS
    expect(stats.overtimeSplit.ueberstunden).toBe(1080);
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
    ];
    const corrected = applyEffectiveDurations(raw, { workDays: null });
    const stats = calculatePeriodStats(
      corrected,
      { workDays: null },
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
    ];
    const corrected = applyEffectiveDurations(raw, { workDays: null });
    const stats = calculatePeriodStats(
      corrected,
      { workDays: null },
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
    ];
    const corrected = applyEffectiveDurations(raw, { workDays: null });
    const stats = calculatePeriodStats(
      corrected,
      { workDays: null },
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    expect(stats.sick).toBe(510);
    expect(stats.totalIst).toBe(510);
    expect(stats.totalSaldo).toBe(0);
  });
});
