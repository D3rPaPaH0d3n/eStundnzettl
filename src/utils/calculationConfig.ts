/**
 * calculationConfig.ts — Defaults und Resolver für die per-User
 * Rechenkonfiguration.
 *
 * Die `CalculationConfig` (siehe `src/types/index.ts`) ist eine optionale
 * Übersteuerung der Locale-Defaults. Bestehende User bekommen beim ersten
 * Start eine Config, die exakt den heutigen Locale-Regeln entspricht — so
 * ändert sich keine einzige Zahl im Dashboard.
 *
 * `resolveEffectiveRules()` fasst Locale und Config zu einem einheitlichen
 * "effective rules"-Objekt zusammen, das von den Funktionen in
 * `timeCalculations.ts` genutzt wird.
 */

import type { Locale } from "../locales/types";
import type {
  CalculationConfig,
  OvertimeMode,
  SickOnWorkDayMode,
  HolidayOnWorkDayMode,
  AutoPauseRule,
} from "../types";

/**
 * Erzeugt eine neue `CalculationConfig` aus den Locale-Defaults und den
 * aktuellen Arbeitstagen. Das Ergebnis bildet das heutige Locale-Verhalten
 * 1:1 nach, damit die Migration bestehender User keine Zahlen ändert.
 */
export function getDefaultCalculationConfig(
  locale: Locale,
  workDays: number[] | null | undefined
): CalculationConfig {
  const safeDays = Array.isArray(workDays) && workDays.length === 7
    ? workDays
    : locale.defaultWorkDays;
  const weekly = safeDays.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);

  return {
    weeklyTargetMinutes: weekly,
    overtimeMode: locale.enableOvertimeSplit ? "split" : "none",
    overtimeThresholdMinutes: locale.weeklyLimitMinutes,
    sickOnWorkDayMode: locale.enableSickAdjustment ? "cap_to_target" : "additive",
    holidaySet: { mode: "locale_default", disabledHolidayKeys: [] },
    halfDayMode: { mode: "locale_default", customHalfDays: [] },
    holidayOnWorkDayMode: "additive",
    autoPauseRules: [],
    vacationAllowanceDays: 25,
    configVersion: 1,
  };
}

/**
 * "Eigener Plan"-Startzustand: leere Regeln, keine Feiertage, keine
 * Halbtage, keine Überstunden-Unterscheidung. Der User baut sich seine
 * Regeln im Baukasten selbst zusammen.
 */
export function getBlankCalculationConfig(
  workDays: number[] | null | undefined
): CalculationConfig {
  const safeDays = Array.isArray(workDays) && workDays.length === 7
    ? workDays
    : [0, 0, 0, 0, 0, 0, 0];
  const weekly = safeDays.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);

  return {
    weeklyTargetMinutes: weekly,
    overtimeMode: "none",
    overtimeThresholdMinutes: null,
    sickOnWorkDayMode: "additive",
    holidaySet: { mode: "custom", disabledHolidayKeys: [], customHolidays: {} },
    halfDayMode: { mode: "none", customHalfDays: [] },
    holidayOnWorkDayMode: "additive",
    autoPauseRules: [],
    vacationAllowanceDays: 25,
    configVersion: 1,
  };
}

/**
 * Validiert (rudimentär), ob ein unbekannter Wert eine CalculationConfig
 * sein könnte — für SQLite- und Backup-Restores. Akzeptiert nur Objekte
 * mit passender Grundstruktur, bricht nicht bei einzelnen fehlenden
 * Feldern ab (die werden dann aus dem Fallback-Default ergänzt).
 */
export function coerceCalculationConfig(
  value: unknown,
  fallback: CalculationConfig
): CalculationConfig {
  if (!value || typeof value !== "object") return fallback;
  const v = value as Partial<CalculationConfig>;
  return {
    weeklyTargetMinutes:
      typeof v.weeklyTargetMinutes === "number"
        ? v.weeklyTargetMinutes
        : fallback.weeklyTargetMinutes,
    overtimeMode: isOvertimeMode(v.overtimeMode) ? v.overtimeMode : fallback.overtimeMode,
    overtimeThresholdMinutes:
      typeof v.overtimeThresholdMinutes === "number"
        ? v.overtimeThresholdMinutes
        : v.overtimeThresholdMinutes === null
          ? null
          : fallback.overtimeThresholdMinutes,
    sickOnWorkDayMode: isSickMode(v.sickOnWorkDayMode)
      ? v.sickOnWorkDayMode
      : fallback.sickOnWorkDayMode,
    holidaySet: coerceHolidaySet(v.holidaySet, fallback.holidaySet),
    halfDayMode: coerceHalfDayMode(v.halfDayMode, fallback.halfDayMode),
    holidayOnWorkDayMode: isHolidayOnWorkDayMode(v.holidayOnWorkDayMode)
      ? v.holidayOnWorkDayMode
      : fallback.holidayOnWorkDayMode,
    autoPauseRules: Array.isArray(v.autoPauseRules)
      ? v.autoPauseRules.filter(isValidAutoPauseRule)
      : fallback.autoPauseRules,
    vacationAllowanceDays:
      typeof v.vacationAllowanceDays === "number"
        ? v.vacationAllowanceDays
        : fallback.vacationAllowanceDays,
    configVersion: 1,
  };
}

function isOvertimeMode(v: unknown): v is OvertimeMode {
  return v === "none" || v === "split" || v === "ueberstunden_only";
}

function isSickMode(v: unknown): v is SickOnWorkDayMode {
  return v === "cap_to_target" || v === "additive" || v === "ignore";
}

function isHolidayOnWorkDayMode(v: unknown): v is HolidayOnWorkDayMode {
  return v === "cap_to_target" || v === "additive";
}

function isValidAutoPauseRule(v: unknown): v is AutoPauseRule {
  if (!v || typeof v !== "object") return false;
  const r = v as Partial<AutoPauseRule>;
  return (
    typeof r.fromMinutes === "number" &&
    typeof r.pauseMinutes === "number" &&
    r.fromMinutes >= 0 &&
    r.pauseMinutes >= 0
  );
}

function coerceHolidaySet(
  v: unknown,
  fallback: CalculationConfig["holidaySet"]
): CalculationConfig["holidaySet"] {
  if (!v || typeof v !== "object") return fallback;
  const h = v as Partial<CalculationConfig["holidaySet"]>;
  const mode = h.mode === "custom" || h.mode === "locale_default" ? h.mode : fallback.mode;
  const disabled = Array.isArray(h.disabledHolidayKeys)
    ? h.disabledHolidayKeys.filter((k): k is string => typeof k === "string")
    : [];
  const custom =
    h.customHolidays && typeof h.customHolidays === "object"
      ? Object.fromEntries(
          Object.entries(h.customHolidays).filter(
            ([k, val]) => typeof k === "string" && typeof val === "string"
          )
        )
      : undefined;
  return { mode, disabledHolidayKeys: disabled, customHolidays: custom };
}

function coerceHalfDayMode(
  v: unknown,
  fallback: CalculationConfig["halfDayMode"]
): CalculationConfig["halfDayMode"] {
  if (!v || typeof v !== "object") return fallback;
  const h = v as Partial<CalculationConfig["halfDayMode"]>;
  const mode =
    h.mode === "none" || h.mode === "custom" || h.mode === "locale_default"
      ? h.mode
      : fallback.mode;
  const custom = Array.isArray(h.customHalfDays)
    ? h.customHalfDays.filter((k): k is string => typeof k === "string")
    : [];
  return { mode, customHalfDays: custom };
}

/**
 * Ergebnis-Objekt von `resolveEffectiveRules`. Enthält alles, was die
 * Rechenfunktionen brauchen, damit sie nicht bei jedem Aufruf selbst
 * entscheiden müssen, ob Config oder Locale Vorrang hat.
 */
export interface EffectiveCalculationRules {
  /** Halbtage als MM-DD-Suffixe. */
  halfDays: string[];
  /** Soll MA/ÜS-Split greifen? (false = alles in einen Topf) */
  overtimeSplitEnabled: boolean;
  /** "none" = nur Saldo, "split" = MA+ÜS, "ueberstunden_only" = alles ÜS */
  overtimeMode: OvertimeMode;
  /** Wochen-Grenze in Minuten, ab der ÜS statt MA gezählt werden. */
  weeklyLimitMinutes: number | null;
  /** Krank-Modus (ersetzt das alte `enableSickAdjustment`-Flag). */
  sickMode: SickOnWorkDayMode;
  /** Feiertags-Modus für Kollision mit Arbeit am selben Tag. */
  holidayOnWorkDayMode: HolidayOnWorkDayMode;
  /** Auto-Pausen-Regeln (leere Liste = aus). */
  autoPauseRules: AutoPauseRule[];
  /** Map YYYY-MM-DD → Name oder null wenn Locale-Default genutzt wird. */
  customHolidays: Record<string, string> | null;
  /** MM-DD-Keys, die aus der Locale-Liste entfernt werden sollen. */
  disabledHolidayKeys: string[];
  /** Aktiver Feiertagsset-Modus (locale_default oder custom). */
  holidaySetMode: "locale_default" | "custom";
}

/**
 * Vereinheitlicht Locale- und Config-Quellen zu einem einzigen
 * "effective rules"-Objekt. Der Aufrufer muss sich nicht mehr um
 * Fallback-Logik kümmern.
 *
 * Wenn `config` `null`/`undefined` ist, werden ausschließlich die
 * Locale-Defaults verwendet — dadurch bleibt bestehender Aufruf-Code
 * ohne Config kompatibel.
 */
export function resolveEffectiveRules(
  locale: Locale,
  config: CalculationConfig | null | undefined
): EffectiveCalculationRules {
  if (!config) {
    return {
      halfDays: locale.halfDays,
      overtimeSplitEnabled: locale.enableOvertimeSplit,
      overtimeMode: locale.enableOvertimeSplit ? "split" : "none",
      weeklyLimitMinutes: locale.weeklyLimitMinutes,
      sickMode: locale.enableSickAdjustment ? "cap_to_target" : "additive",
      holidayOnWorkDayMode: "additive",
      autoPauseRules: [],
      customHolidays: null,
      disabledHolidayKeys: [],
      holidaySetMode: "locale_default",
    };
  }

  // Halbtage: Config bestimmt den Modus
  const halfDays: string[] =
    config.halfDayMode.mode === "none"
      ? []
      : config.halfDayMode.mode === "custom"
        ? config.halfDayMode.customHalfDays
        : locale.halfDays;

  // MA/ÜS: overtimeMode steuert ob überhaupt gesplittet wird
  const overtimeSplitEnabled = config.overtimeMode !== "none";
  const weeklyLimitMinutes =
    config.overtimeMode === "split"
      ? (config.overtimeThresholdMinutes ?? locale.weeklyLimitMinutes)
      : locale.weeklyLimitMinutes;

  // Feiertage: Custom ersetzt komplett, locale_default filtert
  const customHolidays =
    config.holidaySet.mode === "custom"
      ? config.holidaySet.customHolidays ?? {}
      : null;

  return {
    halfDays,
    overtimeSplitEnabled,
    overtimeMode: config.overtimeMode,
    weeklyLimitMinutes,
    sickMode: config.sickOnWorkDayMode,
    holidayOnWorkDayMode: config.holidayOnWorkDayMode,
    autoPauseRules: config.autoPauseRules,
    customHolidays,
    disabledHolidayKeys: config.holidaySet.disabledHolidayKeys,
    holidaySetMode: config.holidaySet.mode,
  };
}

/**
 * Wendet die Auto-Pausen-Regeln auf eine Roh-Arbeitszeit an und liefert
 * die zusätzliche Pause in Minuten. Die größte greifende Regel gewinnt
 * (z.B. bei [6h→30min, 9h→45min] werden nach 10h die 45min angewandt).
 *
 * Wichtig: Die Funktion gibt den GESAMT-Pausenabzug zurück, NICHT die
 * Differenz zur bisher eingetragenen Pause. Der Caller entscheidet, ob
 * eine bereits manuell gesetzte Pause übersteuert wird.
 */
export function calculateAutoPause(
  rawWorkMinutes: number,
  rules: AutoPauseRule[]
): number {
  if (!Array.isArray(rules) || rules.length === 0) return 0;
  let effective = 0;
  for (const rule of rules) {
    if (rawWorkMinutes > rule.fromMinutes && rule.pauseMinutes > effective) {
      effective = rule.pauseMinutes;
    }
  }
  return effective;
}
