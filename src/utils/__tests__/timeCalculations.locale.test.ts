import { describe, it, expect } from "vitest";
import {
  getTargetMinutesForDate,
  calculateOvertimeSplit,
  adjustSickDuration,
  applyEffectiveDurations,
  calculatePeriodStats,
} from "../timeCalculations";
import { neutralLocale } from "../../locales/neutral";
import { austriaLocale } from "../../locales/austria";
import { createGermanyLocale } from "../../locales/germany";
import { WORK_CODE } from "../../hooks/constants";
import type { Entry, UserData } from "../../types";

// =====================================================================
// NEUTRAL LOCALE
// =====================================================================

describe("timeCalculations mit Neutral-Locale", () => {
  it("getTargetMinutesForDate nutzt Neutral-Defaults (Mo-Fr 8h, Sa/So 0)", () => {
    // 2024-01-01 = Montag
    expect(getTargetMinutesForDate("2024-01-01", null, neutralLocale)).toBe(480);
    expect(getTargetMinutesForDate("2024-01-05", null, neutralLocale)).toBe(480); // Fr
    expect(getTargetMinutesForDate("2024-01-06", null, neutralLocale)).toBe(0);   // Sa
  });

  it("getTargetMinutesForDate halbiert 24.12./31.12. NICHT bei Neutral", () => {
    // 2024-12-24 = Dienstag → 8h = 480 min (nicht halbiert)
    expect(getTargetMinutesForDate("2024-12-24", null, neutralLocale)).toBe(480);
    expect(getTargetMinutesForDate("2024-12-31", null, neutralLocale)).toBe(480);
  });

  it("calculateOvertimeSplit liefert bei Neutral kein MA/ÜS (reiner Saldo)", () => {
    // Seit der Config-Umstellung: Neutral → overtimeMode="none"
    // → weder Mehrarbeit noch Überstunden. Der Caller zeigt nur
    // totalSaldo an (calculatePeriodStats returnt in dem Pfad
    // ohnehin direkt, bevor calculateOvertimeSplit aufgerufen wird).
    expect(calculateOvertimeSplit(120, 2400, neutralLocale)).toEqual({
      mehrarbeit: 0,
      ueberstunden: 0,
    });
    expect(calculateOvertimeSplit(30, 2310, neutralLocale)).toEqual({
      mehrarbeit: 0,
      ueberstunden: 0,
    });
  });

  it("adjustSickDuration lässt Krank bei Neutral unverändert", () => {
    // Normalerweise: Krank 240 min, Arbeit 480 min am Tag mit Target 480 → Krank 0
    // Mit Neutral: Krank bleibt 240
    expect(adjustSickDuration(240, 480, 480, neutralLocale)).toBe(240);
    expect(adjustSickDuration(100, 100, 480, neutralLocale)).toBe(100);
  });

  it("applyEffectiveDurations lässt sick-Entries bei Neutral unverändert", () => {
    const entries: Entry[] = [
      { id: 1, type: "work", date: "2024-03-04", start: "08:00", end: "16:00", pause: 0, netDuration: 480, code: 1 },
      { id: 2, type: "sick", date: "2024-03-04", start: null, end: null, pause: 0, netDuration: 240, code: null },
    ];
    const userData: UserData = { name: "", position: "", photo: null, workDays: [0, 480, 480, 480, 480, 480, 0] };
    const result = applyEffectiveDurations(entries, userData, neutralLocale);
    expect(result[1].netDuration).toBe(240); // unverändert
  });

  it("calculatePeriodStats liefert keinen MA/UE-Split bei Neutral", () => {
    const entries: Entry[] = [
      // Komplette Woche Mo-Fr, je 9h = 540 min → 2700 min Woche, bei 2400 Soll = +300
      { id: 1, type: "work", date: "2024-03-04", start: "08:00", end: "17:00", pause: 0, netDuration: 540, code: 1 },
      { id: 2, type: "work", date: "2024-03-05", start: "08:00", end: "17:00", pause: 0, netDuration: 540, code: 1 },
      { id: 3, type: "work", date: "2024-03-06", start: "08:00", end: "17:00", pause: 0, netDuration: 540, code: 1 },
      { id: 4, type: "work", date: "2024-03-07", start: "08:00", end: "17:00", pause: 0, netDuration: 540, code: 1 },
      { id: 5, type: "work", date: "2024-03-08", start: "08:00", end: "17:00", pause: 0, netDuration: 540, code: 1 },
    ];
    const userData: UserData = { name: "", position: "", photo: null, workDays: [0, 480, 480, 480, 480, 480, 0] };
    const stats = calculatePeriodStats(
      entries,
      userData,
      new Date(2024, 2, 4),
      new Date(2024, 2, 10),
      undefined,
      neutralLocale
    );
    expect(stats.totalIst).toBe(2700);
    expect(stats.totalTarget).toBe(2400);
    expect(stats.totalSaldo).toBe(300);
    // Neutral: kein Split, alles in normalstunden
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
    expect(stats.normalstunden).toBe(2700);
  });
});

