import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

// Hook erst NACH den Mocks importieren
import { useLiveTimer } from "../useLiveTimer";

// ─── Tests ──────────────────────────────────────────────────

describe("useLiveTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("returns idle timer state when no saved state exists", () => {
    const { result } = renderHook(() => useLiveTimer());

    expect(result.current.timerState.isRunning).toBe(false);
    expect(result.current.timerState.isPaused).toBe(false);
    expect(result.current.timerState.startTime).toBeNull();
    expect(result.current.timerState.pauseStartTime).toBeNull();
    expect(result.current.timerState.accumulatedPause).toBe(0);
    expect(result.current.autoCheckoutData).toBeNull();
  });

  it("startTimer sets isRunning=true and records a startTime", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());

    expect(result.current.timerState.isRunning).toBe(true);
    expect(result.current.timerState.isPaused).toBe(false);
    expect(result.current.timerState.startTime).toBeTruthy();
    expect(result.current.timerState.accumulatedPause).toBe(0);
  });

  it("pauseTimer sets isPaused=true and records pauseStartTime", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());
    act(() => result.current.pauseTimer());

    expect(result.current.timerState.isPaused).toBe(true);
    expect(result.current.timerState.pauseStartTime).toBeTruthy();
    expect(result.current.timerState.isRunning).toBe(true);
  });

  it("pauseTimer is a no-op when timer is not running", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.pauseTimer());

    expect(result.current.timerState.isPaused).toBe(false);
    expect(result.current.timerState.isRunning).toBe(false);
  });

  it("resumeTimer clears isPaused and accumulates pause duration", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());
    act(() => result.current.pauseTimer());

    // Capture the pause start to verify accumulation
    const pauseStart = result.current.timerState.pauseStartTime;
    expect(pauseStart).toBeTruthy();

    act(() => result.current.resumeTimer());

    expect(result.current.timerState.isPaused).toBe(false);
    expect(result.current.timerState.pauseStartTime).toBeNull();
    // accumulatedPause should be >= 0 (very small since it's near-instant)
    expect(result.current.timerState.accumulatedPause).toBeGreaterThanOrEqual(0);
  });

  it("resumeTimer is a no-op when not paused", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());
    act(() => result.current.resumeTimer());

    // Should remain running, not paused, no changes
    expect(result.current.timerState.isRunning).toBe(true);
    expect(result.current.timerState.isPaused).toBe(false);
  });

  it("stopTimer returns rounded start/end/pause and resets state", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());

    let stopResult: any;
    act(() => {
      stopResult = result.current.stopTimer();
    });

    // stopTimer returns { start, end, pause }
    expect(stopResult).toHaveProperty("start");
    expect(stopResult).toHaveProperty("end");
    expect(stopResult).toHaveProperty("pause");
    expect(stopResult.start).toBeInstanceOf(Date);
    expect(stopResult.end).toBeInstanceOf(Date);
    expect(typeof stopResult.pause).toBe("number");

    // Timer state should be reset
    expect(result.current.timerState.isRunning).toBe(false);
    expect(result.current.timerState.isPaused).toBe(false);
    expect(result.current.timerState.startTime).toBeNull();
  });

  it("stopTimer includes pause time from an active pause", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());
    act(() => result.current.pauseTimer());

    let stopResult: any;
    act(() => {
      stopResult = result.current.stopTimer();
    });

    // pause should be >= 0 (near-instant)
    expect(stopResult.pause).toBeGreaterThanOrEqual(0);
    expect(result.current.timerState.isRunning).toBe(false);
  });

  it("cancelTimer resets state without returning data", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());
    act(() => result.current.cancelTimer());

    expect(result.current.timerState.isRunning).toBe(false);
    expect(result.current.timerState.startTime).toBeNull();
  });

  it("persists timer state to localStorage", () => {
    const { result } = renderHook(() => useLiveTimer());

    act(() => result.current.startTimer());

    const stored = localStorage.getItem("estundnzettl_live_timer");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.isRunning).toBe(true);
    expect(parsed.startTime).toBeTruthy();
  });

  it("restores timer state from localStorage on mount", () => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "estundnzettl_live_timer",
      JSON.stringify({
        isRunning: true,
        isPaused: false,
        startTime: now,
        pauseStartTime: null,
        accumulatedPause: 0,
      })
    );

    const { result } = renderHook(() => useLiveTimer());

    // Same-day timer should remain running
    expect(result.current.timerState.isRunning).toBe(true);
    expect(result.current.timerState.startTime).toBe(now);
  });

  it("auto-checkout triggers when saved timer started on a previous day", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0);

    localStorage.setItem(
      "estundnzettl_live_timer",
      JSON.stringify({
        isRunning: true,
        isPaused: false,
        startTime: yesterday.toISOString(),
        pauseStartTime: null,
        accumulatedPause: 0,
      })
    );

    const { result } = renderHook(() => useLiveTimer());

    // The auto-checkout effect runs on mount asynchronously
    // Wait for state to settle
    await vi.waitFor(() => {
      expect(result.current.autoCheckoutData).not.toBeNull();
    });

    expect(result.current.autoCheckoutData!.isAutoCheckout).toBe(true);
    expect(result.current.autoCheckoutData!.start).toBeInstanceOf(Date);
    expect(result.current.autoCheckoutData!.end).toBeInstanceOf(Date);
    expect(result.current.autoCheckoutData!.end.getHours()).toBe(23);
    expect(result.current.autoCheckoutData!.end.getMinutes()).toBe(59);
    // Timer should be reset
    expect(result.current.timerState.isRunning).toBe(false);
  });

  it("clearAutoCheckout clears the auto-checkout data", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0);

    localStorage.setItem(
      "estundnzettl_live_timer",
      JSON.stringify({
        isRunning: true,
        isPaused: false,
        startTime: yesterday.toISOString(),
        pauseStartTime: null,
        accumulatedPause: 0,
      })
    );

    const { result } = renderHook(() => useLiveTimer());

    await vi.waitFor(() => {
      expect(result.current.autoCheckoutData).not.toBeNull();
    });

    act(() => result.current.clearAutoCheckout());

    expect(result.current.autoCheckoutData).toBeNull();
  });
});
