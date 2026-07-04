import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });
  return { default: fn };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../utils/storageBackup", () => ({
  verifyBackupIntegrity: vi.fn().mockResolvedValue("verified"),
}));

vi.mock("../../schemas/entry", () => ({
  filterValidEntries: vi.fn((entries: unknown[]) => entries),
}));

import { useImport } from "../useImport";
import type { ImportSnapshot } from "../../db/snapshot";

// ─── Helper ─────────────────────────────────────────────────

const makeImportEvent = (payload: unknown) => {
  const file = new File([JSON.stringify(payload)], "backup.json", {
    type: "application/json",
  });
  return { target: { files: [file], value: "" } } as unknown as Event;
};

const renderImport = () => {
  const importSnapshot = vi.fn().mockResolvedValue(undefined);
  const view = renderHook(() => useImport({ importSnapshot }));
  return { ...view, importSnapshot };
};

// ─── Tests ──────────────────────────────────────────────────

describe("useImport — vollständiger Restore (v7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stellt alle Backup-Sektionen wieder her", async () => {
    const { result, importSnapshot } = renderImport();

    result.current.handleImport(
      makeImportEvent({
        entries: [{ id: 1, date: "2026-01-05", type: "work" }],
        user: { name: "Markus" },
        workCodes: [{ id: 1, label: "Montage" }],
        calculationConfig: { weeklyTargetMinutes: 2310 },
        attachments: [{ id: "att_1", entryId: 1, label: "Beleg" }],
        attachmentLabels: ["Beleg", 42, "Rechnung"],
        locale: "at",
        theme: "dark",
      })
    );

    await vi.waitFor(() => expect(importSnapshot).toHaveBeenCalledTimes(1));

    const snapshot: ImportSnapshot = importSnapshot.mock.calls[0][0];
    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.userData).toMatchObject({ name: "Markus" });
    expect(snapshot.workCodes).toEqual([{ id: 1, label: "Montage" }]);
    expect(snapshot.calculationConfig).toMatchObject({ weeklyTargetMinutes: 2310 });
    expect(snapshot.attachments).toHaveLength(1);
    // Nicht-String-Labels werden gefiltert
    expect(snapshot.attachmentLabels).toEqual(["Beleg", "Rechnung"]);
    expect(snapshot.locale).toBe("at");
    expect(snapshot.theme).toBe("dark");
  });

  it("verwirft ungültige locale/theme-Werte statt sie zu importieren", async () => {
    const { result, importSnapshot } = renderImport();

    result.current.handleImport(
      makeImportEvent({
        entries: [{ id: 1, date: "2026-01-05", type: "work" }],
        locale: "mars-base-1",
        theme: "neon",
      })
    );

    await vi.waitFor(() => expect(importSnapshot).toHaveBeenCalledTimes(1));

    const snapshot: ImportSnapshot = importSnapshot.mock.calls[0][0];
    expect(snapshot.locale).toBeUndefined();
    expect(snapshot.theme).toBeUndefined();
  });

  it("lässt ältere Backups ohne v7-Felder unverändert durch (kein implizites Löschen)", async () => {
    const { result, importSnapshot } = renderImport();

    result.current.handleImport(
      makeImportEvent({
        entries: [{ id: 1, date: "2026-01-05", type: "work" }],
        user: { name: "Markus" },
      })
    );

    await vi.waitFor(() => expect(importSnapshot).toHaveBeenCalledTimes(1));

    const snapshot: ImportSnapshot = importSnapshot.mock.calls[0][0];
    expect(snapshot.workCodes).toBeUndefined();
    expect(snapshot.calculationConfig).toBeUndefined();
    expect(snapshot.attachments).toBeUndefined();
    expect(snapshot.attachmentLabels).toBeUndefined();
    expect(snapshot.locale).toBeUndefined();
    expect(snapshot.theme).toBeUndefined();
  });
});
