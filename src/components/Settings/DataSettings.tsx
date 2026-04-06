// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, ListChecks, Calendar, Lock, Unlock, List, ChevronDown, ChevronRight } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";
import { WORK_MODELS, STORAGE_KEYS } from "../../hooks/constants";
import { DEMO_DATA } from "../../utils/demoData";
import toast from "react-hot-toast";
import PresetModal from "../PresetModal";
import ConfirmModal from "../ConfirmModal";
import { isSQLiteActive } from "../../db/storageMode";
import { setSetting, deleteSetting } from "../../db/repositories/settingsRepo";
import { bulkInsertEntries } from "../../db/repositories/entriesRepo";
import { bulkReplaceWorkCodes } from "../../db/repositories/workCodesRepo";
import { logger } from "../../utils/logger";
import { UserData, TimeEntry, WorkCode } from "../../types";
import { motion, AnimatePresence } from "framer-motion";

interface DataSettingsProps {
  userData: UserData;
  setUserData: (data: UserData) => void;
  setShowWorkCodeManager: (show: boolean) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onOpenDayPicker: () => void;
  importEntries: (entries: TimeEntry[]) => void;
  importWorkCodes: (codes: WorkCode[]) => void;
}

const DataSettings: React.FC<DataSettingsProps> = ({
  userData,
  setUserData,
  setShowWorkCodeManager,
  isLocked,
  onToggleLock,
  onOpenDayPicker,
  importEntries,
  importWorkCodes,
}) => {
  const [isWorkModelExpanded, setIsWorkModelExpanded] = useState(true);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showPresetWarning, setShowPresetWarning] = useState(false);
  const [showDemoWarning, setShowDemoWarning] = useState(false);

  const handleWorkModelSelect = (model: typeof WORK_MODELS[0]) => {
    setUserData({
      ...userData,
      workDays: model.days,
    });
    toast.success(`Arbeitsmodell: ${model.name}`);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleApplyPreset = (preset: any) => {
    setShowPresetModal(false);
    
    if (!preset) return;
    
    const newUserData = {
      ...userData,
      name: preset.name || userData.name,
      company: preset.company || userData.company,
      role: preset.role || userData.role,
      workDays: preset.workDays || userData.workDays,
      monthlyTargetMinutes: preset.monthlyTargetMinutes || userData.monthlyTargetMinutes,
    };
    
    setUserData(newUserData);
    
    if (preset.workCodes && preset.workCodes.length > 0) {
      importWorkCodes(preset.workCodes);
    }
    
    toast.success(`Vorlage "${preset.name}" angewendet`);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleLoadDemoData = () => {
    setShowDemoWarning(false);
    
    importEntries(DEMO_DATA.entries);
    importWorkCodes(DEMO_DATA.workCodes);
    
    const newUserData = {
      ...userData,
      name: DEMO_DATA.userData.name || userData.name,
      company: DEMO_DATA.userData.company || userData.company,
      role: DEMO_DATA.userData.role || userData.role,
      workDays: DEMO_DATA.userData.workDays || userData.workDays,
      monthlyTargetMinutes: DEMO_DATA.userData.monthlyTargetMinutes || userData.monthlyTargetMinutes,
    };
    
    setUserData(newUserData);
    
    toast.success("Demo-Daten geladen");
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleResetAll = async () => {
    try {
      await deleteSetting(STORAGE_KEYS.USER_DATA);
      await deleteSetting(STORAGE_KEYS.ENTRIES);
      await deleteSetting(STORAGE_KEYS.WORK_CODES);
      await deleteSetting(STORAGE_KEYS.ONBOARDING_COMPLETE);
      
      window.location.reload();
    } catch (error) {
      console.error("Reset failed:", error);
      toast.error("Zurücksetzen fehlgeschlagen");
    }
  };

  return (
    <Card className="p-5">
      <h3 className="font-bold text-lg mb-4">Daten & Einstellungen</h3>
      
      {/* Work Model */}
      <div className="mb-6">
        <button
          onClick={() => setIsWorkModelExpanded(!isWorkModelExpanded)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-zinc-500" />
            <span className="font-medium">Arbeitsmodell</span>
          </div>
          {isWorkModelExpanded ? (
            <ChevronDown size={18} className="text-zinc-500" />
          ) : (
            <ChevronRight size={18} className="text-zinc-500" />
          )}
        </button>
        
        <AnimatePresence>
          {isWorkModelExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                {WORK_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleWorkModelSelect(model)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      JSON.stringify(userData.workDays) === JSON.stringify(model.days)
                        ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                        : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-zinc-500">
                      {model.days.map(day => ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][day]).join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Lock/Unlock */}
      <div className="mb-6">
        <button
          onClick={onToggleLock}
          className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {isLocked ? (
              <Lock size={18} className="text-zinc-500" />
            ) : (
              <Unlock size={18} className="text-zinc-500" />
            )}
            <div>
              <div className="font-medium">
                {isLocked ? "App gesperrt" : "App entsperrt"}
              </div>
              <div className="text-sm text-zinc-500">
                {isLocked ? "Tippen zum Entsperren" : "Tippen zum Sperren"}
              </div>
            </div>
          </div>
          <div className="px-3 py-1 text-xs font-medium rounded-full bg-zinc-200 dark:bg-zinc-700">
            {isLocked ? "🔒" : "🔓"}
          </div>
        </button>
      </div>
      
      {/* Day Picker */}
      <div className="mb-6">
        <button
          onClick={onOpenDayPicker}
          className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <List size={18} className="text-zinc-500" />
            <div>
              <div className="font-medium">Arbeitstage auswählen</div>
              <div className="text-sm text-zinc-500">
                Individuelle Wochentage festlegen
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-zinc-500" />
        </button>
      </div>
      
      {/* Presets */}
      <div className="mb-6">
        <button
          onClick={() => setShowPresetModal(true)}
          className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <SettingsIcon size={18} className="text-zinc-500" />
            <div>
              <div className="font-medium">Vorlagen</div>
              <div className="text-sm text-zinc-500">
                Schnelleinstellungen laden
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-zinc-500" />
        </button>
      </div>
      
      {/* Demo Data */}
      <div className="mb-6">
        <button
          onClick={() => setShowDemoWarning(true)}
          className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ListChecks size={18} className="text-zinc-500" />
            <div>
              <div className="font-medium">Demo-Daten laden</div>
              <div className="text-sm text-zinc-500">
                Zum Ausprobieren und Testen
              </div>
            </div>
          </div>
          <ChevronRight size={18} className="text-zinc-500" />
        </button>
      </div>
      
      {/* Reset */}
      <div className="mb-4">
        <button
          onClick={() => setShowPresetWarning(true)}
          className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
        >
          Alle Daten zurücksetzen
        </button>
        <p className="text-xs text-zinc-500 mt-2">
          Löscht alle Einträge, Tätigkeiten und Einstellungen
        </p>
      </div>
      
      {/* Storage Mode Info */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        <div className="text-sm font-medium mb-1">Speichermodus</div>
        <div className="text-sm text-zinc-500">
          {isSQLiteActive() ? "SQLite (empfohlen)" : "localStorage (veraltet)"}
        </div>
      </div>

      {/* Modals */}
      <PresetModal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        onSelect={handleApplyPreset}
      />
      
      <ConfirmModal
        isOpen={showPresetWarning}
        onClose={() => setShowPresetWarning(false)}
        onConfirm={handleResetAll}
        title="Alle Daten zurücksetzen?"
        message="Dies löscht ALLE Einträge, Tätigkeiten und Einstellungen. Die App wird neu gestartet. Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Ja, alles löschen"
        confirmStyle="danger"
      />
      
      <ConfirmModal
        isOpen={showDemoWarning}
        onClose={() => setShowDemoWarning(false)}
        onConfirm={handleLoadDemoData}
        title="Demo-Daten laden?"
        message="Dies ersetzt Ihre aktuellen Einträge und Tätigkeiten durch Demo-Daten. Ihre Profil-Einstellungen bleiben erhalten."
        confirmLabel="Ja, Demo-Daten laden"
        confirmStyle="primary"
      />
    </Card>
  );
};

export default DataSettings;