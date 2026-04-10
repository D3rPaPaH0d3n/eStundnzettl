import React, { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Check, ChevronDown, ChevronUp } from "lucide-react";
import { WORK_CODE_PRESETS } from "../../../hooks/constants";

/**
 * Onboarding-Schritt: Tätigkeitscodes auswählen.
 *
 * Default: "Allgemein" (fünf neutrale Basis-Codes).
 * Alternativ: "Keine Codes" (leere Liste, User legt selbst an).
 * Branchen-Presets (z.B. Kogler Aufzugsbau) sind optional und liegen
 * hinter einem "Erweiterte Presets anzeigen"-Toggle, damit neue User
 * nicht mit branchenspezifischen Codes überfahren werden.
 *
 * Die Auswahl wird als Preset-ID im FormData abgelegt; der
 * OnboardingWizard lädt das Preset beim Abschluss.
 */
type BasicPresetId = "allgemein" | "leer";
type AdvancedPresetId = "kogler";
export type WorkCodePresetId = BasicPresetId | AdvancedPresetId;

interface Props {
  selectedPresetId: WorkCodePresetId;
  onSelect: (id: WorkCodePresetId) => void;
}

const BASIC_PRESETS: Array<{ id: BasicPresetId; title: string; subtitle: string }> = [
  {
    id: "allgemein",
    title: "Allgemein",
    subtitle: "5 neutrale Codes (Arbeit, Büro, Besprechung, Fahrzeit, Sonstiges)",
  },
  {
    id: "leer",
    title: "Keine Codes",
    subtitle: "Starte leer — du legst deine Tätigkeiten später selbst an",
  },
];

const ADVANCED_PRESET_IDS: AdvancedPresetId[] = ["kogler"];

const WorkCodesStep: React.FC<Props> = ({ selectedPresetId, onSelect }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <motion.div
      key="step-workcodes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
          <ClipboardList size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Tätigkeiten
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Wähl, mit welchen Codes du deine Stunden zuordnen willst.
        </p>
      </div>

      <div className="space-y-3">
        {BASIC_PRESETS.map((preset) => {
          const selected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                selected
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
              }`}
            >
              <div className="font-bold text-zinc-800 dark:text-white">{preset.title}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {preset.subtitle}
              </div>
              {selected && (
                <div className="absolute top-4 right-4 text-emerald-500">
                  <Check size={18} />
                </div>
              )}
            </button>
          );
        })}

        {/* Advanced-Presets collapsible */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 uppercase transition-colors"
        >
          <span>Branchen-Presets (optional)</span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="space-y-3 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700">
            {ADVANCED_PRESET_IDS.map((id) => {
              const preset = WORK_CODE_PRESETS[id];
              if (!preset) return null;
              const selected = selectedPresetId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                    selected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
                  }`}
                >
                  <div className="font-bold text-zinc-800 dark:text-white">{preset.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {preset.description} ({preset.codes.length} Codes)
                  </div>
                  {selected && (
                    <div className="absolute top-4 right-4 text-blue-500">
                      <Check size={18} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
        Codes kannst du später jederzeit in den Einstellungen ändern oder ergänzen.
      </p>
    </motion.div>
  );
};

export default WorkCodesStep;
