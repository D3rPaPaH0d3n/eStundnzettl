import type { SyntheticEvent } from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks (VOR Hook-Import) ───────────────────────────

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
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

const mockSaveLastCode = vi.fn();
vi.mock("../../../utils/lastCode", () => ({
  saveLastCode: (...args: unknown[]) => mockSaveLastCode(...args),
}));

import toast from "react-hot-toast";
import { Haptics } from "@capacitor/haptics";
import { useEntryActions } from "../useEntryActions";
import { WORK_CODE } from "../../constants";
import type { Entry, FormState, UserData, WorkCode } from "../../../types";

// ─── Test-Helpers ─────────────────────────────────────────────

const makeUser = (overrides: Partial<UserData> = {}): UserData => ({
  name: "Max Muster",
  position: "Elektriker",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 510, 0],
  ...overrides,
});

const makeWorkCodes = (): WorkCode[] => [
  { id: 1, label: "Standard" },
  { id: WORK_CODE.DRIVE, label: "Fahrzeit" },
];

const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 100,
  type: "work",
  date: "2026-04-07",
  start: "08:00",
  end: "16:00",
  pause: 30,
  code: 1,
  netDuration: 450,
  project: "Projekt A",
  ...overrides,
});

interface FormStateOverrides {
  formDate?: string;
  entryType?: string;
  startTime?: string;
  endTime?: string;
  pauseDuration?: number;
  project?: string;
  code?: number;
  editingEntry?: Entry | null;
  specialManualMode?: boolean;
}

const makeForm = (overrides: FormStateOverrides = {}): FormState => ({
  formDate: overrides.formDate ?? "2026-04-07",
  setFormDate: vi.fn(),
  entryType: overrides.entryType ?? "work",
  setEntryType: vi.fn(),
  startTime: overrides.startTime ?? "08:00",
  setStartTime: vi.fn(),
  endTime: overrides.endTime ?? "16:00",
  setEndTime: vi.fn(),
  pauseDuration: overrides.pauseDuration ?? 30,
  setPauseDuration: vi.fn(),
  project: overrides.project ?? "Projekt A",
  setProject: vi.fn(),
  code: overrides.code ?? 1,
  setCode: vi.fn(),
  editingEntry: overrides.editingEntry ?? null,
  setEditingEntry: vi.fn(),
  isLiveEntry: false,
  setIsLiveEntry: vi.fn(),
  specialManualMode: overrides.specialManualMode ?? false,
  setSpecialManualMode: vi.fn(),
  resetForm: vi.fn(),
  startEdit: vi.fn(),
});

type EntryAction = (entry: Entry) => Promise<void>;
type EntryActionMock = Mock<EntryAction>;

interface RenderOptions {
  form?: FormState;
  entries?: Entry[];
  userData?: UserData;
  workCodes?: WorkCode[];
  addEntry?: EntryActionMock;
  updateEntry?: EntryActionMock;
}

const renderActions = (opts: RenderOptions = {}) => {
  const form = opts.form ?? makeForm();
  const addEntry: EntryActionMock = opts.addEntry ?? vi.fn<EntryAction>().mockResolvedValue(undefined);
  const updateEntry: EntryActionMock = opts.updateEntry ?? vi.fn<EntryAction>().mockResolvedValue(undefined);
  const setView = vi.fn();
  const getDefaultCode = vi.fn(() => 1);

  const { result } = renderHook(() =>
    useEntryActions({
      form,
      entries: opts.entries ?? [],
      userData: opts.userData ?? makeUser(),
      workCodes: opts.workCodes ?? makeWorkCodes(),
      addEntry,
      updateEntry,
      getDefaultCode,
      setView,
    }),
  );

  return { result, form, addEntry, updateEntry, setView, getDefaultCode };
};

const fakeEvent = () => ({ preventDefault: vi.fn() }) as unknown as SyntheticEvent;

const saveEntry = async (result: ReturnType<typeof renderActions>["result"]) => {
  await act(async () => {
    await result.current.handleSaveEntry(fakeEvent());
  });
};

// ─── Tests ────────────────────────────────────────────────────

