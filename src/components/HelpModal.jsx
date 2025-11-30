import React from "react";
import { X, Rocket, BookOpen, Car, Send, Smartphone, ShieldCheck, FileText } from "lucide-react";
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

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:w-[600px] md:h-[80vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Hilfe & Anleitung</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Wie funktioniert die App?</p>
              </div>
              <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 scrollbar-hide space-y-8">
              
              {/* INTRO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold uppercase text-xs tracking-wider">
                  <Rocket size={16} /> <span>Wofür ist diese App?</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  Die digitale Lösung für unsere Stundenzettel bei <strong>Kogler Aufzugsbau</strong>. 
                  Schluss mit Papierchaos – diese App erledigt den Papierkram für dich, berechnet dein Gleitzeit-Saldo automatisch und kennt alle österreichischen Feiertage.
                </p>
              </div>

              {/* SCHRITT 1: EINRICHTUNG */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="bg-slate-200 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span>
                  Einrichtung
                </h3>
                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 ml-2">
                  <li className="flex gap-2"><span className="text-orange-500">•</span> Trage in den Einstellungen deinen <strong>Namen</strong> ein.</li>
                  <li className="flex gap-2"><span className="text-orange-500">•</span> Lade optional ein <strong>Profilbild</strong> hoch (erscheint am PDF).</li>
                  <li className="flex gap-2"><span className="text-orange-500">•</span> Aktiviere "Automatisches Backup".</li>
                </ul>
              </div>

              {/* SCHRITT 2: EINTRAGEN */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="bg-slate-200 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">2</span>
                  Stunden eintragen
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Drücke unten rechts auf das <strong>Plus (+)</strong>.</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                    <BookOpen className="text-blue-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                      <span className="font-bold block text-slate-800 dark:text-white">Normale Arbeit</span>
                      Wähle "Arbeit", Zeit und Code. Pause (30min) ist Standard.
                      <br/><span className="text-xs text-orange-500 font-bold mt-1 block">Tipp: "Wie zuletzt" kopiert den Vortag!</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                    <Car className="text-green-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                      <span className="font-bold block text-slate-800 dark:text-white">Fahrtzeit</span>
                      <strong>Grün (Anreise):</strong> Bezahlte Zeit (Code 190).
                      <br/><strong>Orange (Fahrt):</strong> Unbezahlte Zeit (Code 19).
                    </div>
                  </div>
                </div>
              </div>

              {/* SCHRITT 3: BERICHT */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="bg-slate-200 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">3</span>
                  Bericht senden
                </h3>
                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 ml-2">
                  <li className="flex gap-2"><Send size={16} className="text-slate-400 shrink-0" /> Klicke oben rechts auf das <strong>Dokumenten-Symbol</strong>.</li>
                  <li className="flex gap-2"><FileText size={16} className="text-slate-400 shrink-0" /> Wähle den Zeitraum (Woche oder Monat).</li>
                  <li className="flex gap-2"><span className="text-orange-500 font-bold">PDF</span> Drücke auf den Button und sende es per Mail ans Büro.</li>
                </ul>
              </div>

              {/* HINWEISE */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                  <ShieldCheck className="text-blue-600 dark:text-blue-400 mb-2" size={20} />
                  <h4 className="font-bold text-xs uppercase text-blue-700 dark:text-blue-300 mb-1">Sicherheit</h4>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Backups werden lokal in deinen "Dokumenten" gespeichert.</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                  <Smartphone className="text-green-600 dark:text-green-400 mb-2" size={20} />
                  <h4 className="font-bold text-xs uppercase text-green-700 dark:text-green-300 mb-1">Gesten</h4>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80">Wische Einträge in der Liste nach links, um sie zu löschen.</p>
                </div>
              </div>

              <div className="p-4 text-center text-slate-300 dark:text-slate-600 text-xs">
                © Kogler Aufzugsbau App v4.0
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;