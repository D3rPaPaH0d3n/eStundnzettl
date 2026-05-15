import { STORAGE_KEYS } from "../hooks/constants";
import type { Theme } from "../types";

export type NativePickerThemeMode = "light" | "dark" | "system";

export function getNativePickerThemeMode(): NativePickerThemeMode {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
  return theme === "light" || theme === "dark" ? theme : "system";
}
