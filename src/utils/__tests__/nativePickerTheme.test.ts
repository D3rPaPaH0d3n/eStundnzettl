import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEYS } from "../../hooks/constants";
import { getNativePickerThemeMode } from "../nativePickerTheme";

describe("getNativePickerThemeMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "system"],
    ["unexpected", "system"],
  ] as const)("maps stored theme %s to native picker mode %s", (storedTheme, expectedMode) => {
    localStorage.setItem(STORAGE_KEYS.THEME, storedTheme);

    expect(getNativePickerThemeMode()).toBe(expectedMode);
  });

  it("falls back to system when no theme is stored", () => {
    expect(getNativePickerThemeMode()).toBe("system");
  });
});
