import React from "react";
import { Calculator, ClipboardList } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";
import { WORK_MODELS } from "../../hooks/constants";

import type { UserData } from "../../types";

interface Props {
  userData: UserData;
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
}

const RecordingModeSettings: React.FC<Props> = ({ userData, setUserData }) => {
  const { t } = useTranslation();
  const simpleMode = !!userData?.simpleMode;

  const setSimpleMode = (nextSimpleMode: boolean) => {
    if (nextSimpleMode === simpleMode) return;
    Haptics.impact({ style: ImpactStyle.Light });
    setUserData((prev: UserData) => ({
      ...prev,
      simpleMode: nextSimpleMode,
      workDays: !nextSimpleMode && !prev.workDays?.some((day) => day > 0)
        ? [...WORK_MODELS[0].days]
        : prev.workDays,
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
