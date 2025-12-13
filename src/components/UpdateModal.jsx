import React from "react";
import { Download, X, Gift, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
// Browser importieren wir nicht mehr für den Download, da window.open zuverlässiger ist
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
       // Optional: Toast entfernen, wenn es zu nervig ist, aber gut für Feedback
       // toast.success("Download im Browser gestartet...");
       
       // Modal schließen? Geschmackssache. Viele User wollen lesen was passiert.
       // onClose(); 
    } else {
       // Fallback: Wenn window.open blockiert wurde (z.B. Popup Blocker, unwahrscheinlich in App)
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
    // ... (Dein bestehender JSX Code bleibt gleich, nur der Button ruft handleDownload auf)
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content ... (hier nichts ändern) */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        >
            {/* ... Header & Body ... */}
            
            <div className="flex gap-3 pt-2 p-6"> {/* p-6 musste hier rein oder war im parent div */}
              <button 
                onClick={onClose}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Später
              </button>
              
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