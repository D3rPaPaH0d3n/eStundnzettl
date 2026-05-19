import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import {
  clampTargetRect,
  getViewportSize,
  type TargetRect,
} from "../utils/spotlightGeometry";

interface TourStepDefinition {
  key: string;
  icon: LucideIcon;
  color: "emerald" | "blue" | "amber" | "violet" | "zinc";
  target?: string;
}

const STEPS: TourStepDefinition[] = [
  { key: "overview", icon: Settings2, color: "emerald" },
  {
    key: "profile",
    icon: UserRound,
    color: "blue",
    target: '[data-settings-tour="profile"]',
  },
  {
    key: "recording",
    icon: BriefcaseBusiness,
    color: "emerald",
    target: '[data-settings-tour="recording"]',
  },
  {
    key: "codes",
    icon: BriefcaseBusiness,
    color: "amber",
    target: '[data-settings-tour="codes"]',
  },
  {
    key: "calculation",
    icon: Calculator,
    color: "violet",
    target: '[data-settings-tour="calculation"]',
  },
  {
    key: "backup",
    icon: DatabaseBackup,
    color: "blue",
    target: '[data-settings-tour="backup"]',
  },
  {
    key: "appearanceHelp",
    icon: Palette,
    color: "zinc",
    target: '[data-settings-tour="appearanceHelp"]',
  },
  { key: "done", icon: HelpCircle, color: "emerald", target: '[data-settings-tour="help-card"]' },
];

const HIGHLIGHT_PADDING = 8;
const CARD_GAP = 18;
const ESTIMATED_CARD_HEIGHT = 236;

const colorMap = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-600 dark:text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
    dot: "bg-emerald-500",
    ring: "ring-emerald-400",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-600 dark:text-blue-300",
    btn: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
    dot: "bg-blue-500",
    ring: "ring-blue-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-600 dark:text-amber-300",
    btn: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800",
    dot: "bg-amber-500",
    ring: "ring-amber-400",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-600 dark:text-violet-300",
    btn: "bg-violet-600 hover:bg-violet-700 active:bg-violet-800",
    dot: "bg-violet-500",
    ring: "ring-violet-400",
  },
  zinc: {
    bg: "bg-zinc-200 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    btn: "bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:hover:bg-white dark:text-zinc-900",
    dot: "bg-zinc-500",
    ring: "ring-zinc-400",
  },
};

interface Props {
  storageKey: string;
}

const SettingsTourPopup: React.FC<Props> = ({ storageKey }) => {
  const { t } = useTranslation();
  const { visible, dismiss } = useFirstOpenHint(storageKey);
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

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

  const measureTarget = useCallback(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) {
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [step.target]);

  useEffect(() => {
    if (!visible || !step.target) {
      const timeout = window.setTimeout(() => setTargetRect(null), 0);
      return () => window.clearTimeout(timeout);
    }

    const element = document.querySelector(step.target);
    element?.scrollIntoView({ block: "center", behavior: "smooth" });

    const timeouts = [window.setTimeout(measureTarget, 80), window.setTimeout(measureTarget, 320)];
    window.addEventListener("resize", measureTarget);
    window.addEventListener("orientationchange", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("orientationchange", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget, step.target, visible]);

  const highlightStyle = targetRect
    ? (() => {
        const rect = clampTargetRect(targetRect, HIGHLIGHT_PADDING);
        return {
          position: "fixed" as const,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: "1.25rem",
          pointerEvents: "none" as const,
        };
      })()
    : null;

  const cardContainerStyle = (() => {
    if (!highlightStyle) return undefined;
    const vh = getViewportSize().height;
    const safeTop = 24;
    const safeBottom = 24;
    const highlightTop = Number(highlightStyle.top);
    const highlightHeight = Number(highlightStyle.height);
    const spaceAbove = highlightTop - CARD_GAP - safeTop;
    const spaceBelow = vh - (highlightTop + highlightHeight) - CARD_GAP - safeBottom;

    if (spaceBelow >= ESTIMATED_CARD_HEIGHT || spaceBelow >= spaceAbove) {
      return {
        top: Math.min(
          highlightTop + highlightHeight + CARD_GAP,
          vh - ESTIMATED_CARD_HEIGHT - safeBottom,
        ),
      };
    }

    return {
      bottom: Math.min(vh - highlightTop + CARD_GAP, vh - ESTIMATED_CARD_HEIGHT - safeTop),
    };
  })();

  const cardPositionClass = highlightStyle ? "" : "top-1/2 -translate-y-1/2";
  const overlayMaskId = `settings-tour-spotlight-${useId().replace(/:/g, "")}`;

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
        <div className="fixed inset-0 z-[260] pointer-events-none">
          {highlightStyle ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-auto"
              onClick={handleNext}
            >
              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <mask id={overlayMaskId}>
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                      x={Number(highlightStyle.left)}
                      y={Number(highlightStyle.top)}
                      width={Number(highlightStyle.width)}
                      height={Number(highlightStyle.height)}
                      rx="20"
                      ry="20"
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0,0,0,0.55)"
                  mask={`url(#${overlayMaskId})`}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px] pointer-events-auto"
            />
          )}

          {highlightStyle && (
            <button
              type="button"
              aria-label={t("appTour.next")}
              className="fixed z-[268] bg-transparent pointer-events-auto"
              style={highlightStyle}
              onClick={handleNext}
            />
          )}

          {highlightStyle && (
            <motion.div
              key={`${step.key}-highlight`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="z-[265]"
              style={highlightStyle}
            >
              <span className={`absolute inset-0 rounded-[1.25rem] ring-4 ${colors.ring} opacity-80`} />
              <span className={`absolute inset-0 rounded-[1.25rem] ring-4 ${colors.ring} animate-ping opacity-40`} />
            </motion.div>
          )}

          <div
            className={`absolute left-4 right-4 ${cardPositionClass} flex justify-center`}
            style={cardContainerStyle}
          >
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
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsTourPopup;
