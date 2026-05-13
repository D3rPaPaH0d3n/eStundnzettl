import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFirstOpenHint } from "../hooks/useFirstOpenHint";

interface Props {
  storageKey: string;
  title: string;
  children: React.ReactNode;
  tone?: "blue" | "emerald";
}

const toneClasses = {
  blue: {
    iconBox: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
    button: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
  },
  emerald: {
    iconBox: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
    button: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
  },
};

const FirstOpenHint: React.FC<Props> = ({
  storageKey,
  title,
  children,
  tone = "blue",
}) => {
  const { t } = useTranslation();
  const { visible, dismiss } = useFirstOpenHint(storageKey);
  const classes = toneClasses[tone];

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${storageKey}-title`}
            className="relative w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="h-1.5 w-10 rounded-full bg-emerald-500" />
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
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${classes.iconBox}`}
              >
                <Info size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id={`${storageKey}-title`}
                  className="text-base font-bold text-zinc-900 dark:text-white leading-tight"
                >
                  {title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mt-1">
                  {children}
                </p>
              </div>
            </div>

            <div className="flex justify-end px-4 py-3 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/30">
              <button
                type="button"
                onClick={dismiss}
                className={`px-4 py-2 text-xs font-bold rounded-lg text-white transition-colors ${classes.button}`}
              >
                {t("hints.gotIt")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FirstOpenHint;
