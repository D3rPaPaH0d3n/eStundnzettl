import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, Info, ChevronDown, Plus, X, Calendar, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import SelectionDrawer from "../../SelectionDrawer";
import { getLocale } from "../../../locales";
import { getOrthodoxHolidays, getIslamicHolidays } from "../../../locales/holidays/religious";
import {
  displayToMmdd,
  formatHours,
  getHolidayImportOptions,
  HOLIDAY_ON_WORK_OPTION_IDS,
  mmddToDisplay,
  OVERTIME_OPTION_IDS,
  SICK_OPTION_IDS,
} from "../../../utils/calculationUi";
import type { CalculationConfig, OvertimeMode, SickOnWorkDayMode, HolidayOnWorkDayMode } from "../../../types";

/**
 * Onboarding-Schritt "Eigener Plan": Rechenkonfigurations-Baukasten.
 *
 * Wird nur angezeigt, wenn der User in Step 2 ausdrücklich "Eigener
 * Plan" gewählt hat. Nicht-custom User (Neutral/AT/DE) sehen diesen
 * Schritt nie — ihre Rechenregeln kommen direkt aus dem Locale.
 *
 * Aufbau:
 *   - 3 "Simple"-Karten (Vertragsstunden readonly, Überstunden-Regel,
 *     Krank-Regel) immer sichtbar
 *   - "Erweitert"-Akkordeon mit 3 weiteren Karten (Feiertage,
 *     Halbtage, Feiertag+Arbeit)
 *
 * Alle Änderungen laufen über `onChange(next)` → OnboardingWizard
 * aktualisiert `formData.calcConfig`.
 */

interface Props {
  /** Aktuelle Konfiguration aus `formData.calcConfig`. */
  config: CalculationConfig;
  /** Setter auf `formData.calcConfig`. */
  onChange: (next: CalculationConfig) => void;
  /** Aktuelle Arbeitstage aus Step 3 — für die Wochenstunden-Anzeige. */
  workDays: number[];
}

