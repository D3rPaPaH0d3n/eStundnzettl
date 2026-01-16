import React from "react";
import { Import, AlertTriangle, Check, X, Calendar, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ImportConflictModal = ({ analysisData, onConfirm, onCancel }) => {
  if (!analysisData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
      >
        
        {/* Header */}
        <div className="bg-orange-500 p-4 text-white flex items-center gap-3">
          <Import size={24} className="text-white" />
          <h3 className="font-bold text-lg">Backup Inhalt prüfen</h3>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Wir haben Daten in diesem Backup gefunden. Da auch <strong>Einstellungen</strong> (Arbeitszeitmodell) enthalten sind, musst du entscheiden:
          </p>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm space-y-3">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar size={16} /> Zeiteinträge
              </span>
              <span className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow-sm">
                {analysisData.entryCount}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <User size={16} /> Einstellungen
              </span>
              <span className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-800">
                <AlertTriangle size={12} /> Enthalten
              </span>
            </div>
          </div>
          
          <div className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded text-center">
            Achtung: "Alles importieren" überschreibt dein aktuelles Arbeitszeitmodell!
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 flex flex-col gap-3">
          <button 
            onClick={() => onConfirm('ALL')}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            <Check size={18} /> Alles überschreiben & Importieren
          </button>
          
          <button 
            onClick={() => onConfirm('ENTRIES_ONLY')}
            className="w-full py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all active:scale-95"
          >
            Nur Einträge (Einstellungen behalten)
          </button>

          <button 
            onClick={onCancel}
            className="w-full py-2 text-slate-400 font-medium text-sm hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportConflictModal;
