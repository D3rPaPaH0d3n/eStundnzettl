import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppearanceSettings from "../AppearanceSettings";

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn() },
  ImpactStyle: { Light: "light" },
}));

vi.mock("react-hot-toast", () => ({
  default: vi.fn(),
}));

describe("AppearanceSettings", () => {
  afterEach(() => {
    cleanup();
  });

  it("zeigt Material You unter Darstellung und toggelt die Einstellung", () => {
    const setMaterialYouEnabled = vi.fn();

    const { getByText, getByRole } = render(
      <AppearanceSettings
        theme="system"
        setTheme={vi.fn()}
        materialYouEnabled={false}
        setMaterialYouEnabled={setMaterialYouEnabled}
      />,
    );

    fireEvent.click(getByRole("button", { name: /Darstellung/ }));

    expect(getByText("Material You verwenden")).toBeTruthy();

    fireEvent.click(getByRole("checkbox"));

    expect(setMaterialYouEnabled).toHaveBeenCalledWith(true);
  });
});
