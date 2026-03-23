import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

import { CHANGELOG_DATA } from "../data/changelog-data";


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
              fixed z-[160] flex flex-col bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden
              inset-x-0 bottom-0 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:w-[600px] md:h-[80vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            `}
          >
            {/* DRAG HANDLE */}
            <div 
                className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none" 
                onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* CHANGE: border-slate-100 -> border-zinc-100 */}
            <div className="flex justify-between items-center p-5 pt-2 md:pt-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 z-10">
              <div>
                {/* CHANGE: text-slate-800 -> text-zinc-800 */}
                <h2 className="text-xl font-bold text-zinc-800 dark:text-white">Änderungsprotokoll</h2>
                {/* CHANGE: text-slate-500 -> text-zinc-500 */}
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Was ist neu in der App?</p>
              </div>
              <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div 
              id="changelog-content"
              className="flex-1 overflow-y-auto p-0 scrollbar-hide"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            >
              {CHANGELOG_DATA.map((release, idx) => (
                <div key={release.version} className={`p-6 ${idx < CHANGELOG_DATA.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''} ${release.isMajor ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                  
                  <div className="flex justify-between items-baseline mb-3">
                    {/* CHANGE: text-slate-800 -> text-zinc-800, dark:text-slate-100 -> dark:text-zinc-100 */}
                    <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                      v{release.version}
                      {/* CHANGE: bg-orange-500 -> bg-emerald-500 */}
                      {release.isMajor && <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded-full uppercase tracking-wider">Major</span>}
                    </h3>
                    {/* CHANGE: text-slate-400 -> text-zinc-400 */}
                    <span className="text-xs font-medium text-zinc-400">{release.date}</span>
                  </div>
                  
                  {/* CHANGE: text-slate-600 -> text-zinc-600 */}
                  {release.title && <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300 mb-4 italic">"{release.title}"</p>}

                  <div className="space-y-4">
                    {release.sections.map((section, sIdx) => (
                      <div key={sIdx}>
                        {/* CHANGE: text-slate-400 -> text-zinc-400 */}
                        <h4 className="text-xs font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1.5">
                          <section.icon size={14} /> {section.title}
                        </h4>
                        <ul className="space-y-2">
                          {section.items.map((item, iIdx) => (
                            <li key={iIdx} className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-2 leading-relaxed">
                              {/* CHANGE: bg-slate-300 -> bg-zinc-300 */}
                              <span className="block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 mt-1.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="p-4 text-center text-zinc-300 dark:text-zinc-600 text-[10px] uppercase tracking-widest">
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
