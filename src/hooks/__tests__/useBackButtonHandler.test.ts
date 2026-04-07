import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

let backButtonCallback: (() => void) | null = null;
const mockRemove = vi.fn();

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((_event: string, cb: () => void) => {
      backButtonCallback = cb;
      return Promise.resolve({ remove: mockRemove });
    }),
    exitApp: vi.fn(),
  },
}));

import { App as CapacitorApp } from "@capacitor/app";
import { useBackButtonHandler } from "../useBackButtonHandler";

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

// ─── Tests ──────────────────────────────────────────────────

describe("useBackButtonHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backButtonCallback = null;
  });

  it("registers a backButton listener on mount", () => {
    const form = makeForm();
    renderHook(() =>
      useBackButtonHandler({ view: "dashboard", setView: vi.fn(), form })
    );
    expect(CapacitorApp.addListener).toHaveBeenCalledWith(
      "backButton",
      expect.any(Function)
    );
  });

  it("navigates to dashboard when back pressed on non-dashboard view", () => {
    const form = makeForm();
    const setView = vi.fn();
    renderHook(() =>
      useBackButtonHandler({ view: "add", setView, form })
    );
    expect(backButtonCallback).not.toBeNull();
    backButtonCallback!();
    expect(setView).toHaveBeenCalledWith("dashboard");
  });

  it("clears editingEntry when navigating back to dashboard", () => {
    const form = makeForm();
    const setView = vi.fn();
    renderHook(() =>
      useBackButtonHandler({ view: "settings", setView, form })
    );
    backButtonCallback!();
    expect(form.setEditingEntry).toHaveBeenCalledWith(null);
  });

  it("exits app when back pressed on dashboard", () => {
    const form = makeForm();
    const setView = vi.fn();
    renderHook(() =>
      useBackButtonHandler({ view: "dashboard", setView, form })
    );
    backButtonCallback!();
    expect(CapacitorApp.exitApp).toHaveBeenCalledOnce();
    expect(setView).not.toHaveBeenCalled();
  });

  it("does not exit app from settings view", () => {
    const form = makeForm();
    renderHook(() =>
      useBackButtonHandler({ view: "settings", setView: vi.fn(), form })
    );
    backButtonCallback!();
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
  });

  it("removes listener on unmount", async () => {
    const form = makeForm();
    const { unmount } = renderHook(() =>
      useBackButtonHandler({ view: "dashboard", setView: vi.fn(), form })
    );
    unmount();
    // Allow the promise to resolve
    await vi.waitFor(() => {
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  it("re-registers listener when view changes", () => {
    const form = makeForm();
    const setView = vi.fn();
    const { rerender } = renderHook(
      ({ view }) => useBackButtonHandler({ view, setView, form }),
      { initialProps: { view: "dashboard" } }
    );

    const firstCallCount = vi.mocked(CapacitorApp.addListener).mock.calls.length;

    rerender({ view: "settings" });

    expect(vi.mocked(CapacitorApp.addListener).mock.calls.length).toBeGreaterThan(
      firstCallCount
    );
  });

  it("handles back from report view correctly", () => {
    const form = makeForm();
    const setView = vi.fn();
    renderHook(() =>
      useBackButtonHandler({ view: "report", setView, form })
    );
    backButtonCallback!();
    expect(setView).toHaveBeenCalledWith("dashboard");
    expect(form.setEditingEntry).toHaveBeenCalledWith(null);
  });
});
