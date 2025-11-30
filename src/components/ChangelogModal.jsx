import React from "react";
import { X, GitCommit, Sparkles, Zap, FileText, Shield, Bug, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CHANGELOG_DATA = [
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
          "High-End Animationen (Seitenübergänge, Listen)",
          "Haptisches Feedback (Vibrationen bei Interaktionen)",
          "Swipe-to-Delete: Einträge einfach nach links wischen",
          "TimePicker: Zeitwahl aktualisiert sich direkt beim Scrollen"
        ]
      },
      {
        icon: Zap,
        title: "Workflow & Speed",
        items: [
          "Magic Copy: Neuer 'Wie zuletzt'-Button im Formular",
          "Autocomplete: Projekt-Vorschläge beim Tippen",
          "Massive Performance-Optimierung (Lazy Loading)",
          "App-Startzeit drastisch verkürzt"
        ]
      },
      {
        icon: FileText,
        title: "PDF Bericht 2.0",
        items: [
          "Profilfoto im Header (automatisch rechtsbündig)",
          "Layout-Fix: Keine leeren Seiten mehr",
          "Vorschau öffnet sich als schickes Overlay"
        ]
      }
    ]
  },
  {
    version: "3.0.0",
    date: "25.11.2025",
    title: "The Dark Mode Update 🌙",
    isMajor: true,
    sections: [
      {
        icon: Sparkles,
        title: "Neue Features & UI",
        items: [
          "Dark Mode: Unterstützung für Hell, Dunkel und System",
          "Custom Drawers: Moderne Slide-Up Menüs statt nativer Auswahl",
          "Smart DatePicker: Neuer Kalender mit Zebra-Look & großen Flächen",
          "Verbesserte UX: Toasts statt nerviger Alerts",
          "Smart Defaults: Merkt sich die letzte Tätigkeit"
        ]
      },
      {
        icon: Zap,
        title: "Technik",
        items: [
          "Komplettes Refactoring in modulare Komponenten",
          "Upgrade auf Tailwind CSS v4 Engine",
          "Android Splash Screen: Weißes Aufblitzen entfernt"
        ]
      }
    ]
  },
  {
    version: "2.0.1",
    date: "20.11.2025",
    title: "Auto-Backup & Dateizugriff 🛡️",
    isMajor: false,
    sections: [
      {
        icon: Shield,
        title: "Datensicherheit",
        items: [
          "Automatisches Backup: Optional 1x täglich",
          "Offener Speicherort: Dateien landen direkt in 'Dokumente'"
        ]
      },
      {
        icon: Bug,
        title: "Fixes",
        items: [
          "Robuster PDF-Export (Zeitstempel in Dateinamen)",
          "Verbesserter Zugriff auf das Dateisystem"
        ]
      }
    ]
  },
  {
    version: "2.0.0",
    date: "18.11.2025",
    title: "PDF V4, Feiertage & Fahrtzeit 🚀",
    isMajor: true,
    sections: [
      {
        icon: FileText,
        title: "PDF Bericht V4",
        items: [
          "Neues Design: Zebra-Look & optimiertes Layout",
          "Tages-Saldo: Neue Spalte für Plus/Minus pro Tag",
          "Erweiterte Zusammenfassung mit Soll/Ist Vergleich"
        ]
      },
      {
        icon: Globe,
        title: "Logik",
        items: [
          "Intelligente Feiertage (automatische Erkennung Österreich)",
          "Differenzierte Fahrtzeiten: Anreise (bezahlt) vs. Fahrt (unbezahlt)",
          "Unbezahlte Zeiten werden separat ausgewiesen"
        ]
      }
    ]
  }
];

const ChangelogModal = ({ isOpen, onClose }) => {
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
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Änderungsprotokoll</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Was ist neu in der App?</p>
              </div>
              <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-0 scrollbar-hide">
              {CHANGELOG_DATA.map((release, idx) => (
                <div key={release.version} className={`p-6 ${idx < CHANGELOG_DATA.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''} ${release.isMajor ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}>
                  
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
              
              <div className="p-8 text-center text-slate-300 dark:text-slate-600 text-xs">
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