import React from "react";
import { X, Rocket, BookOpen, Car, Send, Smartphone, ShieldCheck, FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HelpModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
            onClick={onClose}
          />

          {/* Modal Container - Mobil: Bottom Sheet Style, Desktop: Center Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`
              fixed z-[160] overflow-hidden flex flex-col bg-white dark:bg-slate-900 shadow-2xl
              
              /* MOBILE STYLES (Bottom Sheet) */
              inset-x-0 bottom-0 top-12 rounded-t-3xl border-t border-slate-200 dark:border-slate-800
              
              /* DESKTOP STYLES (Centered Modal) */
              md:inset-auto md:w-[600px] md:h-[85vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:top-auto md:bottom-auto
            `}
          >
            {/* Mobile Drag Handle (Optik) */}
            <div className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-slate-900 shrink-0" onClick={onClose}>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-start p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Hilfe & Guide</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">So nutzt du die App richtig</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 -mt-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-5 scrollbar-hide space-y-8 bg-white dark:bg-slate-900 pb-safe-bottom">
              
              {/* INTRO */}
              <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold uppercase text-xs tracking-wider mb-2">
                  <Rocket size={16} /> <span>Wofür ist diese App?</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  Schluss mit Papierchaos! Diese App digitalisiert deine Stundenzettel bei <strong>Kogler Aufzugsbau</strong>. Sie berechnet Gleitzeit & Feiertage automatisch.
                </p>
              </div>

              {/* SCHRITT 1: EINRICHTUNG */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">1</div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Einrichtung</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-1 space-y-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200 block mb-1">Profil vervollständigen</strong>
                        Gehe zu den Einstellungen und trage deinen <strong>Namen</strong> ein. Optional kannst du ein Foto hochladen, das auf dem PDF-Bericht erscheint.
                    </div>
                </div>
              </section>

              {/* SCHRITT 2: EINTRAGEN */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">2</div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Stunden erfassen</h3>
                </div>

                <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-1 space-y-3">
                  <p className="text-sm text-slate-500 mb-2">Drücke auf das große <span className="font-bold text-slate-900 dark:text-white">Plus (+)</span> unten rechts.</p>
                  
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm mb-1">
                        <BookOpen size={16} className="text-blue-500" /> Normale Arbeit
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Wähle Start/Ende und deine Tätigkeit. <br/>
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">Tipp:</span> Der "Wie zuletzt"-Button kopiert alle Daten vom letzten Eintrag!
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm mb-1">
                        <Car size={16} className="text-green-500" /> Fahrtzeiten
                    </div>
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <li className="flex gap-2"><span className="w-2 h-2 rounded-full bg-green-500 mt-1"></span> <span><strong>Anreise (Grün):</strong> Bezahlte Zeit (Code 190)</span></li>
                        <li className="flex gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 mt-1"></span> <span><strong>Fahrt (Orange):</strong> Unbezahlt (Code 19)</span></li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* SCHRITT 3: BERICHT */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">3</div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Abschluss</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-1 space-y-2">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Klicke im Dashboard oben rechts auf das <FileText className="inline w-4 h-4 mx-1 align-sub" /> Symbol.
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Wähle den Zeitraum (Woche oder Monat) und erstelle das <strong>PDF</strong>. Du kannst es direkt per Mail versenden.
                    </div>
                </div>
              </section>

              {/* FOOTER HINWEISE */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                  <ShieldCheck className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
                  <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300">Lokal & Sicher</h4>
                  <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1 leading-tight">Deine Daten bleiben auf deinem Gerät. Backups landen in deinen Dateien.</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl">
                  <Smartphone className="text-purple-600 dark:text-purple-400 mb-2" size={24} />
                  <h4 className="font-bold text-sm text-purple-800 dark:text-purple-300">Gesten</h4>
                  <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-1 leading-tight">Wische Einträge in der Liste nach links, um sie schnell zu löschen.</p>
                </div>
              </div>

              {/* Safe Area Spacer for Bottom */}
              <div className="h-10 md:h-0"></div>

              <div className="text-center text-slate-300 dark:text-slate-700 text-[10px] uppercase tracking-widest font-bold pb-4">
                Kogler Aufzugsbau App v4.0
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;