import React, { useState, useMemo } from "react";
import { Globe, ChevronDown, Languages } from "lucide-react";
import toast from "react-hot-toast";
import { Trans, useTranslation } from "react-i18next";
import { Card } from "../../utils";
import { useLocaleSetting } from "../../hooks/useLocaleSetting";
import type { Locale, LocaleId } from "../../locales/types";
import {
  GERMAN_STATE_IDS, GERMAN_STATE_NAMES, type GermanState,
  SWISS_KANTON_IDS, SWISS_KANTON_NAMES, type SwissKanton,
  getLocale,
} from "../../locales";
import SelectionDrawer from "../SelectionDrawer";
import ConfirmModal from "../ConfirmModal";

/**
 * Locale-Auswahl in den Settings: erlaubt dem User, die Stunden-
 * berechnung nachträglich umzustellen. Die Auswahl wirkt sich sofort
 * auf Dashboard, PDF-Export und Feiertags-Markierungen aus; vergangene
 * Einträge bleiben unverändert.
 */
interface Props {
  locale?: Locale;
  setLocale?: (id: LocaleId) => void;
  /** Aktuelle Arbeitstage — wird für den Reset-Default der CalcConfig genutzt. */
  workDays?: number[];
  /**
   * Optionaler Callback, der nach einer bestätigten Locale-Änderung die
   * `CalculationConfig` auf die neuen Locale-Defaults zurücksetzt.
   * Wenn der User im Confirm-Dialog "Nein" wählt, bleibt die Config
   * unverändert (dann wird der Callback nicht aufgerufen).
   */
  onAfterLocaleChange?: (newLocale: Locale, workDays: number[]) => void;
}

type Group = "neutral" | "at" | "de" | "ch";

const LocaleSettings: React.FC<Props> = ({ locale, setLocale, workDays, onAfterLocaleChange }) => {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLocaleSetting();
  const [stateDrawerOpen, setStateDrawerOpen] = useState(false);
  const [kantonDrawerOpen, setKantonDrawerOpen] = useState(false);
  const [pendingLocaleId, setPendingLocaleId] = useState<LocaleId | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const stateOptions = useMemo(
    () => GERMAN_STATE_IDS.map((s) => ({ id: s, label: GERMAN_STATE_NAMES[s] })),
    []
  );

  const kantonOptions = useMemo(
    () => SWISS_KANTON_IDS.map((k) => ({ id: k, label: SWISS_KANTON_NAMES[k] })),
    []
  );

  if (!locale || !setLocale) return null;

  const currentGroup: Group =
    locale.id === "neutral"
      ? "neutral"
      : locale.id === "at"
        ? "at"
        : locale.id.startsWith("ch-")
          ? "ch"
          : "de";

  const currentGermanState: GermanState | null =
    locale.id.startsWith("de-")
      ? (locale.id.slice(3) as GermanState)
      : null;

  const currentSwissKanton: SwissKanton | null =
    locale.id.startsWith("ch-")
      ? (locale.id.slice(3) as SwissKanton)
      : null;

  // Wenn ein onAfterLocaleChange-Callback vorhanden ist, erst Confirm-
  // Dialog zeigen. Sonst sofort umschalten (Legacy-Pfad).
  const initiateLocaleChange = (nextId: LocaleId) => {
    if (!onAfterLocaleChange) {
      setLocale(nextId);
      return true;
    }
    setPendingLocaleId(nextId);
    setConfirmModalOpen(true);
    return false;
  };

  const handleGroupChange = (group: Group) => {
    if (group === "neutral") {
      if (initiateLocaleChange("neutral")) toast.success(t("settings.locale.toast.switchedNeutral"));
    } else if (group === "at") {
      if (initiateLocaleChange("at")) toast.success(t("settings.locale.toast.switchedAustria"));
    } else if (group === "ch") {
      const nextId: LocaleId = (currentSwissKanton
        ? `ch-${currentSwissKanton}`
        : "ch-zh") as LocaleId;
      if (initiateLocaleChange(nextId)) toast.success(t("settings.locale.toast.switchedSwitzerland"));
    } else {
      const nextId: LocaleId = (currentGermanState
        ? `de-${currentGermanState}`
        : "de-by") as LocaleId;
      if (initiateLocaleChange(nextId)) toast.success(t("settings.locale.toast.switchedGermany"));
    }
  };

  const handleGermanStateChange = (id: string | number) => {
    const stateCode = id as GermanState;
    if (initiateLocaleChange(`de-${stateCode}` as LocaleId)) {
      toast.success(t("settings.locale.toast.stateChanged", { name: GERMAN_STATE_NAMES[stateCode] }));
    }
  };

  const handleSwissKantonChange = (id: string | number) => {
    const kCode = id as SwissKanton;
    if (initiateLocaleChange(`ch-${kCode}` as LocaleId)) {
      toast.success(t("settings.locale.toast.kantonChanged", { name: SWISS_KANTON_NAMES[kCode] }));
    }
  };

  const handleConfirmReset = () => {
    if (!pendingLocaleId || !onAfterLocaleChange || !setLocale) {
      setConfirmModalOpen(false);
      setPendingLocaleId(null);
      return;
    }
    setLocale(pendingLocaleId);
    onAfterLocaleChange(getLocale(pendingLocaleId), workDays ?? []);
    toast.success(t("settings.locale.toast.rulesReset"));
    setConfirmModalOpen(false);
    setPendingLocaleId(null);
  };

  const handleKeepConfig = () => {
    if (!pendingLocaleId || !setLocale) {
      setConfirmModalOpen(false);
      setPendingLocaleId(null);
      return;
    }
    // Nur Locale umschalten, Config unverändert lassen
    setLocale(pendingLocaleId);
    toast.success(t("settings.locale.toast.localeSwitchedKeepConfig"));
    setConfirmModalOpen(false);
    setPendingLocaleId(null);
  };

  const handleLanguageChange = (next: (typeof supportedLanguages)[number]) => {
    if (language === next) return;
    setLanguage(next);
    toast.success(t("settings.language.toast"));
  };

  return (
    <>
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600">
          <Languages size={20} />
        </div>
        <div>
          <h3 className="font-bold text-zinc-800 dark:text-white">{t("settings.language.header")}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("settings.language.subtitle")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {supportedLanguages.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => handleLanguageChange(lng)}
            className={`p-3 rounded-xl border-2 text-center text-sm font-bold transition-all ${
              language === lng
                ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-sky-300"
            }`}
          >
            {t(`settings.language.${lng}`)}
          </button>
        ))}
      </div>
    </Card>

    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
          <Globe size={20} />
        </div>
        <div>
          <h3 className="font-bold text-zinc-800 dark:text-white">{t("settings.locale.header")}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("settings.locale.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleGroupChange("neutral")}
          className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
            currentGroup === "neutral"
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-300"
          }`}
        >
          {t("settings.locale.group.neutral")}
        </button>
        <button
          type="button"
          onClick={() => handleGroupChange("at")}
          className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
            currentGroup === "at"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-300"
          }`}
        >
          {t("settings.locale.group.austria")}
        </button>
        <button
          type="button"
          onClick={() => handleGroupChange("de")}
          className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
            currentGroup === "de"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-300"
          }`}
        >
          {t("settings.locale.group.germany")}
        </button>
        <button
          type="button"
          onClick={() => handleGroupChange("ch")}
          className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
            currentGroup === "ch"
              ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-red-300"
          }`}
        >
          {t("settings.locale.group.switzerland")}
        </button>
      </div>

      {currentGroup === "de" && (
        <div>
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
            {t("settings.locale.stateLabel")}
          </label>
          <button
            type="button"
            onClick={() => setStateDrawerOpen(true)}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white hover:border-blue-500 transition-colors"
          >
            <span className="flex-1 text-left">
              {GERMAN_STATE_NAMES[currentGermanState ?? "by"]}
            </span>
            <ChevronDown size={18} className="text-zinc-400 ml-2" />
          </button>
        </div>
      )}

      {currentGroup === "ch" && (
        <div>
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
            {t("settings.locale.kantonLabel")}
          </label>
          <button
            type="button"
            onClick={() => setKantonDrawerOpen(true)}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white hover:border-red-500 transition-colors"
          >
            <span className="flex-1 text-left">
              {SWISS_KANTON_NAMES[currentSwissKanton ?? "zh"]}
            </span>
            <ChevronDown size={18} className="text-zinc-400 ml-2" />
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        <Trans
          i18nKey="settings.locale.active"
          values={{ name: locale.name }}
          components={{ b: <span className="font-bold" /> }}
        />
      </p>

      <SelectionDrawer
        isOpen={stateDrawerOpen}
        onClose={() => setStateDrawerOpen(false)}
        title={t("settings.locale.stateDrawerTitle")}
        options={stateOptions}
        value={currentGermanState ?? "by"}
        onChange={handleGermanStateChange}
      />

      <SelectionDrawer
        isOpen={kantonDrawerOpen}
        onClose={() => setKantonDrawerOpen(false)}
        title={t("settings.locale.kantonDrawerTitle")}
        options={kantonOptions}
        value={currentSwissKanton ?? "zh"}
        onChange={handleSwissKantonChange}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={handleKeepConfig}
        onConfirm={handleConfirmReset}
        title={t("settings.locale.confirmTitle")}
        message={t("settings.locale.confirmMessage")}
        confirmText={t("settings.locale.confirmConfirm")}
        confirmColor="emerald"
      />
    </Card>
    </>
  );
};

export default LocaleSettings;
