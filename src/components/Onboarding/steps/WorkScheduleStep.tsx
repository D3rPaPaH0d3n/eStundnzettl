import React from "react";
import { motion } from "framer-motion";
import { Briefcase, Check, Info } from "lucide-react";
import { WORK_MODELS } from "../../../hooks/constants";

import type { WorkModel } from "../../../types";

/**
 * Onboarding-Schritt 2: Arbeitszeit-Modell auswählen.
 *
 * - Liste der vordefinierten Modelle (38,5 h, 40 h, 4-Tage-Woche ...)
 * - Falls der User ein eigenes Modell einstellt (isCustomModelActive),
 *   erscheinen Slider für die Tages-Arbeitszeiten (So ... Sa).
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
}

interface Props {
  formData: OnboardingFormData;
  onModelSelect: (model: WorkModel) => void;
  onCustomDayChange: (dayIndex: number, value: string) => void;
  isSelected: (days: number[] | undefined) => boolean;
  isCustomModelActive: boolean;
  totalWeeklyMinutes: number;
  minToHours: (m: number) => string;
  onMinuteInputToggle: () => void;
}

const WorkScheduleStep: React.FC<Props> = ({
  formData,
  onModelSelect,
  onCustomDayChange,
  isSelected,
  isCustomModelActive,
  totalWeeklyMinutes,
  minToHours,
  onMinuteInputToggle,
}) => {
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
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Wie viel arbeitest du?</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Damit wir Soll, Ist & Überstunden richtig rechnen.</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
        <Info size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
          Wähl einfach das Modell, das am besten passt. Kannst du später in den
          Einstellungen jederzeit ändern — auch tageweise individuell.
        </p>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {WORK_MODELS.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onModelSelect(model)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
              isSelected(model.days)
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
            }`}
          >
            <div className="font-bold text-zinc-800 dark:text-white">{model.label}</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{model.description}</div>
            {isSelected(model.days) && (
              <div className="absolute top-4 right-4 text-blue-500">
                <Check size={20} />
              </div>
            )}
          </button>
        ))}

        {isCustomModelActive && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">
                Tagesstunden anpassen
              </h3>
              <div className="space-y-3">
                {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((dayName, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold w-6 ${
                        idx === 0 || idx === 6 ? "text-red-400" : "text-zinc-500"
                      }`}
                    >
                      {dayName}
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
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  Wochenstunden:
                </span>
                <span className="text-lg font-bold text-emerald-500">
                  {minToHours(totalWeeklyMinutes)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minütige Zeiteingabe Toggle */}
      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⏱️</div>
          <div>
            <div className="font-bold text-sm text-zinc-800 dark:text-white">
              Minutengenau erfassen
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Sonst in praktischen 15-Min-Schritten</div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Minütige Zeiteingabe umschalten"
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
