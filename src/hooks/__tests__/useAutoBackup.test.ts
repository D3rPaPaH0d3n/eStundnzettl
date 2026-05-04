import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

vi.mock("@capacitor/app", () => {
  let stateCallback: ((state: { isActive: boolean }) => void) | null = null;
  return {
    App: {
      addListener: vi.fn((_event: string, cb: (state: { isActive: boolean }) => void) => {
        stateCallback = cb;
        return Promise.resolve({ remove: vi.fn() });
      }),
    },
    // expose for tests
    __getCallback: () => stateCallback,
  };
});

vi.mock("react-hot-toast", () => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: fn };
});

vi.mock("../../utils/googleDrive", () => ({
  uploadOrUpdateFile: vi.fn().mockResolvedValue(undefined),
  getValidToken: vi.fn().mockResolvedValue({ accessToken: "test-token" }),
}));

vi.mock("../../utils/storageBackup", () => ({
  writeBackupFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../utils/nextcloudClient", () => ({
  uploadBackup: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../utils/nextcloudSecret", () => ({
  getNextcloudAppPassword: vi.fn(async () => localStorage.getItem("estundnzettl_nextcloud_pass") || ""),
}));

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("../../utils/errorUtils", () => ({
  getErrorMessage: vi.fn((e: unknown, fallback: string) => e instanceof Error ? e.message : fallback),
}));

import toast from "react-hot-toast";
import { writeBackupFile } from "../../utils/storageBackup";
import { uploadOrUpdateFile, getValidToken } from "../../utils/googleDrive";
import { uploadBackup as ncUploadBackup } from "../../utils/nextcloudClient";
import { logger } from "../../utils/logger";
import { getNextcloudAppPassword } from "../../utils/nextcloudSecret";
import { useAutoBackup } from "../useAutoBackup";
import type { Entry, UserData } from "../../types";

// ─── Helpers ────────────────────────────────────────────────

