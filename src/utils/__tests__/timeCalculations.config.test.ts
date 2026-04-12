import { describe, it, expect } from "vitest";
import {
  calculateEntryNetDuration,
  calculateOvertimeSplit,
  adjustSickDuration,
  applyEffectiveDurations,
  calculatePeriodStats,
} from "../timeCalculations";
import { getDefaultCalculationConfig, getBlankCalculationConfig } from "../calculationConfig";
import { austriaLocale } from "../../locales/austria";
import { neutralLocale } from "../../locales/neutral";
import type { Entry, UserData, CalculationConfig } from "../../types";

// =====================================================================
// Tests für die neuen CalculationConfig-Modi, die nicht durch die alten
// Locale-Tests abgedeckt sind (ueberstunden_only, sick ignore, custom
// holidays, auto-pause).
// =====================================================================

const AT_WORK_DAYS = [0, 510, 510, 510, 510, 270, 0];
const USER: UserData = {
  name: "Test",
  position: "",
  photo: null,
  workDays: AT_WORK_DAYS,
};

describe("calculateOvertimeSplit mit neuer Config", () => {
  it('"ueberstunden_only" gibt kompletten positiven Saldo als Überstunden zurück', () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      overtimeMode: "ueberstunden_only",
    };
    const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
      120,
      2310,
      austriaLocale,
      config
    );
    expect(mehrarbeit).toBe(0);
    expect(ueberstunden).toBe(120);
  });

  it('"none" gibt 0/0 zurück, selbst bei positivem Saldo', () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      overtimeMode: "none",
    };
    const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
      120,
      2310,
      austriaLocale,
      config
    );
    expect(mehrarbeit).toBe(0);
    expect(ueberstunden).toBe(0);
  });

  it('"split" mit User-Schwelle 2100 min (35h): alles über 35h ist ÜS', () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      overtimeMode: "split",
      overtimeThresholdMinutes: 2100,
    };
    // Wochen-Target 2310, balance 300 → Buffer = max(0, 2100 - 2310) = 0,
    // d.h. alles landet sofort in Überstunden
    const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
      300,
      2310,
      austriaLocale,
      config
    );
    expect(mehrarbeit).toBe(0);
    expect(ueberstunden).toBe(300);
  });
});

describe("adjustSickDuration mit neuen Modi", () => {
  it('"ignore" setzt Krank auf 0 wenn schon gearbeitet wurde', () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      sickOnWorkDayMode: "ignore",
    };
    expect(adjustSickDuration(240, 240, 510, austriaLocale, config)).toBe(0);
    expect(adjustSickDuration(240, 1, 510, austriaLocale, config)).toBe(0);
  });

  it('"ignore" lässt Krank unverändert, wenn an dem Tag NICHT gearbeitet wurde', () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      sickOnWorkDayMode: "ignore",
    };
    expect(adjustSickDuration(240, 0, 510, austriaLocale, config)).toBe(240);
  });

  it('"additive" lässt Krank immer unverändert', () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      sickOnWorkDayMode: "additive",
    };
    expect(adjustSickDuration(240, 480, 510, austriaLocale, config)).toBe(240);
  });

  it('"cap_to_target" verhält sich identisch zum alten AT-Verhalten', () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      sickOnWorkDayMode: "cap_to_target",
    };
    // Arbeit 240, Target 510 → Krank nur bis 270
    expect(adjustSickDuration(240, 240, 510, austriaLocale, config)).toBe(240);
    expect(adjustSickDuration(400, 240, 510, austriaLocale, config)).toBe(270);
    expect(adjustSickDuration(400, 510, 510, austriaLocale, config)).toBe(0);
  });
});

