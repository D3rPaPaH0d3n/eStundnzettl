import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ChevronDown,
  Zap,
  Bug,
  Shield,
  Globe,
  Clock,
  Timer,
  Rocket,
  Sliders,
  Download,
  Cloud,
  Building2,
  Sparkles,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { CHANGELOG_DATA } from "../data/changelog-data";

const ICON_MAP = {
  Zap,
  Bug,
  Shield,
  Globe,
  Clock,
  Timer,
  Rocket,
  Sliders,
  Download,
  Cloud,
  Building2,
  Sparkles,
  FileText,
};

const groupBugfixVersions = (data) => {
  const result = [];
  let i = 0;

  while (i < data.length) {
    const version = data[i];
    const isBugfixOnly = version.sections?.every((section) => section.iconName === "Bug");

    if (!isBugfixOnly) {
      result.push(version);
      i += 1;
      continue;
    }

    const group = { ...version, isBugfixGroup: true, groupedVersions: [version] };
    let j = i + 1;
    while (j < data.length) {
      const next = data[j];
      const nextIsBugfixOnly = next.sections?.every((section) => section.iconName === "Bug");
      if (!nextIsBugfixOnly) break;
      group.groupedVersions.push(next);
      j += 1;
    }

    result.push(group);
    i = j;
  }

  return result;
};

const ChangelogModal = ({ isOpen, onClose }) => {
  const [openVersions, setOpenVersions] = useState({});
  const dragControls = useDragControls();

  const changelogData = useMemo(() => groupBugfixVersions(CHANGELOG_DATA), []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && changelogData.length > 0) {
      setOpenVersions({ [changelogData[0].version]: true });
      return;
    }

    if (!isOpen) {
      setOpenVersions({});
    }
  }, [isOpen, changelogData]);

  const toggleVersion = (version) => {
    setOpenVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  const renderBugfixGroup = (group, isFirst) => {
    const isVersionOpen = !!openVersions[group.version];
    const count = group.groupedVersions.length;

    return (
      <div key={group.version} className="mb-2">
        <div className="border-t border-zinc-100 dark:border-zinc-800 mb-4" />

        <button
          onClick={() => toggleVersion(group.version)}
          className="w-full flex items-center gap-3 text-left group"
        >
          <motion.div
            animate={{ rotate: isVersionOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown
              size={16}
              className="text-zinc-400 group-hover:text-emerald-500 transition-colors"
            />
          </motion.div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              Kürzliche Bugfixes
            </span>
            <span className="text-zinc-400 text-xs ml-2">({count} Versionen)</span>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isVersionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pl-8 pt-3 space-y-4">
                {group.groupedVersions.map((groupedVersion, index) => (
                  <div key={groupedVersion.version} className={index > 0 ? "pt-2" : ""}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {groupedVersion.version}
                      </span>
                      {index === 0 && <Bug size={11} className="text-zinc-400" />}
                    </div>
                    <ul className="space-y-1.5">
                      {groupedVersion.sections?.flatMap((section) => section.items || []).map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-2"
                        >
                          <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderVersion = (version, isFirst) => {
    const isVersionOpen = !!openVersions[version.version];

    return (
      <div key={version.version} className="mb-2">
        {!isFirst && <div className="border-t border-zinc-100 dark:border-zinc-800 mb-4" />}

        <button
          onClick={() => toggleVersion(version.version)}
          className="w-full flex items-center gap-3 text-left group"
        >
          <motion.div
            animate={{ rotate: isVersionOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown
              size={16}
              className="text-zinc-400 group-hover:text-emerald-500 transition-colors"
            />
          </motion.div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {version.version}
            </span>
            <span className="text-zinc-400 text-xs ml-2">{version.date}</span>
            <span className="text-zinc-600 dark:text-zinc-300 text-sm ml-2 truncate">
              - {version.title}
            </span>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isVersionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pl-8 pt-3 space-y-4">
                {version.sections?.map((section) => {
                  const SectionIcon = ICON_MAP[section.iconName];

                  return (
                    <div key={section.title} className="space-y-2">
                      <div className="flex items-center gap-2">
                        {SectionIcon && <SectionIcon size={13} className="text-zinc-400" />}
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                          {section.title}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {section.items?.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-2"
                          >
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            className="
              fixed z-[160] flex flex-col bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden
              inset-x-0 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800
              max-h-[85vh] h-[85vh]
              md:inset-auto md:bottom-auto md:w-[600px] md:h-[85vh] md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl
            "
            style={{ bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))" }}
          >
            <div
              className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
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

            <div
              className="flex-1 overflow-y-auto px-5 py-4 bg-white dark:bg-zinc-900"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            >
              {changelogData.map((version, index) =>
                version.isBugfixGroup
                  ? renderBugfixGroup(version, index === 0)
                  : renderVersion(version, index === 0)
              )}
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

export default ChangelogModal;