// =====================================================================
// ÖSTERREICH LOCALE
// =====================================================================

describe("timeCalculations mit Austria-Locale (explizit)", () => {
  it("halbiert 24.12./31.12.", () => {
    // Dienstag, 510/2 = 255
    expect(getTargetMinutesForDate("2024-12-24", null, austriaLocale)).toBe(255);
    expect(getTargetMinutesForDate("2024-12-31", null, austriaLocale)).toBe(255);
  });

  it("MA/UE-Split auf 40h-Basis", () => {
    // Wochenziel 38.5h = 2310, +120 → 90 MA + 30 UE
    expect(calculateOvertimeSplit(120, 2310, austriaLocale)).toEqual({
      mehrarbeit: 90,
      ueberstunden: 30,
    });
  });
});

// =====================================================================
// DEUTSCHLAND LOCALE
// =====================================================================

describe("timeCalculations mit Germany-Locale", () => {
  const bavaria = createGermanyLocale("by");

  it("Default 40h (Mo-Fr 8h)", () => {
    expect(getTargetMinutesForDate("2024-01-01", null, bavaria)).toBe(480); // Mo
    expect(getTargetMinutesForDate("2024-01-05", null, bavaria)).toBe(480); // Fr
  });

  it("halbiert 24.12./31.12. (in DE praktisch verbreitet)", () => {
    // Dienstag, 480/2 = 240
    expect(getTargetMinutesForDate("2024-12-24", null, bavaria)).toBe(240);
  });

  it("MA/UE-Split: bei 40h-Ziel ist alles Überstunden", () => {
    // Wochenziel 40h = 2400, +60 → 0 MA + 60 UE (Puffer ist 0)
    expect(calculateOvertimeSplit(60, 2400, bavaria)).toEqual({
      mehrarbeit: 0,
      ueberstunden: 60,
    });
  });

  it("MA/UE-Split: Teilzeit unter 40h bekommt MA-Puffer", () => {
    // Wochenziel 35h = 2100, +200 → 200 MA (Puffer bis 2400), 0 UE
    expect(calculateOvertimeSplit(200, 2100, bavaria)).toEqual({
      mehrarbeit: 200,
      ueberstunden: 0,
    });
    // Wochenziel 35h, +400 → 300 MA, 100 UE
    expect(calculateOvertimeSplit(400, 2100, bavaria)).toEqual({
      mehrarbeit: 300,
      ueberstunden: 100,
    });
  });

  it("Krank-Aufrechnung aktiv wie bei AT", () => {
    // Krank 240, Arbeit 480, Target 480 → Krank 0
    expect(adjustSickDuration(240, 480, 480, bavaria)).toBe(0);
    // Krank 240, Arbeit 240, Target 480 → Krank 240 (Diff)
    expect(adjustSickDuration(240, 240, 480, bavaria)).toBe(240);
  });
});

// =====================================================================
// BACKWARD-COMPAT: ohne Locale = AT-Verhalten
// =====================================================================

describe("timeCalculations Backward-Compat (ohne Locale → AT)", () => {
  it("getTargetMinutesForDate hält AT-Verhalten (Mo-Do 510, Fr 270)", () => {
    expect(getTargetMinutesForDate("2024-01-01")).toBe(510); // Mo
    expect(getTargetMinutesForDate("2024-01-05")).toBe(270); // Fr
    expect(getTargetMinutesForDate("2024-12-24")).toBe(255); // halbiert
  });

  it("calculateOvertimeSplit hält 40h-Logik ohne Locale", () => {
    expect(calculateOvertimeSplit(120, 2310)).toEqual({
      mehrarbeit: 90,
      ueberstunden: 30,
    });
  });

  it("adjustSickDuration hält Aufrechnungs-Logik ohne Locale", () => {
    expect(adjustSickDuration(240, 480, 480)).toBe(0);
  });

  it("applyEffectiveDurations hält Sick-Korrektur ohne Locale", () => {
    const entries: Entry[] = [
      { id: 1, type: "work", date: "2024-03-04", start: "08:00", end: "16:00", pause: 0, netDuration: 480, code: 1 },
      { id: 2, type: "sick", date: "2024-03-04", start: null, end: null, pause: 0, netDuration: 510, code: null },
    ];
    const userData: UserData = { name: "", position: "", photo: null, workDays: [0, 510, 510, 510, 510, 270, 0] };
    const result = applyEffectiveDurations(entries, userData);
    // Arbeit 480 + Krank bis Target 510 → Krank = 30
    expect(result[1].netDuration).toBe(30);
  });
});

// Suppress unused warning
void WORK_CODE;
