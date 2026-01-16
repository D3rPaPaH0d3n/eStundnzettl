import React, { useEffect } from "react";
import { X, Rocket, BookOpen, Car, ShieldCheck, Play, Square, Wand2, Fingerprint, Hourglass, FileText } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

const HelpModal = ({ isOpen, onClose }) => {
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
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            dragListener={false} 
            dragControls={dragControls}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            // CHANGE: bg-white dark:bg-slate-900 -> bg-white dark:bg-zinc-900
            // CHANGE: border-slate-200 -> border-zinc-200
            className={`
              fixed z-[160] flex flex-col bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden
              inset-x-0 bottom-0 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:w-[600px] md:h-[85vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            `}
          >
            {/* DRAG HANDLE */}
            <div 
              // CHANGE: bg-white dark:bg-slate-900 -> bg-white dark:bg-zinc-900
              // CHANGE: bg-slate-200 -> bg-zinc-200
              className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* HEADER */}
            {/* CHANGE: border-slate-100 -> border-zinc-100, bg-slate-900 -> bg-zinc-900 */}
            <div className="flex justify-between items-start p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 z-10">
              <div>
                {/* CHANGE: text-slate-800 -> text-zinc-800 */}
                <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight">Anleitung & Hilfe</h2>
                {/* CHANGE: text-slate-500 -> text-zinc-500 */}
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Schnellstart für Kollegen</p>
              </div>
              <button 
                onClick={onClose} 
                // CHANGE: bg-slate-100 -> bg-zinc-100, text-slate-500 -> text-zinc-500, hover:text-slate-800 -> hover:text-zinc-800
                className="p-2 -mr-2 -mt-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENT */}
            <div 
              // CHANGE: bg-white dark:bg-slate-900 -> bg-white dark:bg-zinc-900
              className="overflow-y-auto p-5 scrollbar-hide space-y-8 bg-white dark:bg-zinc-900"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            >
              
              {/* CHANGE: bg-orange-50 -> bg-emerald-50 (Intro Box an das App-Theme anpassen) */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                {/* CHANGE: text-orange-700 -> text-emerald-700 */}
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider mb-2">
                  <Rocket size={16} /> <span>Wofür ist diese App?</span>
                </div>
                {/* CHANGE: text-slate-700 -> text-zinc-700 */}
                <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                  Schluss mit Zettelwirtschaft! Erfasse deine Stunden, Fahrten und Urlaub direkt am Handy. Am Monatsende erstellst du einfach ein PDF.
                </p>
              </div>

              {/* SCHRITT 1: Stempeln */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    {/* CHANGE: bg-slate-900 -> bg-zinc-900, text-slate-900 -> text-zinc-900 */}
                    <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">1</div>
                    <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Stunden erfassen</h3>
                </div>

                {/* CHANGE: border-slate-100 -> border-zinc-100 */}
                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Du hast zwei Möglichkeiten:
                  </p>
                  
                  {/* OPTION A: LIVE */}
                  {/* CHANGE: bg-slate-50 -> bg-zinc-50, border-slate-100 -> border-zinc-100, text-slate-800 -> text-zinc-800 */}
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-white text-sm mb-1">
                        <Play size={16} className="text-green-500" /> Live Stempeluhr (Neu!)
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2">
                        Drücke links unten auf <span className="font-bold">EIN</span>, wenn du anfängst. Wenn du fertig bist, drücke auf <span className="font-bold">AUS</span>. Die App füllt den Eintrag automatisch aus und rundet die Zeit.
                    </p>
                  </div>

                  {/* OPTION B: MANUELL */}
                  {/* CHANGE: bg-slate-50 -> bg-zinc-50 */}
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-white text-sm mb-1">
                        {/* CHANGE: text-orange-500 -> text-emerald-500 (für den Zauberstab, da Action) */}
                        <Wand2 size={16} className="text-emerald-500" /> Manuell & "Wie zuletzt"
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                       Drücke rechts unten auf das <span className="font-bold">+</span>. Oben kannst du "Wie zuletzt" wählen, um Start, Ende und Pause vom Vortag zu kopieren.
                    </p>
                  </div>
                </div>
              </section>

              {/* SCHRITT 2: Fahrten */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">2</div>
                    <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Fahrtzeiten</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        Wähle oben im Menü "Fahrt".
                    </p>
                    <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
                        <li className="flex gap-2 items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100 dark:border-green-900/30">
                            <span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span> 
                            <span><strong>An/Abreise (Grün):</strong> Bezahlte Arbeitszeit (Code 190).</span>
                        </li>
                        
                        {/* HIER LASSEN WIR ORANGE -> Weil der Button im UI Orange ist */}
                        <li className="flex gap-2 items-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg border border-orange-100 dark:border-orange-900/30">
                            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span> 
                            <span><strong>Fahrtzeit (Orange):</strong> Unbezahlte Zeit (Code 19).</span>
                        </li>
                    </ul>
                </div>
              </section>

              {/* SCHRITT 3: Spezialfälle */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">3</div>
                    <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Urlaub, Krank & ZA</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2">
                    <div className="flex items-start gap-3">
                        <Hourglass className="text-purple-500 mt-1 shrink-0" size={20} />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Wähle einfach <strong>Urlaub</strong>, <strong>Krank</strong> oder <strong>ZA</strong> (Zeitausgleich) aus. Die App trägt automatisch die richtigen Soll-Stunden für den Tag ein.
                        </p>
                    </div>
                </div>
              </section>

              {/* SCHRITT 4: PDF */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">4</div>
                    <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Monatsabschluss</h3>
                </div>
                
                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {/* CHANGE: text-orange-500 -> text-emerald-500 */}
                        Klicke auf dem Startbildschirm oben rechts auf das <FileText className="inline w-4 h-4 mx-1 align-sub text-emerald-500" /> Symbol.
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Dort siehst du eine Vorschau. Prüfe alles und klicke dann auf <strong>PDF</strong>, um den Bericht zu senden oder zu speichern.
                    </div>
                </div>
              </section>

              {/* FOOTER TIPPS */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                  {/* CHANGE: text-slate-600 -> text-zinc-600 */}
                  <Fingerprint className="text-zinc-600 dark:text-zinc-400 mb-2" size={24} />
                  <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-300">Löschen</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">Einfach einen Eintrag in der Liste nach <strong>links wischen</strong>.</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                  <ShieldCheck className="text-zinc-600 dark:text-zinc-400 mb-2" size={24} />
                  <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-300">Backup</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">Die App speichert 1x täglich automatisch eine Sicherung lokal.</p>
                </div>
              </div>
              
              {/* CHANGE: text-slate-300 -> text-zinc-300 */}
              <div className="text-center text-zinc-300 dark:text-zinc-700 text-[10px] uppercase tracking-widest font-bold pb-2">
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
