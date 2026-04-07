import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

const mockGetLastBackupMetadata = vi.fn().mockResolvedValue(null);
const mockInsertBackupMetadata = vi.fn().mockResolvedValue(undefined);

vi.mock("../../db/database", () => ({
  getDb: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../db/storageMode", () => ({
  setStorageMode: vi.fn(),
}));

vi.mock("../../db/repositories/backupMetadataRepo", () => ({
  getLastBackupMetadata: (...args: any[]) => mockGetLastBackupMetadata(...args),
  insertBackupMetadata: (...args: any[]) => mockInsertBackupMetadata(...args),
}));

vi.mock("../../utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useBackupMetadata } from "../useBackupMetadata";

// ─── Tests ──────────────────────────────────────────────────

describe("useBackupMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLastBackupMetadata.mockResolvedValue(null);
  });

  it("starts with lastBackup=null and isLoaded=false", () => {
    const { result } = renderHook(() => useBackupMetadata());

    expect(result.current.lastBackup).toBeNull();
    // isLoaded starts false before the async init completes
  });

  it("loads lastBackup from SQLite on mount", async () => {
    mockGetLastBackupMetadata.mockResolvedValue({
      timestamp: "2026-04-07T10:00:00.000Z",
      type: "manual",
    });

    const { result } = renderHook(() => useBackupMetadata());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.lastBackup).toBe("2026-04-07T10:00:00.000Z");
  });

  it("sets lastBackup=null when no metadata exists in SQLite", async () => {
    mockGetLastBackupMetadata.mockResolvedValue(null);

    const { result } = renderHook(() => useBackupMetadata());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.lastBackup).toBeNull();
  });

  it("updateLastBackup updates lastBackup state and inserts into SQLite", async () => {
    const { result } = renderHook(() => useBackupMetadata());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    const ts = "2026-04-07T12:30:00.000Z";
    await act(async () => {
      await result.current.updateLastBackup(ts);
    });

    expect(result.current.lastBackup).toBe(ts);
    expect(mockInsertBackupMetadata).toHaveBeenCalledWith({
      type: "manual",
      timestamp: ts,
    });
  });

  it("updateLastBackup uses current ISO timestamp when no argument given", async () => {
    const { result } = renderHook(() => useBackupMetadata());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.updateLastBackup();
    });

    expect(result.current.lastBackup).toBeTruthy();
    // Should be a valid ISO string
    expect(new Date(result.current.lastBackup!).toISOString()).toBe(result.current.lastBackup);
    expect(mockInsertBackupMetadata).toHaveBeenCalledOnce();
  });

  it("handles SQLite getLastBackupMetadata failure gracefully", async () => {
    mockGetLastBackupMetadata.mockRejectedValue(new Error("db error"));

    const { result } = renderHook(() => useBackupMetadata());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.lastBackup).toBeNull();
  });

  it("handles SQLite insertBackupMetadata failure gracefully", async () => {
    mockInsertBackupMetadata.mockRejectedValueOnce(new Error("insert error"));

    const { result } = renderHook(() => useBackupMetadata());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    // Should not throw
    await act(async () => {
      await result.current.updateLastBackup("2026-04-07T15:00:00.000Z");
    });

    // State is still updated optimistically
    expect(result.current.lastBackup).toBe("2026-04-07T15:00:00.000Z");
  });

  it("multiple updateLastBackup calls update to the latest value", async () => {
    const { result } = renderHook(() => useBackupMetadata());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.updateLastBackup("2026-04-01T08:00:00.000Z");
    });
    await act(async () => {
      await result.current.updateLastBackup("2026-04-07T18:00:00.000Z");
    });

    expect(result.current.lastBackup).toBe("2026-04-07T18:00:00.000Z");
    expect(mockInsertBackupMetadata).toHaveBeenCalledTimes(2);
  });
});