const USER: UserData = {
  name: "Max",
  position: "Dev",
  photo: null,
  workDays: [0, 510, 510, 510, 510, 270, 0],
};

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    type: "work",
    date: "2026-04-06",
    start: "08:00",
    end: "16:30",
    pause: 30,
    netDuration: 480,
    code: 1,
    project: null,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe("useAutoBackup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getValidToken).mockResolvedValue({ accessToken: "test-token" });
    vi.mocked(uploadOrUpdateFile).mockResolvedValue(undefined);
    vi.mocked(writeBackupFile).mockResolvedValue(undefined);
    vi.mocked(getNextcloudAppPassword).mockImplementation(async () => localStorage.getItem("estundnzettl_nextcloud_pass") || "");
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("returns backupFailCount", () => {
    const entries = [makeEntry()];
    const { result } = renderHook(() => useAutoBackup(entries, USER, true));
    expect(typeof result.current.backupFailCount).toBe("number");
  });

  it("does not trigger backup when entries are empty", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    renderHook(() => useAutoBackup([], USER, true));
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(writeBackupFile).not.toHaveBeenCalled();
  });

  it("triggers local backup after debounce when local backup is enabled", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(writeBackupFile).toHaveBeenCalledWith(
      "estundnzettl_backup.json",
      expect.objectContaining({
        entries: expect.any(Array),
        user: expect.any(Object),
        version: "v6",
      })
    );
  });

  it("triggers cloud backup when cloud sync is enabled", async () => {
    localStorage.setItem("estundnzettl_cloud_sync_enabled", "true");
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(getValidToken).toHaveBeenCalled();
    expect(uploadOrUpdateFile).toHaveBeenCalledWith(
      "test-token",
      "estundnzettl_backup.json",
      expect.objectContaining({ entries: expect.any(Array) })
    );
  });

  it("does not backup when all backup options are disabled and isEnabled=false", async () => {
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, false));

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(writeBackupFile).not.toHaveBeenCalled();
    expect(uploadOrUpdateFile).not.toHaveBeenCalled();
  });

  it("debounces backup — rapid changes only trigger one backup", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    const entries1 = [makeEntry({ id: 1 })];
    const entries2 = [makeEntry({ id: 1 }), makeEntry({ id: 2 })];

    const { rerender } = renderHook(
      ({ entries }) => useAutoBackup(entries, USER, true),
      { initialProps: { entries: entries1 } }
    );

    // Advance partially, then change data
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    rerender({ entries: entries2 });

    // The first timer was cleared, new 2000ms timer starts
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Should only be called once (the debounced call)
    expect(writeBackupFile).toHaveBeenCalledTimes(1);
  });

  it("skips Auto-Save when payload hash is unchanged", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    const entries = [makeEntry({ id: 1 })];
    const { rerender } = renderHook(
      ({ currentEntries, currentUser }) => useAutoBackup(currentEntries, currentUser, true),
      { initialProps: { currentEntries: entries, currentUser: USER } }
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    rerender({
      currentEntries: [makeEntry({ id: 1 })],
      currentUser: { ...USER, workDays: [...USER.workDays] },
    });

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(writeBackupFile).toHaveBeenCalledTimes(1);
  });

  it("manual backup is not blocked by cloud backoff", async () => {
    localStorage.setItem("estundnzettl_cloud_sync_enabled", "true");
    localStorage.setItem(
      "estundnzettl_backup_backoff_until",
      new Date(Date.now() + 30 * 60_000).toISOString()
    );

    const entries = [makeEntry()];
    const { result } = renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      await result.current.triggerManualBackup();
    });

    expect(getValidToken).toHaveBeenCalled();
    expect(uploadOrUpdateFile).toHaveBeenCalledWith(
      "test-token",
      "estundnzettl_backup.json",
      expect.objectContaining({ entries: expect.any(Array), version: "v6" })
    );
  });

  it("manual backup bypasses unchanged-hash skip", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    const entries = [makeEntry()];
    const { result } = renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });
    expect(writeBackupFile).toHaveBeenCalledTimes(1);
    vi.mocked(writeBackupFile).mockClear();

    await act(async () => {
      await result.current.triggerManualBackup();
    });

    expect(writeBackupFile).toHaveBeenCalledTimes(1);
  });

  it("does not mark local-only backup successful when local write fails", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    vi.mocked(writeBackupFile).mockRejectedValueOnce(new Error("write failed"));
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(localStorage.getItem("estundnzettl_last_backup_date")).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "[useAutoBackup] Lokales Backup fehlgeschlagen:",
      "write failed",
    );
  });

  it("uses the secure Nextcloud secret for backup when legacy storage is empty", async () => {
    localStorage.setItem("estundnzettl_nextcloud_enabled", "true");
    localStorage.setItem("estundnzettl_nextcloud_url", "https://nc.example.com");
    localStorage.setItem("estundnzettl_nextcloud_user", "demo-user");
    vi.mocked(getNextcloudAppPassword).mockResolvedValueOnce("fixture-secure-pass");
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(ncUploadBackup).toHaveBeenCalledWith(
      "https://nc.example.com",
      "demo-user",
      "fixture-secure-pass",
      expect.objectContaining({ version: "v6" }),
    );
  });

  it("continues cloud and Nextcloud backups when local backup fails", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    localStorage.setItem("estundnzettl_cloud_sync_enabled", "true");
    localStorage.setItem("estundnzettl_nextcloud_enabled", "true");
    localStorage.setItem("estundnzettl_nextcloud_url", "https://nc.example.com");
    localStorage.setItem("estundnzettl_nextcloud_user", "demo-user");
    localStorage.setItem("estundnzettl_nextcloud_pass", "obfuscated-fixture");
    vi.mocked(writeBackupFile).mockRejectedValueOnce(new Error("disk unavailable"));
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(uploadOrUpdateFile).toHaveBeenCalled();
    expect(ncUploadBackup).toHaveBeenCalled();
    expect(localStorage.getItem("estundnzettl_backup_fail_count")).toBe("0");
    expect(localStorage.getItem("estundnzettl_nextcloud_backup_fail_count")).toBe("0");
  });

  it("stores a friendly Google reconnect error for AUTH_REQUIRED", async () => {
    localStorage.setItem("estundnzettl_cloud_sync_enabled", "true");
    vi.mocked(getValidToken).mockRejectedValueOnce(new Error("AUTH_REQUIRED"));
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(localStorage.getItem("estundnzettl_backup_last_error")).toBe("Google Drive Anmeldung erforderlich");
    expect(logger.warn).toHaveBeenCalledWith(
      "Cloud-Backup fehlgeschlagen:",
      "Google Drive Anmeldung erforderlich",
    );
  });

  it("background backup remains possible even when Auto-Save hash is unchanged", async () => {
    localStorage.setItem("estundnzettl_local_backup_enabled", "true");
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });
    expect(writeBackupFile).toHaveBeenCalledTimes(1);
    vi.mocked(writeBackupFile).mockClear();

    const appModule = await import("@capacitor/app");
    const callback = (appModule as unknown as { __getCallback: () => ((state: { isActive: boolean }) => void) | null }).__getCallback();

    await act(async () => {
      callback?.({ isActive: false });
      await Promise.resolve();
    });

    expect(writeBackupFile).toHaveBeenCalledTimes(1);
  });

  it("increments backupFailCount on cloud backup failure", async () => {
    localStorage.setItem("estundnzettl_cloud_sync_enabled", "true");
    vi.mocked(getValidToken).mockResolvedValueOnce(null);
    const entries = [makeEntry()];
    const { result } = renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.backupFailCount).toBe(1);
    expect(localStorage.getItem("estundnzettl_backup_fail_count")).toBe("1");
  });

  it("shows error toast when cloud backup fails 5 times", async () => {
    localStorage.setItem("estundnzettl_cloud_sync_enabled", "true");
    localStorage.setItem("estundnzettl_backup_fail_count", "4"); // already 4 failures
    vi.mocked(getValidToken).mockResolvedValue(null);
    const entries = [makeEntry()];

    renderHook(() => useAutoBackup(entries, USER, true));

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("5x"),
      expect.objectContaining({ duration: 8000 })
    );
  });

  it("registers appStateChange listener on mount", async () => {
    const { App } = await import("@capacitor/app");
    const entries = [makeEntry()];
    renderHook(() => useAutoBackup(entries, USER, true));

    expect(App.addListener).toHaveBeenCalledWith(
      "appStateChange",
      expect.any(Function)
    );
  });

  it("initializes backupFailCount from localStorage", () => {
    localStorage.setItem("estundnzettl_backup_fail_count", "3");
    const entries = [makeEntry()];
    const { result } = renderHook(() => useAutoBackup(entries, USER, true));
    expect(result.current.backupFailCount).toBe(3);
  });
});
