import { deleteSetting, getSetting, setSetting } from "../db/repositories/settingsRepo";
import { logger } from "./logger";

export async function loadLastCode(): Promise<number | null> {
  const value = await getSetting("last_code");
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function saveLastCode(code: number): void {
  setSetting("last_code", code).catch((err) => {
    logger.error("[lastCode] SQLite-Write fehlgeschlagen:", err);
  });
}

export async function clearLastCode(): Promise<void> {
  try {
    await deleteSetting("last_code");
  } catch (err) {
    logger.error("[lastCode] SQLite-Delete fehlgeschlagen:", err);
  }
}
