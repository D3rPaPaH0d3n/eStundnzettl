import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

export type SecretStorageStatus = "ready" | "missing" | "unavailable" | "failed";

export interface SecretReadResult {
  status: SecretStorageStatus;
  value: string | null;
  message?: string;
}

export interface SecretWriteResult {
  status: Exclude<SecretStorageStatus, "missing">;
  ok: boolean;
  message?: string;
}

interface SecretWriteOptions {
  /**
   * Explicit compatibility escape hatch for tests/legacy tooling only.
   * The app must not use this for new secrets: browser localStorage is not secure.
   */
  legacyCompatibilityMode?: boolean;
}

const INSECURE_COMPAT_PREFIX = "estundnzettl_insecure_secret_compat_";
const UNAVAILABLE_MESSAGE = "Secure secret storage is only available on native iOS/Android builds.";
const FAILED_MESSAGE = "Secure secret storage failed.";

function isNativeSecureStorageAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

function compatKey(key: string): string {
  return `${INSECURE_COMPAT_PREFIX}${key}`;
}

function asMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function getSecret(key: string, options: SecretWriteOptions = {}): Promise<SecretReadResult> {
  if (!isNativeSecureStorageAvailable()) {
    if (options.legacyCompatibilityMode) {
      const value = localStorage.getItem(compatKey(key));
      return value === null ? { status: "missing", value: null } : { status: "ready", value };
    }
    return { status: "unavailable", value: null, message: UNAVAILABLE_MESSAGE };
  }

  try {
    const result = await SecureStoragePlugin.get({ key });
    return { status: "ready", value: result.value };
  } catch (error) {
    const message = asMessage(error, "Item with given key does not exist");
    if (/does not exist|not exist|not found|no value/i.test(message)) {
      return { status: "missing", value: null };
    }
    return { status: "failed", value: null, message: FAILED_MESSAGE };
  }
}

export async function setSecret(key: string, value: string, options: SecretWriteOptions = {}): Promise<SecretWriteResult> {
  if (!isNativeSecureStorageAvailable()) {
    if (options.legacyCompatibilityMode) {
      localStorage.setItem(compatKey(key), value);
      return { status: "ready", ok: true };
    }
    return { status: "unavailable", ok: false, message: UNAVAILABLE_MESSAGE };
  }

  try {
    const result = await SecureStoragePlugin.set({ key, value });
    if (result.value !== true) {
      return { status: "failed", ok: false, message: FAILED_MESSAGE };
    }
    return { status: "ready", ok: true };
  } catch {
    return { status: "failed", ok: false, message: FAILED_MESSAGE };
  }
}

export async function deleteSecret(key: string, options: SecretWriteOptions = {}): Promise<SecretWriteResult> {
  if (!isNativeSecureStorageAvailable()) {
    if (options.legacyCompatibilityMode) {
      localStorage.removeItem(compatKey(key));
      return { status: "ready", ok: true };
    }
    return { status: "unavailable", ok: false, message: UNAVAILABLE_MESSAGE };
  }

  try {
    await SecureStoragePlugin.remove({ key });
    return { status: "ready", ok: true };
  } catch (error) {
    const message = asMessage(error, "Item with given key does not exist");
    if (/does not exist|not exist|not found|no value/i.test(message)) {
      return { status: "ready", ok: true };
    }
    return { status: "failed", ok: false, message: FAILED_MESSAGE };
  }
}
