import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Globe, Check, Info, ChevronDown, Sliders } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LocaleId } from "../../../locales/types";
import { GERMAN_STATE_IDS, GERMAN_STATE_NAMES, SWISS_KANTON_IDS, SWISS_KANTON_NAMES } from "../../../locales";
import SelectionDrawer from "../../SelectionDrawer";

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
  /** Aktuell auf "Eigener Plan" geklickt? Erhöht die visuelle Markierung. */
  customPlanSelected?: boolean;
  /** Wird aufgerufen wenn der User "Eigener Plan" wählt. Aktiviert den Baukasten-Schritt. */
  onSelectCustomPlan?: () => void;
}

type TopChoice = "neutral" | "at" | "de" | "ch" | "custom";

const LocaleStep: React.FC<Props> = ({
  selectedLocaleId,
  onSelect,
  customPlanSelected = false,
  onSelectCustomPlan,
}) => {
  const { t } = useTranslation();
  const [stateDrawerOpen, setStateDrawerOpen] = useState(false);
  const [kantonDrawerOpen, setKantonDrawerOpen] = useState(false);

  const stateOptions = useMemo(
    () => GERMAN_STATE_IDS.map((s) => ({ id: s, label: GERMAN_STATE_NAMES[s] })),
    []
  );

  const kantonOptions = useMemo(
    () => SWISS_KANTON_IDS.map((k) => ({ id: k, label: SWISS_KANTON_NAMES[k] })),
    []
  );

  const topChoice: TopChoice | null = customPlanSelected
    ? "custom"
    : selectedLocaleId
      ? selectedLocaleId === "neutral"
        ? "neutral"
        : selectedLocaleId === "at"
          ? "at"
          : selectedLocaleId.startsWith("ch-")
            ? "ch"
            : "de"
      : null;

  const currentSwissKanton =
    selectedLocaleId && selectedLocaleId.startsWith("ch-")
      ? (selectedLocaleId.slice(3) as (typeof SWISS_KANTON_IDS)[number])
      : "zh";

  const currentGermanState =
    selectedLocaleId && selectedLocaleId.startsWith("de-")
      ? (selectedLocaleId.slice(3) as (typeof GERMAN_STATE_IDS)[number])
      : "by";

  const handleDeClick = () => {
    onSelect(`de-${currentGermanState}` as LocaleId);
  };

  const handleChClick = () => {
    onSelect(`ch-${currentSwissKanton}` as LocaleId);
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
          {t("onboarding.locale.title")}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t("onboarding.locale.subtitle")}
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
        <Info size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed">
          {t("onboarding.locale.infoHint")}
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
          <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.locale.neutralTitle")}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("onboarding.locale.neutralDescription")}
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
          <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.locale.austriaTitle")}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("onboarding.locale.austriaDescription")}
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
          <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.locale.germanyTitle")}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("onboarding.locale.germanyDescription")}
          </div>
          {topChoice === "de" && (
            <div className="absolute top-4 right-4 text-blue-500">
              <Check size={18} />
            </div>
          )}
        </button>

        {/* Bundesland-Picker (Deutschland) */}
        {topChoice === "de" && (
          <div className="pl-4 border-l-2 border-blue-300 dark:border-blue-700 ml-2">
            <div className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
              {t("onboarding.locale.stateLabel")}
            </div>
            <button
              type="button"
              onClick={() => setStateDrawerOpen(true)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white hover:border-blue-500 transition-colors"
            >
              <span className="flex-1 text-left">
                {GERMAN_STATE_NAMES[currentGermanState]}
              </span>
              <ChevronDown size={18} className="text-zinc-400 ml-2" />
            </button>
          </div>
        )}

        {/* Schweiz */}
        <button
          type="button"
          onClick={handleChClick}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
            topChoice === "ch"
              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-red-300"
          }`}
        >
          <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.locale.switzerlandTitle")}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("onboarding.locale.switzerlandDescription")}
          </div>
          {topChoice === "ch" && (
            <div className="absolute top-4 right-4 text-red-500">
              <Check size={18} />
            </div>
          )}
        </button>

        {/* Kantons-Picker (Schweiz) */}
        {topChoice === "ch" && (
          <div className="pl-4 border-l-2 border-red-300 dark:border-red-700 ml-2">
            <div className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
              {t("onboarding.locale.kantonLabel")}
            </div>
            <button
              type="button"
              onClick={() => setKantonDrawerOpen(true)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white hover:border-red-500 transition-colors"
            >
              <span className="flex-1 text-left">
                {SWISS_KANTON_NAMES[currentSwissKanton]}
              </span>
              <ChevronDown size={18} className="text-zinc-400 ml-2" />
            </button>
          </div>
        )}

        {/* Eigener Plan — löst den Baukasten-Schritt aus */}
        {onSelectCustomPlan && (
          <button
            type="button"
            onClick={onSelectCustomPlan}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
              topChoice === "custom"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-emerald-600 dark:text-emerald-400" />
              <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.locale.customTitle")}</div>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {t("onboarding.locale.customDescription")}
            </div>
            {topChoice === "custom" && (
              <div className="absolute top-4 right-4 text-emerald-500">
                <Check size={18} />
              </div>
            )}
          </button>
        )}
      </div>

      <SelectionDrawer
        isOpen={stateDrawerOpen}
        onClose={() => setStateDrawerOpen(false)}
        title={t("onboarding.locale.stateDrawerTitle")}
        options={stateOptions}
        value={currentGermanState}
        onChange={(id) => onSelect(`de-${id}` as LocaleId)}
      />

      <SelectionDrawer
        isOpen={kantonDrawerOpen}
        onClose={() => setKantonDrawerOpen(false)}
        title={t("onboarding.locale.kantonDrawerTitle")}
        options={kantonOptions}
        value={currentSwissKanton}
        onChange={(id) => onSelect(`ch-${id}` as LocaleId)}
      />
    </motion.div>
  );
};

export default LocaleStep;
