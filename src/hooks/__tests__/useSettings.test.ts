import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ─── Module-Mocks ───────────────────────────────────────────

const storageModeListeners = vi.hoisted(() => new Set<() => void>());
const secureSecretsMock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  available: true,
  failSet: false,
}));

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
  subscribeStorageMode: vi.fn((listener: () => void) => {
    storageModeListeners.add(listener);
    return () => storageModeListeners.delete(listener);
  }),
}));

vi.mock("../../db/repositories/settingsRepo", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
  deleteSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../utils/obfuscate", () => ({
  obfuscate: vi.fn((val: string) => Promise.resolve(`enc:${val}`)),
  deobfuscate: vi.fn((val: string) => Promise.resolve(val.startsWith("enc:") ? val.replace("enc:", "") : val)),
  deobfuscateLegacySync: vi.fn((val: string) => val),
}));

vi.mock("../../utils/secureSecrets", () => ({
  getSecret: vi.fn(async (key: string) => {
    if (!secureSecretsMock.available) {
      return { status: "unavailable", value: null, message: "secure storage unavailable" };
    }
    const value = secureSecretsMock.store.get(key);
    return value ? { status: "ready", value } : { status: "missing", value: null };
  }),
  setSecret: vi.fn(async (key: string, value: string) => {
    if (!secureSecretsMock.available || secureSecretsMock.failSet) {
      return { status: secureSecretsMock.available ? "failed" : "unavailable", ok: false, message: "secure storage unavailable" };
    }
    secureSecretsMock.store.set(key, value);
    return { status: "ready", ok: true };
  }),
  deleteSecret: vi.fn(async (key: string) => {
    secureSecretsMock.store.delete(key);
    return { status: "ready", ok: true };
  }),
}));

