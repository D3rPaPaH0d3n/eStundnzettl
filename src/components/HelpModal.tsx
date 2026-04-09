import React, { useEffect } from "react";
import {
  X, Rocket, Play, Wand2, Fingerprint, Hourglass, FileText, Clock,
  Briefcase, Tag, Cloud, ShieldCheck, Car, Wrench, Trash2,
  Upload, ServerCog, FolderOpen, Paperclip, Sun, Moon, Monitor,
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: Props) => {
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
            className={`
              fixed z-[160] flex flex-col bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden
              inset-x-0 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:bottom-auto md:w-[600px] md:h-[85vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            `}
            style={{ bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))" }}
          >
            {/* DRAG HANDLE */}
            <div
              className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-start p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight">Anleitung & Hilfe</h2>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Dein Wegweiser durch den eStundnzettl</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 -mt-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENT */}
            <div
              className="overflow-y-auto p-5 scrollbar-hide space-y-8 bg-white dark:bg-zinc-900"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            >

              {/* INTRO */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider mb-2">
                  <Rocket size={16} /> <span>Servus und herzlich willkommen!</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                  Schluss mit der Zettelwirtschaft! Mit dem eStundnzettl erfasst du deine Arbeitszeiten, Fahrten, Urlaub und mehr direkt am Handy. Am Monatsende erstellst du mit einem Tipp ein sauberes PDF.
                </p>
              </div>

              {/* ─── SCHRITT 1: STUNDEN ERFASSEN ─── */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">1</div>
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Stunden erfassen</h3>
                </div>

                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Du hast zwei Wege, deine Stunden einzutragen:
                  </p>

                  {/* Timer */}
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-white text-sm mb-1">
                      <Play size={16} className="text-green-500" /> Live-Timer
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Halte den <strong className="text-emerald-600 dark:text-emerald-400">+</strong> Button unten rechts lange gedrückt und wische nach oben. Der Timer läuft, bis du ihn mit einem Tipp stoppst. Die App trägt dann Start, Ende und Dauer automatisch ein.
                    </p>
                  </div>

                  {/* Manuell */}
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-white text-sm mb-1">
                      <Wand2 size={16} className="text-emerald-500" /> Manuell eintragen
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Tipp auf den <strong className="text-emerald-600 dark:text-emerald-400">+</strong> Button. Wähle Start- und Endzeit, Pause und Projekt. Mit <strong>"Wie zuletzt"</strong> übernimmst du die Zeiten vom Vortag — praktisch bei gleichbleibenden Arbeitszeiten!
                    </p>
                  </div>
                </div>
              </section>

              {/* ─── SCHRITT 2: FAHRTZEITEN ─── */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">2</div>
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Fahrtzeiten</h3>
                </div>

                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    Wähle beim Erstellen eines Eintrags oben den Typ <strong>"Fahrt"</strong>.
                  </p>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
                    <li className="flex gap-2 items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100 dark:border-green-900/30">
                      <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                      <span><strong>An/Abreise:</strong> Bezahlte Arbeitszeit — zählt zum Tagessoll.</span>
                    </li>
                    <li className="flex gap-2 items-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg border border-orange-100 dark:border-orange-900/30">
                      <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
                      <span><strong>Fahrtzeit:</strong> Unbezahlte Wegzeit — wird separat ausgewiesen.</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* ─── SCHRITT 3: URLAUB, KRANK & ZA ─── */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">3</div>
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Urlaub, Krank & ZA</h3>
                </div>

                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <Hourglass className="text-purple-500 mt-1 shrink-0" size={20} />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Wähle einfach <strong>Urlaub</strong>, <strong>Krank</strong> oder <strong>ZA</strong> (Zeitausgleich). Die App rechnet automatisch die richtigen Soll-Stunden für den Tag ein. Du kannst auch manuell Zeiten eingeben, wenn nötig.
                    </p>
                  </div>
                </div>
              </section>

              {/* ─── SCHRITT 4: DOKUMENTE ANHAENGEN ─── */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">4</div>
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Dokumente anhängen</h3>
                </div>

                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <Paperclip className="text-blue-500 mt-1 shrink-0" size={20} />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Zu jedem Eintrag kannst du Fotos oder Dateien anhängen — z.B. Regiescheine, Lieferscheine oder Arbeitsberichte. Tipp auf <strong>"Dokumente"</strong> beim Eintrag. Die Anhänge werden beim PDF-Export automatisch mitgeliefert.
                    </p>
                  </div>
                </div>
              </section>

              {/* ─── SCHRITT 5: MONATSABSCHLUSS ─── */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">5</div>
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Monatsabschluss & PDF</h3>
                </div>

                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-2">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Tipp oben rechts auf das <FileText className="inline w-4 h-4 mx-1 align-sub text-emerald-500" /> Symbol. Dort siehst du eine Vorschau deines Stundenzettels — nach Monat oder Woche filterbar.
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Prüfen, dann als <strong>PDF teilen</strong> — per Mail, WhatsApp, oder einfach lokal speichern. Fertig!
                  </div>
                </div>
              </section>

              {/* ─── SCHRITT 6: BACKUP ─── */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-lg">6</div>
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Backup & Datensicherung</h3>
                </div>

                <div className="ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-6 py-1 space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Deine Daten sind wertvoll — sicher sie ab!
                  </p>

                  <div className="flex items-start gap-3">
                    <Cloud className="text-emerald-500 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-sm font-bold text-zinc-800 dark:text-white">Google Drive</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Verbinde dein Google-Konto in den Einstellungen. Die App sichert täglich automatisch in die Cloud.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FolderOpen className="text-emerald-500 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-sm font-bold text-zinc-800 dark:text-white">Lokales Backup</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Wähle einen Ordner auf deinem Gerät. Die App sichert täglich dorthin — ganz ohne Internet.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── SCHRITT 7: HAUSMASTA-MODUS ─── */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                    <Wrench size={16} />
                  </div>
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Hausmasta-Modus</h3>
                </div>

                <div className="ml-4 border-l-2 border-amber-200 dark:border-amber-900 pl-6 py-1 space-y-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Für Profis, die mehr wollen! Aktiviere den <strong>Hausmasta-Modus</strong> ganz unten in den Einstellungen. Damit werden zusätzliche Funktionen sichtbar:
                  </p>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <ServerCog size={14} className="text-amber-500 shrink-0" />
                      <span><strong>Nextcloud-Backup</strong> — für deine eigene Cloud</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Upload size={14} className="text-amber-500 shrink-0" />
                      <span><strong>JSON Import/Export</strong> — Daten manuell sichern</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText size={14} className="text-amber-500 shrink-0" />
                      <span><strong>PDF-Archiv</strong> — automatische monatliche PDF-Sicherung</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-500 shrink-0" />
                      <span><strong>Minuten-Modus</strong> — 1-Minuten statt 15-Minuten-Schritte</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Tag size={14} className="text-amber-500 shrink-0" />
                      <span><strong>Tätigkeitscodes</strong> — Branchen-Presets oder eigene Codes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Briefcase size={14} className="text-amber-500 shrink-0" />
                      <span><strong>Nur Aufzeichnung</strong> — ohne Soll/Ist-Berechnung</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* ─── TIPPS & TRICKS ─── */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider">Tipps & Tricks</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                    <Fingerprint className="text-zinc-600 dark:text-zinc-400 mb-2" size={22} />
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-300">Löschen</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">Wisch einen Eintrag nach <strong>links</strong> zum Löschen.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                    <Wand2 className="text-zinc-600 dark:text-zinc-400 mb-2" size={22} />
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-300">Bearbeiten</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">Tipp auf einen Eintrag, um ihn zu <strong>bearbeiten</strong>.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                    <ShieldCheck className="text-zinc-600 dark:text-zinc-400 mb-2" size={22} />
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-300">Auto-Backup</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">Einmal verbunden, sichert die App <strong>täglich automatisch</strong>.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                    <div className="flex gap-1 mb-2">
                      <Sun className="text-zinc-600 dark:text-zinc-400" size={22} />
                      <Moon className="text-zinc-600 dark:text-zinc-400" size={22} />
                    </div>
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-300">Design</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">Hell, Dunkel oder <strong>System</strong> — in den Einstellungen wählbar.</p>
                  </div>
                </div>
              </div>

              {/* TAGLINE */}
              <div className="text-center text-zinc-300 dark:text-zinc-700 text-[10px] uppercase tracking-widest font-bold pb-2">
                "Damit ka Stund verloren geht!"
              </div>

            </div>
            <div
              className="shrink-0 bg-white dark:bg-zinc-900 md:hidden"
              style={{ height: "env(safe-area-inset-bottom)" }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
