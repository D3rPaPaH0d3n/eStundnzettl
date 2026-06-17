import React from "react";
import type { SyntheticEvent } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

// ─── Mocks (VOR dem EntryForm-Import) ───────────────────────

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

// framer-motion auf passthrough stellen (analog zu Dashboard.test.tsx).
vi.mock("framer-motion", () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      whileDrag: _whileDrag,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      onDragEnd: _onDragEnd,
      layout: _layout,
      layoutId: _layoutId,
      ...rest
    } = props;
    return rest;
  };
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
          React.createElement(tag, stripMotionProps(props), children);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

// TimePickerDrawer + SelectionDrawer als Passthrough-Dummies,
// damit wir sie bei Bedarf anhand ihrer Buttons testen können.
vi.mock("../TimePickerDrawer", () => ({
  __esModule: true,
  default: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="time-picker-drawer">{title}</div> : null,
}));

vi.mock("../SelectionDrawer", () => ({
  __esModule: true,
  default: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="selection-drawer">{title}</div> : null,
}));

vi.mock("../../plugins/Material3DatePickerPlugin", () => ({
  Material3DatePicker: {
    pickDate: vi.fn(),
  },
}));

// useWorkCodes: minimal-Mock mit einem Code
vi.mock("../../hooks/useWorkCodes", () => ({
  useWorkCodes: vi.fn(() => ({
    workCodes: [
      { id: 1, label: "Standard" },
      { id: 19, label: "Fahrtzeit" },
    ],
    hasAnyCodes: true,
    addCode: vi.fn(),
    updateCode: vi.fn(),
    deleteCode: vi.fn(),
  })),
}));

// Importe NACH den Mocks
import EntryForm from "../EntryForm";
import { Material3DatePicker } from "../../plugins/Material3DatePickerPlugin";
import type { Entry, UserData } from "../../types";

// ─── Test-Helpers ───────────────────────────────────────────

const makeUser = (overrides: Partial<UserData> = {}): UserData => ({
  name: "Max Muster",
  position: "Elektriker",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 510, 0],
  ...overrides,
});

interface RenderOptions {
  entryType?: string;
  lastWorkEntry?: Entry | null;
  onSubmit?: (e: SyntheticEvent) => void;
  onCancel?: () => void;
  setEntryType?: (type: string) => void;
  setCode?: (code: number) => void;
  setProject?: (project: string) => void;
  setStartTime?: (time: string) => void;
  setEndTime?: (time: string) => void;
  setPauseDuration?: (d: number) => void;
  setFormDate?: (date: string) => void;
  code?: number;
  project?: string;
  specialManualMode?: boolean;
  userData?: Partial<UserData>;
}

const renderForm = (opts: RenderOptions = {}) => {
  const onSubmit = opts.onSubmit ?? vi.fn();
  const onCancel = opts.onCancel ?? vi.fn();
  const setEntryType = opts.setEntryType ?? vi.fn();
  const setCode = opts.setCode ?? vi.fn();
  const setProject = opts.setProject ?? vi.fn();
  const setStartTime = opts.setStartTime ?? vi.fn();
  const setEndTime = opts.setEndTime ?? vi.fn();
  const setPauseDuration = opts.setPauseDuration ?? vi.fn();
  const setFormDate = opts.setFormDate ?? vi.fn();

  const result = render(
    <EntryForm
      onCancel={onCancel}
      onSubmit={onSubmit}
      entryType={opts.entryType ?? "work"}
      setEntryType={setEntryType}
      code={opts.code ?? 1}
      setCode={setCode}
      pauseDuration={30}
      setPauseDuration={setPauseDuration}
      formDate="2026-04-07"
      setFormDate={setFormDate}
      startTime="08:00"
      setStartTime={setStartTime}
      endTime="16:30"
      setEndTime={setEndTime}
      project={opts.project ?? ""}
      setProject={setProject}
      lastWorkEntry={opts.lastWorkEntry ?? null}
      existingProjects={[]}
      allEntries={[]}
      isEditing={false}
      isLiveEntry={false}
      userData={makeUser(opts.userData)}
      specialManualMode={opts.specialManualMode ?? false}
    />,
  );

  return {
    ...result,
    onSubmit,
    onCancel,
    setEntryType,
    setCode,
    setProject,
    setStartTime,
    setEndTime,
    setPauseDuration,
    setFormDate,
  };
};

// ─── Tests ──────────────────────────────────────────────────

