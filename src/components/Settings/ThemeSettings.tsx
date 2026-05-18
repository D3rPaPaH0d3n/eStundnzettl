import React from "react";
import { Palette, Sun } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";

import type { Theme } from "../../types";

interface Props {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  materialYouEnabled: boolean;
  setMaterialYouEnabled: (enabled: boolean) => void;
}

const ThemeSettings: React.FC<Props> = ({ theme, setTheme, materialYouEnabled, setMaterialYouEnabled }) => {
  const { t } = useTranslation();

  const handleThemeChange = (newTheme: Theme) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setTheme(newTheme);
  };

  const toggleMaterialYou = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    const next = !materialYouEnabled;
    setMaterialYouEnabled(next);
    toast(next ? t("settings.toast.materialYouOn") : t("settings.toast.materialYouOff"), {
      icon: "🎨",
    });
  };

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-bold text-zinc-700 dark:text-white flex items-center gap-2">
        <Sun size={18} className="text-emerald-400" />
        <span>{t("settings.theme.title")}</span>
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {(["light", "dark", "system"] as const).map((mode) => (
          <button type="button"
            key={mode}
            onClick={() => handleThemeChange(mode as Theme)}
            className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors capitalize
              ${
                theme === mode
                  ? "border-emerald-500 bg-emerald-50 dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400"
                  : "border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
          >
            {t(`settings.theme.${mode}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
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
    </Card>
  );
};

export default ThemeSettings;
