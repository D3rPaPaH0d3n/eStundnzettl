import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

vi.mock("framer-motion", () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      variants: _variants,
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

vi.mock("../Dashboard", () => ({
  default: () => <main data-testid="dashboard-view" />,
}));

vi.mock("../EntryForm", () => ({
  default: () => <form data-testid="entry-form-view" />,
}));

vi.mock("../Settings", () => ({
  default: ({ theme, nextcloudEnabled }: { theme: string; nextcloudEnabled: boolean }) => (
    <section data-testid="settings-view" data-theme={theme} data-nextcloud={String(nextcloudEnabled)} />
  ),
}));

vi.mock("../PrintReport", () => ({
  default: () => <section data-testid="report-view" />,
}));

vi.mock("../LiveTimerOverlay", () => ({
  default: () => <aside data-testid="live-timer-overlay" />,
}));

vi.mock("../AppTour", () => ({
  default: () => <aside data-testid="app-tour" />,
}));

import ViewRouter from "../ViewRouter";
import type { Entry, FormState, UserData, TimerState } from "../../types";
import type { PeriodStatsResult } from "../../utils/timeCalculations";
import { getLocale } from "../../locales";
import { getDefaultCalculationConfig } from "../../utils/calculationConfig";

const userData: UserData = {
  name: "Max Muster",
  position: "Elektriker",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 510, 0],
};

const stats: PeriodStatsResult = {
  work: 0,
  drive: 0,
  holiday: 0,
  vacation: 0,
  sick: 0,
  timeComp: 0,
  totalIst: 0,
  totalTarget: 0,
  totalSaldo: 0,
  normalstunden: 0,
  overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
};

const timerState: TimerState = {
  isRunning: false,
  isPaused: false,
  startTime: null,
  pauseStartTime: null,
  accumulatedPause: 0,
};

const form: FormState = {
  formDate: "2026-04-15",
  setFormDate: vi.fn(),
  entryType: "work",
  setEntryType: vi.fn(),
  startTime: "08:00",
  setStartTime: vi.fn(),
  endTime: "16:00",
  setEndTime: vi.fn(),
  pauseDuration: 30,
  setPauseDuration: vi.fn(),
  project: "Projekt A",
  setProject: vi.fn(),
  code: 1,
  setCode: vi.fn(),
  editingEntry: null,
  setEditingEntry: vi.fn(),
  isLiveEntry: false,
  setIsLiveEntry: vi.fn(),
  specialManualMode: false,
  setSpecialManualMode: vi.fn(),
  resetForm: vi.fn(),
  startEdit: vi.fn(),
};

const locale = getLocale("at");
const calculationConfig = getDefaultCalculationConfig(locale, userData.workDays);

const makeProps = (view: string) => ({
  view,
  showOnboarding: false,
  currentDate: new Date("2026-04-15T00:00:00Z"),
  setCurrentDate: vi.fn(),
  changeMonth: vi.fn(),
  stats,
  overtime: 0,
  progressPercent: 0,
  groupedByWeek: [] as [number, Entry[]][],
  viewMonth: 3,
  viewYear: 2026,
  onEditEntry: vi.fn(),
  onDeleteEntry: vi.fn(),
  onManageAttachments: vi.fn(),
  attachmentCountByEntryId: new Map(),
  userData,
  workCodes: [{ id: 1, label: "Standard" }],
  hasAnyCodes: true,
  addCode: vi.fn(() => true),
  form,
  handleSaveEntry: vi.fn().mockResolvedValue(undefined),
  setView: vi.fn(),
  lastWorkEntry: null,
  uniqueProjects: [],
  entries: [] as Entry[],
  settings: {
    theme: "system" as const,
    setTheme: vi.fn(),
    autoBackup: false,
    setAutoBackup: vi.fn(),
    onTriggerManualBackup: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    onDeleteAll: vi.fn(),
    onCheckUpdate: vi.fn(),
    importEntries: vi.fn(),
    importWorkCodes: vi.fn(),
    setUserData: vi.fn(),
    nextcloudEnabled: true,
    nextcloudUrl: "https://cloud.example.test",
    nextcloudUser: "max",
    nextcloudPass: "secret",
    setNextcloudEnabled: vi.fn(),
    setNextcloudUrl: vi.fn(),
    setNextcloudUser: vi.fn(),
    setNextcloudPass: vi.fn(),
    pdfArchiveLastRun: null,
    pdfArchiveLastError: null,
    pdfArchivePerformRun: vi.fn().mockResolvedValue({ ok: true }),
    setLocale: vi.fn(),
    setCalculationConfig: vi.fn(),
    resetCalculationConfigToLocale: vi.fn(),
    workCodes: [{ id: 1, label: "Standard" }],
    workCodesLoading: false,
    hasAnyWorkCodes: true,
    addWorkCode: vi.fn(() => true),
    updateWorkCode: vi.fn(() => true),
    deleteWorkCode: vi.fn(),
    loadWorkCodePreset: vi.fn(() => true),
    availableWorkCodePresets: [],
    clearAllWorkCodes: vi.fn(),
  },
  entriesWithHolidays: [] as Entry[],
  attachments: [],
  readAttachmentFile: vi.fn().mockResolvedValue(""),
  timerState,
  startNewEntry: vi.fn(),
  handleStartLive: vi.fn(),
  handleStopLive: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  todayTarget: 0,
  showTour: false,
  handleTourClose: vi.fn(),
  locale,
  calculationConfig,
});

describe("ViewRouter", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the dashboard route with the live timer overlay", () => {
    const { getByTestId } = render(<ViewRouter {...makeProps("dashboard")} />);

    expect(getByTestId("dashboard-view")).toBeTruthy();
    expect(getByTestId("live-timer-overlay")).toBeTruthy();
  });

  it("renders add/edit, settings, and report routes", async () => {
    const { rerender, getByTestId } = render(<ViewRouter {...makeProps("add")} />);

    await waitFor(() => expect(getByTestId("entry-form-view")).toBeTruthy());

    rerender(<ViewRouter {...makeProps("settings")} />);
    await waitFor(() => expect(getByTestId("settings-view")).toBeTruthy());
    expect(getByTestId("settings-view").dataset.theme).toBe("system");
    expect(getByTestId("settings-view").dataset.nextcloud).toBe("true");

    rerender(<ViewRouter {...makeProps("report")} />);
    await waitFor(() => expect(getByTestId("report-view")).toBeTruthy());
  });
});
