import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ─── Mocks (VOR Hook-Import) ───────────────────────────────────────

const mockCheck = vi.fn();
vi.mock("../../plugins/PlayServicesAvailabilityPlugin", () => ({
  PlayServicesAvailability: {
    check: (...args: unknown[]) => mockCheck(...args),
  },
}));

const mockIsNativePlatform = vi.fn(() => true);
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNativePlatform(),
  },
}));

const mockAddListener = vi.fn().mockResolvedValue({ remove: vi.fn() });
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

// Importe NACH den Mocks
import {
  useFeatureAvailability,
  __resetFeatureAvailabilityForTests,
} from "../useFeatureAvailability";

// ─── Tests ─────────────────────────────────────────────────────────

describe("useFeatureAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNativePlatform.mockReturnValue(true);
    __resetFeatureAvailabilityForTests();
  });

  it("startet im fail-open / loading Zustand", () => {
    mockCheck.mockResolvedValue({
      googleServicesAvailable: false,
      googleServicesStatus: 9,
    });

    const { result } = renderHook(() => useFeatureAvailability());

    // Initial: loading + fail-open
    expect(result.current.loading).toBe(true);
    expect(result.current.googleServicesAvailable).toBe(true);
  });

  it("setzt googleServicesAvailable=false nach erfolgreicher Probe ohne Google Services", async () => {
    mockCheck.mockResolvedValue({
      googleServicesAvailable: false,
      googleServicesStatus: 9,
    });

    const { result } = renderHook(() => useFeatureAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.googleServicesAvailable).toBe(false);
    expect(result.current.probeFailed).toBe(false);
    expect(result.current.googleServicesStatus).toBe(9);
  });

  it("setzt googleServicesAvailable=true nach erfolgreicher Probe mit Google Services", async () => {
    mockCheck.mockResolvedValue({
      googleServicesAvailable: true,
      googleServicesStatus: 0,
    });

    const { result } = renderHook(() => useFeatureAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.googleServicesAvailable).toBe(true);
  });

  it("fail-open wenn Probe wirft (Plugin nicht registriert / Crash)", async () => {
    mockCheck.mockRejectedValue(new Error("PlayServicesAvailability does not have an implementation"));

    const { result } = renderHook(() => useFeatureAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.probeFailed).toBe(true);
    expect(result.current.googleServicesAvailable).toBe(true);
  });

  it("fail-open auf Web (kein nativer Platform)", async () => {
    mockIsNativePlatform.mockReturnValue(false);

    const { result } = renderHook(() => useFeatureAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.googleServicesAvailable).toBe(true);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("probt nur einmal pro Session, auch bei mehreren Hook-Mounts", async () => {
    mockCheck.mockResolvedValue({
      googleServicesAvailable: false,
      googleServicesStatus: 9,
    });

    const { result: result1 } = renderHook(() => useFeatureAvailability());
    const { result: result2 } = renderHook(() => useFeatureAvailability());

    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
      expect(result2.current.loading).toBe(false);
    });

    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(result1.current.googleServicesAvailable).toBe(false);
    expect(result2.current.googleServicesAvailable).toBe(false);
  });

  it("registriert einen appStateChange-Listener für Re-Probes", async () => {
    mockCheck.mockResolvedValue({
      googleServicesAvailable: true,
      googleServicesStatus: 0,
    });

    renderHook(() => useFeatureAvailability());

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith(
        "appStateChange",
        expect.any(Function),
      );
    });
  });
});