vi.mock("../../utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useSettings } from "../useSettings";
import { isSQLiteActive } from "../../db/storageMode";
import { getSetting, setSetting, deleteSetting } from "../../db/repositories/settingsRepo";
import { deobfuscate, deobfuscateLegacySync } from "../../utils/obfuscate";
import { getSecret, setSecret } from "../../utils/secureSecrets";
import { NEXTCLOUD_APP_PASSWORD_SECRET_KEY } from "../../utils/nextcloudSecret";

// ─── Tests ──────────────────────────────────────────────────

describe("useSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageModeListeners.clear();
    vi.mocked(isSQLiteActive).mockReturnValue(false);
    vi.mocked(getSetting).mockResolvedValue(null);
    vi.mocked(setSetting).mockResolvedValue(undefined);
    vi.mocked(deleteSetting).mockResolvedValue(undefined);
    vi.mocked(deobfuscate).mockImplementation((val: string) => Promise.resolve(val.startsWith("enc:") ? val.replace("enc:", "") : val));
    vi.mocked(deobfuscateLegacySync).mockImplementation((val: string) => val);
    secureSecretsMock.store.clear();
    secureSecretsMock.available = true;
    secureSecretsMock.failSet = false;
    localStorage.clear();

    // jsdom does not implement matchMedia — provide a minimal stub
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("returns default userData when nothing is stored", () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.userData.name).toBe("");
    expect(result.current.userData.position).toBe("");
    expect(result.current.userData.photo).toBeNull();
    expect(result.current.userData.workDays).toHaveLength(7);
  });

  it("loads userData from localStorage on init", () => {
    const user = {
      name: "Max",
      position: "Dev",
      photo: null,
      workDays: [0, 510, 510, 510, 510, 270, 0],
    };
    localStorage.setItem("estundnzettl_user", JSON.stringify(user));

    const { result } = renderHook(() => useSettings());

    expect(result.current.userData.name).toBe("Max");
    expect(result.current.userData.position).toBe("Dev");
    expect(result.current.userData.workDays).toEqual([0, 510, 510, 510, 510, 270, 0]);
  });

  it("setUserData updates userData and persists to localStorage", () => {
    const { result } = renderHook(() => useSettings());

    const newUser = {
      name: "Anna",
      position: "PM",
      photo: null,
      workDays: [0, 480, 480, 480, 480, 480, 0],
    };

    act(() => result.current.setUserData(newUser));

    expect(result.current.userData.name).toBe("Anna");
    const storedUser = localStorage.getItem("estundnzettl_user");
    expect(storedUser).not.toBeNull();
    const stored = JSON.parse(storedUser ?? "{}");
    expect(stored.name).toBe("Anna");
  });

  it("uses localStorage fallback and does not read SQLite while SQLite is not active", () => {
    const user = {
      name: "Fallback User",
      position: "Legacy",
      photo: null,
      workDays: [0, 420, 420, 420, 420, 420, 0],
    };
    localStorage.setItem("estundnzettl_user", JSON.stringify(user));
    localStorage.setItem("estundnzettl_theme", "dark");

    const { result } = renderHook(() => useSettings());

    expect(result.current.userData.name).toBe("Fallback User");
    expect(result.current.theme).toBe("dark");
    expect(getSetting).not.toHaveBeenCalled();
    expect(setSetting).not.toHaveBeenCalled();
  });

  it("loads SQLite settings when SQLite becomes active after initial render", async () => {
    const sqliteUser = {
      name: "Delayed SQLite User",
      position: "Persisted",
      photo: null,
      workDays: [0, 480, 480, 480, 480, 300, 0],
    };
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      const values: Record<string, unknown> = {
        user: sqliteUser,
        theme: "dark",
      };
      return values[key] ?? null;
    });

    const { result } = renderHook(() => useSettings());

    expect(result.current.settingsStorageStatus).toBe("fallback");
    expect(getSetting).not.toHaveBeenCalled();
    expect(setSetting).not.toHaveBeenCalled();

    act(() => {
      vi.mocked(isSQLiteActive).mockReturnValue(true);
      storageModeListeners.forEach((listener) => listener());
    });

    await waitFor(() => {
      expect(result.current.userData.name).toBe("Delayed SQLite User");
      expect(result.current.theme).toBe("dark");
      expect(result.current.settingsStorageStatus).toBe("ready");
      expect(result.current.sqliteReady).toBe(true);
    });

    expect(setSetting).not.toHaveBeenCalledWith("user", expect.objectContaining({ name: "" }));
  });

  it("lets SQLite values override localStorage only after the async DB read is ready", async () => {
    vi.mocked(isSQLiteActive).mockReturnValue(true);

    const localUser = {
      name: "Local User",
      position: "Legacy",
      photo: null,
      workDays: [0, 420, 420, 420, 420, 420, 0],
    };
    const sqliteUser = {
      name: "SQLite User",
      position: "Persisted",
      photo: null,
      workDays: [0, 480, 480, 480, 480, 300, 0],
    };
    localStorage.setItem("estundnzettl_user", JSON.stringify(localUser));
    localStorage.setItem("estundnzettl_theme", "light");

    let releaseDbRead: () => void = () => {
      throw new Error("DB read gate was not initialized");
    };
    const dbReadGate = new Promise<void>((resolve) => {
      releaseDbRead = resolve;
    });
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      await dbReadGate;
      const values: Record<string, unknown> = {
        user: sqliteUser,
        theme: "dark",
        cloud_sync_enabled: true,
        local_backup_enabled: true,
      };
      return values[key] ?? null;
    });

    const { result } = renderHook(() => useSettings());

    expect(result.current.userData.name).toBe("Local User");
    expect(result.current.theme).toBe("light");
    expect(setSetting).not.toHaveBeenCalled();

    releaseDbRead();

    await waitFor(() => {
      expect(result.current.userData.name).toBe("SQLite User");
      expect(result.current.theme).toBe("dark");
      expect(result.current.cloudSyncEnabled).toBe(true);
      expect(result.current.localBackupEnabled).toBe(true);
      expect(result.current.settingsStorageStatus).toBe("ready");
    });

    await waitFor(() => {
      expect(setSetting).toHaveBeenCalledWith("user", expect.objectContaining({ name: "SQLite User" }));
    });

    const storedSqliteUser = localStorage.getItem("estundnzettl_user");
    expect(storedSqliteUser).not.toBeNull();
    expect(JSON.parse(storedSqliteUser ?? "{}").name).toBe("SQLite User");
    expect(localStorage.getItem("estundnzettl_theme")).toBe("dark");
    expect(setSetting).not.toHaveBeenCalledWith("user", expect.objectContaining({ name: "Local User" }));
  });

  it("does not overwrite SQLite with the default empty profile while startup load is pending", async () => {
    vi.mocked(isSQLiteActive).mockReturnValue(true);

    const sqliteUser = {
      name: "Persisted SQLite User",
      position: "Crew",
      photo: null,
      workDays: [0, 480, 480, 480, 480, 240, 0],
    };
    let releaseDbRead: () => void = () => {
      throw new Error("DB read gate was not initialized");
    };
    const dbReadGate = new Promise<void>((resolve) => {
      releaseDbRead = resolve;
    });
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      await dbReadGate;
      return key === "user" ? sqliteUser : null;
    });

    const { result } = renderHook(() => useSettings());

    expect(result.current.userData.name).toBe("");
    expect(result.current.settingsStorageStatus).toBe("loading");
    expect(setSetting).not.toHaveBeenCalled();

    releaseDbRead();

    await waitFor(() => {
      expect(result.current.userData.name).toBe("Persisted SQLite User");
      expect(result.current.settingsStorageStatus).toBe("ready");
    });

    expect(setSetting).not.toHaveBeenCalledWith("user", expect.objectContaining({ name: "" }));
  });

  it("reports SQLite load failures and does not write fallback values back to SQLite", async () => {
    vi.mocked(isSQLiteActive).mockReturnValue(true);
    vi.mocked(getSetting).mockRejectedValue(new Error("db unavailable"));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settingsStorageStatus).toBe("failed");
      expect(result.current.settingsStorageError).toContain("db unavailable");
      expect(result.current.sqliteReady).toBe(false);
    });

    expect(setSetting).not.toHaveBeenCalled();
  });

  it("defaults theme to 'system'", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.theme).toBe("system");
  });

  it("loads theme from localStorage", () => {
    localStorage.setItem("estundnzettl_theme", "dark");

    const { result } = renderHook(() => useSettings());
    expect(result.current.theme).toBe("dark");
  });

  it("setTheme updates theme and persists to localStorage", () => {
    const { result } = renderHook(() => useSettings());

    act(() => result.current.setTheme("light"));

    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("estundnzettl_theme")).toBe("light");
  });

  it("autoBackup defaults to false", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.autoBackup).toBe(false);
    expect(result.current.cloudSyncEnabled).toBe(false);
  });

  it("setAutoBackup / setCloudSyncEnabled updates the setting", () => {
    const { result } = renderHook(() => useSettings());

    act(() => result.current.setAutoBackup(true));

    expect(result.current.autoBackup).toBe(true);
    expect(result.current.cloudSyncEnabled).toBe(true);
    expect(localStorage.getItem("estundnzettl_cloud_sync_enabled")).toBe("true");
  });

  it("localBackupEnabled defaults to false and can be toggled", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.localBackupEnabled).toBe(false);

    act(() => result.current.setLocalBackupEnabled(true));

    expect(result.current.localBackupEnabled).toBe(true);
    expect(localStorage.getItem("estundnzettl_local_backup_enabled")).toBe("true");
  });

  it("nextcloud settings default to disabled/empty", () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.nextcloudEnabled).toBe(false);
    expect(result.current.nextcloudUrl).toBe("");
    expect(result.current.nextcloudUser).toBe("");
    expect(result.current.nextcloudPass).toBe("");
  });

  it("nextcloud settings can be updated", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setNextcloudEnabled(true);
      result.current.setNextcloudUrl("https://cloud.example.com");
      result.current.setNextcloudUser("admin");
      result.current.setNextcloudPass("secret123");
    });

    expect(result.current.nextcloudEnabled).toBe(true);
    expect(result.current.nextcloudUrl).toBe("https://cloud.example.com");
    expect(result.current.nextcloudUser).toBe("admin");
    expect(result.current.nextcloudPass).toBe("secret123");
  });

  it("keeps legacy Nextcloud password fallback readable on init", () => {
    vi.mocked(deobfuscateLegacySync).mockReturnValue("demo-app-password");
    localStorage.setItem("estundnzettl_nextcloud_pass", "obf:ZGVtby1hcHAtcGFzc3dvcmQ=");

    const { result } = renderHook(() => useSettings());

    expect(deobfuscateLegacySync).toHaveBeenCalledWith("obf:ZGVtby1hcHAtcGFzc3dvcmQ=");
    expect(result.current.nextcloudPass).toBe("demo-app-password");
  });

  it("migrates a legacy Nextcloud password only after secure write verification", async () => {
    vi.mocked(deobfuscateLegacySync).mockReturnValue("fixture-legacy-pass");
    vi.mocked(deobfuscate).mockResolvedValue("fixture-legacy-pass");
    localStorage.setItem("estundnzettl_nextcloud_pass", "obf:ZmFrZS1maXh0dXJl");

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.nextcloudSecretStatus).toBe("migrated");
    });

    expect(setSecret).toHaveBeenCalledWith(NEXTCLOUD_APP_PASSWORD_SECRET_KEY, "fixture-legacy-pass");
    expect(getSecret).toHaveBeenCalledWith(NEXTCLOUD_APP_PASSWORD_SECRET_KEY);
    expect(localStorage.getItem("estundnzettl_nextcloud_pass")).toBeNull();
    expect(result.current.nextcloudPass).toBe("fixture-legacy-pass");
  });

  it("keeps the legacy fallback when secure migration fails", async () => {
    secureSecretsMock.failSet = true;
    vi.mocked(deobfuscateLegacySync).mockReturnValue("fixture-legacy-pass");
    vi.mocked(deobfuscate).mockResolvedValue("fixture-legacy-pass");
    localStorage.setItem("estundnzettl_nextcloud_pass", "enc:v1:fixture");

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.nextcloudSecretStatus).toBe("legacy-fallback");
    });

    expect(result.current.nextcloudPass).toBe("fixture-legacy-pass");
    expect(localStorage.getItem("estundnzettl_nextcloud_pass")).toBe("enc:v1:fixture");
  });

  it("writes a new Nextcloud password to secure storage only", async () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setNextcloudPass("fixture-new-pass");
    });

    await waitFor(() => {
      expect(setSecret).toHaveBeenCalledWith(NEXTCLOUD_APP_PASSWORD_SECRET_KEY, "fixture-new-pass");
      expect(result.current.nextcloudSecretStatus).toBe("ready");
    });

    expect(localStorage.getItem("estundnzettl_nextcloud_pass")).toBeNull();
    expect(setSetting).not.toHaveBeenCalledWith("nextcloud_pass", expect.anything());
  });

  it("reports unavailable secure storage and does not delete the legacy Nextcloud password", async () => {
    secureSecretsMock.available = false;
    vi.mocked(deobfuscateLegacySync).mockReturnValue("fixture-legacy-pass");
    vi.mocked(deobfuscate).mockResolvedValue("fixture-legacy-pass");
    localStorage.setItem("estundnzettl_nextcloud_pass", "plain-fixture-legacy");

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.nextcloudSecretStatus).toBe("unavailable");
      expect(result.current.nextcloudSecretError).toContain("unavailable");
    });

    expect(result.current.nextcloudPass).toBe("fixture-legacy-pass");
    expect(localStorage.getItem("estundnzettl_nextcloud_pass")).toBe("plain-fixture-legacy");
  });

  it("handles corrupt userData in localStorage gracefully (uses defaults)", () => {
    localStorage.setItem("estundnzettl_user", "{not-valid-json");

    const { result } = renderHook(() => useSettings());

    // Should fall back to defaults
    expect(result.current.userData.name).toBe("");
    expect(result.current.userData.workDays).toHaveLength(7);
  });

  it("fixes missing workDays array in stored userData", () => {
    localStorage.setItem(
      "estundnzettl_user",
      JSON.stringify({ name: "Test", position: "", photo: null })
    );

    const { result } = renderHook(() => useSettings());

    expect(result.current.userData.name).toBe("Test");
    expect(result.current.userData.workDays).toHaveLength(7);
  });

  // ─── Locale ────────────────────────────────────────────────

  it("locale defaults to null when nothing is stored", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.locale).toBeNull();
  });

  it("loads locale from localStorage on init", () => {
    localStorage.setItem("estundnzettl_locale", "de-by");
    const { result } = renderHook(() => useSettings());
    expect(result.current.locale).toBe("de-by");
  });

  it("ignores unknown locale in localStorage", () => {
    localStorage.setItem("estundnzettl_locale", "xx-yy");
    const { result } = renderHook(() => useSettings());
    expect(result.current.locale).toBeNull();
  });

  it("setLocale updates locale and persists to localStorage", () => {
    const { result } = renderHook(() => useSettings());

    act(() => result.current.setLocale("neutral"));

    expect(result.current.locale).toBe("neutral");
    expect(localStorage.getItem("estundnzettl_locale")).toBe("neutral");
  });

  it("setLocale ignores invalid LocaleIds", () => {
    const { result } = renderHook(() => useSettings());

    // @ts-expect-error — Testen mit ungültiger ID
    act(() => result.current.setLocale("xx-yy"));

    expect(result.current.locale).toBeNull();
    expect(localStorage.getItem("estundnzettl_locale")).toBeNull();
  });
});
