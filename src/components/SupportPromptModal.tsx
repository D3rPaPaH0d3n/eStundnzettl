import React from "react";
import { Coffee, Heart, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Browser } from "@capacitor/browser";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { logger } from "../utils/logger";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.estundnzettl.app";
const COFFEE_URL = "https://revolut.me/mkainer/pocket/QAt1Q0Ntsb";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SupportPromptModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const openExternalLink = async (url: string) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    try {
      await Browser.open({ url });
      onClose();
    } catch (err) {
      logger.error("[SupportPromptModal] Link konnte nicht geöffnet werden:", err);
      toast.error(t("supportPrompt.linkError"));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
          >
            <div className="p-5 space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300">
                <Heart size={24} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {t("supportPrompt.title")}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2">
                  {t("supportPrompt.body")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openExternalLink(PLAY_STORE_URL)}
                  className="py-3 px-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Star size={17} />
                  <span>{t("supportPrompt.rate")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openExternalLink(COFFEE_URL)}
                  className="py-3 px-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-2"
                >
                  <Coffee size={17} />
                  <span>{t("supportPrompt.coffee")}</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {t("supportPrompt.noThanks")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SupportPromptModal;