describe("useEntryActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefaultTimesForDate", () => {
    it("liefert 06:00 / 16:30 wenn an dem Tag noch kein Eintrag existiert", () => {
      const { result } = renderActions({ entries: [] });
      const { startTime, endTime } = result.current.getDefaultTimesForDate("2026-04-07");
      expect(startTime).toBe("06:00");
      expect(endTime).toBe("16:30");
    });

    it("nimmt das Ende des letzten work-Eintrags des Tages als Default-Start", () => {
      const entries = [
        makeEntry({ id: 1, date: "2026-04-07", end: "12:00" }),
        makeEntry({ id: 2, date: "2026-04-07", end: "14:30" }),
      ];
      const { result } = renderActions({ entries });
      const { startTime, endTime } = result.current.getDefaultTimesForDate("2026-04-07");
      expect(startTime).toBe("14:30");
      expect(endTime).toBe("14:30");
    });

    it("ignoriert Einträge anderer Tage", () => {
      const entries = [makeEntry({ id: 1, date: "2026-04-06", end: "23:00" })];
      const { result } = renderActions({ entries });
      const { startTime } = result.current.getDefaultTimesForDate("2026-04-07");
      expect(startTime).toBe("06:00");
    });

    it("ignoriert Einträge ohne 'end'", () => {
      const entries = [makeEntry({ id: 1, date: "2026-04-07", end: undefined })];
      const { result } = renderActions({ entries });
      const { startTime } = result.current.getDefaultTimesForDate("2026-04-07");
      expect(startTime).toBe("06:00");
    });
  });

  describe("startNewEntry", () => {
    it("setzt das Formular auf Default-Werte und wechselt zur Add-View", () => {
      const form = makeForm();
      const { result, setView, getDefaultCode } = renderActions({ form });

      act(() => result.current.startNewEntry());

      expect(form.setEditingEntry).toHaveBeenCalledWith(null);
      expect(form.setEntryType).toHaveBeenCalledWith("work");
      expect(form.setPauseDuration).toHaveBeenCalledWith(30);
      expect(form.setProject).toHaveBeenCalledWith("");
      expect(form.setIsLiveEntry).toHaveBeenCalledWith(false);
      expect(getDefaultCode).toHaveBeenCalled();
      expect(form.setCode).toHaveBeenCalledWith(1);
      expect(setView).toHaveBeenCalledWith("add");
    });
  });

  describe("startEdit", () => {
    it("setzt entryType='drive' bei Drive-Code-Eintrag", () => {
      const form = makeForm();
      const { result } = renderActions({ form });
      const driveEntry = makeEntry({ type: "work", code: WORK_CODE.DRIVE });

      act(() => result.current.startEdit(driveEntry));

      expect(form.setEntryType).toHaveBeenCalledWith("drive");
      expect(form.setPauseDuration).toHaveBeenCalledWith(0);
    });

    it("setzt specialManualMode=true bei sick-Eintrag mit start/end", () => {
      const form = makeForm();
      const { result } = renderActions({ form });
      const manualSick = makeEntry({
        type: "sick",
        start: "08:00",
        end: "12:00",
      });

      act(() => result.current.startEdit(manualSick));

      expect(form.setEntryType).toHaveBeenCalledWith("sick");
      expect(form.setSpecialManualMode).toHaveBeenCalledWith(true);
      expect(form.setStartTime).toHaveBeenCalledWith("08:00");
      expect(form.setEndTime).toHaveBeenCalledWith("12:00");
    });

    it("setzt specialManualMode=false bei sick-Eintrag ohne start/end", () => {
      const form = makeForm();
      const { result } = renderActions({ form });
      const simpleSick = makeEntry({
        type: "sick",
        start: undefined,
        end: undefined,
      });

      act(() => result.current.startEdit(simpleSick));

      expect(form.setSpecialManualMode).toHaveBeenCalledWith(false);
    });

    it("übernimmt project und code bei work-Eintrag", () => {
      const form = makeForm();
      const { result } = renderActions({ form });
      const entry = makeEntry({ project: "Baustelle Süd", code: 5 });

      act(() => result.current.startEdit(entry));

      expect(form.setProject).toHaveBeenCalledWith("Baustelle Süd");
      expect(form.setCode).toHaveBeenCalledWith(5);
    });
  });

  describe("handleSaveEntry — Validierung", () => {
    it("verweigert Speichern wenn start == end (toast, kein addEntry)", async () => {
      const form = makeForm({ startTime: "10:00", endTime: "10:00" });
      const { result, addEntry } = renderActions({ form });

      await saveEntry(result);

      expect(toast.error).toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it("speichert Nachtschicht 22:00-06:00 als 8h-Eintrag", async () => {
      const form = makeForm({ startTime: "22:00", endTime: "06:00", pauseDuration: 0 });
      const { result, addEntry } = renderActions({ form });

      await saveEntry(result);

      expect(addEntry).toHaveBeenCalledOnce();
      const saved = addEntry.mock.calls[0][0];
      expect(saved.start).toBe("22:00");
      expect(saved.end).toBe("06:00");
      expect(saved.netDuration).toBe(8 * 60);
    });

    it("verweigert Speichern bei Überlappung mit existierendem Eintrag", async () => {
      const form = makeForm({
        formDate: "2026-04-07",
        startTime: "09:00",
        endTime: "11:00",
      });
      const overlap = makeEntry({
        id: 999,
        date: "2026-04-07",
        start: "10:00",
        end: "12:00",
      });
      const { result, addEntry } = renderActions({ form, entries: [overlap] });

      await saveEntry(result);

      expect(toast.error).toHaveBeenCalled();
      expect(Haptics.impact).toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it("erlaubt Speichern eines bearbeiteten Eintrags an seiner eigenen Slot-Zeit", async () => {
      const editing = makeEntry({
        id: 42,
        date: "2026-04-07",
        start: "10:00",
        end: "12:00",
      });
      const form = makeForm({
        formDate: "2026-04-07",
        startTime: "10:00",
        endTime: "12:00",
        editingEntry: editing,
      });
      const { result, updateEntry } = renderActions({
        form,
        entries: [editing],
      });

      await saveEntry(result);

      expect(updateEntry).toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("handleSaveEntry — Speichern", () => {
    it("ruft addEntry mit korrekten Feldern für neuen work-Eintrag", async () => {
      const form = makeForm({
        formDate: "2026-04-07",
        startTime: "08:00",
        endTime: "16:00",
        pauseDuration: 30,
        project: "Projekt A",
        code: 1,
      });
      const { result, addEntry } = renderActions({ form });

      await saveEntry(result);

      expect(addEntry).toHaveBeenCalledTimes(1);
      const saved = addEntry.mock.calls[0][0];
      expect(saved.type).toBe("work");
      expect(saved.date).toBe("2026-04-07");
      expect(saved.start).toBe("08:00");
      expect(saved.end).toBe("16:00");
      expect(saved.pause).toBe(30);
      expect(saved.project).toBe("Projekt A");
      expect(saved.code).toBe(1);
      expect(saved.netDuration).toBeGreaterThan(0);
    });

    it("ruft updateEntry statt addEntry, wenn editingEntry gesetzt ist", async () => {
      const editing = makeEntry({ id: 7 });
      const form = makeForm({ editingEntry: editing });
      const { result, addEntry, updateEntry } = renderActions({ form });

      await saveEntry(result);

      expect(addEntry).not.toHaveBeenCalled();
      expect(updateEntry).toHaveBeenCalledTimes(1);
      expect(updateEntry.mock.calls[0][0].id).toBe(7);
    });

    it("speichert Drive-Eintrag mit type='work', code=DRIVE, pause=0", async () => {
      const form = makeForm({
        entryType: "drive",
        startTime: "08:00",
        endTime: "09:00",
        pauseDuration: 30, // wird auf 0 gesetzt für drive
      });
      const { result, addEntry } = renderActions({ form });

      await saveEntry(result);

      const saved = addEntry.mock.calls[0][0];
      expect(saved.type).toBe("work");
      expect(saved.code).toBe(WORK_CODE.DRIVE);
      expect(saved.pause).toBe(0);
    });

    it("speichert automatischen vacation-Eintrag im Normalmodus ohne Zeiten", async () => {
      const form = makeForm({ entryType: "vacation", specialManualMode: false });
      const { result, addEntry } = renderActions({ form });

      await saveEntry(result);

      const saved = addEntry.mock.calls[0][0];
      expect(saved.type).toBe("vacation");
      expect(saved.start).toBeNull();
      expect(saved.end).toBeNull();
      expect(saved.pause).toBe(0);
      expect(saved.code).toBeNull();
    });

    it.each([
      ["sick", "Krank"],
      ["vacation", "Urlaub"],
      ["time_comp", "Zeitausgleich"],
    ])("speichert %s im Simple Mode immer mit manuellen Zeiten", async (entryType, label) => {
      const form = makeForm({
        entryType,
        specialManualMode: false,
        startTime: "08:00",
        endTime: "16:00",
        pauseDuration: 30,
      });
      const { result, addEntry } = renderActions({
        form,
        userData: makeUser({ simpleMode: true }),
      });

      await saveEntry(result);

      const saved = addEntry.mock.calls[0][0];
      expect(saved.type).toBe(entryType);
      expect(saved.start).toBe("08:00");
      expect(saved.end).toBe("16:00");
      expect(saved.pause).toBe(0);
      expect(saved.code).toBeNull();
      expect(saved.project).toBe(label);
      expect(saved.netDuration).toBe(480);
    });

    it("persistiert last_code via settingsRepo für Standard-Codes", async () => {
      const form = makeForm({ code: 5 });
      const { result } = renderActions({ form });

      await saveEntry(result);

      expect(mockSaveLastCode).toHaveBeenCalledWith(5);
    });

    it("persistiert KEIN last_code für Drive-Code", async () => {
      const form = makeForm({ entryType: "drive" });
      const { result } = renderActions({ form });

      await saveEntry(result);

      expect(mockSaveLastCode).not.toHaveBeenCalled();
    });

    it("setzt View nach erfolgreichem Speichern auf 'dashboard'", async () => {
      const form = makeForm();
      const { result, setView } = renderActions({ form });

      await saveEntry(result);

      expect(setView).toHaveBeenCalledWith("dashboard");
      expect(toast.success).toHaveBeenCalled();
    });

    it("räumt das Formular nach Erfolg auf", async () => {
      const form = makeForm();
      const { result } = renderActions({ form });

      await saveEntry(result);

      expect(form.setEditingEntry).toHaveBeenCalledWith(null);
      expect(form.setProject).toHaveBeenCalledWith("");
      expect(form.setEntryType).toHaveBeenCalledWith("work");
    });

    it("zeigt bei addEntry-Fehler keinen Erfolg und bleibt in der sicheren Formular-View", async () => {
      const form = makeForm();
      const addEntry = vi.fn().mockRejectedValue(new Error("insert failed"));
      const { result, setView } = renderActions({ form, addEntry });

      await saveEntry(result);

      expect(addEntry).toHaveBeenCalledOnce();
      expect(toast.success).not.toHaveBeenCalled();
      expect(setView).not.toHaveBeenCalledWith("dashboard");
      expect(form.setEditingEntry).not.toHaveBeenCalledWith(null);
      expect(form.setProject).not.toHaveBeenCalledWith("");
      expect(mockSaveLastCode).not.toHaveBeenCalled();
    });

    it("zeigt bei updateEntry-Fehler keinen Erfolg und verlässt die Bearbeitung nicht", async () => {
      const editing = makeEntry({ id: 7 });
      const form = makeForm({ editingEntry: editing });
      const updateEntry = vi.fn().mockRejectedValue(new Error("update failed"));
      const { result, setView } = renderActions({ form, updateEntry });

      await saveEntry(result);

      expect(updateEntry).toHaveBeenCalledOnce();
      expect(toast.success).not.toHaveBeenCalled();
      expect(setView).not.toHaveBeenCalledWith("dashboard");
      expect(form.setEditingEntry).not.toHaveBeenCalledWith(null);
    });
  });
});
