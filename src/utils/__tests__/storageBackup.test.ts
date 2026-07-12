import { beforeEach, describe, it, expect, vi } from "vitest";

// Mocks für Capacitor- und DB-Abhängigkeiten, damit storageBackup im Test geladen werden kann.
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: vi.fn(), readFile: vi.fn(), mkdir: vi.fn(), getUri: vi.fn() },
  Directory: { Data: "DATA", Documents: "DOCUMENTS", Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));
vi.mock("../googleDrive", () => ({
  uploadOrUpdateFile: vi.fn(),
  getValidToken: vi.fn(),
  initGoogleAuth: vi.fn(),
}));
vi.mock("../nextcloudClient", () => ({
  uploadBackup: vi.fn(),
}));
vi.mock("../nextcloudSecret", () => ({
  getNextcloudAppPassword: vi.fn(),
}));
vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => true),
}));
vi.mock("../../db/repositories/settingsRepo", () => ({
  setSetting: vi.fn(),
  deleteSetting: vi.fn(),
  getSetting: vi.fn(),
}));
vi.mock("../../db/repositories/entriesRepo", () => ({
  getAllEntries: vi.fn(),
  bulkInsertEntries: vi.fn(),
}));
vi.mock("../../db/repositories/workCodesRepo", () => ({
  bulkReplaceWorkCodes: vi.fn(),
  getAllWorkCodes: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../db/repositories/attachmentsRepo", () => ({
  bulkReplaceAttachments: vi.fn(),
  bulkReplaceLabelSuggestions: vi.fn(),
  getAllAttachments: vi.fn().mockResolvedValue([]),
  getAllLabelSuggestions: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../db/snapshot", () => ({
  replaceFullSnapshot: vi.fn().mockResolvedValue(undefined),
}));

import {
  computeBackupChecksum,
  attachBackupChecksum,
  verifyBackupIntegrity,
  analyzeBackupData,
  applyBackup,
  composeBackupPayload,
  triggerManualBackup,
} from "../storageBackup";
import { uploadBackup } from "../nextcloudClient";
import { getNextcloudAppPassword } from "../nextcloudSecret";
import { getSetting } from "../../db/repositories/settingsRepo";
import { getAllEntries } from "../../db/repositories/entriesRepo";
import { getAllWorkCodes } from "../../db/repositories/workCodesRepo";
import { replaceFullSnapshot } from "../../db/snapshot";
import type { BackupAnalysisData } from "../../types";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("computeBackupChecksum", () => {
  it("liefert einen deterministischen SHA-256-Hex", async () => {
    const a = await computeBackupChecksum({ foo: 1, bar: [1, 2, 3] });
    const b = await computeBackupChecksum({ bar: [1, 2, 3], foo: 1 });
    expect(a).toBe(b); // Reihenfolge der Keys egal (kanonische Serialisierung)
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignoriert das `checksum`-Feld bei der Berechnung", async () => {
    const base = { entries: [{ id: 1 }] };
    const a = await computeBackupChecksum(base);
    const b = await computeBackupChecksum({ ...base, checksum: "wrong" });
    expect(a).toBe(b);
  });
});

