import React from "react";
import { ArrowLeft, Settings as SettingsIcon, FileBarChart } from "lucide-react";
import { motion } from "framer-motion";
import AppLogo from "../assets/logo.png";
import type { Entry } from "../types";

interface AppHeaderProps {
  view: string;
  editingEntry: Entry | null;
  getHeaderTitle: (editingEntry: Entry | null) => string;
  onNavigateBack: () => void;
  onOpenSettings: () => void;
  onOpenReport: () => void;
}

export default function AppHeader({
  view,
  editingEntry,
  getHeaderTitle,
  onNavigateBack,
  onOpenSettings,
  onOpenReport,
}: AppHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 bg-zinc-900 text-white p-4 pb-6 shadow-xl z-50 w-full transition-all"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {view !== "dashboard" && view !== "report" ? (
            <button
              type="button"
              aria-label="Zurück zur Übersicht"
              onClick={onNavigateBack}
              className="p-2 hover:bg-zinc-700 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-800 shadow-inner">
              <img src={AppLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-xl leading-tight tracking-tight">
              {getHeaderTitle(editingEntry)}
            </h1>
            {view === "dashboard" && (
              <p className="text-xs text-zinc-400 font-medium mt-0.5 italic">
                Damit ka Stund verlorn geht<span className="ml-1">⏱️</span>
              </p>
            )}
          </div>
        </div>
        {view === "dashboard" && (
          <div className="flex gap-2">
            <button
              type="button"
              data-tour="settings"
              aria-label="Einstellungen öffnen"
              onClick={onOpenSettings}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors active:scale-95"
            >
              <SettingsIcon size={20} className="text-zinc-300" />
            </button>
            <motion.button
              type="button"
              data-tour="report"
              aria-label="Bericht öffnen"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenReport}
              className="bg-emerald-600 hover:bg-emerald-700 p-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
            >
              <FileBarChart size={20} className="text-white" />
            </motion.button>
          </div>
        )}
      </div>
    </header>
  );
}
