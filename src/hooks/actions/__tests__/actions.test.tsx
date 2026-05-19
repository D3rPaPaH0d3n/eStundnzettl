import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SyntheticEvent } from "react";
import { renderHook, act } from "@testing-library/react";
import type { Entry, FormState, UserData, WorkCode } from "../../../types";

// ─── Module-Mocks ───────────────────────────────────────────
// Alle nativen Capacitor-Plugins und externen Side-Effects werden hier
// gemockt, damit die Hooks ohne echtes Gerät / Netzwerk laufen können.

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

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: vi.fn().mockResolvedValue(undefined) },
  Directory: { Cache: "Cache" },
  Encoding: { UTF8: "UTF8" },
}));

vi.mock("../../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn(),
}));
vi.mock("../../../db/repositories/entriesRepo", () => ({
  getAllEntries: vi.fn(),
}));
vi.mock("../../../db/repositories/workCodesRepo", () => ({
  getAllWorkCodes: vi.fn(),
}));

vi.mock("../../../utils/lastCode", () => ({
  saveLastCode: vi.fn(),
  clearLastCode: vi.fn().mockResolvedValue(undefined),
}));

// Hooks erst NACH den Mocks importieren.
import toast from "react-hot-toast";
import { useTimerActions } from "../useTimerActions";
import { useEntryActions } from "../useEntryActions";
import { useDeleteActions } from "../useDeleteActions";
import { useMiscActions } from "../useMiscActions";
import { useOnboardingActions } from "../useOnboardingActions";
import { saveLastCode, clearLastCode } from "../../../utils/lastCode";

// ─── Helpers ────────────────────────────────────────────────

function makeForm(overrides: Record<string, unknown> = {}): FormState {
  return {
    entryType: "work",
    formDate: "2026-04-04",
    startTime: "08:00",
    endTime: "16:00",
    pauseDuration: 30,
    project: "",
    code: 0,
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
  } as FormState;
}

const USER: UserData = {
  name: "Max",
  position: "Dev",
  photo: null,
  workDays: [8, 8, 8, 8, 8, 0, 0],
};

// ─── useTimerActions ────────────────────────────────────────

describe("useTimerActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("handleStartLive ruft startTimer auf und zeigt Success-Toast", () => {
    const startTimer = vi.fn();
    const { result } = renderHook(() =>
      useTimerActions({
        form: makeForm(),
        startTimer,
        stopTimer: vi.fn(),
        getDefaultCode: () => 0,
        setView: vi.fn(),
      })
    );
    act(() => result.current.handleStartLive());
    expect(startTimer).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Stempeluhr"));
  });

  it("handleStopLive schreibt Ergebnis ins Formular und wechselt View", () => {
    const form = makeForm();
    const start = new Date(2026, 3, 4, 9, 0);
    const end = new Date(2026, 3, 4, 17, 15);
    const stopTimer = vi.fn(() => ({ start, end, pause: 30 }));
    const setView = vi.fn();

    const { result } = renderHook(() =>
      useTimerActions({
        form,
        startTimer: vi.fn(),
        stopTimer,
        getDefaultCode: () => 0,
        setView,
      })
    );

    act(() => result.current.handleStopLive());

    expect(stopTimer).toHaveBeenCalledOnce();
    expect(form.setFormDate).toHaveBeenCalledWith("2026-04-04");
    expect(form.setStartTime).toHaveBeenCalledWith("09:00");
    expect(form.setEndTime).toHaveBeenCalledWith("17:15");
    expect(form.setPauseDuration).toHaveBeenCalledWith(30);
    expect(form.setIsLiveEntry).toHaveBeenCalledWith(true);
    expect(setView).toHaveBeenCalledWith("add");
  });
});

// ─── useEntryActions ────────────────────────────────────────

describe("useEntryActions", () => {
  beforeEach(() => vi.clearAllMocks());

  function mount({ form, entries = [], workCodes = [], addEntry, updateEntry, setView }: {
    form?: FormState;
    entries?: Entry[];
    workCodes?: WorkCode[];
    addEntry?: (entry: Entry) => Promise<void>;
    updateEntry?: (entry: Entry) => Promise<void>;
    setView?: (view: string) => void;
  } = {}) {
    return renderHook(() =>
      useEntryActions({
        form: form ?? makeForm(),
        entries,
        userData: USER,
        workCodes: workCodes.length
          ? workCodes
          : [
              { id: 70, label: "Arbeit" },
              { id: 19, label: "Fahrzeit" },
            ],
        addEntry: addEntry ?? vi.fn().mockResolvedValue(undefined),
        updateEntry: updateEntry ?? vi.fn().mockResolvedValue(undefined),
        getDefaultCode: () => 0,
        setView: setView ?? vi.fn(),
      })
    );
  }


  async function saveEntry(result: ReturnType<typeof mount>["result"]) {
    await act(async () => {
      await result.current.handleSaveEntry({ preventDefault: vi.fn() } as unknown as SyntheticEvent);
    });
  }

  it("getDefaultTimesForDate: Default 06:00/16:30 ohne vorige Einträge", () => {
    const { result } = mount();
    expect(result.current.getDefaultTimesForDate("2026-04-04")).toEqual({
      startTime: "06:00",
      endTime: "16:30",
    });
  });

  it("getDefaultTimesForDate: nutzt letzten End-Wert als neuen Start", () => {
    const entries = [
      { id: 1, type: "work", date: "2026-04-04", start: "08:00", end: "12:00" },
      { id: 2, type: "work", date: "2026-04-04", start: "13:00", end: "17:30" },
    ] as unknown as Entry[];
    const { result } = mount({ entries });
    expect(result.current.getDefaultTimesForDate("2026-04-04")).toEqual({
      startTime: "17:30",
      endTime: "17:30",
    });
  });

  it("startEdit lädt Entry ins Formular", () => {
    const form = makeForm();
    const { result } = mount({ form });
    act(() =>
      result.current.startEdit({
        id: 42,
        type: "work",
        date: "2026-04-04",
        start: "07:00",
        end: "15:00",
        pause: 45,
        code: 70,
        project: "Projekt X",
        netDuration: 405,
      } as Entry)
    );
    expect(form.setEditingEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
    expect(form.setStartTime).toHaveBeenCalledWith("07:00");
    expect(form.setEndTime).toHaveBeenCalledWith("15:00");
    expect(form.setPauseDuration).toHaveBeenCalledWith(45);
    expect(form.setProject).toHaveBeenCalledWith("Projekt X");
  });

  it("handleSaveEntry: Endzeit == Startzeit → Fehler-Toast, kein Add", async () => {
    const addEntry = vi.fn();
    const form = makeForm({ startTime: "10:00", endTime: "10:00" });
    const { result } = mount({ form, addEntry });
    await saveEntry(result);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Start"));
    expect(addEntry).not.toHaveBeenCalled();
  });

  it("handleSaveEntry: Nachtschicht 22:00-06:00 wird gespeichert (8h minus 30min Default-Pause)", async () => {
    const addEntry = vi.fn();
    const form = makeForm({ startTime: "22:00", endTime: "06:00" });
    const { result } = mount({ form, addEntry });
    await saveEntry(result);
    expect(addEntry).toHaveBeenCalledOnce();
    const saved = addEntry.mock.calls[0][0];
    expect(saved.start).toBe("22:00");
    expect(saved.end).toBe("06:00");
    expect(saved.netDuration).toBe(8 * 60 - 30);
  });

  it("handleSaveEntry: erkennt Zeitüberschneidung und blockiert Speichern", async () => {
    const addEntry = vi.fn();
    const entries = [
      { id: 1, type: "work", date: "2026-04-04", start: "08:00", end: "12:00", code: 70 },
    ] as unknown as Entry[];
    const form = makeForm({ startTime: "10:00", endTime: "14:00" });
    const { result } = mount({ form, entries, addEntry });
    await saveEntry(result);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Zeitüberschneidung"),
      expect.any(Object)
    );
    expect(addEntry).not.toHaveBeenCalled();
  });

  it("handleSaveEntry: gültiger Work-Entry → addEntry + saveLastCode", async () => {
    const addEntry = vi.fn();
    const form = makeForm({ startTime: "08:00", endTime: "16:30", code: 42 });
    const { result } = mount({
      form,
      addEntry,
      workCodes: [{ id: 42, label: "Custom" }],
    });
    await saveEntry(result);
    expect(addEntry).toHaveBeenCalledOnce();
    const saved = addEntry.mock.calls[0][0];
    expect(saved.type).toBe("work");
    expect(saved.start).toBe("08:00");
    expect(saved.end).toBe("16:30");
    expect(saved.netDuration).toBeGreaterThan(0);
    expect(saveLastCode).toHaveBeenCalledWith(42);
  });

  it("handleSaveEntry: Krank im Auto-Modus → netDuration aus Sollzeit, start/end null", async () => {
    const addEntry = vi.fn();
    const form = makeForm({ entryType: "sick", specialManualMode: false });
    const { result } = mount({ form, addEntry });
    await saveEntry(result);
    expect(addEntry).toHaveBeenCalledOnce();
    const saved = addEntry.mock.calls[0][0];
    expect(saved.type).toBe("sick");
    expect(saved.start).toBeNull();
    expect(saved.end).toBeNull();
    expect(saved.project).toBe("Krank");
    // Samstag 2026-04-04 → USER.workDays[6] = 0, daher 0 Minuten
    expect(saved.netDuration).toBe(0);
  });

  it("handleSaveEntry: Urlaub im Manual-Modus → netDuration aus Start/Ende, Zeiten persistiert", async () => {
    const addEntry = vi.fn();
    const form = makeForm({
      entryType: "vacation",
      startTime: "08:00",
      endTime: "12:00",
      specialManualMode: true,
    });
    const { result } = mount({ form, addEntry });
    await saveEntry(result);
    expect(addEntry).toHaveBeenCalledOnce();
    const saved = addEntry.mock.calls[0][0];
    expect(saved.type).toBe("vacation");
    expect(saved.start).toBe("08:00");
    expect(saved.end).toBe("12:00");
    expect(saved.project).toBe("Urlaub");
    expect(saved.netDuration).toBe(240);
  });

  it("handleSaveEntry: Manual-Special blockiert bei Überschneidung mit bestehendem Work-Eintrag", async () => {
    const addEntry = vi.fn();
    const entries = [
      { id: 1, type: "work", date: "2026-04-04", start: "09:00", end: "11:00", code: 70 },
    ] as unknown as Entry[];
    const form = makeForm({
      entryType: "sick",
      startTime: "08:00",
      endTime: "12:00",
      specialManualMode: true,
    });
    const { result } = mount({ form, entries, addEntry });
    await saveEntry(result);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Zeitüberschneidung"),
      expect.any(Object)
    );
    expect(addEntry).not.toHaveBeenCalled();
  });

  it("startEdit: Manual-Special-Eintrag setzt specialManualMode=true", () => {
    const form = makeForm();
    const { result } = mount({ form });
    act(() =>
      result.current.startEdit({
        id: 77,
        type: "sick",
        date: "2026-04-04",
        start: "08:00",
        end: "12:00",
        pause: 0,
        project: "Krank",
        code: null,
        netDuration: 240,
      } as Entry)
    );
    expect(form.setSpecialManualMode).toHaveBeenCalledWith(true);
    expect(form.setStartTime).toHaveBeenCalledWith("08:00");
    expect(form.setEndTime).toHaveBeenCalledWith("12:00");
  });

  it("handleSaveEntry: editingEntry → updateEntry statt addEntry", async () => {
    const addEntry = vi.fn();
    const updateEntry = vi.fn();
    const form = makeForm({
      startTime: "08:00",
      endTime: "16:30",
      editingEntry: { id: 99, type: "work" } as unknown as Entry,
    });
    const { result } = mount({ form, addEntry, updateEntry });
    await saveEntry(result);
    expect(updateEntry).toHaveBeenCalledOnce();
    expect(updateEntry.mock.calls[0][0].id).toBe(99);
    expect(addEntry).not.toHaveBeenCalled();
  });
});