describe("attachBackupChecksum", () => {
  it("fügt checksum + formatVersion hinzu", async () => {
    const payload: Record<string, unknown> = { entries: [{ id: 1 }] };
    await attachBackupChecksum(payload);
    expect(payload.formatVersion).toBe(2);
    expect(typeof payload.checksum).toBe("string");
    expect(payload.checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("verifyBackupIntegrity", () => {
  it("liefert 'unverified' wenn kein checksum-Feld vorhanden ist", async () => {
    expect(await verifyBackupIntegrity({ entries: [] })).toBe("unverified");
  });

  it("liefert 'verified' für ein unversehrtes Payload", async () => {
    const payload: Record<string, unknown> = { entries: [{ id: 1 }] };
    await attachBackupChecksum(payload);
    expect(await verifyBackupIntegrity(payload)).toBe("verified");
  });

  it("liefert 'mismatch' nach Manipulation der Daten", async () => {
    const payload: Record<string, unknown> = { entries: [{ id: 1 }] };
    await attachBackupChecksum(payload);
    (payload.entries as Array<{ id: number }>).push({ id: 2 }); // Tampering nach Checksum-Berechnung
    expect(await verifyBackupIntegrity(payload)).toBe("mismatch");
  });

  it("liefert 'mismatch' bei manipuliertem checksum-String", async () => {
    const payload: Record<string, unknown> = { entries: [{ id: 1 }] };
    await attachBackupChecksum(payload);
    payload.checksum = "0".repeat(64);
    expect(await verifyBackupIntegrity(payload)).toBe("mismatch");
  });
});

describe("analyzeBackupData", () => {
  it("lehnt null/undefined ab", async () => {
    expect((await analyzeBackupData(null)).valid).toBe(false);
    expect((await analyzeBackupData(undefined)).valid).toBe(false);
  });

  it("lehnt Daten ohne nutzbare Felder ab", async () => {
    expect((await analyzeBackupData({ foo: "bar" })).valid).toBe(false);
  });

  it("akzeptiert ein Payload mit Entries und markiert Legacy-Format als unverified", async () => {
    const result = await analyzeBackupData({
      entries: [
        { id: 1, date: "2024-01-01", type: "work" },
      ],
    });
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.entryCount).toBe(1);
    expect(result.integrity).toBe("unverified");
  });

  it("markiert ein Payload mit korrekter Prüfsumme als verified", async () => {
    const payload = {
      entries: [{ id: 1, date: "2024-01-01", type: "work" }],
    };
    await attachBackupChecksum(payload);
    const result = await analyzeBackupData(payload);
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.integrity).toBe("verified");
  });

  it("markiert manipulierte Payloads als mismatch", async () => {
    const payload = {
      entries: [{ id: 1, date: "2024-01-01", type: "work" }],
    };
    await attachBackupChecksum(payload);
    payload.entries[0].id = 999; // Manipulation
    const result = await analyzeBackupData(payload);
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.integrity).toBe("mismatch");
  });

  it("filtert ungültige Entries per normalizeEntries (Schutz gegen kaputte Exports)", async () => {
    const result = await analyzeBackupData({
      entries: [
        { id: 1, date: "2024-01-01", type: "work" },
        { id: 2, type: "work" }, // ohne date → ungültig
        null,
      ],
    });
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.entryCount).toBe(1);
  });

  it("keeps legacy backup attachment links aligned with string entry IDs", async () => {
    const result = await analyzeBackupData({
      entries: [
        { id: "legacy-301", date: "2024-01-01", type: "work" },
      ],
      attachments: [
        { id: "att-legacy-301", entryId: "legacy-301", label: "Beleg" },
      ],
    });

    if (!result.isValid) throw new Error("expected valid result");
    expect((result.entries as Array<{ id: string }>)[0].id).toBe("legacy-301");
    expect((result.attachments as Array<{ entryId: string }>)[0].entryId).toBe("legacy-301");
  });

  it("preserves a valid monthly target from a full backup", async () => {
    const result = await analyzeBackupData({
      user: { name: "Flex", simpleMode: true, monthlyTargetMinutes: 1800, workDays: [0, 0, 0, 0, 0, 0, 0] },
    });
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.settings).toMatchObject({ monthlyTargetMinutes: 1800 });
  });

  it("drops an invalid monthly target but keeps the legacy profile importable", async () => {
    const result = await analyzeBackupData({
      user: { name: "Legacy", monthlyTargetMinutes: "1800", legacyField: true },
    });
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.settings).toEqual({ name: "Legacy", legacyField: true });
  });
});

describe("analyzeBackupData — locale & theme (v7)", () => {
  it("extrahiert gültige locale und theme aus dem Payload", async () => {
    const result = await analyzeBackupData({
      entries: [{ id: 1, date: "2024-01-01", type: "work" }],
      locale: "at",
      theme: "dark",
    });
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.locale).toBe("at");
    expect(result.theme).toBe("dark");
  });

  it("verwirft ungültige locale/theme-Werte", async () => {
    const result = await analyzeBackupData({
      entries: [{ id: 1, date: "2024-01-01", type: "work" }],
      locale: "mars-base-1",
      theme: "neon",
    });
    if (!result.isValid) throw new Error("expected valid result");
    expect(result.locale).toBeNull();
    expect(result.theme).toBeNull();
  });
});

