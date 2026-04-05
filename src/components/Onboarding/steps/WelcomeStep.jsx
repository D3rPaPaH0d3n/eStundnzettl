import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Play, RefreshCw, FlaskConical, Smartphone, WifiOff, Lock } from "lucide-react";

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
      className="space-y-6 flex flex-col items-center justify-center py-4"
    >
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 relative">
          <img
            src="/icon.png"
            alt="Logo"
            className="w-12 h-12 brightness-0 invert"
            onError={(e) => (e.target.style.display = "none")}
          />
          <ShieldCheck size={40} className="text-white absolute" style={{ opacity: 0.2 }} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Servus! 👋
        </h1>
        <p className="text-zinc-600 dark:text-zinc-300 font-medium">
          Schön, dass du da bist.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[300px] mx-auto leading-relaxed">
          Dein <span className="font-bold text-emerald-600 dark:text-emerald-400">eStundnzettl</span> —
          die einfache Zeiterfassung, die einfach funktioniert. Ganz ohne Schnickschnack.
        </p>
      </div>

      {/* Kern-Versprechen: 3 Mini-Badges */}
      <div className="w-full grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <Smartphone size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-center text-emerald-700 dark:text-emerald-300 leading-tight">Alles am Handy</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <WifiOff size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-center text-emerald-700 dark:text-emerald-300 leading-tight">Offline nutzbar</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <Lock size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-bold text-center text-emerald-700 dark:text-emerald-300 leading-tight">Daten bleiben bei dir</span>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        <button
          type="button"
          onClick={onStartNew}
          className="w-full p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-base shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <Play size={18} fill="currentColor" />
          Los geht's — neu einrichten
        </button>

        <button
          type="button"
          onClick={onStartRestore}
          className="w-full p-4 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-sm hover:border-emerald-200 dark:hover:border-zinc-600 hover:bg-emerald-50/50 dark:hover:bg-zinc-700/50 transition-all flex items-center justify-center gap-3"
        >
          <RefreshCw size={18} />
          Ich hab schon ein Backup
        </button>

        <button
          type="button"
          onClick={onDemoMode}
          className="w-full p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all flex items-center justify-center gap-2"
        >
          <FlaskConical size={16} />
          Nur mal reinschnuppern (Demo)
        </button>
      </div>
    </motion.div>
  );
};

export default WelcomeStep;
