import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// ─── Mocks (VOR dem CalculationSettings-Import) ─────────────

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

// recalculateAllEntries zieht die DB-Schicht mit — für reine
// Render-Tests nicht nötig.
vi.mock("../../../utils/timeCalculations", () => ({
  recalculateAllEntries: vi.fn().mockResolvedValue({ fixed: 0, total: 0 }),
}));

// Importe NACH den Mocks
import CalculationSettings from "../CalculationSettings";
import { getDefaultCalculationConfig } from "../../../utils/calculationConfig";
import { austriaLocale } from "../../../locales/austria";
import type { UserData } from "../../../types";

const userData: UserData = {
  name: "Test",
  position: "",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 270, 0],
};

const makeProps = () => ({
  userData,
  locale: austriaLocale,
  calculationConfig: getDefaultCalculationConfig(
    austriaLocale,
    userData.workDays
  ),
  setCalculationConfig: vi.fn(),
});

describe("CalculationSettings (Wrapper-Varianten)", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert standalone in einer eigenen Card mit Header (unwrapped=false)", () => {
    const { container } = render(<CalculationSettings {...makeProps()} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("rounded-xl"); // Card-Rahmen
    expect(container.textContent).toContain("Berechnung");
  });

  it("rendert eingebettet ohne Card und ohne Header-Toggle (unwrapped=true)", () => {
    const { container } = render(
      <CalculationSettings {...makeProps()} unwrapped />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain("rounded-xl");
    expect(root.className).toContain("space-y-4");
  });
});
