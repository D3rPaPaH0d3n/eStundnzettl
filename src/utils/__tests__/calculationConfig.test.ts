import { describe, it, expect } from "vitest";
import {
  getDefaultCalculationConfig,
  getBlankCalculationConfig,
  resolveEffectiveRules,
  coerceCalculationConfig,
  calculateAutoPause,
} from "../calculationConfig";
import { neutralLocale } from "../../locales/neutral";
import { austriaLocale } from "../../locales/austria";
import { createGermanyLocale } from "../../locales/germany";
import type { CalculationConfig } from "../../types";

describe("getDefaultCalculationConfig", () => {
  it("spiegelt AT-Locale 1:1 wider (enableOvertimeSplit → split, weeklyLimit 2400, sick cap)", () => {
    const config = getDefaultCalculationConfig(austriaLocale, [0, 510, 510, 510, 510, 270, 0]);
    expect(config.overtimeMode).toBe("split");
    expect(config.overtimeThresholdMinutes).toBe(2400);
    expect(config.sickOnWorkDayMode).toBe("cap_to_target");
    expect(config.weeklyTargetMinutes).toBe(2310); // 38,5h
    expect(config.holidaySet.mode).toBe("locale_default");
    expect(config.halfDayMode.mode).toBe("locale_default");
  });

  it("spiegelt Neutral-Locale 1:1 wider (overtimeMode=none, sick additive)", () => {
    const config = getDefaultCalculationConfig(neutralLocale, [0, 480, 480, 480, 480, 480, 0]);
    expect(config.overtimeMode).toBe("none");
    expect(config.overtimeThresholdMinutes).toBe(null);
    expect(config.sickOnWorkDayMode).toBe("additive");
    expect(config.weeklyTargetMinutes).toBe(2400);
  });

  it("spiegelt DE-BY-Locale korrekt (split, 2400, cap)", () => {
    const bavaria = createGermanyLocale("by");
    const config = getDefaultCalculationConfig(bavaria, [0, 480, 480, 480, 480, 480, 0]);
    expect(config.overtimeMode).toBe("split");
    expect(config.overtimeThresholdMinutes).toBe(2400);
    expect(config.sickOnWorkDayMode).toBe("cap_to_target");
  });

  it("fällt auf locale.defaultWorkDays zurück wenn workDays null/kaputt ist", () => {
    const config = getDefaultCalculationConfig(austriaLocale, null);
    expect(config.weeklyTargetMinutes).toBe(
      austriaLocale.defaultWorkDays.reduce((a, b) => a + b, 0)
    );
  });
});

describe("getBlankCalculationConfig (Eigener Plan)", () => {
  it("ist komplett neutral: keine Feiertage, keine Halbtage, keine Überstunden", () => {
    const config = getBlankCalculationConfig([0, 480, 480, 480, 480, 480, 0]);
    expect(config.overtimeMode).toBe("none");
    expect(config.sickOnWorkDayMode).toBe("additive");
    expect(config.holidaySet.mode).toBe("custom");
    expect(config.holidaySet.customHolidays).toEqual({});
    expect(config.halfDayMode.mode).toBe("none");
    expect(config.halfDayMode.customHalfDays).toEqual([]);
    expect(config.autoPauseRules).toEqual([]);
    expect(config.weeklyTargetMinutes).toBe(2400);
  });
});

