import { describe, expect, it, vi } from "vitest";

const registerPlugin = vi.hoisted(() => vi.fn((name: string) => ({ name })));

vi.mock("@capacitor/core", () => ({
  registerPlugin,
}));

describe("native plugin wrappers", () => {
  it("registers the Android dynamic colors plugin", async () => {
    const { DynamicColors } = await import("../DynamicColorsPlugin");

    expect(registerPlugin).toHaveBeenCalledWith("DynamicColors");
    expect(DynamicColors).toEqual({ name: "DynamicColors" });
  });

  it("registers the Android system bars plugin", async () => {
    const { SystemBars } = await import("../SystemBarsPlugin");

    expect(registerPlugin).toHaveBeenCalledWith("SystemBars");
    expect(SystemBars).toEqual({ name: "SystemBars" });
  });
});
