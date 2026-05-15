import React, { useState, useMemo } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { LocaleId } from "../locales/types";
import { GERMAN_STATE_IDS, GERMAN_STATE_NAMES } from "../locales";
import SelectionDrawer from "./SelectionDrawer";

/**
 * LocaleMigrationModal — einmalig erscheinendes Popup für bestehende
 * User nach dem Update auf das Locale-System. Fragt, welche Stunden-
 * berechnung künftig verwendet werden soll: Österreich (wie bisher,
 * empfohlen für bestehende User), Deutschland inkl. Bundesland, oder
 * Neutral (keine automatischen Feiertage/Spezialregeln).
 *
 * Trigger-Logik liegt in App.tsx: nur anzeigen, wenn
 *   - `locale === null` (noch nie gesetzt)
 *   - UND bestehende Einträge vorhanden sind (neue User sehen
 *     stattdessen den erweiterten Onboarding-Wizard)
 */
interface Props {
  isOpen: boolean;
  onChoose: (localeId: LocaleId) => void;
}

type Choice = "at" | "de" | "neutral" | null;

const LocaleMigrationModal: React.FC<Props> = ({ isOpen, onChoose }) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<Choice>("at");
  const [germanState, setGermanState] = useState<string>("by");
  const [stateDrawerOpen, setStateDrawerOpen] = useState(false);

  const stateOptions = useMemo(
    () => GERMAN_STATE_IDS.map((s) => ({ id: s, label: GERMAN_STATE_NAMES[s] })),
    []
  );

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!choice) return;
    if (choice === "at") onChoose("at");
    else if (choice === "neutral") onChoose("neutral");
    else if (choice === "de") onChoose(`de-${germanState}` as LocaleId);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 mx-auto">
            <Globe className="text-emerald-600 dark:text-emerald-400" size={28} />
          </div>

          <h3 className="text-xl font-bold text-center text-zinc-900 dark:text-white mb-2">
            {t("modals.localeMigration.title")}
          </h3>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-relaxed mb-6">
            {t("modals.localeMigration.description")}
          </p>

          <div className="space-y-3">
            {/* Österreich */}
            <button
              type="button"
              onClick={() => setChoice("at")}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                choice === "at"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
              }`}
            >
              <div className="font-bold text-zinc-800 dark:text-white">
                {t("modals.localeMigration.austriaTitle")} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">{t("modals.localeMigration.austriaNote")}</span>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t("modals.localeMigration.austriaDescription")}
              </div>
              {choice === "at" && (
                <div className="absolute top-4 right-4 text-blue-500">
                  <Check size={18} />
                </div>
              )}
            </button>

            {/* Deutschland */}
            <button
              type="button"
              onClick={() => setChoice("de")}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                choice === "de"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
              }`}
            >
              <div className="font-bold text-zinc-800 dark:text-white">{t("modals.localeMigration.germanyTitle")}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t("modals.localeMigration.germanyDescription")}
              </div>
              {choice === "de" && (
                <div className="absolute top-4 right-4 text-blue-500">
                  <Check size={18} />
                </div>
              )}
            </button>

            {/* Bundesland-Picker nur wenn DE gewählt */}
            {choice === "de" && (
              <div className="pl-4 border-l-2 border-blue-300 dark:border-blue-700 ml-2">
                <div className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
                  {t("modals.localeMigration.stateLabel")}
                </div>
                <button
                  type="button"
                  onClick={() => setStateDrawerOpen(true)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white hover:border-blue-500 transition-colors"
                >
                  <span className="flex-1 text-left">
                    {GERMAN_STATE_NAMES[germanState as keyof typeof GERMAN_STATE_NAMES]}
                  </span>
                  <ChevronDown size={18} className="text-zinc-400 ml-2" />
                </button>
              </div>
            )}

            {/* Neutral */}
            <button
              type="button"
              onClick={() => setChoice("neutral")}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                choice === "neutral"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
              }`}
            >
              <div className="font-bold text-zinc-800 dark:text-white">{t("modals.localeMigration.neutralTitle")}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t("modals.localeMigration.neutralDescription")}
              </div>
              {choice === "neutral" && (
                <div className="absolute top-4 right-4 text-emerald-500">
                  <Check size={18} />
                </div>
              )}
            </button>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-5">
            {t("modals.localeMigration.changeLater")}
          </p>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700">
          <button type="button"
            onClick={handleConfirm}
            disabled={!choice}
            className="w-full py-3 px-4 rounded-xl font-bold transition-colors shadow-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white shadow-emerald-900/20"
          >
            {t("common.apply")}
          </button>
        </div>
      </motion.div>

      <SelectionDrawer
        isOpen={stateDrawerOpen}
        onClose={() => setStateDrawerOpen(false)}
        title={t("modals.localeMigration.stateSelect")}
        options={stateOptions}
        value={germanState}
        onChange={(id) => setGermanState(String(id))}
      />
    </div>
  );
};

export default LocaleMigrationModal;
