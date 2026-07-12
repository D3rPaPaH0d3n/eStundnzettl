import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecordingModeSettings from "../Settings/RecordingModeSettings";
import type { UserData } from "../../types";

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn() },
  ImpactStyle: { Light: "light" },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn() },
}));

describe("RecordingModeSettings", () => {
  afterEach(cleanup);

  it("zeigt und speichert das optionale Monatsziel nur bei flexiblen Arbeitszeiten", () => {
    let current: UserData = { name: "Max", position: "", photo: null, workDays: [], simpleMode: true };
    const setUserData = vi.fn((update: UserData | ((previous: UserData) => UserData)) => {
      current = typeof update === "function" ? update(current) : update;
    });
    const { getByText, getByLabelText, rerender } = render(
      <RecordingModeSettings userData={current} setUserData={setUserData} />,
    );

    expect(getByText("Flexible Arbeitszeiten")).toBeTruthy();
    fireEvent.click(getByText("Monatliches Stundenziel"));
    expect(current.monthlyTargetMinutes).toBe(1800);

    rerender(<RecordingModeSettings userData={current} setUserData={setUserData} />);
    fireEvent.change(getByLabelText("Stunden"), { target: { value: "35" } });
    fireEvent.change(getByLabelText("Minuten"), { target: { value: "30" } });
    expect(current.monthlyTargetMinutes).toBe(2130);
  });

  it("blendet das Monatsziel bei festen Sollzeiten aus", () => {
    const userData: UserData = { name: "Max", position: "", photo: null, workDays: [], simpleMode: false, monthlyTargetMinutes: 1800 };
    const { queryByText, getByText } = render(
      <RecordingModeSettings userData={userData} setUserData={vi.fn()} />,
    );
    expect(getByText("Feste Sollzeiten")).toBeTruthy();
    expect(queryByText("Monatliches Stundenziel")).toBeNull();
  });

  it("verwirft einen ungültigen Entwurf beim Verlassen des Eingabefelds", () => {
    let current: UserData = {
      name: "Max", position: "", photo: null, workDays: [], simpleMode: true, monthlyTargetMinutes: 1800,
    };
    const setUserData = vi.fn((update: UserData | ((previous: UserData) => UserData)) => {
      current = typeof update === "function" ? update(current) : update;
    });
    const { getByLabelText } = render(
      <RecordingModeSettings userData={current} setUserData={setUserData} />,
    );
    const input = getByLabelText("Stunden") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(current.monthlyTargetMinutes).toBe(1800);
    fireEvent.blur(input);
    expect(input.value).toBe("30");
  });
});
