import type { UserData } from "../types";

export const MAX_MONTHLY_TARGET_MINUTES = 31 * 24 * 60;

export function parseMonthlyTargetInput(value: string): number | undefined {
  const match = /^(\d{1,3}):([0-5]?\d)$/.exec(value.trim());
  if (!match) return undefined;
  return normalizeMonthlyTargetMinutes(Number(match[1]) * 60 + Number(match[2]));
}

export function formatMonthlyTargetInput(minutes: number | undefined): string {
  const normalized = normalizeMonthlyTargetMinutes(minutes);
  if (normalized === undefined) return "";
  return `${Math.floor(normalized / 60)}:${String(normalized % 60).padStart(2, "0")}`;
}

export function normalizeMonthlyTargetMinutes(value: unknown): number | undefined {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_MONTHLY_TARGET_MINUTES
  ) {
    return undefined;
  }
  return value;
}

/** Erhaelt unbekannte Legacy-Felder, entfernt aber ein beschaedigtes Monatsziel. */
export function normalizeUserDataMonthlyTarget<T extends Record<string, unknown>>(userData: T): T {
  const target = normalizeMonthlyTargetMinutes(userData.monthlyTargetMinutes);
  if (target !== undefined) return userData;
  if (!("monthlyTargetMinutes" in userData)) return userData;
  const { monthlyTargetMinutes: _invalid, ...rest } = userData;
  return rest as T;
}

export interface MonthlyTargetProgress {
  targetMinutes: number;
  actualMinutes: number;
  differenceMinutes: number;
  remainingMinutes: number;
  exceededMinutes: number;
  progressPercent: number;
}

export function getValidMonthlyTargetMinutes(userData?: UserData | null): number | null {
  if (!userData?.simpleMode) return null;
  return normalizeMonthlyTargetMinutes(userData.monthlyTargetMinutes) ?? null;
}

export function calculateMonthlyTargetProgress(
  actualMinutes: number,
  userData?: UserData | null,
): MonthlyTargetProgress | null {
  const targetMinutes = getValidMonthlyTargetMinutes(userData);
  if (targetMinutes === null) return null;

  const safeActual = Number.isFinite(actualMinutes) ? Math.max(0, Math.trunc(actualMinutes)) : 0;
  const differenceMinutes = safeActual - targetMinutes;
  return {
    targetMinutes,
    actualMinutes: safeActual,
    differenceMinutes,
    remainingMinutes: Math.max(0, -differenceMinutes),
    exceededMinutes: Math.max(0, differenceMinutes),
    progressPercent: Math.min(100, (safeActual / targetMinutes) * 100),
  };
}
