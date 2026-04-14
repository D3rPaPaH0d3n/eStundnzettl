import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Play,
  Plus,
  FileBarChart,
  Settings as SettingsIcon,
  BarChart3,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  X,
  Hand,
} from "lucide-react";

/**
 * AppTour
 *
 * Kurze, interaktive Einweisung in die Haupt-App. Wird einmalig nach dem
 * Onboarding angezeigt. Ziel: Neue User lernen die wichtigsten Bedien-
 * elemente (Live-Timer FAB mit Long-Press+Swipe, Bericht, Einstellungen)
 * in wenigen Schritten kennen, ohne dass die App-Logik selbst verändert
 * wird.
 *
 * Pointer-Positionierung: Wir suchen die realen DOM-Buttons über stabile
 * `data-tour="..."`-Attribute und messen deren Bounding-Box. Dadurch
 * sitzen die pulsierenden Marker immer exakt auf dem jeweiligen Button —
 * unabhängig von Safe-Area, Theme oder Gerätegröße.
 */

/**
 * Statische Tour-Schritt-Definition — Text kommt zur Laufzeit aus i18n
 * via `translationKey` und wird im Component-Body über t() aufgelöst.
 */
interface TourStepDefinition {
  id: string;
  translationKey: string;      // passt auf appTour.steps.<key>
  icon: React.ComponentType<any>;
  color: string;
  target: string | null;
  hasHint?: boolean;
}

const STEP_DEFINITIONS: TourStepDefinition[] = [
  { id: "welcome", translationKey: "welcome", icon: Sparkles, color: "emerald", target: null },
  { id: "dashboard", translationKey: "dashboard", icon: BarChart3, color: "emerald", target: null },
  { id: "fab-tap", translationKey: "fabTap", icon: Plus, color: "emerald", target: '[data-tour="fab"]' },
  { id: "fab-timer", translationKey: "fabTimer", icon: ArrowUp, color: "emerald", target: '[data-tour="fab"]', hasHint: true },
  { id: "report", translationKey: "report", icon: FileBarChart, color: "emerald", target: '[data-tour="report"]' },
  { id: "settings", translationKey: "settings", icon: SettingsIcon, color: "zinc", target: '[data-tour="settings"]' },
  { id: "done", translationKey: "done", icon: Check, color: "emerald", target: null },
];

const colorMap: Record<string, { bg: string; text: string; ring: string; btn: string }> = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-400",
    btn: "bg-emerald-600 hover:bg-emerald-700",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-600 dark:text-blue-300",
    ring: "ring-blue-400",
    btn: "bg-blue-600 hover:bg-blue-700",
  },
  zinc: {
    bg: "bg-zinc-200 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    ring: "ring-zinc-400",
    btn: "bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:hover:bg-white dark:text-zinc-900",
  },
};

/**
 * Misst das Ziel-Element per querySelector und liefert Bounding-Box.
 * Liefert null, wenn kein Ziel gesetzt oder nicht gefunden.
 */
interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const useTargetRect = (selector: string | null): TargetRect | null => {
  const [rect, setRect] = useState<TargetRect | null>(null);

  const measure = useCallback(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [selector]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!selector) return;
    // Re-measure auf Resize, Orientierungswechsel und Scroll.
    const handler = () => measure();
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    window.addEventListener("scroll", handler, true);
    // Kleine Verzögerung, damit Layout nach Transitions steht.
    const t = setTimeout(measure, 80);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
      window.removeEventListener("scroll", handler, true);
      clearTimeout(t);
    };
  }, [selector, measure]);

  return rect;
};

interface Props {
  onClose: () => void;
}

const AppTour = ({ onClose }: Props) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // Statische Definition + übersetzte Texte kombinieren.
  const steps = useMemo(
    () =>
      STEP_DEFINITIONS.map((def) => ({
        ...def,
        title: t(`appTour.steps.${def.translationKey}.title`),
        body: t(`appTour.steps.${def.translationKey}.body`),
        hint: def.hasHint ? t(`appTour.steps.${def.translationKey}.hint`) : undefined,
      })),
    [t],
  );

  const step = steps[index];
  const Icon = step.icon;
  const colors = colorMap[step.color] || colorMap.emerald;
  const isLast = index === steps.length - 1;
  const isFirst = index === 0;

  const rect = useTargetRect(step.target);

  useEffect(() => {
    // Sanfte Sperre: verhindert Scroll im Hintergrund während der Tour.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleNext = () => {
    if (isLast) {
      onClose?.();
      return;
    }
    setIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (!isFirst) setIndex((i) => i - 1);
  };

  // Pointer-Box berechnen: um den Button herum mit etwas Luft.
  const pointerPadding = 10;
  const pointerStyle = rect
    ? {
        position: "fixed" as const,
        top: rect.top - pointerPadding,
        left: rect.left - pointerPadding,
        width: rect.width + pointerPadding * 2,
        height: rect.height + pointerPadding * 2,
        borderRadius: "9999px",
        pointerEvents: "none" as const,
      }
    : null;

  // Karte so positionieren, dass sie das Target nicht überdeckt.
  // Wenn Target in der oberen Bildschirmhälfte → Karte unten, sonst oben.
  const cardAnchor = (() => {
    if (!rect) return "center";
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return rect.top + rect.height / 2 < vh / 2 ? "bottom" : "top";
  })();

  const cardPositionClass =
    cardAnchor === "top"
      ? "top-[calc(env(safe-area-inset-top)+5.5rem)]"
      : cardAnchor === "bottom"
      ? "bottom-6"
      : "top-1/2 -translate-y-1/2";

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none">
      {/* Backdrop — klickbar zum Weiterspringen */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
        onClick={handleNext}
      />

      {/* Pointer — pulsiert exakt über dem echten Button */}
      <AnimatePresence mode="wait">
        {pointerStyle && (
          <motion.div
            key={step.id}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="z-[310]"
            style={pointerStyle}
          >
            <span
              className={`absolute inset-0 rounded-full ring-4 ${colors.ring} animate-ping opacity-60`}
            />
            <span
              className={`absolute inset-0 rounded-full ring-4 ${colors.ring}`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Karte */}
      <div className={`absolute left-4 right-4 ${cardPositionClass} flex justify-center pointer-events-none`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fortschritts-Dots + Skip */}
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index
                        ? "w-6 bg-emerald-500"
                        : i < index
                        ? "w-1.5 bg-emerald-300"
                        : "w-1.5 bg-zinc-200 dark:bg-zinc-600"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("appTour.skipAria")}
                className="p-1.5 -mr-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pt-3 pb-4 flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                <Icon size={22} className={colors.text} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mt-1">
                  {step.body}
                </p>
                {step.hint && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50">
                    <Hand size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {step.hint}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/30">
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
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AppTour;
