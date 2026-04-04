import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Play, RefreshCw, FlaskConical } from "lucide-react";

/**
 * Onboarding-Schritt 0: Willkommen.
 *
 * Dreiwege-Abzweigung in den Wizard:
 *  - Neu starten         → Setup-Flow ab Schritt 1
 *  - Backup laden        → Restore-Flow direkt bei Schritt 3
 *  - Demo-Daten testen   → lädt Demo-Daten und schließt den Wizard sofort
 */
const WelcomeStep = ({ onStartNew, onStartRestore, onDemoMode }) => {
  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 flex flex-col items-center justify-center h-full py-6"
    >
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
          <img
            src="/icon.png"
            alt="Logo"
            className="w-12 h-12 brightness-0 invert"
            onError={(e) => (e.target.style.display = "none")}
          />
          <ShieldCheck size={40} className="text-white absolute" style={{ opacity: 0.2 }} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          eStundnzettl
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto">
          Die moderne Zeiterfassung für Profis. Wie möchtest du starten?
        </p>
      </div>

      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={onStartNew}
          className="w-full p-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <Play size={20} fill="currentColor" />
          Neu starten
        </button>

        <button
          type="button"
          onClick={onStartRestore}
          className="w-full p-5 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold text-lg hover:border-emerald-200 dark:hover:border-zinc-600 hover:bg-emerald-50/50 dark:hover:bg-zinc-700/50 transition-all flex items-center justify-center gap-3"
        >
          <RefreshCw size={20} />
          Backup laden
        </button>

        <button
          type="button"
          onClick={onDemoMode}
          className="w-full p-5 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold text-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all flex items-center justify-center gap-3"
        >
          <FlaskConical size={20} />
          Demo-Daten ausprobieren
        </button>
      </div>
    </motion.div>
  );
};

export default WelcomeStep;