describe("calculateEntryNetDuration mit Auto-Pause", () => {
  it("zieht Auto-Pause bei 8h Arbeit ohne manuelle Pause ab (Regel: ab 6h → 30min)", () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      autoPauseRules: [{ fromMinutes: 360, pauseMinutes: 30 }],
    };
    const net = calculateEntryNetDuration({
      entryType: "work",
      startTime: "08:00",
      endTime: "16:00",
      pauseDuration: 0,
      formDate: "2024-01-15",
      userData: USER,
      code: 1,
      locale: austriaLocale,
      config,
    });
    expect(net).toBe(450); // 480 - 30
  });

  it("greift NICHT wenn User eine manuelle Pause > 0 gesetzt hat", () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      autoPauseRules: [{ fromMinutes: 360, pauseMinutes: 30 }],
    };
    const net = calculateEntryNetDuration({
      entryType: "work",
      startTime: "08:00",
      endTime: "16:00",
      pauseDuration: 15, // manuell
      formDate: "2024-01-15",
      userData: USER,
      code: 1,
      locale: austriaLocale,
      config,
    });
    expect(net).toBe(465); // 480 - 15 (user-Pause, nicht auto)
  });

  it("wählt die größte greifende Regel bei mehreren Schwellen", () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      autoPauseRules: [
        { fromMinutes: 360, pauseMinutes: 30 },
        { fromMinutes: 540, pauseMinutes: 45 },
      ],
    };
    // 10h Arbeit → Regel ab 9h greift → 45 min Pause
    const net = calculateEntryNetDuration({
      entryType: "work",
      startTime: "08:00",
      endTime: "18:00",
      pauseDuration: 0,
      formDate: "2024-01-15",
      userData: USER,
      code: 1,
      locale: austriaLocale,
      config,
    });
    expect(net).toBe(555); // 600 - 45
  });
});

describe("applyEffectiveDurations mit holidayOnWorkDayMode=cap_to_target", () => {
  it("kappt public_holiday-Eintrag wenn schon gearbeitet wurde", () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      holidayOnWorkDayMode: "cap_to_target",
    };
    // Montag, 4h Arbeit + Feiertag der normalerweise 510 min wäre
    const entries: Entry[] = [
      {
        id: 1,
        type: "work",
        date: "2024-03-04",
        start: "08:00",
        end: "12:00",
        pause: 0,
        netDuration: 240,
        code: 1,
      },
      {
        id: 2,
        type: "public_holiday",
        date: "2024-03-04",
        start: null,
        end: null,
        pause: 0,
        netDuration: 510,
        code: null,
      },
    ];
    const result = applyEffectiveDurations(entries, USER, austriaLocale, config);
    // Tagessoll 510, Arbeit 240 → Feiertag capped auf 270
    expect(result[1].netDuration).toBe(270);
  });

  it("lässt public_holiday unverändert bei additive-Modus (Default)", () => {
    const config = getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS);
    const entries: Entry[] = [
      {
        id: 1,
        type: "work",
        date: "2024-03-04",
        start: "08:00",
        end: "12:00",
        pause: 0,
        netDuration: 240,
        code: 1,
      },
      {
        id: 2,
        type: "public_holiday",
        date: "2024-03-04",
        start: null,
        end: null,
        pause: 0,
        netDuration: 510,
        code: null,
      },
    ];
    const result = applyEffectiveDurations(entries, USER, austriaLocale, config);
    expect(result[1].netDuration).toBe(510);
  });
});

describe("calculatePeriodStats mit overtimeMode=none", () => {
  it("liefert totalSaldo aber KEINE MA/ÜS-Werte", () => {
    const config: CalculationConfig = {
      ...getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS),
      overtimeMode: "none",
    };
    // Ein Eintrag Mo 2024-01-01, 10h Arbeit (bei Soll 8,5h)
    const entries: Entry[] = [
      {
        id: 1,
        type: "work",
        date: "2024-01-01",
        start: "08:00",
        end: "18:00",
        pause: 0,
        netDuration: 600,
        code: 1,
      },
    ];
    const stats = calculatePeriodStats(
      entries,
      USER,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7),
      undefined,
      austriaLocale,
      config
    );
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
    expect(stats.totalSaldo).toBe(600 - 2310); // 10h - Wochen-Soll 38,5h
    expect(stats.normalstunden).toBe(600);
  });
});

