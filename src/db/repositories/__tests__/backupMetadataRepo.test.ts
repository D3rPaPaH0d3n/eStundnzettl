import { describe, it, expect, vi, beforeEach } from "vitest";

const runMock = vi.fn();
const queryMock = vi.fn();

vi.mock("../../database", () => ({
  run: (...args: unknown[]) => runMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
}));

import {
  getLastBackupMetadata,
  insertBackupMetadata,
  getBackupHistory,
  getBackupMetadataByType,
} from "../backupMetadataRepo";

beforeEach(() => {
  runMock.mockReset();
  queryMock.mockReset();
});

describe("getLastBackupMetadata", () => {
  it("liefert null bei leerer Tabelle", async () => {
    queryMock.mockResolvedValue([]);
    expect(await getLastBackupMetadata()).toBeNull();
  });

  it("liefert normalisiertes Metadata-Objekt", async () => {
    queryMock.mockResolvedValue([
      { id: 1, type: "nextcloud", timestamp: "2026-04-04T10:00:00Z", size_bytes: 1024, location: "/eStundnzettl" },
    ]);
    const meta = await getLastBackupMetadata();
    expect(meta).toEqual({
      id: 1,
      type: "nextcloud",
      timestamp: "2026-04-04T10:00:00Z",
      size_bytes: 1024,
      location: "/eStundnzettl",
    });
  });
});

describe("insertBackupMetadata", () => {
  it("füllt Default timestamp wenn fehlt", async () => {
    runMock.mockResolvedValue(undefined);
    await insertBackupMetadata({ type: "manual" });
    const values = runMock.mock.calls[0][1];
    expect(values[0]).toBe("manual");
    expect(typeof values[1]).toBe("string"); // ISO-String
    expect(values[2]).toBeNull();
    expect(values[3]).toBeNull();
  });

  it("nutzt Default type=manual wenn fehlt", async () => {
    runMock.mockResolvedValue(undefined);
    await insertBackupMetadata({ type: "manual" });
    expect(runMock.mock.calls[0][1][0]).toBe("manual");
  });

  it("respektiert alle Felder", async () => {
    runMock.mockResolvedValue(undefined);
    await insertBackupMetadata({
      type: "auto",
      timestamp: "2026-04-04T00:00:00Z",
      size_bytes: 2048,
      location: "Drive",
    });
    expect(runMock.mock.calls[0][1]).toEqual(["auto", "2026-04-04T00:00:00Z", 2048, "Drive"]);
  });
});

describe("getBackupHistory", () => {
  it("übergibt limit als Parameter", async () => {
    queryMock.mockResolvedValue([]);
    await getBackupHistory(5);
    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/LIMIT \?/i), [5]);
  });

  it("Default limit ist 10", async () => {
    queryMock.mockResolvedValue([]);
    await getBackupHistory();
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [10]);
  });
});

describe("getBackupMetadataByType", () => {
  it("filtert nach type und sortiert nach timestamp DESC", async () => {
    queryMock.mockResolvedValue([
      { id: 1, type: "nextcloud", timestamp: "2026-04-04", size_bytes: 100, location: "/a" },
    ]);
    const result = await getBackupMetadataByType("nextcloud");
    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/type = \?/i), ["nextcloud"]);
    expect(result).toHaveLength(1);
  });
});
