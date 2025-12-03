import React, { useEffect } from "react";
import { X, Sparkles, Zap, FileText, Shield, Bug, Globe, Clock, Timer } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

const CHANGELOG_DATA = [
  {
    version: "4.3.0",
    date: "04.12.2025",
    title: "The Live Update ⏱️",
    isMajor: true,
    sections: [
      {
        icon: Timer,
        title: "Live Stempeluhr",
        items: [
          "Endlich da: Drücke einfach auf 'Einstempeln' und die App erfasst deine Zeit live",
          "Neuer 'EIN/AUS' Button: Schwebend unten links, immer erreichbar",
          "Live-Status: Siehe sofort, wie viel Zeit noch fehlt oder ob du schon Überstunden machst"
        ]
      },
      {
        icon: Zap,
        title: "Workflow & Logik",
        items: [
          "Auto-Rundung: Beim Ausstempeln wird automatisch kaufmännisch auf 15 Minuten gerundet",
          "Smart-Entry: Gestoppte Zeiten landen direkt fix und fertig im Formular",
          "Zeitzonen-Fix: Korrekte Uhrzeit-Erfassung unabhängig von der Serverzeit"
        ]
      }
    ]
  },
  {
    version: "4.2.0",
    date: "03.12.2025",
    title: "Smart Time & Zeitausgleich 🧠",
    isMajor: false,
    sections: [
      {
        icon: Sparkles,
        title: "Neue Features",
        items: [
          "Smart Time: Startzeit orientiert sich automatisch am letzten Eintrag",
          "Zeitausgleich (ZA): Eigener Button für korrekte Stundenberechnung",
          "Dashboard: Pause wird jetzt direkt in der Liste angezeigt"
        ]
      },
      {
        icon: FileText,
        title: "PDF & Design",
        items: [
          "PDF-Bericht: Kompaktes Layout, leere Kategorien werden ausgeblendet",
          "Dezenter DatePicker: Feiertage jetzt nur noch durch rote Schrift markiert"
        ]
      }
    ]
  },
  {
    version: "4.1.1",
    date: "02.12.2025",
    title: "PDF Perfektion & Notizen 📝",
    isMajor: false,
    sections: [
      {
        icon: FileText,
        title: "PDF Bericht",
        items: [
          "Perfektes A4-Format ohne leere Seiten",
          "Notiz-Funktion für den Monatsbericht",
          "Intelligente Datums-Gruppierung im PDF"
        ]
      }
    ]
  },
  {
    version: "4.1.0",
    date: "01.12.2025",
    title: "The Precision Update 🎯",
    isMajor: true,
    sections: [
      {
        icon: Shield,
        title: "Sicherheit",
        items: [
          "Schutz vor doppelten Einträgen (Zeitüberschneidung)",
          "OTA-Check: Updates direkt in der App suchen"
        ]
      },
      {
        icon: Bug,
        title: "Fixes",
        items: [
          "iPhone Fix: Buttons jetzt zuverlässig klickbar",
          "Safe-Area Anpassung für moderne Displays"
        ]
      }
    ]
  },
  {
    version: "4.0.0",
    date: "30.11.2025",
    title: "The Smooth Elevator Update 🛗",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Look & Feel",
        items: [
          "High-End Animationen & Haptisches Feedback",
          "Swipe-to-Delete: Einträge einfach wegwischen",
          "Neues Design mit 'Wie zuletzt'-Automatik"
        ]
      }
    ]
  }
];

const ChangelogModal = ({ isOpen, onClose }) => {
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
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            className={`
              fixed z-[160] flex flex-col bg-white dark:bg-slate-900 shadow-2xl overflow-hidden
              inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 dark:border-slate-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:w-[600px] md:h-[80vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            `}
          >
            {/* DRAG HANDLE */}
            <div 
                className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing touch-none" 
                onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            <div className="flex justify-between items-center p-5 pt-2 md:pt-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Änderungsprotokoll</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Was ist neu in der App?</p>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div 
              className="flex-1 overflow-y-auto p-0 scrollbar-hide"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            >
              {CHANGELOG_DATA.map((release, idx) => (
                <div key={release.version} className={`p-6 ${idx < CHANGELOG_DATA.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''} ${release.isMajor ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                  
                  <div className="flex justify-between items-baseline mb-3">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      v{release.version}
                      {release.isMajor && <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded-full uppercase tracking-wider">Major</span>}
                    </h3>
                    <span className="text-xs font-medium text-slate-400">{release.date}</span>
                  </div>
                  
                  {release.title && <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4 italic">"{release.title}"</p>}

                  <div className="space-y-4">
                    {release.sections.map((section, sIdx) => (
                      <div key={sIdx}>
                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                          <section.icon size={14} /> {section.title}
                        </h4>
                        <ul className="space-y-2">
                          {section.items.map((item, iIdx) => (
                            <li key={iIdx} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                              <span className="block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="p-4 text-center text-slate-300 dark:text-slate-600 text-[10px] uppercase tracking-widest">
                Ende des Protokolls
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChangelogModal;