import React from "react";
import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import CollapsibleCard from "./CollapsibleCard";
import LocaleSettings from "./LocaleSettings";
import ThemeSettings from "./ThemeSettings";

import type { Theme } from "../../types";
import type { Locale, LocaleId } from "../../locales/types";

interface Props {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  materialYouEnabled: boolean;
  setMaterialYouEnabled: (enabled: boolean) => void;
  locale?: Locale;
  setLocale?: (id: LocaleId) => void;
  workDays?: number[];
  onAfterLocaleChange?: (newLocale: Locale, workDays: number[]) => void;
}

const AppearanceSettings: React.FC<Props> = ({
  theme,
  setTheme,
  materialYouEnabled,
  setMaterialYouEnabled,
  locale,
  setLocale,
  workDays,
  onAfterLocaleChange,
}) => {
  const { t } = useTranslation();

  return (
    <CollapsibleCard
      title={t("settings.appearance.title")}
      subtitle={t("settings.appearance.subtitle")}
      icon={
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600">
          <Palette size={20} />
        </div>
      }
      defaultExpanded={false}
      bodyClassName="px-4 pb-4 pt-0 space-y-4"
    >
      <LocaleSettings
        mode="language"
        locale={locale}
        setLocale={setLocale}
        workDays={workDays}
        onAfterLocaleChange={onAfterLocaleChange}
      />
      <ThemeSettings
        theme={theme}
        setTheme={setTheme}
        materialYouEnabled={materialYouEnabled}
        setMaterialYouEnabled={setMaterialYouEnabled}
      />
    </CollapsibleCard>
  );
};

export default AppearanceSettings;
