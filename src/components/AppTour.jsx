import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
} from "lucide-react";

/**
 * AppTour
 *
 * Kurze, interaktive Einweisung in die Haupt-App. Wird einmalig nach dem
 * Onboarding angezeigt (oder manuell aus den Einstellungen/Hilfe
 * triggerbar). Ziel: Neue User lernen die wichtigsten Buttons (FAB-Timer,
 * "+"-Eintrag, Bericht, Einstellungen) in wenigen Schritten kennen, ohne
 * dass die App-Logik selbst verändert wird.
 *
 * Design: Halbtransparenter Backdrop + schwebende Karte. Ein kleiner
 * "Pointer"-Marker weist auf die tatsächliche Position des zugehörigen
 * Buttons in der App (oben rechts Header, unten rechts FAB, ...). So
 * bleibt die Einweisung robust gegenüber Layout-Änderungen — wir heben
 * keine DOM-Nodes mit Refs hervor, sondern benutzen feste Screen-Zonen.
 */

const steps = [
  {
    id: "welcome",
    icon: Sparkles,
    color: "emerald",
    title: "Kurze Tour gefällig?",
    body: "Servus! Lass uns in 6 kleinen Schritten durchgehen, wo du was findest. Du kannst die Tour jederzeit überspringen.",
    pointer: null,
  },
  {
    id: "dashboard",
    icon: BarChart3,
    color: "emerald",
    title: "Deine Übersicht",
    body: "Hier siehst du auf einen Blick: Ist-Stunden, Soll-Stunden und deine Überstunden für den gewählten Monat. Wochen kannst du antippen zum Aufklappen.",
    pointer: { pos: "center", label: "Dashboard" },
  },
  {
    id: "timer",
    icon: Play,
    color: "emerald",
    title: "Der grüne Start-Knopf",
    body: "Rechts unten findest du den Live-Timer. Tippen = Start. Nochmal tippen = Stopp, und dein Eintrag wird automatisch angelegt. Einfacher geht's nicht.",
    pointer: { pos: "bottom-right", label: "Play" },
  },
  {
    id: "add",
    icon: Plus,
    color: "blue",
    title: "Manueller Eintrag",
    body: "Vergessen zu starten? Kein Problem. Mit dem „+“ links daneben trägst du Zeiten jederzeit manuell nach — auch für vergangene Tage.",
    pointer: { pos: "bottom-left-fab", label: "Plus" },
  },
  {
    id: "report",
    icon: FileBarChart,
    color: "emerald",
    title: "Stundenzettel als PDF",
    body: "Oben rechts der grüne Button: dein fertiger Stundenzettel zum Anschauen, Teilen oder Ausdrucken. Mit Unterschrift, Notizen und deinem Logo.",
    pointer: { pos: "top-right", label: "Bericht" },
  },
  {
    id: "settings",
    icon: SettingsIcon,
    color: "zinc",
    title: "Einstellungen & mehr",
    body: "Das Zahnrad oben ist deine Schaltzentrale: Profil, Arbeitszeit, eigene Tätigkeits-Codes, Backup, Theme und die Hilfe. Alles lässt sich jederzeit ändern.",
    pointer: { pos: "top-right-2", label: "Einstellungen" },
  },
  {
    id: "done",
    icon: Check,
    color: "emerald",
    title: "Das war's schon!",
    body: "Du kennst jetzt alle wichtigen Ecken. Falls du was nochmal nachlesen willst: Einstellungen → Hilfe. Viel Spaß mit dem eStundnzettl!",
    pointer: null,
  },
];

const colorMap = {
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
 * Pointer: kleiner, pulsierender Marker an einer fixen Screen-Position.
 * Ziel-Koordinaten orientieren sich am Header (oben) und FAB (unten).
 */
const Pointer = ({ pos, color }) => {
  if (!pos) return null;
  const style = {};
  const safeTop = "calc(env(safe-area-inset-top) + 1rem)";
  switch (pos) {
    case "top-right":
      // Bericht-Button (emerald, ganz rechts im Header)
      style.top = `calc(${safeTop} + 0.4rem)`;
      style.right = "1rem";
      break;
    case "top-right-2":
      // Settings-Button (zinc, knapp links vom Bericht)
      style.top = `calc(${safeTop} + 0.4rem)`;
      style.right = "3.6rem";
      break;
    case "bottom-right":
      // Live-Timer FAB
      style.bottom = "1.5rem";
      style.right = "1.25rem";
      break;
    case "bottom-left-fab":
      // Plus-Button (neben FAB)
      style.bottom = "1.5rem";
      style.right = "5.5rem";
      break;
    case "center":
      style.top = "50%";
      style.left = "50%";
      style.transform = "translate(-50%, -50%)";
      break;
    default:
      break;
  }
  const ring = colorMap[color]?.ring || "ring-emerald-400";
  return (
    <motion.div
      key={pos}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed z-[310] pointer-events-none"
      style={style}
    >
      <span className={`relative flex h-12 w-12`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ring} opacity-60 ring-4`}></span>
        <span className={`relative inline-flex rounded-full h-12 w-12 ring-4 ${ring}`}></span>
      </span>
    </motion.div>
  );
};

const AppTour = ({ onClose }) => {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const Icon = step.icon;
  const colors = colorMap[step.color] || colorMap.emerald;
  const isLast = index === steps.length - 1;
  const isFirst = index === 0;

  // Card-Position: oben, wenn der Pointer unten ist — sonst unten.
  // Welcome/Done (ohne Pointer) → zentriert.
  const cardAnchor = (() => {
    const p = step.pointer?.pos;
    if (!p) return "center";
    if (p === "bottom-right" || p === "bottom-left-fab") return "top";
    if (p === "top-right" || p === "top-right-2") return "bottom";
    return "bottom";
  })();

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

      {/* Pointer */}
      <AnimatePresence mode="wait">
        {step.pointer && <Pointer pos={step.pointer.pos} color={step.color} />}
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
                aria-label="Tour überspringen"
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
                <ArrowLeft size={14} /> Zurück
              </button>

              <span className="text-[11px] font-bold text-zinc-400">
                {index + 1} / {steps.length}
              </span>

              <button
                type="button"
                onClick={handleNext}
                className={`px-4 py-2 text-xs font-bold rounded-lg text-white transition-colors flex items-center gap-1 ${colors.btn}`}
              >
                {isLast ? "Fertig" : "Weiter"}
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
