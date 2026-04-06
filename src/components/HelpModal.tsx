import React, { useEffect } from "react";
import { X, Rocket, BookOpen, Car, ShieldCheck, Play, Square, Wand2, Fingerprint, Hourglass, FileText, Clock, Briefcase, Tag, Cloud } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const dragControls = useDragControls();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed left-0 top-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-[150]"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 bottom-0 w-screen h-[90vh] bg-white dark:bg-zinc-800 rounded-t-3xl shadow-2xl z-[151] overflow-hidden"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            {/* Drag Handle */}
            <div 
              className="w-full py-3 flex justify-center cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-2 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <BookOpen size={22} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Hilfe & Anleitung</h2>
                    <p className="text-sm text-zinc-500">So funktioniert eStundnzettl</p>
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

            {/* Content */}
            <div className="h-[calc(90vh-80px)] overflow-y-auto px-5 py-6">
              <div className="space-y-8">
                {/* Quick Start */}
                <section>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Rocket size={18} className="text-emerald-500" />
                    Schnellstart
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Play size={16} className="text-emerald-500" />
                        Timer starten
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Tippe auf "Start" im Dashboard, um die Zeiterfassung zu beginnen.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Square size={16} className="text-emerald-500" />
                        Timer stoppen
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Tippe auf "Stopp", um den Timer zu beenden und einen Eintrag zu erstellen.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Wand2 size={16} className="text-emerald-500" />
                        Manueller Eintrag
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Tippe auf "+" im Dashboard, um einen Eintrag manuell zu erfassen.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Core Features */}
                <section>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Car size={18} className="text-emerald-500" />
                    Kernfunktionen
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Clock size={16} className="text-emerald-500" />
                        Live-Timer
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Zeigt die aktuelle Arbeitszeit in Echtzeit an, auch wenn die App im Hintergrund läuft.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Briefcase size={16} className="text-emerald-500" />
                        Tätigkeiten
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Erstelle Tätigkeits-Codes für verschiedene Projekte oder Aufgaben.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Tag size={16} className="text-emerald-500" />
                        Anhänge
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Füge Bilder, PDFs oder Dokumente zu Einträgen hinzu.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <FileText size={16} className="text-emerald-500" />
                        PDF-Export
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Erstelle professionelle Stundenzettel als PDF zum Drucken oder Teilen.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Privacy & Backup */}
                <section>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    Datenschutz & Backup
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Fingerprint size={16} className="text-emerald-500" />
                        Lokale Speicherung
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Alle Daten bleiben auf Ihrem Gerät. Keine Cloud-Synchronisation ohne Ihre Erlaubnis.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Hourglass size={16} className="text-emerald-500" />
                        Automatisches Backup
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Aktivieren Sie das Backup, um regelmäßige Sicherungen zu erstellen.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="font-medium flex items-center gap-2 mb-1">
                        <Cloud size={16} className="text-emerald-500" />
                        Cloud-Backup
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Optional: Sichern Sie Ihre Daten in Google Drive oder Nextcloud.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Tips */}
                <section>
                  <h3 className="font-bold text-lg mb-4">Tipps & Tricks</h3>
                  <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                      <span>Verwenden Sie Tätigkeits-Codes für eine bessere Übersicht über verschiedene Projekte.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                      <span>Das PDF-Archiv erstellt automatisch am Monatsende eine Sicherung aller Stundenzettel.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                      <span>Sie können die App mit einem PIN sperren, um Ihre Daten zu schützen.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                      <span>Demo-Daten helfen beim ersten Kennenlernen der App.</span>
                    </li>
                  </ul>
                </section>

                {/* Contact */}
                <section className="pt-4 border-t border-zinc-100 dark:border-zinc-700">
                  <h3 className="font-bold text-lg mb-2">Fragen oder Probleme?</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Bei technischen Fragen oder Feedback kontaktieren Sie uns gerne über die Play Store-Bewertung oder direkt per E-Mail.
                  </p>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;