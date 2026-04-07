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
import { isSQLiteActive } from "../../db/storageMode";
import { getSetting } from "../../db/repositories/settingsRepo";

// ─── Tests ──────────────────────────────────────────────────

describe("useLastCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(isSQLiteActive).mockReturnValue(false);
    vi.mocked(getSetting).mockResolvedValue(null);
  });

  it("returns WORK_CODE.DEFAULT (1) when nothing is stored and no codes exist", () => {
    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: false, workCodes: [] })
    );

    const code = result.current();
    expect(code).toBe(1); // WORK_CODE.DEFAULT
  });

  it("returns last code from localStorage when available", () => {
    localStorage.setItem("estundnzettl_last_code", "5");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    const code = result.current();
    expect(code).toBe(5);
  });

  it("returns first workCode id when no last code is stored but codes exist", () => {
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

  it("returns numeric value even when localStorage stores a string", () => {
    localStorage.setItem("estundnzettl_last_code", "19");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: false, workCodes: [] })
    );

    const code = result.current();
    expect(code).toBe(19);
    expect(typeof code).toBe("number");
  });

  it("prefers last code over first workCode when both exist", () => {
    localStorage.setItem("estundnzettl_last_code", "42");

    const { result } = renderHook(() =>
      useLastCode({
        hasAnyCodes: true,
        workCodes: [{ id: 1, label: "First" }],
      })
    );

    const code = result.current();
    expect(code).toBe(42);
  });

  it("loads last code from SQLite when SQLite is active", async () => {
    vi.mocked(isSQLiteActive).mockReturnValue(true);
    vi.mocked(getSetting).mockResolvedValue("99");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    // Wait for the async SQLite load effect to settle
    await vi.waitFor(() => {
      expect(getSetting).toHaveBeenCalledWith("last_code");
    });

    const code = result.current();
    expect(code).toBe(99);
  });

  it("falls back to localStorage when SQLite getSetting fails", async () => {
    vi.mocked(isSQLiteActive).mockReturnValue(true);
    vi.mocked(getSetting).mockRejectedValue(new Error("db error"));
    localStorage.setItem("estundnzettl_last_code", "15");

    const { result } = renderHook(() =>
      useLastCode({ hasAnyCodes: true, workCodes: [{ id: 1, label: "A" }] })
    );

    await vi.waitFor(() => {
      expect(getSetting).toHaveBeenCalled();
    });

    const code = result.current();
    expect(code).toBe(15);
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
