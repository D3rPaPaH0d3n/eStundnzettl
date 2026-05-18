import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getPalette = vi.hoisted(() => vi.fn());

vi.mock("../../plugins/DynamicColorsPlugin", () => ({
  DynamicColors: {
    getPalette,
  },
}));

import { useMaterialYouPalette } from "../useMaterialYouPalette";

const materialYouVariables = [
  "--my-accent-light",
  "--my-accent-dark",
  "--my-accent-container-light",
  "--my-accent-container-dark",
] as const;

function primeMaterialYouStyles() {
  document.documentElement.classList.add("material-you");
  materialYouVariables.forEach((name) => document.documentElement.style.setProperty(name, "#123456"));
}

describe("useMaterialYouPalette", () => {
  beforeEach(() => {
    getPalette.mockReset();
    document.documentElement.classList.remove("material-you");
    materialYouVariables.forEach((name) => document.documentElement.style.removeProperty(name));
  });

  afterEach(() => {
    document.documentElement.classList.remove("material-you");
    materialYouVariables.forEach((name) => document.documentElement.style.removeProperty(name));
  });

  it("waits until settings storage is loaded", () => {
    renderHook(() => useMaterialYouPalette({ enabled: true, settingsStorageStatus: "loading" }));

    expect(getPalette).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains("material-you")).toBe(false);
  });

  it("clears material-you styles when the setting is disabled", () => {
    primeMaterialYouStyles();

    renderHook(() => useMaterialYouPalette({ enabled: false, settingsStorageStatus: "ready" }));

    expect(getPalette).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains("material-you")).toBe(false);
    materialYouVariables.forEach((name) => {
      expect(document.documentElement.style.getPropertyValue(name)).toBe("");
    });
  });

  it("applies dynamic colors when Android reports a supported palette", async () => {
    getPalette.mockResolvedValue({
      supported: true,
      accentLight: "#006c4b",
      accentDark: "#7adbac",
      accentContainerLight: "#91f8c7",
      accentContainerDark: "#005139",
    });

    renderHook(() => useMaterialYouPalette({ enabled: true, settingsStorageStatus: "ready" }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains("material-you")).toBe(true);
    });
    expect(document.documentElement.style.getPropertyValue("--my-accent-light")).toBe("#006c4b");
    expect(document.documentElement.style.getPropertyValue("--my-accent-dark")).toBe("#7adbac");
    expect(document.documentElement.style.getPropertyValue("--my-accent-container-light")).toBe("#91f8c7");
    expect(document.documentElement.style.getPropertyValue("--my-accent-container-dark")).toBe("#005139");
  });

  it("clears material-you styles when Android reports unsupported dynamic colors", async () => {
    primeMaterialYouStyles();
    getPalette.mockResolvedValue({ supported: false });

    renderHook(() => useMaterialYouPalette({ enabled: true, settingsStorageStatus: "ready" }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains("material-you")).toBe(false);
    });
  });

  it("clears material-you styles when the native plugin fails", async () => {
    primeMaterialYouStyles();
    getPalette.mockRejectedValue(new Error("plugin unavailable"));

    renderHook(() => useMaterialYouPalette({ enabled: true, settingsStorageStatus: "ready" }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains("material-you")).toBe(false);
    });
  });

  it("does not apply a palette after the hook unmounts", async () => {
    let resolvePalette: (palette: { supported: boolean; accentLight: string }) => void = () => {};
    getPalette.mockReturnValue(
      new Promise((resolve) => {
        resolvePalette = resolve;
      }),
    );

    const { unmount } = renderHook(() => useMaterialYouPalette({ enabled: true, settingsStorageStatus: "ready" }));
    unmount();
    resolvePalette({ supported: true, accentLight: "#abcdef" });

    await Promise.resolve();

    expect(document.documentElement.classList.contains("material-you")).toBe(false);
    expect(document.documentElement.style.getPropertyValue("--my-accent-light")).toBe("");
  });
});