// ─── useDeleteActions ───────────────────────────────────────

describe("useDeleteActions", () => {
  beforeEach(() => vi.clearAllMocks());

  function mount(overrides: Record<string, unknown> = {}) {
    return renderHook(() =>
      useDeleteActions({
        entries: [{ id: 1, type: "work", date: "2026-04-04" }] as unknown as Entry[],
        userData: USER,
        deleteEntry: vi.fn(),
        deleteAllEntries: vi.fn(),
        removeAttachmentsForEntry: vi.fn().mockResolvedValue(undefined),
        setUserData: vi.fn(),
        setDeleteTarget: vi.fn(),
        ...overrides,
      })
    );
  }

  it("type='single' löscht den einzelnen Eintrag und entfernt Attachments", async () => {
    const deleteEntry = vi.fn();
    const removeAttachmentsForEntry = vi.fn().mockResolvedValue(undefined);
    const setDeleteTarget = vi.fn();
    const { result } = mount({ deleteEntry, removeAttachmentsForEntry, setDeleteTarget });

    await act(async () => {
      await result.current.executeDelete({ type: "single", id: 7 });
    });

    expect(removeAttachmentsForEntry).toHaveBeenCalledWith(7);
    expect(deleteEntry).toHaveBeenCalledWith(7);
    expect(setDeleteTarget).toHaveBeenCalledWith(null);
  });

  it("type='all' schreibt Sicherheits-Backup und setzt User zurück", async () => {
    const deleteAllEntries = vi.fn();
    const setUserData = vi.fn();
    const { result } = mount({ deleteAllEntries, setUserData });

    await act(async () => {
      await result.current.executeDelete({ type: "all" });
    });

    const { Filesystem } = await import("@capacitor/filesystem");
    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "estundnzettl_pre_delete_backup.json" })
    );
    expect(deleteAllEntries).toHaveBeenCalledOnce();
    expect(setUserData).toHaveBeenCalledWith(expect.objectContaining({ name: "" }));
    expect(clearLastCode).toHaveBeenCalled();
  });

  it("type='all' bleibt funktionsfähig, wenn Filesystem.writeFile fehlschlägt", async () => {
    const { Filesystem } = await import("@capacitor/filesystem");
    (Filesystem.writeFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));
    const deleteAllEntries = vi.fn();
    const { result } = mount({ deleteAllEntries });

    await act(async () => {
      await result.current.executeDelete({ type: "all" });
    });

    expect(deleteAllEntries).toHaveBeenCalledOnce(); // Reset trotzdem durchlaufen
  });
});

// ─── useMiscActions ─────────────────────────────────────────

describe("useMiscActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("changeMonth verschiebt das Datum um delta Monate", () => {
    const setCurrentDate = vi.fn();
    const { result } = renderHook(() => useMiscActions({ setCurrentDate }));
    act(() => result.current.changeMonth(2));
    const updater = setCurrentDate.mock.calls[0][0];
    expect(typeof updater).toBe("function");
    const prev = new Date(2026, 0, 15);
    const next = updater(prev);
    expect(next.getMonth()).toBe(2); // Januar + 2 = März
  });

  it("handleManualUpdateCheck bricht bei Offline ab", async () => {
    const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, "onLine");
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => useMiscActions({ setCurrentDate: vi.fn() }));
    await act(async () => {
      await result.current.handleManualUpdateCheck();
    });
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Internet"));

    if (originalOnLine) Object.defineProperty(window.navigator, "onLine", originalOnLine);
  });
});

// ─── useOnboardingActions ───────────────────────────────────

describe("useOnboardingActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  it("lädt User & Entries aus localStorage wenn kein SQLite aktiv", async () => {
    localStorage.setItem(
      "estundnzettl_user",
      JSON.stringify({ name: "Max", workDays: [8, 8, 8, 8, 8, 0, 0] })
    );
    localStorage.setItem(
      "estundnzettl_entries",
      JSON.stringify([{ id: 1, type: "work", date: "2026-04-04" }])
    );

    const setUserData = vi.fn();
    const importEntries = vi.fn();
    const setShowOnboarding = vi.fn();
    const setView = vi.fn();

    const { result } = renderHook(() =>
      useOnboardingActions({
        setUserData,
        setAutoBackup: vi.fn(),
        importEntries,
        setShowOnboarding,
        setView,
      })
    );

    await act(async () => {
      await result.current.handleOnboardingFinish();
    });

    expect(setUserData).toHaveBeenCalledWith(expect.objectContaining({ name: "Max" }));
    expect(importEntries).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Object)]));
    expect(setShowOnboarding).toHaveBeenCalledWith(false);
    expect(setView).toHaveBeenCalledWith("dashboard");
  });

  it("übersteht korruptes localStorage ohne zu crashen", async () => {
    localStorage.setItem("estundnzettl_user", "{not-json");
    localStorage.setItem("estundnzettl_entries", "also-not-json");

    const setUserData = vi.fn();
    const importEntries = vi.fn();
    const { result } = renderHook(() =>
      useOnboardingActions({
        setUserData,
        setAutoBackup: vi.fn(),
        importEntries,
        setShowOnboarding: vi.fn(),
        setView: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleOnboardingFinish();
    });

    // Keine Exception — Setter wurden nicht mit korrupten Daten aufgerufen
    expect(setUserData).not.toHaveBeenCalled();
    expect(importEntries).not.toHaveBeenCalled();
  });
});
