import React from "react";
import { motion } from "framer-motion";
import { Briefcase, Check, Info, ClipboardList, Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WORK_MODELS } from "../../../hooks/constants";

import type { WorkModel } from "../../../types";

/**
 * Onboarding-Schritt 3: Arbeitszeit einstellen.
 *
 * - Mode-Auswahl: "Nur Aufzeichnung" (simpleMode) oder "Soll/Ist-Berechnung"
 * - Benutzerdefinierte Tages-Slider stehen IMMER an erster Stelle und
 *   sind der aktive Modus — der User kann seine Stunden sofort selbst
 *   einstellen. Die Vorbelegung kommt aus `locale.defaultWorkDays`
 *   (im OnboardingWizard beim Verlassen des Locale-Steps gesetzt).
 * - Darunter steht eine optionale Liste der vordefinierten Modelle
 *   (38,5 h, 40 h, 4-Tage-Woche ...), mit denen der User auf Wunsch
 *   ein Preset als Ausgangswert einspielen kann. Der "Benutzerdefiniert"-
 *   Eintrag aus WORK_MODELS wird hier ausgeblendet, weil die Slider
 *   bereits die aktive Custom-Ansicht sind.
 * - Zusätzlich der "Minütige Zeiteingabe"-Toggle.
 */

interface OnboardingFormData {
  name: string;
  company: string;
  role: string;
  photo: string | null;
  workDays: number[];
  autoBackup: boolean;
  localBackupEnabled: boolean;
  minuteInput: boolean;
  simpleMode?: boolean;
}

interface Props {
  formData: OnboardingFormData;
  onModelSelect: (model: WorkModel) => void;
  onCustomDayChange: (dayIndex: number, value: string) => void;
  isSelected: (days: number[] | undefined) => boolean;
  totalWeeklyMinutes: number;
  minToHours: (m: number) => string;
  onMinuteInputToggle: () => void;
  onSimpleModeToggle: () => void;
}

const WorkScheduleStep: React.FC<Props> = ({
  formData,
  onModelSelect,
  onCustomDayChange,
  isSelected,
  totalWeeklyMinutes,
  minToHours,
  onMinuteInputToggle,
  onSimpleModeToggle,
}) => {
  const { t } = useTranslation();
  const simpleMode = !!formData.simpleMode;
  // Presets für die optionale Liste unterhalb der Slider — ohne den
  // 'custom'-Entry, denn die Slider SIND bereits die aktive Custom-Ansicht.
  const selectablePresets = WORK_MODELS.filter((m) => m.id !== "custom");

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
          <Briefcase size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("onboarding.workSchedule.title")}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t("onboarding.workSchedule.subtitle")}</p>
      </div>

      {/* Mode-Auswahl */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { if (!simpleMode) return; onSimpleModeToggle(); }}
          className={`p-4 rounded-xl border-2 text-center transition-all ${
            !simpleMode
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
          }`}
        >
          <Calculator size={24} className="mx-auto mb-2 text-blue-600" />
          <div className="font-bold text-sm text-zinc-800 dark:text-white">{t("onboarding.workSchedule.modeTargetActual")}</div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">{t("onboarding.workSchedule.modeTargetActualHint")}</div>
        </button>
        <button
          type="button"
          onClick={() => { if (simpleMode) return; onSimpleModeToggle(); }}
          className={`p-4 rounded-xl border-2 text-center transition-all ${
            simpleMode
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
          }`}
        >
          <ClipboardList size={24} className="mx-auto mb-2 text-emerald-600" />
          <div className="font-bold text-sm text-zinc-800 dark:text-white">{t("onboarding.workSchedule.modeSimple")}</div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">{t("onboarding.workSchedule.modeSimpleHint")}</div>
        </button>
      </div>

      {simpleMode && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <Info size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
            {t("onboarding.workSchedule.simpleInfo")}
          </p>
        </div>
      )}

      {!simpleMode && (
        <>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
            <Info size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              {t("onboarding.workSchedule.customInfo")}
            </p>
          </div>

          {/* 1. Immer aktiv: benutzerdefinierte Slider */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">
              {t("onboarding.workSchedule.dailyHoursTitle")}
            </h3>
            <div className="space-y-3">
              {/*
                Anzeige-Reihenfolge Mo..So (ISO-Woche), während das
                darunterliegende workDays-Array weiter in JS-Date-Reihenfolge
                [So, Mo, Di, Mi, Do, Fr, Sa] indexiert ist (entspricht
                Date.getDay() mit 0 = Sonntag). Wir mappen hier nur die UI.
              */}
              {[
                { label: t("settings.weekdays.mon"), idx: 1 },
                { label: t("settings.weekdays.tue"), idx: 2 },
                { label: t("settings.weekdays.wed"), idx: 3 },
                { label: t("settings.weekdays.thu"), idx: 4 },
                { label: t("settings.weekdays.fri"), idx: 5 },
                { label: t("settings.weekdays.sat"), idx: 6 },
                { label: t("settings.weekdays.sun"), idx: 0 },
              ].map(({ label, idx }) => {
                const isWeekend = idx === 0 || idx === 6;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold w-6 ${
                        isWeekend ? "text-red-400" : "text-zinc-500"
                      }`}
                    >
                      {label}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="720"
                      step="15"
                      value={formData.workDays[idx]}
                      onChange={(e) => onCustomDayChange(idx, e.target.value)}
                      className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">
                      {minToHours(formData.workDays[idx])}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
              <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
                {t("onboarding.workSchedule.weeklyHours")}
              </span>
              <span className="text-lg font-bold text-emerald-500">
                {minToHours(totalWeeklyMinutes)}
              </span>
            </div>
          </div>

          {/* 2. Optionale Presets (überschreiben die Slider bei Klick) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase px-1">
              {t("onboarding.workSchedule.presetsTitle")}
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {selectablePresets.map((model) => {
                const selected = isSelected(model.days);
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onModelSelect(model)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all relative ${
                      selected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="font-bold text-sm text-zinc-800 dark:text-white">
                      {model.label}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {model.description}
                    </div>
                    {selected && (
                      <div className="absolute top-3 right-3 text-blue-500">
                        <Check size={18} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Minütige Zeiteingabe Toggle */}
      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⏱️</div>
          <div>
            <div className="font-bold text-sm text-zinc-800 dark:text-white">
              {t("onboarding.workSchedule.minuteInputTitle")}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{t("onboarding.workSchedule.minuteInputHint")}</div>
          </div>
        </div>
        <button
          type="button"
          aria-label={t("onboarding.workSchedule.minuteInputAria")}
          onClick={onMinuteInputToggle}
          className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
            formData.minuteInput ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        >
          <div
            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              formData.minuteInput ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </motion.div>
  );
};

export default WorkScheduleStep;