const CalculationStep: React.FC<Props> = ({ config, onChange, workDays }) => {
  const { t } = useTranslation();

  const OVERTIME_OPTIONS = useMemo(
    () => OVERTIME_OPTION_IDS.map((id) => ({ id, label: t(`settings.calc.overtimeOptions.${id}`) })),
    [t],
  );
  const SICK_OPTIONS = useMemo(
    () => SICK_OPTION_IDS.map((id) => ({ id, label: t(`settings.calc.sickOptions.${id}`) })),
    [t],
  );
  const HOLIDAY_ON_WORK_OPTIONS = useMemo(
    () => HOLIDAY_ON_WORK_OPTION_IDS.map((id) => ({ id, label: t(`settings.calc.holidayOnWorkOptions.${id}`) })),
    [t],
  );

  const [overtimeDrawerOpen, setOvertimeDrawerOpen] = useState(false);
  const [sickDrawerOpen, setSickDrawerOpen] = useState(false);
  const [holidayWorkDrawerOpen, setHolidayWorkDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customHolidayInput, setCustomHolidayInput] = useState({ display: "", name: "" });
  const [customHalfDayInput, setCustomHalfDayInput] = useState("");

  const weeklyMinutes = useMemo(
    () => workDays.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0),
    [workDays]
  );

  const customHolidays = useMemo(
    () => config.holidaySet.customHolidays ?? {},
    [config.holidaySet.customHolidays]
  );
  const sortedHolidayEntries = useMemo(
    () => Object.entries(customHolidays).sort(([a], [b]) => a.localeCompare(b)),
    [customHolidays]
  );

  // --- Live-Preview-Helfer ------------------------------------------------
  const overtimePreview = useMemo(() => {
    // Beispiel: Mo 10h Arbeit mit dem aktuell konfigurierten Wochensoll
    const workMinutes = 600;
    const dayTarget = 480; // 8h Beispiel
    const weekTarget = weeklyMinutes > 0 ? weeklyMinutes : 2310;
    const mehrarbeitBuffer = Math.max(
      0,
      (config.overtimeThresholdMinutes ?? 2400) - weekTarget
    );
    const balance = Math.max(0, workMinutes - dayTarget);
    if (config.overtimeMode === "none") {
      return t("onboarding.calc.preview.overtimeNone", {
        weekTarget: formatHours(weekTarget),
        balance: formatHours(balance),
      });
    }
    if (config.overtimeMode === "ueberstunden_only") {
      return t("onboarding.calc.preview.overtimeAll", {
        balance: formatHours(balance),
      });
    }
    const ma = Math.min(balance, mehrarbeitBuffer);
    const ue = Math.max(0, balance - ma);
    return t("onboarding.calc.preview.overtimeSplit", {
      ma: formatHours(ma),
      ue: formatHours(ue),
    });
  }, [config.overtimeMode, config.overtimeThresholdMinutes, weeklyMinutes, t]);

  const sickPreview = useMemo(() => {
    switch (config.sickOnWorkDayMode) {
      case "cap_to_target":
        return t("onboarding.calc.preview.sickCap");
      case "additive":
        return t("onboarding.calc.preview.sickAdditive");
      case "ignore":
        return t("onboarding.calc.preview.sickIgnore");
    }
  }, [config.sickOnWorkDayMode, t]);

  // --- Handlers -----------------------------------------------------------
  const handleOvertimeChange = (id: string | number) => {
    const mode = id as OvertimeMode;
    onChange({
      ...config,
      overtimeMode: mode,
      // Default 40h/Woche wenn Split aktiviert wird und noch keine Schwelle gesetzt
      overtimeThresholdMinutes:
        mode === "split"
          ? (config.overtimeThresholdMinutes ?? 2400)
          : mode === "none"
            ? null
            : config.overtimeThresholdMinutes,
    });
  };

  const handleSickChange = (id: string | number) => {
    onChange({ ...config, sickOnWorkDayMode: id as SickOnWorkDayMode });
  };

  const handleHolidayWorkChange = (id: string | number) => {
    onChange({ ...config, holidayOnWorkDayMode: id as HolidayOnWorkDayMode });
  };

  const handleThresholdHourInput = (value: string) => {
    const parsed = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onChange({
      ...config,
      overtimeThresholdMinutes: Math.round(parsed * 60),
    });
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
      const mmdd = date.slice(5);
      next[mmdd] = name;
    }
    onChange({
      ...config,
      holidaySet: {
        mode: "custom",
        disabledHolidayKeys: [],
        customHolidays: next,
      },
    });
  };

  const handleRemoveCustomHoliday = (key: string) => {
    const next = { ...customHolidays };
    delete next[key];
    onChange({
      ...config,
      holidaySet: {
        ...config.holidaySet,
        customHolidays: next,
      },
    });
  };

  const handleAddCustomHoliday = () => {
    const mmdd = displayToMmdd(customHolidayInput.display);
    const name = customHolidayInput.name.trim();
    if (!mmdd || name.length === 0) return;
    onChange({
      ...config,
      holidaySet: {
        mode: "custom",
        disabledHolidayKeys: [],
        customHolidays: { ...customHolidays, [mmdd]: name },
      },
    });
    setCustomHolidayInput({ display: "", name: "" });
  };

  const handleAddCustomHalfDay = (displayInput: string) => {
    const mmdd = displayToMmdd(displayInput);
    if (!mmdd) return;
    if (config.halfDayMode.customHalfDays.includes(mmdd)) return;
    onChange({
      ...config,
      halfDayMode: {
        mode: "custom",
        customHalfDays: [...config.halfDayMode.customHalfDays, mmdd],
      },
    });
    setCustomHalfDayInput("");
  };

  const handleRemoveHalfDay = (mmdd: string) => {
    const filtered = config.halfDayMode.customHalfDays.filter((d) => d !== mmdd);
    onChange({
      ...config,
      halfDayMode: {
        mode: filtered.length === 0 ? "none" : "custom",
        customHalfDays: filtered,
      },
    });
  };

  const handleAddClassicHalfDays = () => {
    const existing = new Set(config.halfDayMode.customHalfDays);
    existing.add("12-24");
    existing.add("12-31");
    onChange({
      ...config,
      halfDayMode: {
        mode: "custom",
        customHalfDays: Array.from(existing).sort(),
      },
    });
  };

  const importOptions = useMemo(() => getHolidayImportOptions(t), [t]);

  const overtimeLabel =
    OVERTIME_OPTIONS.find((o) => o.id === config.overtimeMode)?.label ?? t("settings.calc.fallbackOvertime");
  const sickLabel =
    SICK_OPTIONS.find((o) => o.id === config.sickOnWorkDayMode)?.label ?? t("settings.calc.fallbackSick");
  const holidayWorkLabel =
    HOLIDAY_ON_WORK_OPTIONS.find((o) => o.id === config.holidayOnWorkDayMode)?.label ??
    t("settings.calc.fallbackHolidayOnWork");

  return (
    <motion.div
      key="step-calculation"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Sliders size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {t("onboarding.calc.title")}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t("onboarding.calc.subtitle")}
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
        <Info size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed">
          {t("onboarding.calc.infoHint")}
        </p>
      </div>

      {/* Card 1: Vertragsstunden Readonly */}
      <div className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-1">
        <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
          {t("settings.calc.contractedHours")}
        </div>
        <div className="text-xl font-bold text-zinc-800 dark:text-white">
          {t("settings.calc.hoursPerWeek", { hours: formatHours(weeklyMinutes) })}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("onboarding.calc.contractedHoursAuto")}
        </div>
      </div>

      {/* Card 2: Überstunden-Regel */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOvertimeDrawerOpen(true)}
          className="w-full p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors text-left"
        >
          <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
            {t("settings.calc.overtimeRule")}
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-zinc-800 dark:text-white">{overtimeLabel}</div>
            <ChevronDown size={18} className="text-zinc-400" />
          </div>
        </button>

        {config.overtimeMode === "split" && (
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <label htmlFor="onboarding-overtime-threshold" className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-2">
              {t("settings.calc.overtimeThresholdLabel")}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="onboarding-overtime-threshold"
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

        <div className="text-xs text-zinc-500 dark:text-zinc-400 italic px-1">
          {overtimePreview}
        </div>
      </div>

      {/* Card 3: Krank-Regel */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setSickDrawerOpen(true)}
          className="w-full p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors text-left"
        >
          <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
            {t("settings.calc.sickOnWorkDay")}
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-zinc-800 dark:text-white">{sickLabel}</div>
            <ChevronDown size={18} className="text-zinc-400" />
          </div>
        </button>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 italic px-1">
          {sickPreview}
        </div>
      </div>

      {/* Erweitert-Toggle */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="w-full p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        {advancedOpen ? t("onboarding.calc.advancedClose") : t("onboarding.calc.advancedOpen")}
        <ChevronDown
          size={16}
          className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {advancedOpen && (
          <motion.div
            key="advanced"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-4"
          >
            {/* Card 4: Feiertage */}
            <div className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.calc.holidaysTitle")}</div>
              </div>

              <button
                type="button"
                onClick={() => setImportDrawerOpen(true)}
                className="w-full p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                <Upload size={14} />
                {t("settings.calc.importHolidays")}
              </button>

              {sortedHolidayEntries.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-2">
                  {t("onboarding.calc.noHolidays")}
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
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
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label={t("settings.calc.removeHolidayAria", { name })}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Eigener Feiertag hinzufügen */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700 space-y-2">
                <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                  {t("onboarding.calc.customHolidayTitle")}
                </div>
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="onboarding-custom-holiday-date" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.dateLabel")}</label>
                    <input
                      id="onboarding-custom-holiday-date"
                      type="text"
                      placeholder={t("settings.calc.dateFormatPlaceholder")}
                      value={customHolidayInput.display}
                      onChange={(e) =>
                        setCustomHolidayInput((p) => ({ ...p, display: e.target.value }))
                      }
                      className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="onboarding-custom-holiday-name" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.nameLabel")}</label>
                    <input
                      id="onboarding-custom-holiday-name"
                      type="text"
                      placeholder={t("settings.calc.customHolidayPlaceholder")}
                      value={customHolidayInput.name}
                      onChange={(e) =>
                        setCustomHolidayInput((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomHoliday}
                    className="w-full p-2.5 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    {t("settings.calc.add")}
                  </button>
                </div>
              </div>
            </div>

            {/* Card 5: Halbtage */}
            <div className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.calc.halfDaysTitle")}</div>
              </div>

              {config.halfDayMode.customHalfDays.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-2">
                  {t("onboarding.calc.noHalfDays")}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {config.halfDayMode.customHalfDays.map((mmdd) => (
                    <button
                      key={mmdd}
                      type="button"
                      onClick={() => handleRemoveHalfDay(mmdd)}
                      className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      {mmddToDisplay(mmdd)}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddClassicHalfDays}
                className="w-full p-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                {t("onboarding.calc.classicHalfDays")}
              </button>

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

            {/* Card 6: Feiertag + Arbeit */}
            <button
              type="button"
              onClick={() => setHolidayWorkDrawerOpen(true)}
              className="w-full p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors text-left"
            >
              <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                {t("settings.calc.holidayWork")}
              </div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-zinc-800 dark:text-white">{holidayWorkLabel}</div>
                <ChevronDown size={18} className="text-zinc-400" />
              </div>
            </button>

            {/* Card 7: Urlaubstage */}
            <div className="p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-3">
              <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                {t("onboarding.calc.vacationTitle")}
              </div>
              <div className="space-y-1">
                <label htmlFor="onboarding-vacation-allowance" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.yearlyAllowance")}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="onboarding-vacation-allowance"
                    type="number"
                    min={0}
                    max={365}
                    value={config.vacationAllowanceDays}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      if (Number.isFinite(parsed) && parsed >= 0) onChange({ ...config, vacationAllowanceDays: parsed });
                    }}
                    className="w-24 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">{t("settings.calc.days")}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="onboarding-vacation-carryover" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t("settings.calc.remainingCarryover")}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="onboarding-vacation-carryover"
                    type="number"
                    min={-365}
                    max={365}
                    value={config.vacationCarryoverDays}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      if (Number.isFinite(parsed)) onChange({ ...config, vacationCarryoverDays: parsed });
                    }}
                    className="w-24 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">{t("settings.calc.days")}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                  {t("settings.calc.carryoverHint")}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        value={""}
        onChange={handleImportHolidays}
      />
    </motion.div>
  );
};

export default CalculationStep;
