import React from "react";
import { Import, AlertTriangle, Check, X, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";

interface ImportConflictModalProps {
  analysisData: any;
  onConfirm: (keepSettings: boolean) => void;
  onCancel: () => void;
}

const ImportConflictModal: React.FC<ImportConflictModalProps> = ({ analysisData, onConfirm, onCancel }) => {
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
          <h3 className="font-bold text-lg">Backup Inhalt prüfen</h3>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Wir haben Daten in diesem Backup gefunden. Da auch <strong>Einstellungen</strong> (Arbeitszeitmodell) enthalten sind, musst du entscheiden:
          </p>
          
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 text-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Calendar size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="font-medium">Einträge</div>
                <div className="text-zinc-500 dark:text-zinc-400">
                  {analysisData.entriesCount} Einträge
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <User size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="font-medium">Tätigkeiten</div>
                <div className="text-zinc-500 dark:text-zinc-400">
                  {analysisData.workCodesCount} Tätigkeiten
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <div className="font-medium text-amber-800 dark:text-amber-300">
                  Einstellungen überschreiben?
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Das Backup enthält auch Einstellungen (Arbeitszeitmodell). 
                  Sollen diese deine aktuellen Einstellungen ersetzen?
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-700 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Abbrechen
          </button>
          
          <div className="flex flex-col gap-2 flex-1">
            <button
              onClick={() => onConfirm(false)}
              className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Nur Einträge
            </button>
            <div className="text-xs text-center text-zinc-500">
              Behalte meine Einstellungen
            </div>
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
            <button
              onClick={() => onConfirm(true)}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <Import size={18} />
              Alles importieren
            </button>
            <div className="text-xs text-center text-zinc-500">
              Inkl. Einstellungen
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportConflictModal;