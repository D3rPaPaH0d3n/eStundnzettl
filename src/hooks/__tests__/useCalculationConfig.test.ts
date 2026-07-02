import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// SQLite inaktiv → Hook bleibt auf den Locale-Defaults (kein Hydrate).
vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

import { useCalculationConfig } from "../useCalculationConfig";
import { getDefaultCalculationConfig } from "../../utils/calculationConfig";
import { austriaLocale } from "../../locales/austria";
import { neutralLocale } from "../../locales/neutral";
import type { UserData } from "../../types";

const userData: UserData = {
  name: "Test",
  position: "",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 270, 0],
};

const renderConfigHook = () =>
  renderHook(() =>
    useCalculationConfig({ locale: austriaLocale, localeId: null, userData })
  );

describe("useCalculationConfig", () => {
  it("initialisiert mit den Locale-Defaults (ohne SQLite)", () => {
    const { result } = renderConfigHook();
    expect(result.current.calculationConfig).toEqual(
      getDefaultCalculationConfig(austriaLocale, userData.workDays)
    );
  });

  it("setCalculationConfig unterstützt Wert und Funktions-Updater", () => {
    const { result } = renderConfigHook();

    act(() => {
      result.current.setCalculationConfig((prev) => ({
        ...prev,
        weeklyTargetMinutes: 2400,
      }));
    });
    expect(result.current.calculationConfig.weeklyTargetMinutes).toBe(2400);

    const next = {
      ...result.current.calculationConfig,
      weeklyTargetMinutes: 1800,
    };
    act(() => {
      result.current.setCalculationConfig(next);
    });
    expect(result.current.calculationConfig.weeklyTargetMinutes).toBe(1800);
  });

  it("resetCalculationConfigToLocale setzt auf die Defaults der neuen Locale", () => {
    const { result } = renderConfigHook();
    const workDays = [0, 480, 480, 480, 480, 480, 0];

    act(() => {
      result.current.resetCalculationConfigToLocale(neutralLocale, workDays);
    });
    expect(result.current.calculationConfig).toEqual(
      getDefaultCalculationConfig(neutralLocale, workDays)
    );
  });
});
