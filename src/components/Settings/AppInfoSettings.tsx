import React from "react";
import {
  RefreshCw,
  BookOpen,
  History,
  AlertTriangle,
  Trash2,
  Shield,
  Globe,
  Code2,
  Coffee,
  FileText,
  Scale,
  Mail,
} from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Browser } from "@capacitor/browser";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";
import { APP_VERSION } from "../../hooks/constants";
import { logger } from "../../utils/logger";

interface Props {
  onCheckUpdate?: () => void;
  onDeleteAll?: () => void;
  onShowHelp?: () => void;
  onShowChangelog?: () => void;
}

const AppInfoSettings: React.FC<Props> = ({
  onCheckUpdate,
  onDeleteAll,
  onShowHelp,
  onShowChangelog,
}) => {
  const { t } = useTranslation();
  const openExternalLink = async (url: string) => {
    Haptics.impact({ style: ImpactStyle.Light });
    try {
      await Browser.open({ url });
    } catch (err) {
      logger.error("[AppInfoSettings] Link konnte nicht geöffnet werden:", err);
      toast.error(t("settings.appInfo.linkError"));
    }
  };

  const openMailto = (email: string) => {
    Haptics.impact({ style: ImpactStyle.Light });
    try {
      window.location.href = `mailto:${email}`;
    } catch (err) {
      logger.error("[AppInfoSettings] Mail-App konnte nicht geöffnet werden:", err);
      toast.error(t("settings.appInfo.mailError"));
    }
  };

  return (
    <>
      <div data-settings-tour="help-card">
        <Card className="p-5 space-y-3">
        <h3 className="font-bold text-zinc-700 dark:text-white">
          {t("settings.appInfo.sectionInfoTitle")}
        </h3>

        <button type="button"
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onCheckUpdate?.();
          }}
          className="w-full py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <RefreshCw size={18} /> {t("settings.appInfo.playStore")}
        </button>

        <button type="button"
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onShowHelp?.();
          }}
          className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <BookOpen size={18} /> {t("settings.appInfo.help")}
        </button>

        <button type="button"
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onShowChangelog?.();
          }}
          className="w-full py-3 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
        >
          <History size={18} /> {t("settings.appInfo.changelog")}
        </button>
        </Card>
      </div>

      {/* Über — Links zu Datenschutz, Website, GitHub */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-zinc-700 dark:text-white">
          {t("settings.appInfo.sectionAboutTitle")}
        </h3>

        <button type="button"
          onClick={() => openExternalLink("https://d3rpapah0d3n.github.io/eStundnzettl/privacy.html")}
          className="w-full py-3 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          <Shield size={18} /> {t("settings.appInfo.privacy")}
        </button>

        <button type="button"
          onClick={() => openExternalLink("https://kainer.co.at/projekte/estundnzettl/")}
          className="w-full py-3 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          <Globe size={18} /> {t("settings.appInfo.website")}
        </button>

        <button type="button"
          onClick={() => openExternalLink("https://github.com/D3rPaPaH0d3n/eStundnzettl")}
          className="w-full py-3 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          <Code2 size={18} /> {t("settings.appInfo.sourceCode")}
        </button>

        {/* Rechtliches & Kontakt — kompakter 3-Spalten-Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button type="button"
            onClick={() => openExternalLink("https://d3rpapah0d3n.github.io/eStundnzettl/impressum.html")}
            className="py-2 px-1 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <FileText size={16} />
            <span>{t("settings.appInfo.imprint")}</span>
          </button>

          <button type="button"
            onClick={() => openExternalLink("https://github.com/D3rPaPaH0d3n/eStundnzettl/blob/main/LICENSE")}
            className="py-2 px-1 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <Scale size={16} />
            <span>{t("settings.appInfo.license")}</span>
          </button>

          <button type="button"
            onClick={() => openMailto("project@kainer.co.at")}
            className="py-2 px-1 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <Mail size={16} />
            <span>{t("settings.appInfo.contact")}</span>
          </button>
        </div>

        <button type="button"
          onClick={() => openExternalLink("https://revolut.me/mkainer/pocket/QAt1Q0Ntsb")}
          className="w-full py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800"
        >
          <Coffee size={18} /> {t("settings.appInfo.donate")}
        </button>
      </Card>

      {/* Danger Zone */}
      <Card className="p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle
            className="text-red-600 dark:text-red-400"
            size={20}
          />
          <h3 className="font-bold text-red-700 dark:text-red-400">
            {t("settings.appInfo.dangerTitle")}
          </h3>
        </div>

        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4 font-medium leading-relaxed">
          {t("settings.appInfo.dangerBody")}
        </p>

        <button type="button"
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Medium });
            onDeleteAll?.();
          }}
          className="w-full py-3 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={18} /> {t("settings.appInfo.deleteAll")}
        </button>
      </Card>

      {/* Footer */}
      <div className="text-center space-y-1 pb-4">
        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
          {t("settings.appInfo.versionLabel", { version: APP_VERSION })}
        </p>
        <p className="text-[10px] text-zinc-300 dark:text-zinc-600 font-medium">
          {t("settings.appInfo.credits")}
        </p>
      </div>
    </>
  );
};

export default AppInfoSettings;
