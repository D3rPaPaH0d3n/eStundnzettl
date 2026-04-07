import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: { Heavy: "Heavy", Light: "Light" },
  NotificationType: { Success: "Success" },
}));

import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useAutoCheckoutHandler } from "../useAutoCheckoutHandler";
import type { AutoCheckoutData } from "../../types";

// ─── Helpers ────────────────────────────────────────────────

function makeForm(overrides = {}) {
  return {
    entryType: "work",
    formDate: "2026-04-04",
    startTime: "08:00",
    endTime: "16:00",
    pauseDuration: 30,
    project: "",
    code: 1,
    editingEntry: null,
    specialManualMode: false,
    isLiveEntry: false,
    setEntryType: vi.fn(),
    setFormDate: vi.fn(),
    setStartTime: vi.fn(),
    setEndTime: vi.fn(),
    setPauseDuration: vi.fn(),
    setProject: vi.fn(),
    setCode: vi.fn(),
    setEditingEntry: vi.fn(),
    setIsLiveEntry: vi.fn(),
    setSpecialManualMode: vi.fn(),
    resetForm: vi.fn(),
    startEdit: vi.fn(),
    ...overrides,
  };
}

function makeAutoCheckoutData(overrides: Partial<AutoCheckoutData> = {}): AutoCheckoutData {
  return {
    start: new Date(2026, 3, 6, 8, 0),  // April 6, 08:00
    end: new Date(2026, 3, 6, 22, 0),    // April 6, 22:00
    pause: 45,
    isAutoCheckout: true,
    daysMissed: 0,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe("useAutoCheckoutHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when autoCheckoutData is null", () => {
    const form = makeForm();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: null,
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(form.setFormDate).not.toHaveBeenCalled();
    expect(Haptics.impact).not.toHaveBeenCalled();
  });

  it("triggers haptic feedback when autoCheckoutData arrives", () => {
    const form = makeForm();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData(),
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Heavy });
  });

  it("populates form date from autoCheckoutData.start", () => {
    const form = makeForm();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData(),
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(form.setFormDate).toHaveBeenCalledWith("2026-04-06");
  });

  it("populates start and end times from autoCheckoutData", () => {
    const form = makeForm();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData(),
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(form.setStartTime).toHaveBeenCalledWith("08:00");
    expect(form.setEndTime).toHaveBeenCalledWith("22:00");
  });

  it("sets pause duration from autoCheckoutData", () => {
    const form = makeForm();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData({ pause: 60 }),
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(form.setPauseDuration).toHaveBeenCalledWith(60);
  });

  it("sets entryType to work and code to default", () => {
    const form = makeForm();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData(),
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 42,
      })
    );
    expect(form.setEntryType).toHaveBeenCalledWith("work");
    expect(form.setCode).toHaveBeenCalledWith(42);
  });

  it("sets isLiveEntry=true and navigates to add view", () => {
    const form = makeForm();
    const setView = vi.fn();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData(),
        form,
        setView,
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(form.setIsLiveEntry).toHaveBeenCalledWith(true);
    expect(setView).toHaveBeenCalledWith("add");
  });

  it("shows warning toast about auto checkout", () => {
    const form = makeForm();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData(),
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining("Automatisch ausgestempelt"),
      expect.objectContaining({ duration: 6000 })
    );
  });

  it("calls clearAutoCheckout after processing", () => {
    const form = makeForm();
    const clearAutoCheckout = vi.fn();
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: makeAutoCheckoutData(),
        form,
        setView: vi.fn(),
        clearAutoCheckout,
        getDefaultCode: () => 1,
      })
    );
    expect(clearAutoCheckout).toHaveBeenCalledOnce();
  });

  it("pads single-digit hours and months correctly", () => {
    const form = makeForm();
    const data = makeAutoCheckoutData({
      start: new Date(2026, 0, 5, 7, 5),  // Jan 5, 07:05
      end: new Date(2026, 0, 5, 9, 3),    // Jan 5, 09:03
    });
    renderHook(() =>
      useAutoCheckoutHandler({
        autoCheckoutData: data,
        form,
        setView: vi.fn(),
        clearAutoCheckout: vi.fn(),
        getDefaultCode: () => 1,
      })
    );
    expect(form.setFormDate).toHaveBeenCalledWith("2026-01-05");
    expect(form.setStartTime).toHaveBeenCalledWith("07:05");
    expect(form.setEndTime).toHaveBeenCalledWith("09:03");
  });
});
