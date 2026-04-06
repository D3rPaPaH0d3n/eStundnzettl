import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Play,
  FileBarChart,
  Settings as SettingsIcon,
  BarChart3,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
  Hand,
  LucideIcon,
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  targetSelector: string;
  position: "top" | "bottom" | "left" | "right";
  arrow: "up" | "down" | "left" | "right";
  offset?: { x?: number; y?: number };
}

interface AppTourProps {
  isOpen: boolean;
  onClose: () => void;
}

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
const AppTour: React.FC<AppTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const steps: TourStep[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      description: "Hier siehst du deine aktuellen Einträge und den Live-Timer.",
      icon: BarChart3,
      targetSelector: '[data-tour="dashboard"]',
      position: "bottom",
      arrow: "up",
    },
    {
      id: "fab",
      title: "Live-Timer",
      description: "Tippe hier, um die Zeiterfassung zu starten. Halte gedrückt, um einen manuellen Eintrag zu erstellen.",
      icon: Play,
      targetSelector: '[data-tour="fab"]',
      position: "top",
      arrow: "down",
      offset: { y: -20 },
    },
    {
      id: "report",
      title: "Bericht erstellen",
      description: "Hier kannst du PDF-Berichte für einen beliebigen Zeitraum generieren.",
      icon: FileBarChart,
      targetSelector: '[data-tour="report"]',
      position: "top",
      arrow: "down",
    },
    {
      id: "settings",
      title: "Einstellungen",
      description: "Passe dein Profil, Arbeitsmodell und Sicherungsoptionen an.",
      icon: SettingsIcon,
      targetSelector: '[data-tour="settings"]',
      position: "top",
      arrow: "down",
    },
  ];

  const measureTarget = useCallback(() => {
    if (!isOpen) return;
    
    const step = steps[currentStep];
    if (!step) return;
    
    setIsMeasuring(true);
    
    // Kurze Verzögerung, damit DOM-Elemente geladen sind
    setTimeout(() => {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        console.warn(`Tour target not found: ${step.targetSelector}`);
        setTargetRect(null);
      }
      setIsMeasuring(false);
    }, 50);
  }, [isOpen, currentStep, steps]);

  useLayoutEffect(() => {
    if (isOpen) {
      measureTarget();
    }
  }, [isOpen, measureTarget]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      
      const handleResize = () => measureTarget();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", measureTarget);
      
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", measureTarget);
      };
    }
  }, [isOpen, measureTarget]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const step = steps[currentStep];
  const Icon = step?.icon || Sparkles;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      {/* Pulsierender Marker */}
      <AnimatePresence>
        {targetRect && !isMeasuring && (
          <motion.div
            key={`marker-${step.id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: targetRect.left + (targetRect.width / 2),
              top: targetRect.top + (targetRect.height / 2),
              transform: "translate(-50%, -50%)",
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-500/30"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.7, 0, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-500/50"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
            <div className="relative w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
              <Hand size={24} className="text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour Card */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-800 rounded-t-3xl shadow-2xl p-6"
      >
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Icon size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-lg">{step?.title}</div>
              <div className="text-sm text-zinc-500">
                Schritt {currentStep + 1} von {steps.length}
              </div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
            aria-label="Überspringen"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Description */}
        <p className="text-zinc-700 dark:text-zinc-300 mb-6">
          {step?.description}
        </p>

        {/* Step Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep
                  ? "bg-emerald-500"
                  : "bg-zinc-300 dark:bg-zinc-700"
              }`}
              aria-label={`Zu Schritt ${idx + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              currentStep === 0
                ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600"
            }`}
          >
            <ArrowLeft size={18} />
            Zurück
          </button>
          
          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <Check size={18} />
                Fertig
              </>
            ) : (
              <>
                Weiter
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Hint */}
        <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Sparkles size={14} className="text-emerald-500" />
            <span>Du kannst diese Tour später in den Einstellungen wiederholen.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AppTour;