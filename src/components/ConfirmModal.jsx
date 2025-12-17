import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Löschen", // Standard
  confirmColor = "red"     // Standard: red, blue, slate
}) => {
  // Body-Klasse für Modal-Open Status (versteckt Navbar)
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const getColorClass = (color) => {
    switch(color) {
      case 'blue': return "bg-blue-600 hover:bg-blue-700 text-white";
      case 'slate': return "bg-slate-800 hover:bg-slate-900 text-white";
      case 'red': 
      default: return "bg-red-600 hover:bg-red-700 text-white";
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
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4 mx-auto">
            <AlertTriangle className="text-orange-600 dark:text-orange-500" size={24} />
          </div>
          
          <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
            {title}
          </h3>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Abbrechen
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-colors shadow-lg ${getColorClass(confirmColor)}`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmModal;