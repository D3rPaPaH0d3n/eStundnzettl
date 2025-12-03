import React, { useEffect } from "react";
import { X, Rocket, BookOpen, Car, ShieldCheck, Smartphone, FileText, Wand2, Fingerprint, Hourglass } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

const HelpModal = ({ isOpen, onClose }) => {
  const dragControls = useDragControls();

  // FIX: Verhindert Scrollen der App im Hintergrund
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
          {/* FIX: Vollbild-Overlay erzwingen */}
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
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            dragListener={false} 
            dragControls={dragControls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className={`
              fixed z-[160] flex flex-col bg-white dark:bg-slate-900 shadow-2xl overflow-hidden
              inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 dark:border-slate-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:w-[600px] md:h-[85vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            `}
          >
            {/* DRAG HANDLE - WICHTIG: touch-none verhindert Scroll-Konflikte */}
            <div 
              className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-start p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Anleitung & Hilfe</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Schnellstart für Kollegen</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 -mt-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENT */}
            <div 
              className="overflow-y-auto p-5 scrollbar-hide space-y-8 bg-white dark:bg-slate-900"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            >
              
              {/* INTRO BOX */}
              <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold uppercase text-xs tracking-wider mb-2">
                  <Rocket size={16} /> <span>Wofür ist diese App?</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  Schluss mit Zettelwirtschaft! Erfasse deine Stunden, Fahrten und Urlaub direkt am Handy. Am Monatsende erstellst du einfach ein PDF.
                </p>
              </div>

              {/* SCHRITT 1: Tägliches Stempeln */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">1</div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Stunden eintragen</h3>
                </div>

                <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-1 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Drücke unten rechts auf das große <span className="font-bold text-slate-900 dark:text-white">Plus (+)</span>.
                  </p>
                  
                  {/* FEATURE: SMART TIME */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm mb-1">
                        <Wand2 size={16} className="text-purple-500" /> Die App denkt mit
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Wenn du heute schon etwas eingetragen hast (z.B. Anreise), startet der nächste Eintrag automatisch zur passenden Uhrzeit. Du musst nicht kurbeln!
                    </p>
                  </div>

                  {/* FEATURE: WIE ZULETZT */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm mb-1">
                        <BookOpen size={16} className="text-blue-500" /> "Wie zuletzt"-Knopf
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                       Machst du das Gleiche wie beim letzten Mal? Drücke oben auf <span className="font-bold text-orange-600 dark:text-orange-400">"Wie zuletzt"</span> und die App füllt Start, Ende, Pause und Projekt automatisch aus.
                    </p>
                  </div>
                </div>
              </section>

              {/* SCHRITT 2: Fahrten */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">2</div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Fahrtzeiten</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-1 space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Wähle oben im Menü "Fahrt". Du hast zwei Möglichkeiten:
                    </p>
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                        <li className="flex gap-2 items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100 dark:border-green-900/30">
                            <span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span> 
                            <span><strong>An/Abreise (Grün):</strong> Das ist bezahlte Arbeitszeit (Code 190).</span>
                        </li>
                        <li className="flex gap-2 items-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg border border-orange-100 dark:border-orange-900/30">
                            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span> 
                            <span><strong>Fahrtzeit (Orange):</strong> Das ist unbezahlte Zeit (Code 19).</span>
                        </li>
                    </ul>
                </div>
              </section>

              {/* SCHRITT 3: Spezialfälle */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">3</div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Urlaub, Krank & ZA</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-1 space-y-2">
                    <div className="flex items-start gap-3">
                        <Hourglass className="text-purple-500 mt-1 shrink-0" size={20} />
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Wähle einfach <strong>Urlaub</strong>, <strong>Krank</strong> oder <strong>ZA</strong> (Zeitausgleich) aus. Die App trägt automatisch die richtigen Soll-Stunden für den Tag ein.
                        </p>
                    </div>
                </div>
              </section>

              {/* SCHRITT 4: PDF */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">4</div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Monatsabschluss</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-1 space-y-2">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Klicke auf dem Startbildschirm oben rechts auf das <FileText className="inline w-4 h-4 mx-1 align-sub text-orange-500" /> Symbol.
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Dort siehst du eine Vorschau. Prüfe alles und klicke dann auf <strong>PDF</strong>, um den Bericht zu senden oder zu speichern.
                    </div>
                </div>
              </section>

              {/* FOOTER TIPPS */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <Fingerprint className="text-slate-600 dark:text-slate-400 mb-2" size={24} />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-300">Löschen</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">Einfach einen Eintrag in der Liste nach <strong>links wischen</strong>, um ihn zu löschen.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <ShieldCheck className="text-slate-600 dark:text-slate-400 mb-2" size={24} />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-300">Backup</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">Keine Sorge: Die App speichert 1x täglich automatisch eine Sicherung auf dein Handy.</p>
                </div>
              </div>
              
              <div className="text-center text-slate-300 dark:text-slate-700 text-[10px] uppercase tracking-widest font-bold pb-2">
                "Damit keine Stunde im Schacht verschwindet"
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;