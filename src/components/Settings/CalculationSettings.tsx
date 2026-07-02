import React, { useState, useMemo, useEffect } from "react";
import { Sliders, ChevronDown, Plus, X, Calculator, Upload, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";
import SelectionDrawer from "../SelectionDrawer";
import { recalculateAllEntries } from "../../utils/timeCalculations";
import { getLocale } from "../../locales";
import { getOrthodoxHolidays, getIslamicHolidays } from "../../locales/holidays/religious";
import { logger } from "../../utils/logger";
import {
  displayToMmdd,
  formatHours,
  getHolidayImportOptions,
  HOLIDAY_ON_WORK_OPTION_IDS,
  mmddToDisplay,
  OVERTIME_OPTION_IDS,
  SICK_OPTION_IDS,
} from "../../utils/calculationUi";
import type {
  CalculationConfig,
  OvertimeMode,
  SickOnWorkDayMode,
  HolidayOnWorkDayMode,
  AutoPauseRule,
  UserData,
} from "../../types";
import type { Locale } from "../../locales/types";

/**
 * CalculationSettings — Nachträgliche Bearbeitung der `CalculationConfig`.
 *
 * Zeigt die gleichen Stellschrauben wie der Onboarding-CalculationStep,
 * plus die "Settings-only"-Extras (Auto-Pausen, Urlaubsanspruch).
 *
 * Sichtbar für **alle User** (auch AT/DE/Neutral): wer nichts anpasst,
 * bleibt bei seinen Locale-Defaults. Wer mag, kann auf "Eigener Plan"
 * umschalten, indem er einfach Knöpfe drückt — der Modus wird nicht
 * mehr separat getrackt, weil `calculationConfig` allein alles steuert.
 *
 * Der "Alle Einträge neu berechnen"-Button am Ende ruft
 * `recalculateAllEntries(userData, locale, config)` auf.
 */

interface Props {
  userData: UserData;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
  setCalculationConfig?: (
    next: CalculationConfig | ((prev: CalculationConfig) => CalculationConfig)
  ) => void;
  /**
   * Wenn true, rendert die Komponente ohne eigenen Card-Wrapper, damit
   * sie z.B. in einer kombinierten "Berechnung"-Card eingebettet werden
   * kann. Der Header-Toggle (Klick auf Header → Body kollabieren) bleibt
   * erhalten.
   */
  unwrapped?: boolean;
}

const Wrapper: React.FC<{ unwrapped: boolean; children: React.ReactNode }> = ({
  unwrapped,
  children,
}) =>
  unwrapped ? (
    <div className="space-y-4">{children}</div>
  ) : (
    <Card className="p-4 space-y-4">{children}</Card>
  );

const CalculationSettings: React.FC<Props> = ({
  userData,
  locale,
  calculationConfig,
  setCalculationConfig,
  unwrapped = false,
}) => {
  const { t } = useTranslation();

  const OVERTIME_OPTIONS = useMemo(
    () =>
      OVERTIME_OPTION_IDS.map((id) => ({
        id,
        label: t(`settings.calc.overtimeOptions.${id}`),
      })),
    [t],
  );
  const SICK_OPTIONS = useMemo(
    () =>
      SICK_OPTION_IDS.map((id) => ({
        id,
        label: t(`settings.calc.sickOptions.${id}`),
      })),
    [t],
  );
  const HOLIDAY_ON_WORK_OPTIONS = useMemo(
    () =>
      HOLIDAY_ON_WORK_OPTION_IDS.map((id) => ({
        id,
        label: t(`settings.calc.holidayOnWorkOptions.${id}`),
      })),
    [t],
  );

  const [overtimeDrawerOpen, setOvertimeDrawerOpen] = useState(false);
  const [sickDrawerOpen, setSickDrawerOpen] = useState(false);
  const [holidayWorkDrawerOpen, setHolidayWorkDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customHolidayInput, setCustomHolidayInput] = useState({ mmdd: "", name: "" });
  const [customHalfDayInput, setCustomHalfDayInput] = useState("");
  const [newPauseInput, setNewPauseInput] = useState({ fromHours: "6", pauseMinutes: "30" });
  const [recalcRunning, setRecalcRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Local string buffers for vacation inputs so users can clear the field
  // while typing. Without this, a controlled number input with a NaN-guard
  // in onChange would refuse empty input and keep showing the old value.
  const [vacationAllowanceInput, setVacationAllowanceInput] = useState<string>(
    String(calculationConfig?.vacationAllowanceDays ?? 0),
  );
  const [vacationCarryoverInput, setVacationCarryoverInput] = useState<string>(
    String(calculationConfig?.vacationCarryoverDays ?? 0),
  );
  useEffect(() => {
    setVacationAllowanceInput(String(calculationConfig?.vacationAllowanceDays ?? 0));
  }, [calculationConfig?.vacationAllowanceDays]);
  useEffect(() => {
    setVacationCarryoverInput(String(calculationConfig?.vacationCarryoverDays ?? 0));
  }, [calculationConfig?.vacationCarryoverDays]);

  const customHolidaysMemo = useMemo(
    () => calculationConfig?.holidaySet.customHolidays ?? {},
    [calculationConfig]
  );
  const sortedHolidayEntries = useMemo(
    () => Object.entries(customHolidaysMemo).sort(([a], [b]) => a.localeCompare(b)),
    [customHolidaysMemo]
  );

  const importOptions = useMemo(() => getHolidayImportOptions(t), [t]);

  if (!calculationConfig || !setCalculationConfig) return null;

  const config = calculationConfig;
  const customHolidays = customHolidaysMemo;

  const overtimeLabel =
    OVERTIME_OPTIONS.find((o) => o.id === config.overtimeMode)?.label ?? t("settings.calc.fallbackOvertime");
  const sickLabel =
    SICK_OPTIONS.find((o) => o.id === config.sickOnWorkDayMode)?.label ?? t("settings.calc.fallbackSick");
  const holidayWorkLabel =
    HOLIDAY_ON_WORK_OPTIONS.find((o) => o.id === config.holidayOnWorkDayMode)?.label ??
    t("settings.calc.fallbackHolidayOnWork");

  // --- Handlers -----------------------------------------------------------
  const patch = (partial: Partial<CalculationConfig>) =>
    setCalculationConfig({ ...config, ...partial });

  const handleOvertimeChange = (id: string | number) => {
    const mode = id as OvertimeMode;
    patch({
      overtimeMode: mode,
      overtimeThresholdMinutes:
        mode === "split"
          ? (config.overtimeThresholdMinutes ?? 2400)
          : mode === "none"
            ? null
            : config.overtimeThresholdMinutes,
    });
  };

  const handleThresholdHourInput = (value: string) => {
    const parsed = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    patch({ overtimeThresholdMinutes: Math.round(parsed * 60) });
  };

  const handleSickChange = (id: string | number) => {
    patch({ sickOnWorkDayMode: id as SickOnWorkDayMode });
  };

  const handleHolidayWorkChange = (id: string | number) => {
    patch({ holidayOnWorkDayMode: id as HolidayOnWorkDayMode });
  };

  const handleImportHolidays = (id: string | number) => {
    const key = id as string;
    const year = new Date().getFullYear();
    let base: Record<string, string>;

    if (key === "_orthodox") {
      base = getOrthodoxHolidays(year);
    } else if (key === "_islamic") {
      base = getIslamicHolidays(year);
    } else {
      const loc = getLocale(key as never);
      base = loc.getHolidays(year);
    }

    const next: Record<string, string> = { ...customHolidays };
    for (const [date, name] of Object.entries(base)) {
      next[date.slice(5)] = name;
    }
    patch({
      holidaySet: {
        mode: "custom",
        disabledHolidayKeys: [],
        customHolidays: next,
      },
    });
    toast.success(t("settings.calc.toast.holidaysImported", { count: Object.keys(base).length }));
  };

  const handleRemoveCustomHoliday = (key: string) => {
    const next = { ...customHolidays };
    delete next[key];
    patch({
      holidaySet: { ...config.holidaySet, customHolidays: next },
    });
  };

  const handleAddCustomHoliday = () => {
    const mmdd = displayToMmdd(customHolidayInput.mmdd);
    const name = customHolidayInput.name.trim();
    if (!mmdd || name.length === 0) {
      toast.error(t("settings.calc.toast.formatDateName"));
      return;
    }
    patch({
      holidaySet: {
        mode: "custom",
        disabledHolidayKeys: [],
        customHolidays: { ...customHolidays, [mmdd]: name },
      },
    });
    setCustomHolidayInput({ mmdd: "", name: "" });
  };

  const handleAddCustomHalfDay = (displayInput: string) => {
    const mmdd = displayToMmdd(displayInput);
    if (!mmdd) {
      toast.error(t("settings.calc.toast.formatDate"));
      return;
    }
    if (config.halfDayMode.customHalfDays.includes(mmdd)) return;
    patch({
      halfDayMode: {
        mode: "custom",
        customHalfDays: [...config.halfDayMode.customHalfDays, mmdd],
      },
    });
    setCustomHalfDayInput("");
  };

  const handleRemoveHalfDay = (mmdd: string) => {
    const filtered = config.halfDayMode.customHalfDays.filter((d) => d !== mmdd);
    patch({
      halfDayMode: {
        mode: filtered.length === 0 ? "none" : "custom",
        customHalfDays: filtered,
      },
    });
  };

  const handleAddAutoPause = () => {
    const fromHours = parseFloat(newPauseInput.fromHours.replace(",", "."));
    const pauseMinutes = parseInt(newPauseInput.pauseMinutes, 10);
    if (!Number.isFinite(fromHours) || fromHours <= 0 || !Number.isFinite(pauseMinutes) || pauseMinutes <= 0) {
      toast.error(t("settings.calc.toast.invalidValues"));
      return;
    }
    const rule: AutoPauseRule = {
      fromMinutes: Math.round(fromHours * 60),
      pauseMinutes,
    };
    patch({
      autoPauseRules: [...config.autoPauseRules, rule].sort(
        (a, b) => a.fromMinutes - b.fromMinutes
      ),
    });
    setNewPauseInput({ fromHours: "6", pauseMinutes: "30" });
  };

  const handleRemoveAutoPause = (idx: number) => {
    patch({
      autoPauseRules: config.autoPauseRules.filter((_, i) => i !== idx),
    });
  };

  const handleVacationAllowanceChange = (value: string) => {
    setVacationAllowanceInput(value);
    if (value === "") return;
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const clamped = Math.min(parsed, 365);
    patch({ vacationAllowanceDays: clamped });
  };

  const handleVacationAllowanceBlur = () => {
    const parsed = parseInt(vacationAllowanceInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setVacationAllowanceInput("0");
      patch({ vacationAllowanceDays: 0 });
      return;
    }
    const clamped = Math.min(parsed, 365);
    setVacationAllowanceInput(String(clamped));
    patch({ vacationAllowanceDays: clamped });
  };

  const handleVacationCarryoverChange = (value: string) => {
    setVacationCarryoverInput(value);
    if (value === "" || value === "-") return;
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(-365, Math.min(parsed, 365));
    patch({ vacationCarryoverDays: clamped });
  };

  const handleVacationCarryoverBlur = () => {
    const parsed = parseInt(vacationCarryoverInput, 10);
    if (!Number.isFinite(parsed)) {
      setVacationCarryoverInput("0");
      patch({ vacationCarryoverDays: 0 });
      return;
    }
    const clamped = Math.max(-365, Math.min(parsed, 365));
    setVacationCarryoverInput(String(clamped));
    patch({ vacationCarryoverDays: clamped });
  };

  const handleRecalculate = async () => {
    if (recalcRunning) return;
    setRecalcRunning(true);
    const toastId = toast.loading(t("settings.calc.recalcRunning"));
    try {
      const { total, fixed } = await recalculateAllEntries(userData, locale, config);
      toast.success(
        fixed > 0
          ? t("settings.calc.toast.recalcFixed", { fixed, total })
          : t("settings.calc.toast.recalcAllCorrect", { total }),
        { id: toastId }
      );
    } catch (err) {
      logger.error("[CalculationSettings] Neuberechnung fehlgeschlagen:", err);
      toast.error(t("settings.calc.toast.recalcError"), { id: toastId });
    } finally {
      setRecalcRunning(false);
    }
  };

  return (
    <Wrapper unwrapped={unwrapped}>
      {!unwrapped && (
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
            <Calculator size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-zinc-800 dark:text-white">{t("settings.calc.header")}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("settings.calc.subtitle")}
            </p>
          </div>
          <ChevronDown
            size={18}
            className={`text-zinc-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {!unwrapped && !isExpanded && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("settings.calc.teaser", { overtime: overtimeLabel, sick: sickLabel })}
        </div>
      )}

      {unwrapped && !editOpen && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
            <div>
              <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                {t("settings.calc.contractedHours")}
              </div>
              <div className="text-lg font-bold text-zinc-800 dark:text-white">
                {t("settings.calc.hoursPerWeek", { hours: formatHours(config.weeklyTargetMinutes) })}
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">{t("settings.calc.overtimeRule")}: </span>
                <span className="font-semibold text-zinc-800 dark:text-white">{overtimeLabel}</span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">{t("settings.calc.sickOnWorkDay")}: </span>
                <span className="font-semibold text-zinc-800 dark:text-white">{sickLabel}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="w-full p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            {t("settings.calc.editRules")}
          </button>
        </div>
      )}

      {((unwrapped && editOpen) || (!unwrapped && isExpanded)) && (<>
      {unwrapped && (
        <button
          type="button"
          onClick={() => setEditOpen(false)}
          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
        >
          {t("settings.calc.showLess")}
        </button>
      )}
      {/* Vertragsstunden (Readonly) */}
      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700">
        <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
          {t("settings.calc.contractedHours")}
        </div>
        <div className="text-lg font-bold text-zinc-800 dark:text-white">
          {t("settings.calc.hoursPerWeek", { hours: formatHours(config.weeklyTargetMinutes) })}
        </div>
      </div>

      {/* Überstunden-Regel */}
      <button
        type="button"
        onClick={() => setOvertimeDrawerOpen(true)}
        className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 transition-colors text-left"
      >
        <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-0.5">
          {t("settings.calc.overtimeRule")}
        </div>
        <div className="flex items-center justify-between">
          <div className="font-bold text-zinc-800 dark:text-white text-sm">{overtimeLabel}</div>
          <ChevronDown size={16} className="text-zinc-400" />
        </div>
      </button>

      {config.overtimeMode === "split" && (
        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <label htmlFor="settings-overtime-threshold" className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-2">
            {t("settings.calc.overtimeThresholdLabel")}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="settings-overtime-threshold"
              type="number"
              min={1}
              max={80}
              step={0.5}
              defaultValue={((config.overtimeThresholdMinutes ?? 2400) / 60).toString()}
              onBlur={(e) => handleThresholdHourInput(e.target.value)}
              className="flex-1 p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-800 dark:text-white outline-none"
            />
            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{t("settings.calc.hoursPerWeekUnit")}</span>
          </div>
        </div>
      )}

      {/* Krank-Regel */}
      <button
        type="button"
        onClick={() => setSickDrawerOpen(true)}
        className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 transition-colors text-left"
      >
        <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-0.5">
          {t("settings.calc.sickOnWorkDay")}
        </div>
        <div className="flex items-center justify-between">
          <div className="font-bold text-zinc-800 dark:text-white text-sm">{sickLabel}</div>
          <ChevronDown size={16} className="text-zinc-400" />
        </div>
      </button>

      {/* Feiertage & Halbtage (einklappbar) */}
      <button
        type="button"
        onClick={() => setHolidayOpen((v) => !v)}
        className="w-full p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 font-bold text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Calendar size={14} /> {t("settings.calc.holidaysHalfDays")}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${holidayOpen ? "rotate-180" : ""}`}
        />
      </button>

      {holidayOpen && (
        <div className="space-y-3 pl-2 border-l-2 border-emerald-200 dark:border-emerald-900">
          <button
            type="button"
            onClick={() => setImportDrawerOpen(true)}
            className="w-full p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
          >
            <Upload size={14} />
            {t("settings.calc.importHolidays")}
          </button>

          {sortedHolidayEntries.length === 0 ? (
            <div className="text-xs text-zinc-500 italic text-center py-1">
              {t("settings.calc.noHolidaysActive")}
            </div>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {sortedHolidayEntries.map(([key, name]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-zinc-700 dark:text-zinc-200 truncate">{name}</div>
                    <div className="text-xs text-zinc-500">{mmddToDisplay(key)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomHoliday(key)}
                    className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                    aria-label={t("settings.calc.removeHolidayAria", { name })}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
            <div className="space-y-1">
              <label htmlFor="settings-custom-holiday-date" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.dateLabel")}</label>
              <input
                id="settings-custom-holiday-date"
                type="text"
                placeholder={t("settings.calc.dateFormatPlaceholder")}
                value={customHolidayInput.mmdd}
                onChange={(e) => setCustomHolidayInput((p) => ({ ...p, mmdd: e.target.value }))}
                className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="settings-custom-holiday-name" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.nameLabel")}</label>
              <input
                id="settings-custom-holiday-name"
                type="text"
                placeholder={t("settings.calc.customHolidayPlaceholder")}
                value={customHolidayInput.name}
                onChange={(e) => setCustomHolidayInput((p) => ({ ...p, name: e.target.value }))}
                className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomHoliday}
              className="w-full p-2 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              {t("settings.calc.add")}
            </button>
          </div>

          {/* Halbtage */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700 space-y-2">
            <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
              {t("settings.calc.halfDays")}
            </div>

            {config.halfDayMode.customHalfDays.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.halfDayMode.customHalfDays.map((mmdd) => (
                  <button
                    key={mmdd}
                    type="button"
                    onClick={() => handleRemoveHalfDay(mmdd)}
                    className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 hover:bg-emerald-200 transition-colors"
                  >
                    {mmddToDisplay(mmdd)}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                aria-label={t("settings.calc.dateLabel")}
                type="text"
                placeholder={t("settings.calc.dateFormatPlaceholder")}
                value={customHalfDayInput}
                onChange={(e) => setCustomHalfDayInput(e.target.value)}
                className="flex-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddCustomHalfDay(customHalfDayInput)}
                className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                aria-label={t("settings.calc.addHalfDayAria")}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Feiertag + Arbeit */}
          <button
            type="button"
            onClick={() => setHolidayWorkDrawerOpen(true)}
            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 transition-colors text-left"
          >
            <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-0.5">
              {t("settings.calc.holidayWork")}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-zinc-800 dark:text-white text-sm">{holidayWorkLabel}</div>
              <ChevronDown size={16} className="text-zinc-400" />
            </div>
          </button>
        </div>
      )}

      {/* Erweitert (Auto-Pausen + Urlaubsanspruch) */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="w-full p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 font-bold text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sliders size={14} /> {t("settings.calc.advanced")}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
        />
      </button>

      {advancedOpen && (
        <div className="space-y-4 pl-2 border-l-2 border-emerald-200 dark:border-emerald-900">
          {/* Auto-Pausen */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
              {t("settings.calc.autoPauses")}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("settings.calc.autoPauseInfo")}
            </p>

            {config.autoPauseRules.length > 0 ? (
              <div className="space-y-1">
                {config.autoPauseRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 text-sm"
                  >
                    <div className="font-bold text-zinc-700 dark:text-zinc-200">
                      {t("settings.calc.autoPauseRule", { fromHours: formatHours(rule.fromMinutes), pauseMinutes: rule.pauseMinutes })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAutoPause(idx)}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                      aria-label={t("settings.calc.removeRuleAria")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic">
                {t("settings.calc.noAutoPauseRule")}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <span className="text-xs text-zinc-500">{t("settings.calc.fromLabel")}</span>
              <input
                aria-label={t("settings.calc.fromLabel")}
                type="number"
                min={0}
                step={0.5}
                value={newPauseInput.fromHours}
                onChange={(e) =>
                  setNewPauseInput((p) => ({ ...p, fromHours: e.target.value }))
                }
                className="w-16 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
              />
              <span className="text-xs text-zinc-500">{t("settings.calc.hoursToArrow")}</span>
              <input
                aria-label={t("settings.calc.minUnit")}
                type="number"
                min={0}
                step={5}
                value={newPauseInput.pauseMinutes}
                onChange={(e) =>
                  setNewPauseInput((p) => ({ ...p, pauseMinutes: e.target.value }))
                }
                className="w-16 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
              />
              <span className="text-xs text-zinc-500">{t("settings.calc.minUnit")}</span>
              <button
                type="button"
                onClick={handleAddAutoPause}
                className="ml-auto p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                aria-label={t("settings.calc.addPauseRuleAria")}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Urlaubsanspruch + Resturlaub */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-700">
            <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
              {t("settings.calc.vacation")}
            </div>
            <div className="space-y-1">
              <label htmlFor="settings-vacation-allowance" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.yearlyAllowance")}</label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-vacation-allowance"
                  type="number"
                  min={0}
                  max={365}
                  value={vacationAllowanceInput}
                  onChange={(e) => handleVacationAllowanceChange(e.target.value)}
                  onBlur={handleVacationAllowanceBlur}
                  className="w-24 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-300">{t("settings.calc.days")}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="settings-vacation-carryover" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.remainingCarryover")}</label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-vacation-carryover"
                  type="number"
                  min={-365}
                  max={365}
                  value={vacationCarryoverInput}
                  onChange={(e) => handleVacationCarryoverChange(e.target.value)}
                  onBlur={handleVacationCarryoverBlur}
                  className="w-24 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-300">{t("settings.calc.days")}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                {t("settings.calc.carryoverHint")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recalculate-Button */}
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={recalcRunning}
        className="w-full p-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
      >
        {recalcRunning ? t("settings.calc.recalcRunning") : t("settings.calc.recalcAll")}
      </button>
      </>)}

      <SelectionDrawer
        isOpen={overtimeDrawerOpen}
        onClose={() => setOvertimeDrawerOpen(false)}
        title={t("settings.calc.overtimeRule")}
        options={OVERTIME_OPTIONS}
        value={config.overtimeMode}
        onChange={handleOvertimeChange}
      />

      <SelectionDrawer
        isOpen={sickDrawerOpen}
        onClose={() => setSickDrawerOpen(false)}
        title={t("settings.calc.sickOnWorkDay")}
        options={SICK_OPTIONS}
        value={config.sickOnWorkDayMode}
        onChange={handleSickChange}
      />

      <SelectionDrawer
        isOpen={holidayWorkDrawerOpen}
        onClose={() => setHolidayWorkDrawerOpen(false)}
        title={t("settings.calc.drawerHolidayWork")}
        options={HOLIDAY_ON_WORK_OPTIONS}
        value={config.holidayOnWorkDayMode}
        onChange={handleHolidayWorkChange}
      />

      <SelectionDrawer
        isOpen={importDrawerOpen}
        onClose={() => setImportDrawerOpen(false)}
        title={t("settings.calc.drawerImportHolidays")}
        options={importOptions}
        value=""
        onChange={handleImportHolidays}
      />
    </Wrapper>
  );
};

export default CalculationSettings;
