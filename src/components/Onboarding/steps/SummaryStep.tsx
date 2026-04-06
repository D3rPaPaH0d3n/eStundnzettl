import React from "react";
import { motion } from "framer-motion";
import { Check, Play, Sparkles } from "lucide-react";

interface SummaryStepProps {
  hasRestoreData: boolean;
  onFinish: () => void;
}

/**
 * Onboarding-Schritt 4: Abschluss-Bildschirm.
 *
 * Zeigt eine kurze Erfolgsmeldung und den Call-to-Action, der den Wizard
 * abschließt und in die Haupt-App wechselt. Im Anschluss startet die
 * interaktive Kurz-Einweisung (AppTour) in App.jsx.
 */
const SummaryStep: React.FC<SummaryStepProps> = ({ hasRestoreData, onFinish }) => {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center py-4"
    >
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300">
        <Check size={40} strokeWidth={3} />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Perfekt! 🎉</h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-[280px] mx-auto leading-relaxed">
          {hasRestoreData
            ? "Deine Daten sind wieder da. Wir zeigen dir kurz, was die App alles kann."
            : "Alles eingerichtet. Jetzt zeigen wir dir in wenigen Klicks, wo du was findest."}
        </p>
      </div>

      <div className="space-y-3 max-w-[280px] mx-auto">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Sparkles size={14} className="text-emerald-500" />
          <span>Lokale Speicherung – deine Daten bleiben privat</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Sparkles size={14} className="text-emerald-500" />
          <span>Automatische Sicherungen (optional)</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Sparkles size={14} className="text-emerald-500" />
          <span>PDF-Export für deine Stundenzettel</span>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="w-full max-w-[280px] mx-auto p-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3"
      >
        <Play size={20} />
        <span>Jetzt loslegen</span>
      </button>

      <p className="text-xs text-zinc-500 max-w-[280px] mx-auto">
        Du kannst später jederzeit in den Einstellungen etwas ändern.
      </p>
    </motion.div>
  );
};

export default SummaryStep;