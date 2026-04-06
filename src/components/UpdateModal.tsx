import React from "react";
import { Download, Gift, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { logger } from "../utils/logger";

interface UpdateData {
  version: string;
  downloadUrl: string;
  changelog?: string[];
  isMandatory?: boolean;
}

interface UpdateModalProps {
  updateData: UpdateData | null;
  onClose: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ updateData, onClose }) => {
  if (!updateData) return null;

  const handleDownload = async () => {
    // URL validieren
    if (!updateData.downloadUrl) {
        toast.error("Keine Download-URL vorhanden.");
        return;
    }

    // Strategie: Sofort den System-Browser erzwingen ('_system')
    const target = "_system";
    
    // Versuch 1: Standard window.open (Capacitor fängt '_system' ab und öffnet extern)
    const opened = window.open(updateData.downloadUrl, target);

    // Feedback für den User
    if (opened) {
       // Optional: Modal schließen? Hier lassen wir es offen.
    } else {
       // Fallback: Wenn window.open blockiert wurde
       logger.error("Konnte Browser nicht öffnen");
       toast.error("Browser konnte nicht geöffnet werden. Bitte manuell öffnen.");
    }
  };

  return (
    <AnimatePresence>
      {updateData && (
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
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Gift size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-zinc-800 dark:text-white">
                    Update verfügbar!
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Version {updateData.version}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              {updateData.isMandatory && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertCircle size={16} />
                    <span className="font-medium">Erforderliches Update</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Diese Version ist erforderlich, um die App weiterhin nutzen zu können.
                  </p>
                </div>
              )}

              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                Ein neues Update für eStundnzettl ist verfügbar. Laden Sie die neueste Version herunter, um von neuen Funktionen und Verbesserungen zu profitieren.
              </p>

              {updateData.changelog && updateData.changelog.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Was ist neu?</h3>
                  <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {updateData.changelog.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="text-sm font-medium mb-1">Installationshinweis</div>
                <div className="text-sm text-zinc-500">
                  {Capacitor.getPlatform() === "android"
                    ? "Nach dem Download tippen Sie auf die APK-Datei, um die Installation zu starten."
                    : "Für iOS ist das Update über den App Store verfügbar."}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
              <div className="flex gap-3">
                {!updateData.isMandatory && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Später
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Jetzt herunterladen
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateModal;