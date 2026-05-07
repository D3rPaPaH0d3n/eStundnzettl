import { deleteSetting, getSetting, setSetting } from "../db/repositories/settingsRepo";
import { isSQLiteActive } from "../db/storageMode";
import { STORAGE_KEYS } from "../hooks/constants";
import { logger } from "./logger";

export async function loadLastCode(): Promise<number | null> {
  if (!isSQLiteActive()) {
    const value = localStorage.getItem(STORAGE_KEYS.LAST_CODE);
    if (!value) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const value = await getSetting("last_code");
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function saveLastCode(code: number): void {
  if (!isSQLiteActive()) {
    localStorage.setItem(STORAGE_KEYS.LAST_CODE, String(code));
    return;
  }

  setSetting("last_code", code).catch((err) => {
    logger.error("[lastCode] SQLite-Write fehlgeschlagen:", err);
  });
}

export async function clearLastCode(): Promise<void> {
  if (!isSQLiteActive()) {
    localStorage.removeItem(STORAGE_KEYS.LAST_CODE);
    return;
  }

  try {
    await deleteSetting("last_code");
  } catch (err) {
    logger.error("[lastCode] SQLite-Delete fehlgeschlagen:", err);
  }
}
