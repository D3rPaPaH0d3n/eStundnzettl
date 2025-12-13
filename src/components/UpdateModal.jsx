import React from "react";
import { Download, Gift, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast"; 

const UpdateModal = ({ updateData, onClose }) => {
  if (!updateData) return null;

  const handleDownload = async () => {
    // URL validieren
    if (!updateData.downloadUrl) {
        toast.error("Keine Download-URL vorhanden.");
        return;
    }

    // Strategie: Sofort den System-Browser erzwingen ('_system')
    // Das übergibt die Verantwortung an Chrome/Android Download Manager
    const target = "_system";
    
    // Versuch 1: Standard window.open (Capacitor fängt '_system' ab und öffnet extern)
    const opened = window.open(updateData.downloadUrl, target);

    // Feedback für den User
    if (opened) {
       // Optional: Modal schließen? Hier lassen wir es offen.
    } else {
       // Fallback: Wenn window.open blockiert wurde
       console.error("Konnte Browser nicht öffnen");
       
       try {
          await navigator.clipboard.writeText(updateData.downloadUrl);
          toast.error("Browser-Start fehlgeschlagen. Link in Zwischenablage kopiert!", {
              duration: 5000,
              icon: '📋'
          });
       } catch (e) {
          toast.error("Fehler beim Starten des Downloads.");
       }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          {/* Header mit schönem Farbverlauf */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-center">
            <Gift size={40} className="mx-auto mb-2 animate-bounce" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Update verfügbar!</h2>
            <p className="font-medium opacity-90">Version {updateData.version} ist da.</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Release Notes */}
            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Das ist neu ({updateData.date}):</h3>
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {updateData.notes}
              </div>
            </div>

            {/* Info für iOS User (Da man dort keine APK laden kann) */}
            {Capacitor.getPlatform() === 'ios' && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>Auf dem iPhone erfolgt das Update bitte über TestFlight oder den Administrator.</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button 
                onClick={onClose}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Später
              </button>
              
              {/* Button nur anzeigen wenn Download URL da ist (meist APK) */}
              <button 
                onClick={handleDownload}
                className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download size={20} />
                {Capacitor.getPlatform() === 'android' ? "Update laden" : "Zu GitHub"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpdateModal;