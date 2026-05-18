import { useEffect } from "react";
import type { Theme } from "../types";
import { SystemBars } from "../plugins/SystemBarsPlugin";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

interface UseSystemBarsThemeOptions {
  theme: Theme;
  showOnboarding: boolean;
}

export function useSystemBarsTheme({ theme, showOnboarding }: UseSystemBarsThemeOptions) {
  useEffect(() => {
    const systemQuery = window.matchMedia?.(SYSTEM_DARK_QUERY);

    const isSystemDark = () => systemQuery?.matches ?? false;
    const applySystemBars = () => {
      const dark = theme === "dark" || (theme === "system" && isSystemDark());

      SystemBars.setTheme({
        dark,
        statusBarDark: showOnboarding ? dark : true,
        navigationBarDark: dark,
      }).catch(() => {
        // Web/dev fallback: native plugin exists only inside the Android app.
      });
    };

    applySystemBars();

    if (theme === "system" && systemQuery) {
      systemQuery.addEventListener("change", applySystemBars);
      return () => systemQuery.removeEventListener("change", applySystemBars);
    }
  }, [showOnboarding, theme]);
}
