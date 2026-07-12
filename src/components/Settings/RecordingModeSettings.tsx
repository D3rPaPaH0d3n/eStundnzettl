import React, { useState } from "react";
import { Calculator, ClipboardList, Target } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";
import { WORK_MODELS } from "../../hooks/constants";
import { DEFAULT_LOCALE_ID, getLocale } from "../../locales";
import { formatMonthlyTargetInput, parseMonthlyTargetInput } from "../../utils/monthlyTarget";
import MonthlyTargetInput from "../MonthlyTargetInput";

import type { UserData } from "../../types";
import type { Locale, LocaleId } from "../../locales/types";

interface Props {
  userData: UserData;
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
  locale?: Locale;
  setLocale?: (id: LocaleId) => void;
  resetCalculationConfigToLocale?: (newLocale: Locale, workDays: number[]) => void;
}

const RecordingModeSettings: React.FC<Props> = ({
  userData,
  setUserData,
  locale,
  setLocale,
  resetCalculationConfigToLocale,
}) => {
  const { t } = useTranslation();
  const simpleMode = !!userData?.simpleMode;
  const [targetInput, setTargetInput] = useState(
    () => formatMonthlyTargetInput(userData.monthlyTargetMinutes),
  );
  const targetEnabled = userData.monthlyTargetMinutes !== undefined;
  const targetInvalid = targetEnabled && parseMonthlyTargetInput(targetInput) === undefined;

  const setMonthlyTargetEnabled = (enabled: boolean) => {
    setTargetInput(enabled ? "30:00" : "");
    setUserData((previous) => ({
      ...previous,
      monthlyTargetMinutes: enabled ? 1800 : undefined,
    }));
  };

  const updateMonthlyTarget = (value: string) => {
    setTargetInput(value);
    const parsed = parseMonthlyTargetInput(value);
    if (parsed !== undefined) {
      setUserData((previous) => ({
        ...previous,
        monthlyTargetMinutes: parsed,
      }));
    }
  };

  const restoreValidMonthlyTarget = () => {
    if (targetInvalid) {
      setTargetInput(formatMonthlyTargetInput(userData.monthlyTargetMinutes));
    }
  };

  const setSimpleMode = (nextSimpleMode: boolean) => {
    if (nextSimpleMode === simpleMode) return;
    Haptics.impact({ style: ImpactStyle.Light });
    const targetLocale = !nextSimpleMode && (!locale || locale.id === "neutral")
      ? getLocale(DEFAULT_LOCALE_ID)
      : locale;
    const nextWorkDays = !nextSimpleMode && !userData.workDays?.some((day) => day > 0)
      ? [...(targetLocale?.defaultWorkDays ?? WORK_MODELS[0].days)]
      : userData.workDays;

    if (!nextSimpleMode && targetLocale && targetLocale.id !== locale?.id) {
      setLocale?.(targetLocale.id);
    }
    if (!nextSimpleMode && targetLocale) {
      resetCalculationConfigToLocale?.(targetLocale, nextWorkDays);
    }

    setUserData((prev: UserData) => ({
      ...prev,
      simpleMode: nextSimpleMode,
      workDays: nextWorkDays,
    }));
    toast.success(
      nextSimpleMode
        ? t("settings.recordingMode.toastSimple")
        : t("settings.recordingMode.toastCalculated"),
    );
  };

  return (
    <Card className="overflow-visible">
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 shrink-0">
            {simpleMode ? <ClipboardList size={20} /> : <Calculator size={20} />}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-800 dark:text-white">
              {t("settings.recordingMode.title")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {simpleMode
                ? t("settings.recordingMode.subtitleSimple")
                : t("settings.recordingMode.subtitleCalculated")}
            </p>
          </div>
        </div>

        {simpleMode && (
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={targetEnabled}
                onChange={(event) => setMonthlyTargetEnabled(event.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span>
                <span className="flex items-center gap-2 font-bold text-sm text-zinc-800 dark:text-white">
                  <Target size={16} className="text-emerald-600" />
                  {t("settings.recordingMode.monthlyTarget.title")}
                </span>
                <span className="block mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t("settings.recordingMode.monthlyTarget.description")}
                </span>
              </span>
            </label>
            {targetEnabled && (
              <div>
                <div className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                  {t("settings.recordingMode.monthlyTarget.inputLabel")}
                </div>
                <MonthlyTargetInput
                  idPrefix="settings-monthly-target"
                  value={targetInput}
                  onChange={updateMonthlyTarget}
                  onBlur={restoreValidMonthlyTarget}
                  invalid={targetInvalid}
                  describedBy="settings-monthly-target-hint"
                />
                <p id="settings-monthly-target-hint" className={`mt-1 text-xs ${targetInvalid ? "text-red-600" : "text-zinc-500"}`}>
                  {targetInvalid
                    ? t("settings.recordingMode.monthlyTarget.invalid")
                    : t("settings.recordingMode.monthlyTarget.hint")}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSimpleMode(true)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              simpleMode
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <ClipboardList size={22} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-zinc-800 dark:text-white">
                  {t("settings.recordingMode.simpleTitle")}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {t("settings.recordingMode.simpleDescription")}
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSimpleMode(false)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              !simpleMode
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <Calculator size={22} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-zinc-800 dark:text-white">
                  {t("settings.recordingMode.calculatedTitle")}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {t("settings.recordingMode.calculatedDescription")}
                </div>
              </div>
            </div>
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
          {t("settings.recordingMode.noDataLossHint")}
        </p>
      </div>
    </Card>
  );
};

export default RecordingModeSettings;
