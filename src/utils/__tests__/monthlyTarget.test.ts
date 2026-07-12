import { describe, expect, it } from "vitest";
import {
  MAX_MONTHLY_TARGET_MINUTES,
  calculateMonthlyTargetProgress,
  formatMonthlyTargetInput,
  getValidMonthlyTargetMinutes,
  normalizeMonthlyTargetMinutes,
  normalizeUserDataMonthlyTarget,
  parseMonthlyTargetInput,
} from "../monthlyTarget";

describe("monthly target core", () => {
  it.each([undefined, null, 0, -1, 30.5, Number.NaN, Infinity, "1800", MAX_MONTHLY_TARGET_MINUTES + 1])(
    "rejects invalid persisted target %s",
    (value) => expect(normalizeMonthlyTargetMinutes(value)).toBeUndefined(),
  );

  it("accepts positive whole minutes through the calendar-month ceiling", () => {
    expect(normalizeMonthlyTargetMinutes(1)).toBe(1);
    expect(normalizeMonthlyTargetMinutes(1800)).toBe(1800);
    expect(normalizeMonthlyTargetMinutes(MAX_MONTHLY_TARGET_MINUTES)).toBe(MAX_MONTHLY_TARGET_MINUTES);
  });

  it("removes only an invalid target from tolerant legacy profiles", () => {
    expect(normalizeUserDataMonthlyTarget({ name: "Max", monthlyTargetMinutes: "1800", legacy: true })).toEqual({
      name: "Max",
      legacy: true,
    });
  });

  it("activates a target only in simple mode", () => {
    expect(getValidMonthlyTargetMinutes({ simpleMode: false, monthlyTargetMinutes: 1800 } as never)).toBeNull();
    expect(getValidMonthlyTargetMinutes({ simpleMode: true, monthlyTargetMinutes: 1800 } as never)).toBe(1800);
  });

  it("derives open, reached and exceeded progress", () => {
    const user = { simpleMode: true, monthlyTargetMinutes: 1800 } as never;
    expect(calculateMonthlyTargetProgress(1350, user)).toMatchObject({
      differenceMinutes: -450,
      remainingMinutes: 450,
      exceededMinutes: 0,
      progressPercent: 75,
    });
    expect(calculateMonthlyTargetProgress(1800, user)).toMatchObject({ differenceMinutes: 0, remainingMinutes: 0 });
    expect(calculateMonthlyTargetProgress(1935, user)).toMatchObject({
      differenceMinutes: 135,
      exceededMinutes: 135,
      progressPercent: 100,
    });
  });

  it("normalizes invalid actual durations", () => {
    const user = { simpleMode: true, monthlyTargetMinutes: 60 } as never;
    expect(calculateMonthlyTargetProgress(-10, user)?.actualMinutes).toBe(0);
    expect(calculateMonthlyTargetProgress(Number.NaN, user)?.actualMinutes).toBe(0);
    expect(calculateMonthlyTargetProgress(30.9, user)?.actualMinutes).toBe(30);
  });
});

describe("monthly target input", () => {
  it("parses and formats valid HH:MM values", () => {
    expect(parseMonthlyTargetInput("30:15")).toBe(1815);
    expect(formatMonthlyTargetInput(1815)).toBe("30:15");
  });

  it("rejects invalid minutes, zero and values above the maximum", () => {
    expect(parseMonthlyTargetInput("30:75")).toBeUndefined();
    expect(parseMonthlyTargetInput("0:00")).toBeUndefined();
    expect(parseMonthlyTargetInput("744:01")).toBeUndefined();
  });
});