describe("composeBackupPayload", () => {
  it("baut einen vollständigen v7-Payload mit Checksum", async () => {
    const payload = await composeBackupPayload(
      {
        user: { name: "Demo" },
        entries: [{ id: 1, date: "2024-01-01", type: "work" } as never],
        workCodes: [{ id: 1, label: "Montage" } as never],
        attachmentLabels: ["Beleg"],
        calculationConfig: { weeklyTargetMinutes: 2310 } as never,
        locale: "at",
        theme: "dark",
      },
      "Test-Backup"
    );

    expect(payload.version).toBe("v7");
    expect(payload.workCodes).toEqual([{ id: 1, label: "Montage" }]);
    expect(payload.locale).toBe("at");
    expect(payload.theme).toBe("dark");
    expect(payload.attachmentLabels).toEqual(["Beleg"]);
    expect(payload.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyBackupIntegrity(payload)).toBe("verified");
  });
});

describe("applyBackup", () => {
  const makeAnalyzed = (overrides: Partial<BackupAnalysisData> = {}): BackupAnalysisData => ({
    valid: true,
    entryCount: 1,
    hasSettings: true,
    hasWorkCodes: true,
    hasAttachments: false,
    hasCalculationConfig: true,
    entries: [{ id: 1, date: "2024-01-01", type: "work" } as never],
    settings: { name: "Demo" },
    workCodes: [{ id: 1, label: "Montage" } as never],
    attachments: [],
    attachmentLabels: ["Beleg"],
    calculationConfig: { weeklyTargetMinutes: 2310 },
    locale: "at",
    theme: "dark",
    timestamp: null,
    integrity: "verified",
    ...overrides,
  });

  it("schreibt alle Sektionen inkl. locale/theme in den Snapshot", async () => {
    const ok = await applyBackup(makeAnalyzed());

    expect(ok).toBe(true);
    expect(replaceFullSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: expect.any(Array),
        userData: { name: "Demo" },
        workCodes: [{ id: 1, label: "Montage" }],
        attachmentLabels: ["Beleg"],
        calculationConfig: { weeklyTargetMinutes: 2310 },
        locale: "at",
        theme: "dark",
      })
    );
    // localStorage-Mirrors für Pre-Hydration-Reads
    expect(localStorage.getItem("estundnzettl_locale")).toBe("at");
    expect(localStorage.getItem("estundnzettl_theme")).toBe("dark");
  });

  it("liefert false wenn der Snapshot-Write fehlschlägt", async () => {
    vi.mocked(replaceFullSnapshot).mockRejectedValueOnce(new Error("db locked"));
    const ok = await applyBackup(makeAnalyzed());
    expect(ok).toBe(false);
  });
});

describe("triggerManualBackup", () => {
  it("liest das Nextcloud-App-Passwort aus Secure Storage statt aus Legacy-Storage", async () => {
    vi.mocked(getAllEntries).mockResolvedValue([{ id: 1, date: "2024-01-01", type: "work" } as never]);
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      const values: Record<string, unknown> = {
        user: { name: "Demo", position: "", photo: null, workDays: [] },
        calculationConfig: null,
        nextcloud_enabled: true,
        nextcloud_url: "https://cloud.invalid/remote.php/dav/files/demo",
        nextcloud_user: "demo-user",
      };
      return values[key] ?? null;
    });
    vi.mocked(getNextcloudAppPassword).mockResolvedValue("fixture-secure-pass");
    vi.mocked(uploadBackup).mockResolvedValue(true);

    const result = await triggerManualBackup();

    expect(result.nextcloud).toBe(true);
    expect(getNextcloudAppPassword).toHaveBeenCalledTimes(1);
    expect(uploadBackup).toHaveBeenCalledWith(
      "https://cloud.invalid/remote.php/dav/files/demo",
      "demo-user",
      "fixture-secure-pass",
      expect.objectContaining({ version: "v7" }),
    );
  });

  it("sichert workCodes im manuellen Backup mit", async () => {
    vi.mocked(getAllEntries).mockResolvedValue([{ id: 1, date: "2024-01-01", type: "work" } as never]);
    vi.mocked(getAllWorkCodes).mockResolvedValue([{ id: 7, label: "Montage" } as never]);
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      const values: Record<string, unknown> = {
        user: { name: "Demo" },
        locale: "at",
        theme: "dark",
        nextcloud_enabled: true,
        nextcloud_url: "https://cloud.invalid",
        nextcloud_user: "demo-user",
      };
      return values[key] ?? null;
    });
    vi.mocked(getNextcloudAppPassword).mockResolvedValue("fixture-secure-pass");
    vi.mocked(uploadBackup).mockResolvedValue(true);

    await triggerManualBackup();

    expect(uploadBackup).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        workCodes: [{ id: 7, label: "Montage" }],
        locale: "at",
        theme: "dark",
      }),
    );
  });
});
