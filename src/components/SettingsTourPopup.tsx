import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Calculator,
  Check,
  DatabaseBackup,
  HelpCircle,
  Palette,
  Settings2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFirstOpenHint } from "../hooks/useFirstOpenHint";

interface TourStepDefinition {
  key: string;
  icon: LucideIcon;
  color: "emerald" | "blue" | "amber" | "violet" | "zinc";
}

const STEPS: TourStepDefinition[] = [
  { key: "overview", icon: Settings2, color: "emerald" },
  { key: "profile", icon: UserRound, color: "blue" },
  { key: "recording", icon: BriefcaseBusiness, color: "emerald" },
  { key: "codes", icon: BriefcaseBusiness, color: "amber" },
  { key: "calculation", icon: Calculator, color: "violet" },
  { key: "backup", icon: DatabaseBackup, color: "blue" },
  { key: "appearanceHelp", icon: Palette, color: "zinc" },
  { key: "done", icon: HelpCircle, color: "emerald" },
];

const colorMap = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-600 dark:text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
    dot: "bg-emerald-500",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-600 dark:text-blue-300",
    btn: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
    dot: "bg-blue-500",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-600 dark:text-amber-300",
    btn: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800",
    dot: "bg-amber-500",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-600 dark:text-violet-300",
    btn: "bg-violet-600 hover:bg-violet-700 active:bg-violet-800",
    dot: "bg-violet-500",
  },
  zinc: {
    bg: "bg-zinc-200 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    btn: "bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:hover:bg-white dark:text-zinc-900",
    dot: "bg-zinc-500",
  },
};

interface Props {
  storageKey: string;
}

const SettingsTourPopup: React.FC<Props> = ({ storageKey }) => {
  const { t } = useTranslation();
  const { visible, dismiss } = useFirstOpenHint(storageKey);
  const [index, setIndex] = useState(0);

  const steps = useMemo(
    () =>
      STEPS.map((step) => ({
        ...step,
        title: t(`settingsTour.steps.${step.key}.title`),
        body: t(`settingsTour.steps.${step.key}.body`),
      })),
    [t],
  );

  const step = steps[index];
  const Icon = step.icon;
  const colors = colorMap[step.color];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const handleNext = () => {
    if (isLast) {
      dismiss();
      return;
    }
    setIndex((current) => current + 1);
  };

  const handleBack = () => {
    if (!isFirst) setIndex((current) => current - 1);
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] pointer-events-auto"
          />

          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-tour-title"
            className="relative w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index
                        ? `w-6 ${colors.dot}`
                        : i < index
                          ? "w-1.5 bg-emerald-300 dark:bg-emerald-700"
                          : "w-1.5 bg-zinc-200 dark:bg-zinc-600"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t("common.close")}
                className="p-1.5 -mr-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pt-3 pb-5 flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}
              >
                <Icon size={22} className={colors.text} />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="settings-tour-title"
                  className="text-base font-bold text-zinc-900 dark:text-white leading-tight"
                >
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mt-1">
                  {step.body}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/30">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirst}
                className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={14} /> {t("common.back")}
              </button>

              <span className="text-[11px] font-bold text-zinc-400">
                {index + 1} / {steps.length}
              </span>

              <button
                type="button"
                onClick={handleNext}
                className={`px-4 py-2 text-xs font-bold rounded-lg text-white transition-colors flex items-center gap-1 ${colors.btn}`}
              >
                {isLast ? t("appTour.finish") : t("appTour.next")}
                {isLast ? <Check size={14} /> : <ArrowRight size={14} />}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsTourPopup;