describe("EntryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert ohne Crash", () => {
    const { container } = renderForm();
    expect(container.querySelector("form")).toBeTruthy();
  });

  it("zeigt Eintragstyp-Buttons (Arbeit/Fahrt/Krank/Urlaub/ZA)", () => {
    const { getByText } = renderForm();
    expect(getByText("Arbeit")).toBeTruthy();
    expect(getByText("Fahrt")).toBeTruthy();
    expect(getByText("Krank")).toBeTruthy();
    expect(getByText("Urlaub")).toBeTruthy();
    expect(getByText("ZA")).toBeTruthy();
  });

  it("zeigt Zeit-Felder (Start/Ende) für work-Typ", () => {
    const { getByText } = renderForm({ entryType: "work" });
    expect(getByText("Start")).toBeTruthy();
    expect(getByText("Ende")).toBeTruthy();
  });

  it("zeigt Pause+Tätigkeit für work, versteckt sie für drive", () => {
    const { queryByText, rerender } = renderForm({ entryType: "work" });
    expect(queryByText("Pause")).not.toBeNull();
    expect(queryByText("Tätigkeit")).not.toBeNull();

    rerender(
      <EntryForm
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        entryType="drive"
        setEntryType={vi.fn()}
        code={19}
        setCode={vi.fn()}
        pauseDuration={0}
        setPauseDuration={vi.fn()}
        formDate="2026-04-07"
        setFormDate={vi.fn()}
        startTime="08:00"
        setStartTime={vi.fn()}
        endTime="16:30"
        setEndTime={vi.fn()}
        project=""
        setProject={vi.fn()}
        lastWorkEntry={null}
        existingProjects={[]}
        allEntries={[]}
        isEditing={false}
        isLiveEntry={false}
        userData={makeUser()}
        specialManualMode={false}
      />,
    );
    expect(queryByText("Pause")).toBeNull();
    expect(queryByText("Tätigkeit")).toBeNull();
  });

  it("ruft onCancel bei Click auf 'Abbrechen'", () => {
    const { getByText, onCancel } = renderForm();
    fireEvent.click(getByText("Abbrechen"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ruft onSubmit bei Submit des Formulars", () => {
    const { container, onSubmit } = renderForm();
    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    if (form) fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("ruft setEntryType bei Click auf 'Urlaub'", () => {
    const { getByText, setEntryType } = renderForm();
    fireEvent.click(getByText("Urlaub"));
    expect(setEntryType).toHaveBeenCalledWith("vacation");
  });

  it("zeigt im Normalmodus Automatisch/Manuell für Sondertypen", () => {
    const { getByText } = renderForm({ entryType: "sick" });
    expect(getByText("Automatisch")).toBeTruthy();
    expect(getByText("Manuell")).toBeTruthy();
  });

  it("erzwingt im Simple Mode manuelle Zeiten für Sondertypen", () => {
    const { queryByText, getByText } = renderForm({
      entryType: "sick",
      specialManualMode: false,
      userData: { simpleMode: true },
    });

    expect(queryByText("Automatisch")).toBeNull();
    expect(queryByText("Manuell")).toBeNull();
    expect(getByText("Start")).toBeTruthy();
    expect(getByText("Ende")).toBeTruthy();
  });

  it("zeigt 'Wie zuletzt' nur wenn lastWorkEntry existiert", () => {
    const { queryByText } = renderForm({ lastWorkEntry: null });
    expect(queryByText("Wie zuletzt")).toBeNull();

    cleanup();
    const withLast = renderForm({
      lastWorkEntry: {
        id: 1,
        type: "work",
        date: "2026-04-06",
        start: "08:00",
        end: "16:30",
        pause: 30,
        project: "Projekt A",
        code: 1,
        netDuration: 480,
      },
    });
    expect(withLast.queryByText("Wie zuletzt")).not.toBeNull();
  });

  it("öffnet TimePickerDrawer bei Click auf Start-Button", () => {
    const { queryByTestId, getByText } = renderForm();
    expect(queryByTestId("time-picker-drawer")).toBeNull();
    // Der Start-Button enthält die Zeit-Anzeige "08:00"
    const startButton = getByText("08:00").closest("button");
    expect(startButton).toBeTruthy();
    if (startButton) fireEvent.click(startButton);
    expect(queryByTestId("time-picker-drawer")).not.toBeNull();
  });

  it("zeigt einen manuellen Datums-Fallback, wenn der native Picker fehlschlägt", async () => {
    vi.mocked(Material3DatePicker.pickDate).mockRejectedValueOnce(new Error("native picker unavailable"));
    const { getByText, findByText, container } = renderForm();

    const dateButton = getByText(/07\.04\.2026/).closest("button");
    expect(dateButton).toBeTruthy();
    if (dateButton) fireEvent.click(dateButton);

    expect(await findByText("Native Datumsauswahl nicht verfügbar – bitte Datum manuell wählen.")).toBeTruthy();
    expect(container.querySelector('input[type="date"]')).toBeTruthy();
  });

  it("matcht das gerenderte Markup für entryType 'work' (Snapshot)", () => {
    const { container } = renderForm({ entryType: "work" });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matcht das gerenderte Markup für entryType 'sick' (Snapshot)", () => {
    const { container } = renderForm({ entryType: "sick" });
    expect(container.firstChild).toMatchSnapshot();
  });
});
