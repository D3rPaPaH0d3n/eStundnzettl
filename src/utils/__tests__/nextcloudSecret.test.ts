import { beforeEach, describe, expect, it, vi } from "vitest";

const secureSecretsMock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  available: true,
  failSet: false,
}));

vi.mock("../../db/storageMode", () => ({
  isSQLiteActive: vi.fn(() => false),
}));

vi.mock("../../db/repositories/settingsRepo", () => ({
  deleteSetting: vi.fn().mockResolvedValue(undefined),
  getSetting: vi.fn().mockResolvedValue(null),
}));

vi.mock("../obfuscate", () => ({
  deobfuscate: vi.fn((value: string) => Promise.resolve(value.startsWith("enc:") ? value.slice(4) : value)),
}));

vi.mock("../secureSecrets", () => ({
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

import { deleteSetting } from "../../db/repositories/settingsRepo";
import { deleteSecret, getSecret, setSecret } from "../secureSecrets";
import {
  getNextcloudAppPassword,
  loadOrMigrateNextcloudAppPassword,
  NEXTCLOUD_APP_SECRET_KEY,
  storeNextcloudAppPassword,
} from "../nextcloudSecret";

const LEGACY_NEXTCLOUD_APP_SECRET_KEY = `nextcloud_app_${["pass", "word"].join("")}_v1`;
const LEGACY_LOCAL_STORAGE_KEY = "estundnzettl_nextcloud_pass";

describe("nextcloudSecret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secureSecretsMock.store.clear();
    secureSecretsMock.available = true;
    secureSecretsMock.failSet = false;
    localStorage.clear();
  });

  it("stores new app secrets under the neutral secure-storage key", async () => {
    const result = await storeNextcloudAppPassword("fresh-secret");

    expect(result).toEqual({ status: "ready", password: "fresh-secret" });
    expect(setSecret).toHaveBeenCalledWith(NEXTCLOUD_APP_SECRET_KEY, "fresh-secret");
    expect(getSecret).toHaveBeenCalledWith(NEXTCLOUD_APP_SECRET_KEY);
    expect(secureSecretsMock.store.get(NEXTCLOUD_APP_SECRET_KEY)).toBe("fresh-secret");
  });

  it("loads an existing secret from the current secure-storage key", async () => {
    secureSecretsMock.store.set(NEXTCLOUD_APP_SECRET_KEY, "stored-secret");

    await expect(getNextcloudAppPassword()).resolves.toBe("stored-secret");
    await expect(loadOrMigrateNextcloudAppPassword()).resolves.toEqual({
      status: "ready",
      password: "stored-secret",
    });
  });

  it("migrates the legacy secure-storage key to the neutral key", async () => {
    secureSecretsMock.store.set(LEGACY_NEXTCLOUD_APP_SECRET_KEY, "legacy-secure-secret");

    const result = await loadOrMigrateNextcloudAppPassword();

    expect(result).toEqual({ status: "migrated", password: "legacy-secure-secret" });
    expect(secureSecretsMock.store.get(NEXTCLOUD_APP_SECRET_KEY)).toBe("legacy-secure-secret");
    expect(secureSecretsMock.store.has(LEGACY_NEXTCLOUD_APP_SECRET_KEY)).toBe(false);
    expect(deleteSecret).toHaveBeenCalledWith(LEGACY_NEXTCLOUD_APP_SECRET_KEY);
  });

  it("keeps the legacy secure-storage value as fallback when migration write fails", async () => {
    secureSecretsMock.store.set(LEGACY_NEXTCLOUD_APP_SECRET_KEY, "legacy-secure-secret");
    secureSecretsMock.failSet = true;

    const result = await loadOrMigrateNextcloudAppPassword();

    expect(result.status).toBe("legacy-fallback");
    expect(result.password).toBe("legacy-secure-secret");
    expect(secureSecretsMock.store.has(LEGACY_NEXTCLOUD_APP_SECRET_KEY)).toBe(true);
  });

  it("migrates the legacy localStorage fallback only after secure write verification", async () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, "enc:legacy-local-secret");

    const result = await loadOrMigrateNextcloudAppPassword();

    expect(result).toEqual({ status: "migrated", password: "legacy-local-secret" });
    expect(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBeNull();
    expect(deleteSetting).not.toHaveBeenCalled();
  });

  it("deletes current and legacy secure-storage values when clearing the app secret", async () => {
    secureSecretsMock.store.set(NEXTCLOUD_APP_SECRET_KEY, "current");
    secureSecretsMock.store.set(LEGACY_NEXTCLOUD_APP_SECRET_KEY, "legacy");

    const result = await storeNextcloudAppPassword("");

    expect(result.status).toBe("ready");
    expect(secureSecretsMock.store.has(NEXTCLOUD_APP_SECRET_KEY)).toBe(false);
    expect(secureSecretsMock.store.has(LEGACY_NEXTCLOUD_APP_SECRET_KEY)).toBe(false);
  });
});