describe("Regression: ohne Config = unverändertes Locale-Verhalten", () => {
  it("calculatePeriodStats mit AT-Locale ohne Config vs. mit Default-AT-Config identisch", () => {
    const entries: Entry[] = [
      {
        id: 1,
        type: "work",
        date: "2024-01-01",
        start: "08:00",
        end: "18:00",
        pause: 30,
        netDuration: 570,
        code: 1,
      },
      {
        id: 2,
        type: "work",
        date: "2024-01-02",
        start: "08:00",
        end: "16:30",
        pause: 30,
        netDuration: 480,
        code: 1,
      },
    ];
    const configDefault = getDefaultCalculationConfig(austriaLocale, AT_WORK_DAYS);

    const statsNoConfig = calculatePeriodStats(
      entries,
      USER,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7),
      undefined,
      austriaLocale
    );
    const statsWithDefault = calculatePeriodStats(
      entries,
      USER,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7),
      undefined,
      austriaLocale,
      configDefault
    );

    expect(statsNoConfig.totalIst).toBe(statsWithDefault.totalIst);
    expect(statsNoConfig.totalTarget).toBe(statsWithDefault.totalTarget);
    expect(statsNoConfig.totalSaldo).toBe(statsWithDefault.totalSaldo);
    expect(statsNoConfig.overtimeSplit).toEqual(statsWithDefault.overtimeSplit);
    expect(statsNoConfig.normalstunden).toBe(statsWithDefault.normalstunden);
  });

  it("calculatePeriodStats mit Neutral-Locale ohne Config vs. mit Neutral-Default identisch", () => {
    const neutralUser: UserData = {
      ...USER,
      workDays: [0, 480, 480, 480, 480, 480, 0],
    };
    const entries: Entry[] = [
      {
        id: 1,
        type: "work",
        date: "2024-01-01",
        start: "08:00",
        end: "16:00",
        pause: 0,
        netDuration: 480,
        code: 1,
      },
    ];
    const statsNoConfig = calculatePeriodStats(
      entries,
      neutralUser,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7),
      undefined,
      neutralLocale
    );
    const statsWithDefault = calculatePeriodStats(
      entries,
      neutralUser,
      new Date(2024, 0, 1),
      new Date(2024, 0, 7),
      undefined,
      neutralLocale,
      getDefaultCalculationConfig(neutralLocale, neutralUser.workDays)
    );
    expect(statsNoConfig.totalSaldo).toBe(statsWithDefault.totalSaldo);
    expect(statsNoConfig.normalstunden).toBe(statsWithDefault.normalstunden);
    expect(statsNoConfig.overtimeSplit).toEqual(statsWithDefault.overtimeSplit);
  });
});

describe('Eigener Plan (blank config) mit custom holidays', () => {
  it("calculatePeriodStats ohne Feiertage rechnet nur echte work-Einträge", () => {
    const config = getBlankCalculationConfig(AT_WORK_DAYS);
    // Neutral-Locale + leere custom holidays → kein Feiertag am 2024-05-01 (Tag der Arbeit)
    const entries: Entry[] = [
      {
        id: 1,
        type: "work",
        date: "2024-05-01",
        start: "08:00",
        end: "16:00",
        pause: 0,
        netDuration: 480,
        code: 1,
      },
    ];
    const stats = calculatePeriodStats(
      entries,
      USER,
      new Date(2024, 4, 1),
      new Date(2024, 4, 1),
      undefined,
      neutralLocale, // unter der Haube bei "Eigener Plan"
      config
    );
    expect(stats.work).toBe(480);
    expect(stats.holiday).toBe(0);
    expect(stats.overtimeSplit.mehrarbeit).toBe(0);
    expect(stats.overtimeSplit.ueberstunden).toBe(0);
  });
});