describe("resolveEffectiveRules", () => {
  it("liefert ohne Config nur Locale-Defaults zurück", () => {
    const rules = resolveEffectiveRules(austriaLocale, null);
    expect(rules.halfDays).toEqual(austriaLocale.halfDays);
    expect(rules.overtimeSplitEnabled).toBe(true);
    expect(rules.weeklyLimitMinutes).toBe(2400);
    expect(rules.sickMode).toBe("cap_to_target");
    expect(rules.holidaySetMode).toBe("locale_default");
  });

  it("überschreibt halfDays bei config.halfDayMode=none", () => {
    const config: CalculationConfig = getDefaultCalculationConfig(austriaLocale, [
      0, 510, 510, 510, 510, 270, 0,
    ]);
    config.halfDayMode = { mode: "none", customHalfDays: [] };
    const rules = resolveEffectiveRules(austriaLocale, config);
    expect(rules.halfDays).toEqual([]);
  });

  it("überschreibt halfDays bei config.halfDayMode=custom", () => {
    const config = getDefaultCalculationConfig(austriaLocale, [0, 510, 510, 510, 510, 270, 0]);
    config.halfDayMode = { mode: "custom", customHalfDays: ["06-15"] };
    const rules = resolveEffectiveRules(austriaLocale, config);
    expect(rules.halfDays).toEqual(["06-15"]);
  });

  it("disablet Overtime-Split bei config.overtimeMode=none", () => {
    const config = getDefaultCalculationConfig(austriaLocale, [0, 510, 510, 510, 510, 270, 0]);
    config.overtimeMode = "none";
    const rules = resolveEffectiveRules(austriaLocale, config);
    expect(rules.overtimeSplitEnabled).toBe(false);
    expect(rules.overtimeMode).toBe("none");
  });

  it("überschreibt weeklyLimitMinutes bei config.overtimeMode=split mit anderer Schwelle", () => {
    const config = getDefaultCalculationConfig(austriaLocale, [0, 510, 510, 510, 510, 270, 0]);
    config.overtimeThresholdMinutes = 2100; // 35h
    const rules = resolveEffectiveRules(austriaLocale, config);
    expect(rules.weeklyLimitMinutes).toBe(2100);
  });

  it("liefert customHolidays zurück bei holidaySet.mode=custom", () => {
    const config = getBlankCalculationConfig([0, 480, 480, 480, 480, 480, 0]);
    config.holidaySet.customHolidays = { "01-01": "Neujahr" };
    const rules = resolveEffectiveRules(austriaLocale, config);
    expect(rules.customHolidays).toEqual({ "01-01": "Neujahr" });
    expect(rules.holidaySetMode).toBe("custom");
  });

  it("überschreibt sickMode mit der User-Wahl", () => {
    const config = getDefaultCalculationConfig(austriaLocale, [0, 510, 510, 510, 510, 270, 0]);
    config.sickOnWorkDayMode = "ignore";
    const rules = resolveEffectiveRules(austriaLocale, config);
    expect(rules.sickMode).toBe("ignore");
  });
});

describe("coerceCalculationConfig", () => {
  const fallback = getDefaultCalculationConfig(austriaLocale, [0, 510, 510, 510, 510, 270, 0]);

  it("akzeptiert eine gültige Config unverändert", () => {
    const valid = getDefaultCalculationConfig(austriaLocale, [0, 480, 480, 480, 480, 480, 0]);
    const coerced = coerceCalculationConfig(valid, fallback);
    expect(coerced.weeklyTargetMinutes).toBe(2400);
    expect(coerced.overtimeMode).toBe("split");
  });

  it("gibt fallback zurück wenn value kein Objekt ist", () => {
    expect(coerceCalculationConfig(null, fallback)).toEqual(fallback);
    expect(coerceCalculationConfig(undefined, fallback)).toEqual(fallback);
    expect(coerceCalculationConfig("not-an-object", fallback)).toEqual(fallback);
  });

  it("repariert unvollständige Configs mit Fallback-Feldern", () => {
    const broken = { overtimeMode: "split" } as unknown;
    const coerced = coerceCalculationConfig(broken, fallback);
    expect(coerced.overtimeMode).toBe("split");
    expect(coerced.sickOnWorkDayMode).toBe(fallback.sickOnWorkDayMode);
    expect(coerced.vacationAllowanceDays).toBe(fallback.vacationAllowanceDays);
  });

  it("filtert ungültige autoPauseRules", () => {
    const broken = {
      autoPauseRules: [
        { fromMinutes: 360, pauseMinutes: 30 },
        { foo: "bar" },
        { fromMinutes: "nope", pauseMinutes: 15 },
        { fromMinutes: 540, pauseMinutes: 45 },
      ],
    } as unknown;
    const coerced = coerceCalculationConfig(broken, fallback);
    expect(coerced.autoPauseRules).toHaveLength(2);
    expect(coerced.autoPauseRules[0]).toEqual({ fromMinutes: 360, pauseMinutes: 30 });
    expect(coerced.autoPauseRules[1]).toEqual({ fromMinutes: 540, pauseMinutes: 45 });
  });
});

describe("calculateAutoPause", () => {
  const rules = [
    { fromMinutes: 360, pauseMinutes: 30 }, // ab 6h → 30min
    { fromMinutes: 540, pauseMinutes: 45 }, // ab 9h → 45min
  ];

  it("liefert 0 wenn keine Regel greift (Arbeitszeit ≤ kleinste Schwelle)", () => {
    expect(calculateAutoPause(300, rules)).toBe(0); // 5h
    expect(calculateAutoPause(360, rules)).toBe(0); // genau 6h → strikt größer!
  });

  it("greift bei Arbeitszeit leicht über der ersten Schwelle", () => {
    expect(calculateAutoPause(361, rules)).toBe(30);
    expect(calculateAutoPause(480, rules)).toBe(30); // 8h → 30min
  });

  it("greift bei Arbeitszeit über der zweiten Schwelle mit der größeren Pause", () => {
    expect(calculateAutoPause(541, rules)).toBe(45);
    expect(calculateAutoPause(600, rules)).toBe(45); // 10h → 45min
  });

  it("liefert 0 bei leerer Regel-Liste", () => {
    expect(calculateAutoPause(600, [])).toBe(0);
  });
});
