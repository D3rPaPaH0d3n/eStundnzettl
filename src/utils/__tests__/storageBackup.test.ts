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
  isSQLiteActive: () => false,
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
}));
vi.mock("../../db/repositories/attachmentsRepo", () => ({
  bulkReplaceAttachments: vi.fn(),
  bulkReplaceLabelSuggestions: vi.fn(),
}));

import {
  computeBackupChecksum,
  attachBackupChecksum,
  verifyBackupIntegrity,
  analyzeBackupData,
  triggerManualBackup,
} from "../storageBackup";
import { uploadBackup } from "../nextcloudClient";
import { getNextcloudAppPassword } from "../nextcloudSecret";

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
    expect(result.valid).toBe(true);
    expect(result.entryCount).toBe(1);
    expect(result.integrity).toBe("unverified");
  });

  it("markiert ein Payload mit korrekter Prüfsumme als verified", async () => {
    const payload = {
      entries: [{ id: 1, date: "2024-01-01", type: "work" }],
    };
    await attachBackupChecksum(payload);
    const result = await analyzeBackupData(payload);
    expect(result.valid).toBe(true);
    expect(result.integrity).toBe("verified");
  });

  it("markiert manipulierte Payloads als mismatch", async () => {
    const payload = {
      entries: [{ id: 1, date: "2024-01-01", type: "work" }],
    };
    await attachBackupChecksum(payload);
    payload.entries[0].id = 999; // Manipulation
    const result = await analyzeBackupData(payload);
    expect(result.valid).toBe(true);
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

    expect(result.valid).toBe(true);
    expect((result.entries as Array<{ id: string }>)[0].id).toBe("legacy-301");
    expect((result.attachments as Array<{ entryId: string }>)[0].entryId).toBe("legacy-301");
  });
});

describe("triggerManualBackup", () => {
  it("liest das Nextcloud-App-Passwort aus Secure Storage statt aus Legacy-Storage", async () => {
    localStorage.setItem("estundnzettl_nextcloud_enabled", "true");
    localStorage.setItem("estundnzettl_nextcloud_url", "https://cloud.invalid/remote.php/dav/files/demo");
    localStorage.setItem("estundnzettl_nextcloud_user", "demo-user");
    localStorage.setItem("estundnzettl_entries", JSON.stringify([{ id: 1, date: "2024-01-01", type: "work" }]));
    vi.mocked(getNextcloudAppPassword).mockResolvedValue("fixture-secure-pass");
    vi.mocked(uploadBackup).mockResolvedValue(undefined);

    const result = await triggerManualBackup();

    expect(result.nextcloud).toBe(true);
    expect(getNextcloudAppPassword).toHaveBeenCalledTimes(1);
    expect(uploadBackup).toHaveBeenCalledWith(
      "https://cloud.invalid/remote.php/dav/files/demo",
      "demo-user",
      "fixture-secure-pass",
      expect.objectContaining({ version: "v6" }),
    );
  });
});
