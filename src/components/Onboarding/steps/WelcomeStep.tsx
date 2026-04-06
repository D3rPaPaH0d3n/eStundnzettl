import React from "react";
import { motion } from "framer-motion";
import { Play, RefreshCw, FlaskConical, Smartphone, WifiOff, Lock } from "lucide-react";
import AppLogo from "../../../assets/logo.png";

interface WelcomeStepProps {
  onStartNew: () => void;
  onStartRestore: () => void;
  onDemoMode: () => void;
}

/**
 * Onboarding-Schritt 0: Willkommen.
 *
 * Dreiwege-Abzweigung in den Wizard:
 *  - Neu starten         → Setup-Flow ab Schritt 1
 *  - Backup laden        → Restore-Flow direkt bei Schritt 3
 *  - Demo-Daten testen   → lädt Demo-Daten und schließt den Wizard sofort
 */
const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStartNew, onStartRestore, onDemoMode }) => {
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
            alt="eStundnzettl Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-2xl font-bold text-zinc-800 dark:text-white">
          Willkommen bei eStundnzettl
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
          Ihre lokale Zeiterfassung mit Datenschutz im Fokus.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onStartNew}
          className="w-full p-4 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/30"
        >
          <Play size={20} />
          <span>Neu starten</span>
        </button>

        <div className="text-xs text-center text-zinc-500">
          Für neue Nutzer oder wenn Sie von vorne beginnen möchten.
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onStartRestore}
          className="w-full p-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-white rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-3"
        >
          <RefreshCw size={20} />
          <span>Backup laden</span>
        </button>

        <div className="text-xs text-center text-zinc-500">
          Haben Sie ein Backup? Laden Sie Ihre Daten wieder her.
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onDemoMode}
          className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-xl font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-3"
        >
          <FlaskConical size={20} />
          <span>Demo-Daten testen</span>
        </button>

        <div className="text-xs text-center text-zinc-500">
          Laden Sie Demo-Daten, um die App ohne Risiko auszuprobieren.
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 w-full max-w-sm">
        <div className="text-center text-xs text-zinc-500 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Smartphone size={12} />
            <span>Lokale Speicherung auf Ihrem Gerät</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <WifiOff size={12} />
            <span>Keine Internetverbindung erforderlich</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Lock size={12} />
            <span>Ihre Daten bleiben privat</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WelcomeStep;