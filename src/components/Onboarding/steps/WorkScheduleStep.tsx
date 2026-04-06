import React from "react";
import { motion } from "framer-motion";
import { Briefcase, Check, Info } from "lucide-react";
import { WORK_MODELS } from "../../../hooks/constants";

interface WorkScheduleStepProps {
  formData: any;
  onModelSelect: (model: any) => void;
  onCustomDayChange: (dayIndex: number, minutes: number) => void;
  isSelected: (modelId: string) => boolean;
  isCustomModelActive: boolean;
  totalWeeklyMinutes: number;
  minToHours: (minutes: number) => string;
  onMinuteInputToggle: (enabled: boolean) => void;
}

/**
 * Onboarding-Schritt 2: Arbeitszeit-Modell auswählen.
 *
 * - Liste der vordefinierten Modelle (38,5 h, 40 h, 4-Tage-Woche ...)
 * - Falls der User ein eigenes Modell einstellt (isCustomModelActive),
 *   erscheinen Slider für die Tages-Arbeitszeiten (So ... Sa).
 * - Zusätzlich der "Minütige Zeiteingabe"-Toggle.
 */
const WorkScheduleStep: React.FC<WorkScheduleStepProps> = ({
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
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Briefcase size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Wie arbeitest du?</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Wähle dein Arbeitszeit-Modell.</p>
      </div>

      <div className="space-y-3">
        {WORK_MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => onModelSelect(model)}
            className={`w-full p-4 rounded-xl text-left transition-colors ${
              isSelected(model.id)
                ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{model.label}</div>
                <div className="text-sm text-zinc-500 mt-1">
                  {model.days.map(day => ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][day]).join(", ")}
                </div>
              </div>
              {isSelected(model.id) && (
                <Check size={20} className="text-emerald-500" />
              )}
            </div>
          </button>
        ))}
      </div>

      {isCustomModelActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-4">
            <div className="font-medium">Individuelle Arbeitszeiten</div>
            {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((day, idx) => (
              <div key={day} className="flex items-center justify-between">
                <div className="w-8 font-medium">{day}</div>
                <div className="flex-1 mx-4">
                  <input
                    type="range"
                    min="0"
                    max="600"
                    step="15"
                    value={formData.customDays?.[idx] || 0}
                    onChange={(e) => onCustomDayChange(idx, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="w-16 text-right">
                  {minToHours(formData.customDays?.[idx] || 0)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-zinc-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <strong>{minToHours(totalWeeklyMinutes)}</strong> Wochenstunden
              {isCustomModelActive && " (individuell)"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Diese Einstellung bestimmt dein wöchentliches Soll für die Überstunden-Berechnung.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
        <div>
          <div className="font-medium">Minütige Zeiteingabe</div>
          <div className="text-sm text-zinc-500">
            Einträge in Minuten statt 15-Minuten-Schritten
          </div>
        </div>
        <button
          onClick={() => onMinuteInputToggle(!formData.minuteInputEnabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            formData.minuteInputEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              formData.minuteInputEnabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </motion.div>
  );
};

export default WorkScheduleStep;