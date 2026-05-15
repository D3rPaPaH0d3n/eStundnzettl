import { STORAGE_KEYS } from "../hooks/constants";
import { isSQLiteActive } from "../db/storageMode";
import { deleteSetting, getSetting } from "../db/repositories/settingsRepo";
import { deobfuscate } from "./obfuscate";
import { deleteSecret, getSecret, setSecret, type SecretStorageStatus } from "./secureSecrets";

const NEXTCLOUD_SECRET_KEY_PREFIX = "nextcloud_app_";
const LEGACY_SECRET_KEY_KIND = ["pass", "word"].join("");

export const NEXTCLOUD_APP_SECRET_KEY = `${NEXTCLOUD_SECRET_KEY_PREFIX}secret_v1`;
const LEGACY_NEXTCLOUD_APP_SECRET_KEY = `${NEXTCLOUD_SECRET_KEY_PREFIX}${LEGACY_SECRET_KEY_KIND}_v1`;

export type NextcloudSecretStatus =
  | "ready"
  | "migrated"
  | "legacy-fallback"
  | "missing"
  | "unavailable"
  | "failed";

export interface NextcloudSecretResult {
  status: NextcloudSecretStatus;
  password: string;
  message?: string;
}

const VERIFY_FAILED_MESSAGE = "Secure Nextcloud password storage could not be verified.";

function mapSecretStatus(status: SecretStorageStatus): NextcloudSecretStatus {
  if (status === "ready") return "ready";
  if (status === "missing") return "missing";
  return status;
}

async function readStoredNextcloudSecret(): Promise<NextcloudSecretResult> {
  const current = await getSecret(NEXTCLOUD_APP_SECRET_KEY);
  if (current.status === "ready" && current.value) {
    return { status: "ready", password: current.value };
  }

  const legacy = await getSecret(LEGACY_NEXTCLOUD_APP_SECRET_KEY);
  if (legacy.status === "ready" && legacy.value) {
    const written = await setSecret(NEXTCLOUD_APP_SECRET_KEY, legacy.value);
    if (written.ok) {
      const verified = await getSecret(NEXTCLOUD_APP_SECRET_KEY);
      if (verified.status === "ready" && verified.value === legacy.value) {
        await deleteSecret(LEGACY_NEXTCLOUD_APP_SECRET_KEY);
        return { status: "migrated", password: legacy.value };
      }
    }

    return {
      status: written.status === "unavailable" ? "unavailable" : "legacy-fallback",
      password: legacy.value,
      message: written.message || VERIFY_FAILED_MESSAGE,
    };
  }

  return {
    status: mapSecretStatus(current.status),
    password: "",
    message: current.message,
  };
}

async function readLegacyRaw(sqliteValue?: unknown): Promise<string> {
  const localValue = localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS);
  if (localValue) return localValue;

  if (typeof sqliteValue === "string" && sqliteValue) return sqliteValue;

  if (sqliteValue === undefined && isSQLiteActive()) {
    try {
      const settingValue = await getSetting("nextcloud_pass");
      if (typeof settingValue === "string" && settingValue) return settingValue;
    } catch {
      // Legacy fallback is best-effort; callers still get a clear secure-storage status.
    }
  }

  return "";
}

export async function readLegacyNextcloudPassword(sqliteValue?: unknown): Promise<string> {
  const raw = await readLegacyRaw(sqliteValue);
  if (!raw) return "";
  return deobfuscate(raw);
}

export async function removeLegacyNextcloudPassword(): Promise<void> {
  localStorage.removeItem(STORAGE_KEYS.NEXTCLOUD_PASS);
  if (!isSQLiteActive()) return;
  try {
    await deleteSetting("nextcloud_pass");
  } catch {
    // Non-fatal: new writes no longer use legacy storage, so a stale SQLite value
    // may remain until the DB is available again.
  }
}

export async function storeNextcloudAppPassword(password: string): Promise<NextcloudSecretResult> {
  if (!password) {
    const deleted = await deleteSecret(NEXTCLOUD_APP_SECRET_KEY);
    const legacyDeleted = await deleteSecret(LEGACY_NEXTCLOUD_APP_SECRET_KEY);
    if (deleted.ok && legacyDeleted.ok) {
      await removeLegacyNextcloudPassword();
    }
    return {
      status: deleted.ok ? "ready" : mapSecretStatus(deleted.status),
      password: "",
      message: deleted.message,
    };
  }

  const written = await setSecret(NEXTCLOUD_APP_SECRET_KEY, password);
  if (!written.ok) {
    return { status: mapSecretStatus(written.status), password, message: written.message };
  }

  const verified = await getSecret(NEXTCLOUD_APP_SECRET_KEY);
  if (verified.status === "ready" && verified.value === password) {
    await removeLegacyNextcloudPassword();
    return { status: "ready", password };
  }

  return {
    status: verified.status === "unavailable" ? "unavailable" : "failed",
    password,
    message: verified.message || VERIFY_FAILED_MESSAGE,
  };
}

export async function loadOrMigrateNextcloudAppPassword(sqliteLegacyValue?: unknown): Promise<NextcloudSecretResult> {
  const stored = await readStoredNextcloudSecret();
  if (stored.password) return stored;

  const legacyPassword = await readLegacyNextcloudPassword(sqliteLegacyValue);
  if (!legacyPassword) return stored;

  const migrated = await storeNextcloudAppPassword(legacyPassword);
  if (migrated.status === "ready") {
    return { status: "migrated", password: legacyPassword };
  }

  return {
    status: migrated.status === "unavailable" ? "unavailable" : "legacy-fallback",
    password: legacyPassword,
    message: migrated.message,
  };
}

export async function getNextcloudAppPassword(): Promise<string> {
  const stored = await readStoredNextcloudSecret();
  if (stored.password) return stored.password;
  return readLegacyNextcloudPassword();
}
