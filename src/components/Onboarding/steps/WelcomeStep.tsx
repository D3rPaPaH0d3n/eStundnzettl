import React from "react";
import { motion } from "framer-motion";
import { Calculator, ClipboardList, FlaskConical, Lock, RefreshCw, Smartphone, WifiOff } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import AppLogo from "../../../assets/logo.png";

/**
 * Onboarding-Schritt 0: Willkommen.
 *
 * Klare Startpfade:
 *  - Nur Arbeitszeiten eintragen -> Fast Path mit Profil, danach fertig
 *  - Mit Berechnung & Auswertung -> voller Setup-Flow
 *  - Backup wiederherstellen     -> Restore-Flow
 *  - Demo ansehen                -> kleiner Nebenlink
 */

interface Props {
  onStartSimple: () => void;
  onStartNew: () => void;
  onStartRestore: () => void;
  onDemoMode: () => void;
}

const WelcomeStep: React.FC<Props> = ({ onStartSimple, onStartNew, onStartRestore, onDemoMode }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 flex flex-col items-center justify-center py-4"
    >
      <div className="text-center space-y-3">
        <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto shadow-xl shadow-emerald-500/20 ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-zinc-800">
          <img
            src={AppLogo}
            alt={t("onboarding.welcome.logoAlt")}
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          {t("onboarding.welcome.hello")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-300 font-medium">
          {t("onboarding.welcome.glad")}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[300px] mx-auto leading-relaxed">
          <Trans
            i18nKey="onboarding.welcome.intro"
            components={{
              brand: <span className="font-bold text-emerald-600 dark:text-emerald-400" />,
            }}
          />
        </p>
      </div>

      {/* Kern-Versprechen: 3 Mini-Badges */}
      <div className="w-full grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <Smartphone size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-center text-emerald-700 dark:text-emerald-300 leading-tight">{t("onboarding.welcome.badgeMobile")}</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <WifiOff size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-center text-emerald-700 dark:text-emerald-300 leading-tight">{t("onboarding.welcome.badgeOffline")}</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <Lock size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-center text-emerald-700 dark:text-emerald-300 leading-tight">{t("onboarding.welcome.badgePrivate")}</span>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        <button
          type="button"
          onClick={onStartSimple}
          className="w-full p-4 bg-emerald-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-start gap-3 text-left"
        >
          <ClipboardList size={22} className="shrink-0 mt-0.5" />
          <span>
            <span className="block">{t("onboarding.welcome.simpleStart")}</span>
            <span className="block text-xs font-medium text-emerald-50/90 mt-0.5">{t("onboarding.welcome.simpleStartHint")}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onStartNew}
          className="w-full p-4 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-2xl font-bold text-sm hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all flex items-start gap-3 text-left"
        >
          <Calculator size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <span>
            <span className="block">{t("onboarding.welcome.calculatedStart")}</span>
            <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{t("onboarding.welcome.calculatedStartHint")}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onStartRestore}
          className="w-full p-4 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-sm hover:border-emerald-200 dark:hover:border-zinc-600 hover:bg-emerald-50/50 dark:hover:bg-zinc-700/50 transition-all flex items-center justify-center gap-3"
        >
          <RefreshCw size={18} />
          {t("onboarding.welcome.restore")}
        </button>

        <button
          type="button"
          onClick={onDemoMode}
          className="w-full p-2 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center gap-2"
        >
          <FlaskConical size={14} />
          {t("onboarding.welcome.demo")}
        </button>
      </div>
    </motion.div>
  );
};

export default WelcomeStep;
