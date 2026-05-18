import React from "react";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: "red" | "emerald" | "zinc";
}

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmColor = "red"     // red, emerald (statt blue), zinc (statt slate)
}: Props) => {
  const { t } = useTranslation();
  const resolvedConfirmText = confirmText ?? t("modals.confirm.defaultConfirmText");
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const getColorClass = (color: string): string => {
    switch(color) {
      case 'emerald': return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20";
      case 'zinc': return "bg-zinc-800 hover:bg-zinc-900 text-white";
      case 'red': 
      default: return "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20";
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          {/* CHANGE: bg-orange-100 -> bg-red-100 (passender für Warnung) oder Zinc */}
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
            {/* CHANGE: text-orange-600 -> text-red-600 (Gefahrenzone) */}
            <AlertTriangle className="text-red-600 dark:text-red-500" size={24} />
          </div>
          
          {/* CHANGE: text-slate-900 -> text-zinc-900 */}
          <h3 className="text-xl font-bold text-center text-zinc-900 dark:text-white mb-2">
            {title}
          </h3>
          
          {/* CHANGE: text-slate-500 -> text-zinc-500 */}
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
            {message}
          </p>
        </div>

        {/* CHANGE: bg-slate-50 -> bg-zinc-50, dark:bg-slate-800 -> dark:bg-zinc-800 */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3">
          <button type="button"
            onClick={onClose}
            className="material-you-secondary-action flex-1 py-3 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-colors shadow-lg ${getColorClass(confirmColor)}`}
          >
            {resolvedConfirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmModal;
