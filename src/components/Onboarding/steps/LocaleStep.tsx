import React from "react";
import { motion } from "framer-motion";
import { Globe, Check, Info } from "lucide-react";
import type { LocaleId } from "../../../locales/types";
import { GERMAN_STATE_IDS, GERMAN_STATE_NAMES } from "../../../locales";

/**
 * Onboarding-Schritt: Locale / Stundenberechnung auswählen.
 *
 * Drei Optionen:
 *   - Neutral: keine Feiertage, keine Halbtage, kein MA/ÜS-Split
 *   - Österreich: gesetzliche Feiertage, 24./31.12. halbiert, AZG
 *   - Deutschland: bundesweite + regionale Feiertage, 40h-Woche
 *     (Bundesland-Dropdown erscheint bei DE-Auswahl)
 *
 * Die Auswahl wird im Onboarding-FormData als `localeId` abgelegt.
 * Vom WorkSchedule-Schritt wird sie gelesen, um sinnvolle Default-
 * Arbeitsstunden vorzubelegen.
 */
interface Props {
  selectedLocaleId: LocaleId | null;
  onSelect: (id: LocaleId) => void;
}

type TopChoice = "neutral" | "at" | "de";

const LocaleStep: React.FC<Props> = ({ selectedLocaleId, onSelect }) => {
  const topChoice: TopChoice | null = selectedLocaleId
    ? selectedLocaleId === "neutral"
      ? "neutral"
      : selectedLocaleId === "at"
      ? "at"
      : "de"
    : null;

  const currentGermanState =
    selectedLocaleId && selectedLocaleId.startsWith("de-")
      ? (selectedLocaleId.slice(3) as (typeof GERMAN_STATE_IDS)[number])
      : "by";

  const handleDeClick = () => {
    // Default: bei Klick auf DE zunächst Bayern vorauswählen
    onSelect(`de-${currentGermanState}` as LocaleId);
  };

  return (
    <motion.div
      key="step-locale"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Globe size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Stundenberechnung
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Wähl, welche Regeln deine App verwenden soll.
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
        <Info size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed">
          Kannst du jederzeit in den Einstellungen ändern. Beeinflusst automatische
          Feiertage, Halbtage (24./31.12.) und die Aufteilung in Mehrarbeit/Überstunden.
        </p>
      </div>

      <div className="space-y-3">
        {/* Neutral */}
        <button
          type="button"
          onClick={() => onSelect("neutral")}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
            topChoice === "neutral"
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
          }`}
        >
          <div className="font-bold text-zinc-800 dark:text-white">Neutral</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Keine automatischen Feiertage, keine Halbtage, kein MA/ÜS-Split. Für alle
            Berufe & Länder.
          </div>
          {topChoice === "neutral" && (
            <div className="absolute top-4 right-4 text-emerald-500">
              <Check size={18} />
            </div>
          )}
        </button>

        {/* Österreich */}
        <button
          type="button"
          onClick={() => onSelect("at")}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
            topChoice === "at"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
          }`}
        >
          <div className="font-bold text-zinc-800 dark:text-white">Österreich</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            13 gesetzliche Feiertage, 24./31.12. halbiert, Mehrarbeit/Überstunden nach AZG.
          </div>
          {topChoice === "at" && (
            <div className="absolute top-4 right-4 text-blue-500">
              <Check size={18} />
            </div>
          )}
        </button>

        {/* Deutschland */}
        <button
          type="button"
          onClick={handleDeClick}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
            topChoice === "de"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
          }`}
        >
          <div className="font-bold text-zinc-800 dark:text-white">Deutschland</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Bundesweite + regionale Feiertage, 40h-Woche, Mehrarbeit/Überstunden.
          </div>
          {topChoice === "de" && (
            <div className="absolute top-4 right-4 text-blue-500">
              <Check size={18} />
            </div>
          )}
        </button>

        {/* Bundesland-Dropdown erscheint, wenn Deutschland gewählt */}
        {topChoice === "de" && (
          <div className="pl-4 border-l-2 border-blue-300 dark:border-blue-700 ml-2">
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
              Bundesland
            </label>
            <select
              value={currentGermanState}
              onChange={(e) => onSelect(`de-${e.target.value}` as LocaleId)}
              className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white focus:border-blue-500 outline-none"
            >
              {GERMAN_STATE_IDS.map((s) => (
                <option key={s} value={s}>
                  {GERMAN_STATE_NAMES[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LocaleStep;
