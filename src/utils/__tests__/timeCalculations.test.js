import { describe, it, expect } from "vitest";
import {
  parseTime,
  getDayOfWeek,
  getTargetMinutesForDate,
  getWeekNumber,
  calculateOvertimeSplit,
  adjustSickDuration,
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

  it("Donnerstag-Regel: April bekommt volle Woche MA/ÜS (Do im April)", () => {
    // KW14: Mo 30.3. – So 5.4. Donnerstag = 02.04 → liegt in April.
    // Volle Woche: Soll 2310, Ist 2340, Diff = 30 → 30 min MA komplett an April.
    const userData = { workDays: null };
    const allEntries = [
      { id: 1, date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { id: 2, date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { id: 3, date: "2026-04-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 4, date: "2026-04-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 5, date: "2026-04-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 },
    ];
    const aprilEntries = allEntries.filter((e) => e.date.startsWith("2026-04"));
    const stats = calculatePeriodStats(
      aprilEntries,
      userData,
      new Date(2026, 3, 1),
      new Date(2026, 3, 30),
      allEntries
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(30);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
  });

  it("Rand-Tage ohne täglichen Überschuss → keine MA, keine ÜS", () => {
    // KW14: Do=02.04 liegt NICHT in März → Rand-Tage.
    // Mo 30.03 (IST=420, SOLL=510) und Di 31.03 (IST=420, SOLL=510): IST < SOLL.
    const userData = { workDays: null };
    const allEntries = [
      { id: 1, date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { id: 2, date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { id: 3, date: "2026-04-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 4, date: "2026-04-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 5, date: "2026-04-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 },
    ];
    const marchEntries = allEntries.filter((e) => e.date.startsWith("2026-03"));
    const stats = calculatePeriodStats(
      marchEntries,
      userData,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
      allEntries
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
  });

  it("Rand-Tage mit täglichem Überschuss → tägliche ÜS, keine MA", () => {
    // KW14: Mo 30.03 (IST=600, SOLL=510 → 90 ÜS), Di 31.03 (IST=540, SOLL=510 → 30 ÜS).
    // Do=02.04 liegt in April → März = Rand-Tage → 0 MA, 120 min ÜS.
    const userData = { workDays: null };
    const allEntries = [
      { id: 1, date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 2, date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 540 },
      { id: 3, date: "2026-04-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: 4, date: "2026-04-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 510 },
      { id: 5, date: "2026-04-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 270 },
    ];
    const marchEntries = allEntries.filter((e) => e.date.startsWith("2026-03"));
    const stats = calculatePeriodStats(
      marchEntries,
      userData,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
      allEntries
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(120);
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
    // Normalstunden: pro Tag min(ist, soll) → Mo-Do min(540,510)=510, Fr min(270,270)=270
    expect(stats.normalstunden).toBe(510 * 4 + 270);
  });

  it("normalstunden: min(dayIst, daySoll) pro Tag, gemischt", () => {
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
    // Mo: min(600,510)=510, Di: min(400,510)=400, Sa: min(300,0)=0
    expect(stats.normalstunden).toBe(910);
  });

  it("März 2026: 4 volle Wochen → max 360min MA (kein MA aus Rand-Tagen)", () => {
    // KW10-13 jeweils Mo-Do 10h (600), Fr 4.5h (270) → Woche 44.5h IST
    // Soll 38.5h, Diff 6h, MA 1.5h, ÜS 4.5h pro Woche
    // KW14 Rand-Tage Mo 30.03 + Di 31.03 je 10h (600)
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
      ...makeWeek("2026-03-02"),  // KW10
      ...makeWeek("2026-03-09"),  // KW11
      ...makeWeek("2026-03-16"),  // KW12
      ...makeWeek("2026-03-23"),  // KW13
      ...makeWeek("2026-03-30"),  // KW14 (Do 02.04 = April)
    ];
    const marchEntries = allEntries.filter((e) => e.date.startsWith("2026-03"));
    const stats = calculatePeriodStats(
      marchEntries,
      userData,
      new Date(2026, 2, 1),
      new Date(2026, 2, 31),
      allEntries
    );
    // 4 volle Wochen × 90min MA = 360min (NICHT mehr)
    expect(stats.overtimeSplit.mehrarbeit).toBe(360);
    // 4 volle Wochen × 270min ÜS = 1080, + Rand-Tage: Mo (600-510=90) + Di (600-510=90) = 180
    expect(stats.overtimeSplit.ueberstunden).toBe(1080 + 180);
  });

  it("Monatsbeginn mitten in der Woche: Rand-Tage korrekt (keine MA)", () => {
    // April 2026 beginnt am Mittwoch (01.04).
    // KW14: Mo 30.03 – So 05.04, Do 02.04 = im April → volle Woche gehört April
    // KW14: nur Mi 01.04 - So 05.04 im April, aber Do im April → volle Woche
    const userData = { workDays: null };
    const allEntries = [
      { id: 1, date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 2, date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 3, date: "2026-04-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 4, date: "2026-04-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 5, date: "2026-04-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 },
    ];
    const aprilEntries = allEntries.filter((e) => e.date.startsWith("2026-04"));
    const stats = calculatePeriodStats(
      aprilEntries,
      userData,
      new Date(2026, 3, 1),
      new Date(2026, 3, 30),
      allEntries
    );
    // KW14: Do 02.04 in April → volle Woche. Ist=2700, Soll=2310, Diff=390
    // MA = min(390, 90) = 90, ÜS = 300
    expect(stats.overtimeSplit.mehrarbeit).toBe(90);
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

describe("calculatePeriodStats — gemischte Krank-Tage", () => {
  it("Arbeit + Krank am selben Tag → keine Doppelzählung", () => {
    const entries = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 },
      { date: "2024-01-01", type: "sick", code: null, netDuration: 510 },
    ];
    const stats = calculatePeriodStats(
      entries,
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
    const entries = [
      { date: "2024-01-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { date: "2024-01-01", type: "sick", code: null, netDuration: 510 },
    ];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null },
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    expect(stats.sick).toBe(0);
    expect(stats.work).toBe(600);
    expect(stats.totalIst).toBe(600);
  });

  it("voller Kranktag ohne Arbeit → unverändert", () => {
    const entries = [
      { date: "2024-01-01", type: "sick", code: null, netDuration: 510 },
    ];
    const stats = calculatePeriodStats(
      entries,
      { workDays: null },
      new Date(2024, 0, 1),
      new Date(2024, 0, 1)
    );
    expect(stats.sick).toBe(510);
    expect(stats.totalIst).toBe(510);
    expect(stats.totalSaldo).toBe(0);
  });
});
