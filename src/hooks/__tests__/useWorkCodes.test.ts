import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../db/repositories/workCodesRepo", () => ({
  getAllWorkCodes: vi.fn().mockResolvedValue([]),
  insertWorkCode: vi.fn().mockResolvedValue(undefined),
  updateWorkCodeInDb: vi.fn().mockResolvedValue(undefined),
  deleteWorkCodeFromDb: vi.fn().mockResolvedValue(undefined),
  bulkReplaceWorkCodes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useWorkCodes } from "../useWorkCodes";

// ─── Tests ──────────────────────────────────────────────────

describe("useWorkCodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("loads default preset (allgemein) for new users with no stored codes", () => {
    const { result } = renderHook(() => useWorkCodes());

    // The allgemein preset has 5 codes
    expect(result.current.workCodes.length).toBe(5);
    expect(result.current.hasAnyCodes).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("loads existing codes from localStorage", () => {
    const storedCodes = [
      { id: 1, label: "Code A" },
      { id: 2, label: "Code B" },
    ];
    localStorage.setItem("estundnzettl_work_codes", JSON.stringify(storedCodes));

    const { result } = renderHook(() => useWorkCodes());

    expect(result.current.workCodes).toHaveLength(2);
    expect(result.current.workCodes[0].label).toBe("Code A");
  });

  it("hasAnyCodes is false when localStorage has empty array", () => {
    localStorage.setItem("estundnzettl_work_codes", JSON.stringify([]));

    const { result } = renderHook(() => useWorkCodes());

    expect(result.current.hasAnyCodes).toBe(false);
    expect(result.current.workCodes).toHaveLength(0);
  });

  it("addCode appends a new code with the next available id", () => {
    localStorage.setItem(
      "estundnzettl_work_codes",
      JSON.stringify([{ id: 1, label: "Existing" }])
    );

    const { result } = renderHook(() => useWorkCodes());

    let success: boolean | undefined;
    act(() => {
      success = result.current.addCode("New Code");
    });

    expect(success).toBe(true);
    expect(result.current.workCodes).toHaveLength(2);
    expect(result.current.workCodes[1].label).toBe("New Code");
    expect(result.current.workCodes[1].id).toBe(2);
  });

  it("addCode rejects empty or whitespace-only labels", () => {
    const { result } = renderHook(() => useWorkCodes());

    let success: boolean | undefined;
    act(() => {
      success = result.current.addCode("   ");
    });

    expect(success).toBe(false);
  });

  it("updateCode modifies a code's label", () => {
    localStorage.setItem(
      "estundnzettl_work_codes",
      JSON.stringify([{ id: 1, label: "Old Label" }])
    );

    const { result } = renderHook(() => useWorkCodes());

    let success: boolean | undefined;
    act(() => {
      success = result.current.updateCode(1, "New Label");
    });

    expect(success).toBe(true);
    expect(result.current.workCodes[0].label).toBe("New Label");
  });

  it("updateCode rejects empty label", () => {
    localStorage.setItem(
      "estundnzettl_work_codes",
      JSON.stringify([{ id: 1, label: "Old" }])
    );

    const { result } = renderHook(() => useWorkCodes());

    let success: boolean | undefined;
    act(() => {
      success = result.current.updateCode(1, "");
    });

    expect(success).toBe(false);
    expect(result.current.workCodes[0].label).toBe("Old");
  });

  it("deleteCode removes a code by id", () => {
    localStorage.setItem(
      "estundnzettl_work_codes",
      JSON.stringify([
        { id: 1, label: "A" },
        { id: 2, label: "B" },
      ])
    );

    const { result } = renderHook(() => useWorkCodes());

    act(() => result.current.deleteCode(1));

    expect(result.current.workCodes).toHaveLength(1);
    expect(result.current.workCodes[0].id).toBe(2);
  });

  it("loadWorkCodes replaces all codes with imported ones", () => {
    const { result } = renderHook(() => useWorkCodes());

    const imported = [
      { id: 10, label: "Imported A" },
      { id: 11, label: "Imported B" },
    ];

    let success: boolean | undefined;
    act(() => {
      success = result.current.loadWorkCodes(imported);
    });

    expect(success).toBe(true);
    expect(result.current.workCodes).toEqual(imported);
  });

  it("loadWorkCodes rejects non-array input", () => {
    const { result } = renderHook(() => useWorkCodes());

    let success: boolean | undefined;
    act(() => {
      success = result.current.loadWorkCodes("not-an-array" as any);
    });

    expect(success).toBe(false);
  });

  it("clearAllCodes removes every code", () => {
    localStorage.setItem(
      "estundnzettl_work_codes",
      JSON.stringify([{ id: 1, label: "A" }])
    );

    const { result } = renderHook(() => useWorkCodes());
    expect(result.current.workCodes).toHaveLength(1);

    act(() => result.current.clearAllCodes());

    expect(result.current.workCodes).toHaveLength(0);
    expect(result.current.hasAnyCodes).toBe(false);
  });

  it("sortCodes orders by id ascending", () => {
    localStorage.setItem(
      "estundnzettl_work_codes",
      JSON.stringify([
        { id: 3, label: "C" },
        { id: 1, label: "A" },
        { id: 2, label: "B" },
      ])
    );

    const { result } = renderHook(() => useWorkCodes());

    act(() => result.current.sortCodes());

    expect(result.current.workCodes.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("availablePresets returns all defined presets", () => {
    const { result } = renderHook(() => useWorkCodes());

    expect(result.current.availablePresets.length).toBeGreaterThanOrEqual(2);
    expect(result.current.availablePresets.map((p) => p.id)).toContain("allgemein");
  });

  it("persists workCodes changes to localStorage", () => {
    localStorage.setItem("estundnzettl_work_codes", JSON.stringify([]));

    const { result } = renderHook(() => useWorkCodes());

    act(() => result.current.addCode("Persisted"));

    const stored = JSON.parse(localStorage.getItem("estundnzettl_work_codes")!);
    expect(stored).toHaveLength(1);
    expect(stored[0].label).toBe("Persisted");
  });
});
