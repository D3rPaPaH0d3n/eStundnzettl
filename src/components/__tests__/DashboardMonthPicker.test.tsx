import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import DashboardMonthPicker from "../DashboardMonthPicker";
import { Material3DatePicker } from "../../plugins/Material3DatePickerPlugin";

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

vi.mock("../../plugins/Material3DatePickerPlugin", () => ({
  Material3DatePicker: {
    pickMonth: vi.fn(),
  },
}));

describe("DashboardMonthPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("zeigt einen manuellen Monats-Fallback, wenn der native Picker fehlschlägt", async () => {
    vi.mocked(Material3DatePicker.pickMonth).mockRejectedValueOnce(new Error("native picker unavailable"));
    const onSelectMonth = vi.fn();
    const onClose = vi.fn();

    const { findByDisplayValue, getByText } = render(
      <DashboardMonthPicker
        selectedDate={new Date("2026-04-15T00:00:00")}
        onSelectMonth={onSelectMonth}
        onClose={onClose}
      />,
    );

    const input = await findByDisplayValue("2026-04");
    fireEvent.change(input, { target: { value: "2026-05" } });
    fireEvent.click(getByText("Übernehmen"));

    expect(onSelectMonth).toHaveBeenCalledTimes(1);
    expect(onSelectMonth.mock.calls[0][0]).toEqual(new Date("2026-05-01T00:00:00"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
