import { Import, AlertTriangle, Check, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";

interface AnalysisData {
  entryCount: number;
}

interface Props {
  analysisData: AnalysisData | null;
  onConfirm: (mode: "ALL" | "ENTRIES_ONLY") => void;
  onCancel: () => void;
}

const ImportConflictModal = ({ analysisData, onConfirm, onCancel }: Props) => {
  const { t } = useTranslation();
  if (!analysisData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
      >
        
        {/* Header */}
        <div className="bg-orange-500 p-4 text-white flex items-center gap-3">
          <Import size={24} className="text-white" />
          <h3 className="font-bold text-lg">{t("modals.importConflict.title")}</h3>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            <Trans i18nKey="modals.importConflict.description" components={{ b: <strong /> }} />
          </p>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 text-sm space-y-3">

            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Calendar size={16} /> {t("modals.importConflict.entriesLabel")}
              </span>
              <span className="font-bold text-zinc-800 dark:text-white bg-white dark:bg-zinc-700 px-2 py-0.5 rounded shadow-sm">
                {analysisData.entryCount}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <User size={16} /> {t("modals.importConflict.settingsLabel")}
              </span>
              <span className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-800">
                <AlertTriangle size={12} /> {t("modals.importConflict.settingsIncluded")}
              </span>
            </div>
          </div>

          <div className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 p-2 rounded text-center">
            {t("modals.importConflict.warning")}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col gap-3">
          <button type="button"
            onClick={() => onConfirm('ALL')}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <Check size={18} /> {t("modals.importConflict.importAll")}
          </button>

          <button type="button"
            onClick={() => onConfirm('ENTRIES_ONLY')}
            className="w-full py-3 bg-white dark:bg-zinc-700 border-2 border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-all active:scale-95"
          >
            {t("modals.importConflict.entriesOnly")}
          </button>

          <button type="button"
            onClick={onCancel}
            className="w-full py-2 text-zinc-400 font-medium text-sm hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportConflictModal;
