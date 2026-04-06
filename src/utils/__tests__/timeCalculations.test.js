import { describe, it, expect } from "vitest";
import {
  parseTime,
  getDayOfWeek,
  getTargetMinutesForDate,
  getWeekNumber,
  calculateOvertimeSplit,
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

  it("zählt Mehrarbeit aus einer Wochenübergangs-Woche nur einmal (Donnerstag-Regel)", () => {
    // Szenario Bug-Report April 2026: Woche KW14 geht Mo 30.3. – So 5.4.
    // Der User hat Mo/Di (März-Teil) wenig gearbeitet (je 7h = 420 min,
    // 90 min unter Soll) und Mi/Do/Fr (April-Teil) viel (je 10h = 600 min
    // Mi/Do, Fr 5h = 300 min). Volle Woche: Soll 2310, Ist 420+420+600+600+300 = 2340,
    // Diff = 30 → Mehrarbeit sollte nur 30 min sein, nicht 210.
    const userData = { workDays: null };
    const allEntries = [
      { id: 1, date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { id: 2, date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 420 },
      { id: 3, date: "2026-04-01", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 4, date: "2026-04-02", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 5, date: "2026-04-03", type: "work", code: WORK_CODE.OFFICE, netDuration: 300 },
    ];
    // Monats-Ansicht April: nur die April-Entries sind "in period"
    const aprilEntries = allEntries.filter((e) => e.date.startsWith("2026-04"));
    const stats = calculatePeriodStats(
      aprilEntries,
      userData,
      new Date(2026, 3, 1),
      new Date(2026, 3, 30),
      allEntries
    );
    // Donnerstag der KW14 ist 2.4.2026 → liegt in April → Woche zählt zu April.
    // Volle-Woche-Rechnung: 420+420+600+600+300 = 2340, Soll 2310 → Diff 30 MA.
    // Proportionale Aufteilung: 3 von 5 Arbeitstagen liegen im April → 30 * 3/5 = 18.
    expect(stats.overtimeSplit.mehrarbeit).toBe(18);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
  });

  it("zählt Mehrarbeit einer Wochenübergangs-Woche NICHT beim Nachbarmonat, wenn der Donnerstag nicht drin liegt", () => {
    // Wenn der User im März-Monat schaut und der Donnerstag der Woche in April liegt,
    // soll die Woche beim März nicht mitgezählt werden (sie gehört zu April).
    const userData = { workDays: null };
    const allEntries = [
      { id: 1, date: "2026-03-30", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
      { id: 2, date: "2026-03-31", type: "work", code: WORK_CODE.OFFICE, netDuration: 600 },
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
    // Donnerstag der KW14 liegt in April → Woche zählt NICHT zu März.
    // KW13 (23.–29.3.) hat keine Einträge → keine Mehrarbeit.
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
  });
});
