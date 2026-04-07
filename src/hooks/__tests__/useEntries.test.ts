import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

const mockGetAllEntries = vi.fn().mockResolvedValue([]);
const mockInsertEntry = vi.fn().mockResolvedValue(undefined);
const mockUpdateEntryInDb = vi.fn().mockResolvedValue(undefined);
const mockDeleteEntryFromDb = vi.fn().mockResolvedValue(undefined);
const mockDeleteAllEntriesFromDb = vi.fn().mockResolvedValue(undefined);
const mockBulkInsertEntries = vi.fn().mockResolvedValue(undefined);

vi.mock("../../db/database", () => ({
  getDb: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../db/storageMode", () => ({
  setStorageMode: vi.fn(),
}));

vi.mock("../../db/repositories/entriesRepo", () => ({
  getAllEntries: (...args: any[]) => mockGetAllEntries(...args),
  insertEntry: (...args: any[]) => mockInsertEntry(...args),
  updateEntryInDb: (...args: any[]) => mockUpdateEntryInDb(...args),
  deleteEntryFromDb: (...args: any[]) => mockDeleteEntryFromDb(...args),
  deleteAllEntriesFromDb: (...args: any[]) => mockDeleteAllEntriesFromDb(...args),
  bulkInsertEntries: (...args: any[]) => mockBulkInsertEntries(...args),
}));

vi.mock("../../db/migrate-from-localstorage", () => ({
  migrateAllToSQLite: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import toast from "react-hot-toast";
import { useEntries } from "../useEntries";

// ─── Helpers ────────────────────────────────────────────────

function makeEntry(overrides = {}): any {
  return {
    id: Date.now(),
    type: "work",
    date: "2026-04-07",
    start: "08:00",
    end: "16:00",
    pause: 30,
    code: 1,
    project: "",
    netDuration: 450,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe("useEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllEntries.mockResolvedValue([]);
  });

  it("starts with empty entries array", () => {
    const { result } = renderHook(() => useEntries());
    expect(result.current.entries).toEqual([]);
  });

  it("loads entries from SQLite on mount", async () => {
    const savedEntries = [makeEntry({ id: 1 }), makeEntry({ id: 2 })];
    mockGetAllEntries.mockResolvedValue(savedEntries);

    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(result.current.entries).toHaveLength(2);
    });
    expect(result.current.entries[0].id).toBe(1);
  });

  it("addEntry optimistically adds entry and persists to SQLite", async () => {
    const { result } = renderHook(() => useEntries());

    // Wait for init to complete
    await vi.waitFor(() => {
      expect(mockGetAllEntries).toHaveBeenCalled();
    });

    const entry = makeEntry({ id: 100 });

    await act(async () => {
      await result.current.addEntry(entry);
    });

    expect(result.current.entries).toContainEqual(entry);
    expect(mockInsertEntry).toHaveBeenCalledWith(entry);
  });

  it("addEntry reverts on SQLite failure and shows error toast", async () => {
    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(mockGetAllEntries).toHaveBeenCalled();
    });

    mockInsertEntry.mockRejectedValueOnce(new Error("write failed"));
    const entry = makeEntry({ id: 200 });

    await act(async () => {
      await result.current.addEntry(entry);
    });

    // The entry should be reverted
    expect(result.current.entries.find((e) => e.id === 200)).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("gespeichert"));
  });

  it("updateEntry optimistically updates and persists to SQLite", async () => {
    mockGetAllEntries.mockResolvedValue([makeEntry({ id: 1, project: "Old" })]);
    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });

    const updated = makeEntry({ id: 1, project: "New" });
    await act(async () => {
      await result.current.updateEntry(updated);
    });

    expect(result.current.entries[0].project).toBe("New");
    expect(mockUpdateEntryInDb).toHaveBeenCalledWith(updated);
  });

  it("updateEntry shows error toast on SQLite failure", async () => {
    mockGetAllEntries.mockResolvedValue([makeEntry({ id: 1, project: "Old" })]);

    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });

    mockUpdateEntryInDb.mockRejectedValueOnce(new Error("update failed"));

    await act(async () => {
      await result.current.updateEntry(makeEntry({ id: 1, project: "New" }));
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("aktualisiert"));
  });

  it("deleteEntry removes entry optimistically and persists", async () => {
    mockGetAllEntries.mockResolvedValue([makeEntry({ id: 1 }), makeEntry({ id: 2 })]);
    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(result.current.entries).toHaveLength(2);
    });

    await act(async () => {
      await result.current.deleteEntry(1);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe(2);
    expect(mockDeleteEntryFromDb).toHaveBeenCalledWith(1);
  });

  it("deleteEntry shows error toast on SQLite failure", async () => {
    mockGetAllEntries.mockResolvedValue([makeEntry({ id: 1 })]);

    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });

    mockDeleteEntryFromDb.mockRejectedValueOnce(new Error("delete failed"));

    await act(async () => {
      await result.current.deleteEntry(1);
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("gelöscht"));
  });

  it("deleteAllEntries clears all entries and persists", async () => {
    mockGetAllEntries.mockResolvedValue([makeEntry({ id: 1 }), makeEntry({ id: 2 })]);
    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(result.current.entries).toHaveLength(2);
    });

    await act(async () => {
      await result.current.deleteAllEntries();
    });

    expect(result.current.entries).toHaveLength(0);
    expect(mockDeleteAllEntriesFromDb).toHaveBeenCalledOnce();
  });

  it("importEntries replaces all entries and bulk-inserts into SQLite", async () => {
    const { result } = renderHook(() => useEntries());

    // Wait for init to complete
    await vi.waitFor(() => {
      expect(mockGetAllEntries).toHaveBeenCalled();
    });

    const newEntries = [makeEntry({ id: 10 }), makeEntry({ id: 11 }), makeEntry({ id: 12 })];

    await act(async () => {
      await result.current.importEntries(newEntries);
    });

    expect(result.current.entries).toHaveLength(3);
    expect(result.current.entries).toEqual(newEntries);
    expect(mockBulkInsertEntries).toHaveBeenCalledWith(newEntries);
  });

  it("importEntries reverts on SQLite failure", async () => {
    mockGetAllEntries.mockResolvedValue([makeEntry({ id: 1 })]);
    mockBulkInsertEntries.mockRejectedValueOnce(new Error("bulk failed"));

    const { result } = renderHook(() => useEntries());

    await vi.waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });

    await act(async () => {
      await result.current.importEntries([makeEntry({ id: 10 })]);
    });

    // Should revert to the backup (original entries)
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Import"));
  });
});
