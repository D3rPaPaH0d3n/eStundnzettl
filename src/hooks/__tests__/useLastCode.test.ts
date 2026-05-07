import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
}));

import { useLastCode } from "../useLastCode";
import { getSetting } from "../../db/repositories/settingsRepo";
import { isSQLiteActive } from "../../db/storageMode";

// ─── Tests ──────────────────────────────────────────────────

describe("useLastCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getSetting).mockResolvedValue(null);
    vi.mocked(isSQLiteActive).mockReturnValue(true);
  });

  it("returns WORK_CODE.DEFAULT (1) when nothing is stored and no codes exist", () => {
    vi.mocked(isSQLiteActive).mockReturnValue(false);
    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: false, workCodes: [] })
    );

    const code = result.current();
    expect(code).toBe(1); // WORK_CODE.DEFAULT
  });

  it("returns last code from SQLite when available", async () => {
    vi.mocked(getSetting).mockResolvedValue("5");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    await vi.waitFor(() => expect(result.current()).toBe(5));
  });

  it("returns first workCode id when no last code is stored but codes exist", () => {
    vi.mocked(isSQLiteActive).mockReturnValue(false);
    const { result } = renderHook(() =>
      useLastCode({
        hasAnyCodes: true,
        workCodes: [
          { id: 7, label: "Code Seven" },
          { id: 8, label: "Code Eight" },
        ],
      })
    );

    const code = result.current();
    expect(code).toBe(7);
  });

  it("returns numeric value even when SQLite stores a string", async () => {
    vi.mocked(getSetting).mockResolvedValue("19");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: false, workCodes: [] })
    );

    await vi.waitFor(() => expect(result.current()).toBe(19));
    const code = result.current();
    expect(code).toBe(19);
    expect(typeof code).toBe("number");
  });

  it("prefers last code over first workCode when both exist", async () => {
    vi.mocked(getSetting).mockResolvedValue("42");

    const { result } = renderHook(() =>
      useLastCode({
        hasAnyCodes: true,
        workCodes: [{ id: 1, label: "First" }],
      })
    );

    await vi.waitFor(() => expect(result.current()).toBe(42));
  });

  it("loads last code from SQLite when SQLite is active", async () => {
    vi.mocked(getSetting).mockResolvedValue("99");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    // Wait for the async SQLite load effect to settle
    await vi.waitFor(() => expect(result.current()).toBe(99));
  });

  it("falls back to first workCode when SQLite getSetting fails", async () => {
    vi.mocked(getSetting).mockRejectedValue(new Error("db error"));

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    await vi.waitFor(() => {
      expect(getSetting).toHaveBeenCalled();
    });

    expect(result.current()).toBe(1);
  });

  it("reads last code from localStorage when SQLite is inactive", async () => {
    vi.mocked(isSQLiteActive).mockReturnValue(false);
    localStorage.setItem("estundnzettl_last_code", "77");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    await vi.waitFor(() => expect(result.current()).toBe(77));
    expect(getSetting).not.toHaveBeenCalled();
  });

  it("getDefaultCode is a callable function", () => {
    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    expect(typeof result.current).toBe("function");
    const code = result.current();
    expect(typeof code).toBe("number");
  });
});
