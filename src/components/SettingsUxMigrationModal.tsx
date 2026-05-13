import React from "react";
import { ClipboardList, Settings2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReviewMode: () => void;
}

const SettingsUxMigrationModal: React.FC<Props> = ({ isOpen, onClose, onReviewMode }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 shrink-0">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {t("settingsUxMigration.title")}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                    {t("settingsUxMigration.body")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{t("settingsUxMigration.pointData")}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <ClipboardList size={18} className="text-sky-500 shrink-0 mt-0.5" />
                  <span>{t("settingsUxMigration.pointMode")}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <Settings2 size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>{t("settingsUxMigration.pointAdvanced")}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
              >
                {t("settingsUxMigration.close")}
              </button>
              <button
                type="button"
                onClick={onReviewMode}
                className="flex-1 py-3 px-4 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {t("settingsUxMigration.reviewMode")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsUxMigrationModal;
