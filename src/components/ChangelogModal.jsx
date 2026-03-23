import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Lazy-load changelog data + icons to keep initial bundle small
let cachedData = null;
let cachedIcons = null;

const loadChangelogData = async () => {
  if (cachedData) return { data: cachedData, icons: cachedIcons };

  const [
    { CHANGELOG_DATA },
    { Zap, Bug, Shield, Globe, Clock, Timer, Rocket, Sliders, Download, Cloud, Building2, Sparkles }
  ] = await Promise.all([
    import("../data/changelog-data"),
    import("lucide-react")
  ]);

  const iconMap = { Zap, Bug, Shield, Globe, Clock, Timer, Rocket, Sliders, Download, Cloud, Building2, Sparkles };
  cachedData = CHANGELOG_DATA;
  cachedIcons = iconMap;
  return { data: CHANGELOG_DATA, icons: iconMap };
};

const ChangelogModal = ({ isOpen, onClose }) => {
  const [changelogData, setChangelogData] = useState(null);
  const [icons, setIcons] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !changelogData) {
      setLoading(true);
      loadChangelogData().then(({ data, icons: iconMap }) => {
        setChangelogData(data);
        setIcons(iconMap);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen, changelogData]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-zinc-900 w-full sm:max-w-md max-h-screen sm:max-h-[80vh] overflow-hidden flex flex-col rounded-t-3xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="text-lg">📋</div>
                <h2 className="font-bold text-zinc-800 dark:text-white">Änderungsprotokoll</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} className="text-zinc-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {loading ? (
                <div className="text-center py-10 text-zinc-400 text-sm">Lädt...</div>
              ) : (
                changelogData?.map((version, idx) => {
                  const Icon = version.icon ? icons[version.iconName] : null;
                  return (
                    <div key={version.version} className="space-y-3">
                      {idx > 0 && <div className="border-t border-zinc-100 dark:border-zinc-800" />}
                      {/* Version Header */}
                      <div className="flex items-center gap-3">
                        {Icon && <Icon size={18} className="text-emerald-500" />}
                        <div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {version.version}
                          </span>
                          <span className="text-zinc-400 text-xs ml-2">{version.date}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-zinc-800 dark:text-white text-base leading-snug">
                        {version.title}
                      </h3>
                      {/* Sections */}
                      {version.sections?.map((section) => {
                        const SectionIcon = icons[section.icon?.name];
                        return (
                          <div key={section.title} className="space-y-2">
                            <div className="flex items-center gap-2">
                              {SectionIcon && <SectionIcon size={14} className="text-zinc-400" />}
                              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                {section.title}
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {section.items?.map((item, i) => (
                                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                                  <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChangelogModal;
