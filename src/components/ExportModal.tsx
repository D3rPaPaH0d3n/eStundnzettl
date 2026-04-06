import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderUp, Share2, HardDrive, FileText } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: () => void;
  onSelectShare: () => void;
  isPdf?: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectFolder, 
  onSelectShare, 
  isPdf = false 
}) => {
  
  const handleChoice = (choice: 'folder' | 'share') => {
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
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    {isPdf ? (
                      <FileText size={22} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <HardDrive size={22} className="text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-zinc-800 dark:text-white">
                      {isPdf ? "PDF exportieren" : "Daten exportieren"}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Wohin soll die Datei gespeichert werden?
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                  aria-label="Schließen"
                >
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-5 space-y-3">
              <button
                onClick={() => handleChoice('folder')}
                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                    <FolderUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-zinc-800 dark:text-white">
                      In Ordner speichern
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Datei im Gerätespeicher ablegen
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                  Empfohlen
                </div>
              </button>

              <button
                onClick={() => handleChoice('share')}
                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                    <Share2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-zinc-800 dark:text-white">
                      Teilen / Senden
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Per E‑Mail, WhatsApp, etc.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                {isPdf 
                  ? "Das PDF enthält alle Einträge des aktuellen Monats."
                  : "Die JSON-Datei enthält alle Einträge, Tätigkeiten und Einstellungen."
                }
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExportModal;