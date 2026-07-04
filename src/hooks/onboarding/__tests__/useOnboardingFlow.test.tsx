import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { TFunction } from "i18next";

// ─── Mocks (vor dem Hook-Import) ────────────────────────────

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });
  return { default: fn };
});

vi.mock("../../../utils/storageBackup", () => ({
  applyBackup: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../db/repositories/settingsRepo", () => ({
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../db/repositories/workCodesRepo", () => ({
  bulkReplaceWorkCodes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../db/repositories/entriesRepo", () => ({
  bulkInsertEntries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../utils/nextcloudSecret", () => ({
  storeNextcloudAppPassword: vi.fn().mockResolvedValue({ status: "ready" }),
}));

vi.mock("../../../utils/demoData", () => ({
  DEMO_DATA: {
    user: { name: "Demo", position: "", photo: null, workDays: [0, 462, 462, 462, 462, 462, 0] },
    workCodes: [],
    generateEntries: () => [],
  },
}));

import toast from "react-hot-toast";
import { applyBackup } from "../../../utils/storageBackup";
import { setSetting } from "../../../db/repositories/settingsRepo";
import { useOnboardingFlow } from "../useOnboardingFlow";
import type { BackupAnalysisData } from "../../../types";

// ─── Helper ─────────────────────────────────────────────────

const t = ((key: string) => key) as TFunction;

const makeProps = () => ({
  onComplete: vi.fn(),
  setUserData: vi.fn(),
  importEntries: vi.fn(),
  importWorkCodes: vi.fn(),
  setCloudSyncEnabled: vi.fn(),
  setLocalBackupEnabled: vi.fn(),
  setTheme: vi.fn(),
  setLocale: vi.fn(),
  setCalculationConfig: vi.fn(),
});

const makeRestoreData = (overrides: Partial<BackupAnalysisData> = {}): BackupAnalysisData => ({
  valid: true,
  entryCount: 1,
  hasSettings: true,
  hasWorkCodes: false,
  hasAttachments: false,
  hasCalculationConfig: false,
  entries: [{ id: 1, type: "work", date: "2026-01-05", start: "08:00", end: "16:00", pause: 30, netDuration: 450 }],
  settings: {
    name: "Markus",
    company: "ACME",
    position: "Techniker",
    photo: null,
    workDays: [0, 480, 480, 480, 480, 480, 0],
  },
  workCodes: [],
  attachments: [],
  attachmentLabels: [],
  calculationConfig: null,
  locale: null,
  theme: null,
  timestamp: "2026-01-05T10:00:00.000Z",
  integrity: "verified",
  ...overrides,
});

const renderFlow = () => {
  const props = makeProps();
  const view = renderHook(() => useOnboardingFlow(t, props, null));
  return { ...view, props };
};

// ─── Tests ──────────────────────────────────────────────────

describe("useOnboardingFlow — finishSetup im Restore-Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applyBackup).mockResolvedValue(true);
  });

  it("persistiert das User-Profil aus dem Backup statt des leeren formData", async () => {
    const { result, props } = renderFlow();

    act(() => {
      result.current.handleStartRestore();
      result.current.setRestoreData(makeRestoreData());
    });

    await act(async () => {
      await result.current.finishSetup();
    });

    // Backup wurde eingespielt
    expect(applyBackup).toHaveBeenCalledTimes(1);

    // Der Settings-Key "user" enthält das Profil aus dem Backup —
    // nicht den leeren Wizard-formData (Profil-Steps werden im
    // Restore-Flow übersprungen).
    const userWrite = vi.mocked(setSetting).mock.calls.find(([key]) => key === "user");
    expect(userWrite).toBeDefined();
    expect(userWrite?.[1]).toMatchObject({ name: "Markus", company: "ACME" });

    // App-State bekommt ebenfalls das restaurierte Profil, damit der
    // useSettings-Persist-Effekt nicht nachträglich ein leeres Profil
    // über den restaurierten Stand schreibt.
    expect(props.setUserData).toHaveBeenCalledWith(expect.objectContaining({ name: "Markus" }));

    // applyBackup lief VOR dem "user"-Write (Schreib-Reihenfolge gegen
    // den Persist-Effekt in useSettings).
    const applyOrder = vi.mocked(applyBackup).mock.invocationCallOrder[0];
    const userWriteIndex = vi.mocked(setSetting).mock.calls.findIndex(([key]) => key === "user");
    const userWriteOrder = vi.mocked(setSetting).mock.invocationCallOrder[userWriteIndex];
    expect(applyOrder).toBeLessThan(userWriteOrder);

    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("onboarding.toast.restoreSuccess");
  });

  it("bricht mit Fehler-Toast ab wenn applyBackup fehlschlägt", async () => {
    vi.mocked(applyBackup).mockResolvedValue(false);
    const { result, props } = renderFlow();

    act(() => {
      result.current.handleStartRestore();
      result.current.setRestoreData(makeRestoreData());
    });

    await act(async () => {
      await result.current.finishSetup();
    });

    expect(toast.error).toHaveBeenCalledWith("onboarding.toast.restoreError");
    expect(setSetting).not.toHaveBeenCalled();
    expect(props.setUserData).not.toHaveBeenCalled();
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it("übernimmt WorkCodes, CalculationConfig, Locale und Theme aus dem Backup in den State", async () => {
    const { result, props } = renderFlow();
    const restoreData = makeRestoreData({
      hasWorkCodes: true,
      workCodes: [{ id: 1, label: "Montage" }],
      calculationConfig: { weeklyTargetMinutes: 2310 },
      locale: "at",
      theme: "dark",
    });

    act(() => {
      result.current.handleStartRestore();
      result.current.setRestoreData(restoreData);
    });

    await act(async () => {
      await result.current.finishSetup();
    });

    expect(props.importWorkCodes).toHaveBeenCalledWith([{ id: 1, label: "Montage" }]);
    expect(props.setCalculationConfig).toHaveBeenCalledWith(
      expect.objectContaining({ weeklyTargetMinutes: 2310 })
    );
    expect(props.setLocale).toHaveBeenCalledWith("at");
    expect(props.setTheme).toHaveBeenCalledWith("dark");
  });

  it("nutzt formData-Profil wenn das Backup keine User-Daten enthält", async () => {
    const { result, props } = renderFlow();
    const restoreData = { ...makeRestoreData(), hasSettings: false, settings: null };

    act(() => {
      result.current.handleStartRestore();
      result.current.setRestoreData(restoreData);
    });

    await act(async () => {
      await result.current.finishSetup();
    });

    const userWrite = vi.mocked(setSetting).mock.calls.find(([key]) => key === "user");
    expect(userWrite?.[1]).toMatchObject({ name: "" });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("useOnboardingFlow — finishSetup für neue User", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persistiert das formData-Profil und ruft applyBackup nicht auf", async () => {
    const { result, props } = renderFlow();

    act(() => {
      result.current.handleStartNew();
      result.current.setFormData((p) => ({ ...p, name: "Neu Nutzer", localeId: "at" }));
    });

    await act(async () => {
      await result.current.finishSetup();
    });

    expect(applyBackup).not.toHaveBeenCalled();
    const userWrite = vi.mocked(setSetting).mock.calls.find(([key]) => key === "user");
    expect(userWrite?.[1]).toMatchObject({ name: "Neu Nutzer" });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("onboarding.toast.welcome");
  });
});
