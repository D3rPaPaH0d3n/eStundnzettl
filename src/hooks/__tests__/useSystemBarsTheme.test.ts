import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setSystemBarsTheme = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../../plugins/SystemBarsPlugin", () => ({
  SystemBars: {
    setTheme: setSystemBarsTheme,
  },
}));

import { useSystemBarsTheme } from "../useSystemBarsTheme";

describe("useSystemBarsTheme", () => {
  let mediaQuery: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setSystemBarsTheme.mockClear();
    mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets light system bars while the normal app shell is active", () => {
    renderHook(() => useSystemBarsTheme({ theme: "light", showOnboarding: false }));

    expect(setSystemBarsTheme).toHaveBeenCalledWith({
      dark: false,
      statusBarDark: true,
      navigationBarDark: false,
    });
    expect(mediaQuery.addEventListener).not.toHaveBeenCalled();
  });

  it("lets onboarding use the same dark state for status and navigation bars", () => {
    renderHook(() => useSystemBarsTheme({ theme: "dark", showOnboarding: true }));

    expect(setSystemBarsTheme).toHaveBeenCalledWith({
      dark: true,
      statusBarDark: true,
      navigationBarDark: true,
    });
  });

  it("tracks system theme changes and removes the listener on cleanup", () => {
    mediaQuery.matches = true;
    const { unmount } = renderHook(() => useSystemBarsTheme({ theme: "system", showOnboarding: false }));

    expect(setSystemBarsTheme).toHaveBeenCalledWith({
      dark: true,
      statusBarDark: true,
      navigationBarDark: true,
    });
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    const listener = mediaQuery.addEventListener.mock.calls[0][1] as () => void;
    mediaQuery.matches = false;
    listener();

    expect(setSystemBarsTheme).toHaveBeenLastCalledWith({
      dark: false,
      statusBarDark: true,
      navigationBarDark: false,
    });

    unmount();

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", listener);
  });

  it("ignores native plugin failures in web/dev environments", () => {
    setSystemBarsTheme.mockRejectedValueOnce(new Error("not native"));

    expect(() => {
      renderHook(() => useSystemBarsTheme({ theme: "dark", showOnboarding: false }));
    }).not.toThrow();
  });
});
