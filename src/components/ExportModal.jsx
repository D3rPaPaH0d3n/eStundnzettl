import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderUp, Share2, HardDrive, FileText } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const ExportModal = ({ isOpen, onClose, onSelectFolder, onSelectShare, isPdf = false }) => {
  
  const handleChoice = (choice) => {
    Haptics.impact({ style: ImpactStyle.Light });
    if (choice === 'folder') {
      onSelectFolder();
    } else if (choice === 'share') {
      onSelectShare();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    {isPdf ? (
                      <FileText size={22} className="text-orange-600 dark:text-orange-400" />
                    ) : (
                      <HardDrive size={22} className="text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white">
                      {isPdf ? "PDF speichern" : "Daten exportieren"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Wähle eine Methode
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              {/* Option 1: Ordner / Documents */}
              <button
                onClick={() => handleChoice('folder')}
                className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all active:scale-[0.98]"
              >
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <FolderUp size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-bold text-slate-800 dark:text-white">
                    {isPdf ? "In Dokumente speichern" : "In Ordner speichern"}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {isPdf 
                      ? "Speichert die PDF im Ordner 'Documents'" 
                      : "Wähle einen Speicherort (z.B. Downloads)"
                    }
                  </span>
                </div>
              </button>

              {/* Option 2: Teilen */}
              <button
                onClick={() => handleChoice('share')}
                className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-all active:scale-[0.98]"
              >
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Share2 size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-bold text-slate-800 dark:text-white">
                    Teilen / Senden
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Per WhatsApp, E-Mail oder andere Apps
                  </span>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
              <button
                onClick={onClose}
                className="w-full py-3 text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExportModal;