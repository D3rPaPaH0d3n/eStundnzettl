import React, { useState } from "react";
import { Calculator, FlaskConical, Palette, Wrench } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";
import ConfirmModal from "../ConfirmModal";
import { recalculateAllEntries } from "../../utils/timeCalculations";
import { logger } from "../../utils/logger";

import type { CalculationConfig, UserData } from "../../types";
import type { Locale } from "../../locales/types";

interface Props {
  userData: UserData;
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
  materialYouEnabled: boolean;
  setMaterialYouEnabled: (enabled: boolean) => void;
  onLoadDemoData?: () => void;
  locale?: Locale;
  calculationConfig?: CalculationConfig | null;
}

const ExpertModeSettings: React.FC<Props> = ({
  userData,
  setUserData,
  materialYouEnabled,
  setMaterialYouEnabled,
  onLoadDemoData,
  locale,
  calculationConfig,
}) => {
  const { t } = useTranslation();
  const expertMode = userData?.expertMode ?? false;
  const [showRecalcWarning, setShowRecalcWarning] = useState(false);

  const toggleExpertMode = () => {
    Haptics.impact({ style: ImpactStyle.Medium });
    const next = !expertMode;
    setUserData((prev: UserData) => ({ ...prev, expertMode: next }));
    toast(next ? t("settings.toast.expertOn") : t("settings.toast.expertOff"), {
      icon: next ? "🔧" : "🔒",
    });
  };

  const toggleMaterialYou = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    const next = !materialYouEnabled;
    setMaterialYouEnabled(next);
    toast(next ? t("settings.toast.materialYouOn") : t("settings.toast.materialYouOff"), {
      icon: "🎨",
    });
  };

  const handleConfirmRecalculate = async () => {
    Haptics.impact({ style: ImpactStyle.Medium });
    try {
      const { total, fixed } = await recalculateAllEntries(userData, locale, calculationConfig);
      if (fixed > 0) {
        toast.success(t("settings.appInfo.recalcFixed", { fixed, total }));
      } else {
        toast.success(t("settings.appInfo.recalcAllCorrect", { total }));
      }
    } catch (err) {
      logger.error("[ExpertModeSettings] Neuberechnung fehlgeschlagen:", err);
      toast.error(t("settings.appInfo.recalcError"));
    }
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-full shrink-0 ${expertMode ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"}`}>
              <Wrench size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base text-zinc-800 dark:text-white">
                {t("settings.expertMode.title")}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {expertMode ? t("settings.expertMode.on") : t("settings.expertMode.off")}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={expertMode}
              onChange={toggleExpertMode}
            />
            <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-amber-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        {expertMode && (
          <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/30 space-y-3">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {t("settings.expertMode.description")}
            </p>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300 shrink-0">
                  <Palette size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-zinc-800 dark:text-white">
                    {t("settings.materialYou.title")}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {t("settings.materialYou.description")}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={materialYouEnabled}
                  onChange={toggleMaterialYou}
                />
                <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-violet-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRecalcWarning(true)}
                className="flex-1 py-2 px-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Calculator size={14} />
                {t("settings.appInfo.recalc")}
              </button>
              <button
                type="button"
                onClick={onLoadDemoData}
                className="flex-1 py-2 px-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <FlaskConical size={14} />
                {t("settings.appInfo.demoData")}
              </button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={showRecalcWarning}
        onClose={() => setShowRecalcWarning(false)}
        onConfirm={() => {
          setShowRecalcWarning(false);
          handleConfirmRecalculate();
        }}
        title={t("settings.appInfo.recalcModalTitle")}
        message={t("settings.appInfo.recalcModalMessage")}
        confirmText={t("settings.appInfo.recalc")}
        confirmColor="emerald"
      />
    </>
  );
};

export default ExpertModeSettings;
