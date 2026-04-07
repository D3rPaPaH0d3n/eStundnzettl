import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: { hide: vi.fn() },
}));

import { useAppState } from "../useAppState";
import { SplashScreen } from "@capacitor/splash-screen";
import type { UserData } from "../../types";

// ─── Helpers ────────────────────────────────────────────────

const COMPLETE_USER: UserData = {
  name: "Max",
  position: "Dev",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 270, 0],
};

const NEW_USER: UserData = {
  name: "",
  position: "",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 270, 0],
};

const LEGACY_USER: UserData = {
  name: "Legacy",
  position: "Worker",
  photo: null,
  workDays: undefined as unknown as number[],
};

// ─── Tests ──────────────────────────────────────────────────

describe("useAppState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  it("hides SplashScreen on mount", () => {
    renderHook(() => useAppState({ userData: COMPLETE_USER }));
    expect(SplashScreen.hide).toHaveBeenCalledOnce();
  });

  it("initializes with view='dashboard'", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    expect(result.current.view).toBe("dashboard");
  });

  it("initializes deleteTarget as null", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    expect(result.current.deleteTarget).toBeNull();
  });

  it("shows onboarding for new user (empty name)", () => {
    const { result } = renderHook(() => useAppState({ userData: NEW_USER }));
    expect(result.current.showOnboarding).toBe(true);
  });

  it("shows onboarding for legacy user (no workDays)", () => {
    const { result } = renderHook(() => useAppState({ userData: LEGACY_USER }));
    expect(result.current.showOnboarding).toBe(true);
  });

  it("hides onboarding for complete user", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    expect(result.current.showOnboarding).toBe(false);
  });

  it("handleRequestDeleteEntry sets deleteTarget with type=single", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    act(() => result.current.handleRequestDeleteEntry(42));
    expect(result.current.deleteTarget).toEqual({ type: "single", id: 42 });
  });

  it("handleRequestDeleteAll sets deleteTarget with type=all", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    act(() => result.current.handleRequestDeleteAll());
    expect(result.current.deleteTarget).toEqual({ type: "all" });
  });

  it("handleCloseDeleteModal resets deleteTarget to null", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    act(() => result.current.handleRequestDeleteEntry(7));
    expect(result.current.deleteTarget).not.toBeNull();
    act(() => result.current.handleCloseDeleteModal());
    expect(result.current.deleteTarget).toBeNull();
  });

  it("handleTourStart shows tour when not previously seen", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    act(() => result.current.handleTourStart());
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.showTour).toBe(true);
    vi.useRealTimers();
  });

  it("handleTourStart does NOT show tour when already seen", () => {
    localStorage.setItem("estundnzettl_tour_seen", "1");
    vi.useFakeTimers();
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    act(() => result.current.handleTourStart());
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.showTour).toBe(false);
    vi.useRealTimers();
  });

  it("handleTourClose sets showTour=false and persists to localStorage", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    act(() => result.current.handleTourStart());
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.showTour).toBe(true);

    act(() => result.current.handleTourClose());
    expect(result.current.showTour).toBe(false);
    expect(localStorage.getItem("estundnzettl_tour_seen")).toBe("1");
    vi.useRealTimers();
  });

  it("getHeaderTitle returns correct title per view", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));

    expect(result.current.getHeaderTitle(null)).toBe("eStundnzettl");

    act(() => result.current.setView("settings"));
    expect(result.current.getHeaderTitle(null)).toBe("Einstellungen");

    act(() => result.current.setView("add"));
    expect(result.current.getHeaderTitle(null)).toBe("Neuer Eintrag");

    const editingEntry = { id: 1, type: "work" as const, date: "2026-04-01", pause: 0, netDuration: 480 };
    expect(result.current.getHeaderTitle(editingEntry)).toBe("Eintrag bearbeiten");

    act(() => result.current.setView("report"));
    expect(result.current.getHeaderTitle(null)).toBe("Bericht");
  });

  it("handleCloseAttachmentModal resets attachmentEntry to null", () => {
    const { result } = renderHook(() => useAppState({ userData: COMPLETE_USER }));
    act(() => result.current.setAttachmentEntry({ id: 1, type: "work", date: "2026-04-01", pause: 0, netDuration: 480 }));
    expect(result.current.attachmentEntry).not.toBeNull();
    act(() => result.current.handleCloseAttachmentModal());
    expect(result.current.attachmentEntry).toBeNull();
  });
});
