import type { TFunction } from "i18next";
import {
  GERMAN_STATE_IDS,
  GERMAN_STATE_NAMES,
  SWISS_KANTON_IDS,
  SWISS_KANTON_NAMES,
} from "../locales";
import { getIntlLocale } from "./formatLocale";
import type { HolidayOnWorkDayMode, OvertimeMode, SickOnWorkDayMode } from "../types";

export const OVERTIME_OPTION_IDS: OvertimeMode[] = ["none", "split", "ueberstunden_only"];
export const SICK_OPTION_IDS: SickOnWorkDayMode[] = ["cap_to_target", "additive", "ignore"];
export const HOLIDAY_ON_WORK_OPTION_IDS: HolidayOnWorkDayMode[] = [
  "additive",
  "counts_as_overtime",
  "cap_to_target",
];

export const formatHours = (minutes: number): string => {
  if (!Number.isFinite(minutes)) return "0 h";
  const hours = minutes / 60;
  return hours.toLocaleString(getIntlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " h";
};

export const mmddToDisplay = (mmdd: string): string => {
  const parts = mmdd.split("-");
  if (parts.length !== 2) return mmdd;
  return `${parts[1]}.${parts[0]}.`;
};

export const displayToMmdd = (input: string): string | null => {
  const clean = input.replace(/\.$/, "").trim();
  const parts = clean.split(".");
  if (parts.length !== 2) return null;
  const dd = parts[0].padStart(2, "0");
  const mm = parts[1].padStart(2, "0");
  if (!/^\d{2}$/.test(dd) || !/^\d{2}$/.test(mm)) return null;
  return `${mm}-${dd}`;
};

export const getHolidayImportOptions = (t: TFunction) => [
  { id: "at", label: t("settings.calc.importOptions.austria") },
  ...GERMAN_STATE_IDS.map((s) => ({
    id: `de-${s}`,
    label: t("settings.calc.importOptions.germanyState", { state: GERMAN_STATE_NAMES[s] }),
  })),
  ...SWISS_KANTON_IDS.map((k) => ({
    id: `ch-${k}`,
    label: t("settings.calc.importOptions.swissKanton", { kanton: SWISS_KANTON_NAMES[k] }),
  })),
  { id: "_orthodox", label: t("settings.calc.importOptions.orthodox") },
  { id: "_islamic", label: t("settings.calc.importOptions.islamic") },
];
