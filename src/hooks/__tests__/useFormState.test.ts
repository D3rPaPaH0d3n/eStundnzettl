import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("../../utils.tsx", () => ({
  toLocalDateString: () => "2026-04-07",
}));

// Hook erst NACH den Mocks importieren
import { useFormState } from "../useFormState";

// ─── Tests ──────────────────────────────────────────────────

describe("useFormState", () => {
  const getDefaultCode = vi.fn(() => 1);

  beforeEach(() => {
    vi.clearAllMocks();
    getDefaultCode.mockReturnValue(1);
  });

  it("returns correct initial default values", () => {
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    expect(result.current.formDate).toBe("2026-04-07");
    expect(result.current.entryType).toBe("work");
    expect(result.current.startTime).toBe("06:00");
    expect(result.current.endTime).toBe("16:30");
    expect(result.current.pauseDuration).toBe(30);
    expect(result.current.project).toBe("");
    expect(result.current.code).toBe(1); // WORK_CODE.DEFAULT
    expect(result.current.editingEntry).toBeNull();
    expect(result.current.isLiveEntry).toBe(false);
    expect(result.current.specialManualMode).toBe(false);
  });

  it("setters update the corresponding state", () => {
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    act(() => result.current.setFormDate("2026-05-01"));
    expect(result.current.formDate).toBe("2026-05-01");

    act(() => result.current.setEntryType("sick"));
    expect(result.current.entryType).toBe("sick");

    act(() => result.current.setStartTime("09:00"));
    expect(result.current.startTime).toBe("09:00");

    act(() => result.current.setEndTime("17:30"));
    expect(result.current.endTime).toBe("17:30");

    act(() => result.current.setPauseDuration(45));
    expect(result.current.pauseDuration).toBe(45);

    act(() => result.current.setProject("Projekt Alpha"));
    expect(result.current.project).toBe("Projekt Alpha");

    act(() => result.current.setCode(19));
    expect(result.current.code).toBe(19);
  });

  it("resetForm restores all fields to defaults", () => {
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    // Modify several fields
    act(() => {
      result.current.setFormDate("2025-01-01");
      result.current.setEntryType("vacation");
      result.current.setStartTime("10:00");
      result.current.setEndTime("18:00");
      result.current.setPauseDuration(60);
      result.current.setProject("Something");
      result.current.setCode(99);
      result.current.setEditingEntry({ id: 1, type: "work", date: "2025-01-01", pause: 0, netDuration: 0 } as any);
      result.current.setIsLiveEntry(true);
      result.current.setSpecialManualMode(true);
    });

    // Reset
    act(() => result.current.resetForm());

    expect(result.current.formDate).toBe("2026-04-07");
    expect(result.current.entryType).toBe("work");
    expect(result.current.startTime).toBe("06:00");
    expect(result.current.endTime).toBe("16:30");
    expect(result.current.pauseDuration).toBe(30);
    expect(result.current.project).toBe("");
    expect(result.current.editingEntry).toBeNull();
    expect(result.current.isLiveEntry).toBe(false);
    expect(result.current.specialManualMode).toBe(false);
  });

  it("resetForm calls getDefaultCode for the code value", () => {
    getDefaultCode.mockReturnValue(42);
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    act(() => result.current.resetForm());

    expect(getDefaultCode).toHaveBeenCalled();
    expect(result.current.code).toBe(42);
  });

  it("startEdit with a work entry populates all work fields", () => {
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    act(() =>
      result.current.startEdit({
        id: 10,
        type: "work",
        date: "2026-03-15",
        start: "07:30",
        end: "15:45",
        pause: 45,
        code: 5,
        project: "Projekt A",
        netDuration: 450,
      })
    );

    expect(result.current.editingEntry).toEqual(expect.objectContaining({ id: 10 }));
    expect(result.current.entryType).toBe("work");
    expect(result.current.formDate).toBe("2026-03-15");
    expect(result.current.startTime).toBe("07:30");
    expect(result.current.endTime).toBe("15:45");
    expect(result.current.pauseDuration).toBe(45);
    expect(result.current.code).toBe(5);
    expect(result.current.project).toBe("Projekt A");
    expect(result.current.isLiveEntry).toBe(false);
    expect(result.current.specialManualMode).toBe(false);
  });

  it("startEdit with a drive entry (code=19) sets entryType to 'drive' and pause to 0", () => {
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    act(() =>
      result.current.startEdit({
        id: 20,
        type: "work",
        date: "2026-03-20",
        start: "06:00",
        end: "07:30",
        pause: 0,
        code: 19, // WORK_CODE.DRIVE
        project: "",
        netDuration: 90,
      })
    );

    expect(result.current.entryType).toBe("drive");
    expect(result.current.pauseDuration).toBe(0);
    expect(result.current.code).toBe(19);
  });

  it("startEdit with a sick entry (auto mode, no start/end) does NOT set specialManualMode", () => {
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    act(() =>
      result.current.startEdit({
        id: 30,
        type: "sick",
        date: "2026-04-01",
        start: null,
        end: null,
        pause: 0,
        project: "Krank",
        netDuration: 510,
      })
    );

    expect(result.current.entryType).toBe("sick");
    expect(result.current.specialManualMode).toBe(false);
    expect(result.current.pauseDuration).toBe(0);
  });

  it("startEdit with a vacation entry in manual mode (has start+end) sets specialManualMode=true", () => {
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    act(() =>
      result.current.startEdit({
        id: 40,
        type: "vacation",
        date: "2026-04-02",
        start: "08:00",
        end: "12:00",
        pause: 0,
        project: "Urlaub",
        netDuration: 240,
      })
    );

    expect(result.current.entryType).toBe("vacation");
    expect(result.current.specialManualMode).toBe(true);
    expect(result.current.startTime).toBe("08:00");
    expect(result.current.endTime).toBe("12:00");
  });

  it("startEdit with work entry missing code falls back to getDefaultCode", () => {
    getDefaultCode.mockReturnValue(7);
    const { result } = renderHook(() => useFormState({ getDefaultCode }));

    act(() =>
      result.current.startEdit({
        id: 50,
        type: "work",
        date: "2026-04-03",
        start: "08:00",
        end: "16:00",
        pause: 30,
        code: null,
        project: "",
        netDuration: 450,
      })
    );

    expect(result.current.code).toBe(7);
  });
});
