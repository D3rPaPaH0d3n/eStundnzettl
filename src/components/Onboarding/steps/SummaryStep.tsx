import React from "react";
import { motion } from "framer-motion";
import { Check, Play, Sparkles } from "lucide-react";

/**
 * Onboarding-Schritt 4: Abschluss-Bildschirm.
 *
 * Zeigt eine kurze Erfolgsmeldung und den Call-to-Action, der den Wizard
 * abschließt und in die Haupt-App wechselt. Im Anschluss startet die
 * interaktive Kurz-Einweisung (AppTour) in App.jsx.
 */
interface Props {
  hasRestoreData: boolean;
  onFinish: () => void;
}

const SummaryStep: React.FC<Props> = ({ hasRestoreData, onFinish }) => {
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

      <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
        <Sparkles size={14} />
        <span>Kurze Tour — dauert nur a Minütchen</span>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onFinish}
          className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          Los, zeig mir die App <Play size={20} fill="currentColor" />
        </button>
      </div>
    </motion.div>
  );
};

export default SummaryStep;
