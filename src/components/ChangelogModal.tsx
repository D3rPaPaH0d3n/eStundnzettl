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
  LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
// @ts-ignore - JavaScript module without types
import { CHANGELOG_DATA } from "../data/changelog-data.js";

const ICON_MAP: Record<string, LucideIcon> = {
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

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const dragControls = useDragControls();
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const sortedChangelog = useMemo(() => {
    return [...CHANGELOG_DATA].sort((a, b) => {
      const parseVersion = (v: string) => v.split(".").map(Number);
      const aParts = parseVersion(a.version);
      const bParts = parseVersion(b.version);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (bVal !== aVal) return bVal - aVal;
      }
      return 0;
    });
  }, []);

  const toggleVersion = (version: string) => {
    const newSet = new Set(expandedVersions);
    if (newSet.has(version)) {
      newSet.delete(version);
    } else {
      newSet.add(version);
    }
    setExpandedVersions(newSet);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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
            onDragEnd={(_, info) => {
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
                    <FileText size={22} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Changelog</h2>
                    <p className="text-sm text-zinc-500">Was ist neu in eStundnzettl</p>
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
              <div className="space-y-6">
                {sortedChangelog.map((release) => {
                  const isExpanded = expandedVersions.has(release.version);
                  const Icon = ICON_MAP[release.icon] || FileText;

                  return (
                    <div
                      key={release.version}
                      className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden"
                    >
                      {/* Version Header */}
                      <button
                        onClick={() => toggleVersion(release.version)}
                        className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg">
                            <Icon size={18} className="text-emerald-500" />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-lg">
                              v{release.version}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {formatDate(release.date)}
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          size={20}
                          className={`text-zinc-500 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Version Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-white dark:bg-zinc-800">
                              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                                {release.description}
                              </p>

                              <div className="space-y-3">
                                {release.changes.map((change: {icon: string, text: string}, idx: number) => {
                                  const ChangeIcon = ICON_MAP[change.icon] || FileText;
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"
                                    >
                                      <div className="p-1.5 bg-white dark:bg-zinc-800 rounded">
                                        <ChangeIcon size={14} className="text-emerald-500" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                          {change.text}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {release.notes && (
                                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                  <div className="font-medium text-amber-800 dark:text-amber-300">
                                    Hinweis
                                  </div>
                                  <div className="text-sm text-amber-700 dark:text-amber-400">
                                    {release.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-700">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                  Der Changelog wird aus den Commit-Nachrichten generiert.
                  Ältere Versionen sind in den Release-Notes auf GitHub zu finden.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChangelogModal;