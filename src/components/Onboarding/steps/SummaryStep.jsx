import React from "react";
import { motion } from "framer-motion";
import { Check, Play } from "lucide-react";

/**
 * Onboarding-Schritt 4: Abschluss-Bildschirm.
 *
 * Zeigt eine kurze Erfolgsmeldung und den Call-to-Action, der den Wizard
 * abschließt und in die Haupt-App wechselt.
 */
const SummaryStep = ({ hasRestoreData, onFinish }) => {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center py-4"
    >
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300">
        <Check size={40} strokeWidth={3} />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Alles bereit!</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          {hasRestoreData
            ? "Daten erfolgreich wiederhergestellt."
            : "Dein Profil wurde erfolgreich erstellt."}
        </p>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={onFinish}
          className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          App starten <Play size={20} fill="currentColor" />
        </button>
      </div>
    </motion.div>
  );
};

export default SummaryStep;
