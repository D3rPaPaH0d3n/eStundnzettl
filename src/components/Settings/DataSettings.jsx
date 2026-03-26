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

const DataSettings = ({
  userData,
  setUserData,
  setShowWorkCodeManager,
  isLocked,
  onToggleLock,
  onOpenDayPicker,
}) => {
  const [isWorkModelExpanded, setIsWorkModelExpanded] = useState(true);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showPresetWarning, setShowPresetWarning] = useState(false);
  const [showDemoWarning, setShowDemoWarning] = useState(false);

  const safeUserData = userData || {};
  const activeModelId = safeUserData.workModelId || "custom";
  const isCustomMode = activeModelId === "custom";
  const activeModelLabel =
    WORK_MODELS.find((m) => m.id === activeModelId)?.label || "Benutzerdefiniert";

  useEffect(() => {
    // Always expand initially so existing users see the content
    setIsWorkModelExpanded(true);
  }, []);

  const minToHours = (m) =>
    m === 0 ? "" : Number(m / 60).toFixed(2).replace(".", ",");

  const toggleWorkModelExpanded = () => {
    setIsWorkModelExpanded(!isWorkModelExpanded);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleShowPresetWarning = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    setShowPresetWarning(true);
  };

  const handlePresetSelect = (model) => {
    const newUserData = { ...userData, workModelId: model.id };
    if (model.id !== "custom" && model.days) {
      newUserData.workDays = [...model.days];
    }
    setUserData(newUserData);
    toast.success(
      model.id === "custom" ? "Benutzerdefiniert aktiviert" : "Vorlage übernommen"
    );
    Haptics.impact({ style: ImpactStyle.Medium });
  };

  // Check if user has data without backup (sync read — ok for UI hint)
  const hasEntriesWithoutBackup = () => {
    try {
      // Try localStorage first (Web/Dev)
      const entriesLS = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      const lastBackupLS = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      if (entriesLS && JSON.parse(entriesLS).length > 0 && !lastBackupLS) {
        return true;
      }
      
      // For SQLite, we'd need async check - return false for now (UI hint only)
      return false;
    } catch { return false; }
  };

  const handleLoadDemoData = () => {
    setShowDemoWarning(true);
  };

  const handleConfirmDemoData = async () => {
    Haptics.impact({ style: ImpactStyle.Medium });
    const demoUser = { ...DEMO_DATA.user };
    const demoEntries = DEMO_DATA.generateEntries();
    
    // Dual-Write: localStorage (für Web/Dev Fallback)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(demoEntries));
    localStorage.setItem(
      STORAGE_KEYS.WORK_CODES,
      JSON.stringify(DEMO_DATA.workCodes)
    );
    localStorage.removeItem(STORAGE_KEYS.LAST_CODE);
    
    // SQLite (für Android)
    if (isSQLiteActive()) {
      try {
        await Promise.all([
          setSetting("user", demoUser),
          bulkInsertEntries(demoEntries),
          bulkReplaceWorkCodes(DEMO_DATA.workCodes),
          deleteSetting("last_code")
        ]);
      } catch (err) {
        console.error("[DataSettings] SQLite-Demo-Daten schreiben fehlgeschlagen:", err);
      }
    }
    
    toast.success("Demo-Daten geladen! Seite wird neu geladen...");
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <>
      <Card className="p-5 space-y-4">
        {/* Collapsible Work Model Section */}
        <div className="space-y-3">
          {/* Collapsible Header */}
          <div
            onClick={toggleWorkModelExpanded}
            className="flex justify-between items-start gap-4 cursor-pointer select-none"
          >
            <div>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-zinc-400" />
                <h3 className="font-bold text-zinc-700 dark:text-white">
                  Arbeitszeit Modell
                </h3>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                Aktuell:{" "}
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {activeModelLabel}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              {isCustomMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock();
                  }}
                  className={`p-2 rounded-lg border transition-all ${
                    isLocked
                      ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-500"
                      : "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900 text-emerald-600"
                  }`}
                >
                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowPresetWarning();
                }}
                className="bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 px-3 py-2 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm shrink-0"
              >
                <List size={14} /> Vorlagen
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWorkModelExpanded();
                }}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                {isWorkModelExpanded ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {isWorkModelExpanded && (
            <div className="space-y-4 pt-2">
              {/* Week Hours Display */}
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                  Wochenstunden:{" "}
                  {(safeUserData.workDays.reduce((a, b) => a + b, 0) / 60).toLocaleString(
                    "de-DE"
                  )}{" "}
                  h
                </span>
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-2">
                {[
                  { label: "Mo", dayIndex: 1 },
                  { label: "Di", dayIndex: 2 },
                  { label: "Mi", dayIndex: 3 },
                  { label: "Do", dayIndex: 4 },
                  { label: "Fr", dayIndex: 5 },
                  { label: "Sa", dayIndex: 6 },
                  { label: "So", dayIndex: 0 },
                ].map(({ label, dayIndex }) => {
                  const isInteractive = isCustomMode && !isLocked;

                  return (
                    <div key={dayIndex} className="flex flex-col gap-1">
                      <label
                        className={`text-[10px] font-bold text-center uppercase ${
                          dayIndex === 0 || dayIndex === 6
                            ? "text-red-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {label}
                      </label>
                      <div
                        onClick={() => isInteractive && onOpenDayPicker(dayIndex)}
                        className={`w-full text-center p-2 rounded-lg text-xs font-bold border transition-colors relative h-[34px] flex items-center justify-center
                          ${isInteractive
                            ? "bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-white shadow-sm cursor-pointer hover:border-emerald-500"
                            : "bg-transparent border-transparent text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-80"
                          }
                        `}
                      >
                        {safeUserData.workDays[dayIndex] > 0
                          ? minToHours(safeUserData.workDays[dayIndex])
                          : "-"}

                        {safeUserData.workDays[dayIndex] > 0 && (
                          <div
                            className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                              isInteractive
                                ? "bg-emerald-500"
                                : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-100 dark:border-zinc-700" />

        {/* Minütige Zeiteingabe */}
        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="text-xl">⏱️</div>
            <div>
              <div className="font-medium text-zinc-700 dark:text-white">
                Minütige Zeiteingabe
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {userData?.minuteInput ? "1-Minuten-Modus" : "15-Minuten-Schritte"}
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              setUserData((p) => ({ ...p, minuteInput: !p?.minuteInput }))
            }
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
              userData?.minuteInput
                ? "bg-emerald-500"
                : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                userData?.minuteInput ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Tätigkeitscodes */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <ListChecks size={18} className="text-sky-500" />
              <div>
                <div className="font-medium text-zinc-700 dark:text-white">
                  Tätigkeitscodes
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Presets für deine Branche laden
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                Haptics.impact({ style: ImpactStyle.Light });
                setShowWorkCodeManager(true);
              }}
              className="px-4 py-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 font-medium rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/40 transition-colors flex items-center gap-2"
            >
              <ListChecks size={16} /> Verwalten
            </button>
          </div>
        </div>

        {/* Discrete Demo-Daten Button */}
        <div className="text-center pt-2">
          <button
            onClick={handleLoadDemoData}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium transition-colors"
          >
            Demo-Daten laden
          </button>
        </div>
      </Card>

      {/* Modals */}
      <PresetModal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        onSelect={handlePresetSelect}
        currentModelId={activeModelId}
      />

      <ConfirmModal
        isOpen={showPresetWarning}
        onClose={() => setShowPresetWarning(false)}
        onConfirm={() => {
          setShowPresetWarning(false);
          setTimeout(() => setShowPresetModal(true), 100);
        }}
        title="Arbeitszeitmodell ändern?"
        message="Achtung: Eine Änderung des Modells führt zu einer Neuberechnung der Überstunden aller bisherigen Einträge! Möchtest du fortfahren?"
        confirmText="Verstanden"
        confirmColor="red"
      />

      <ConfirmModal
        isOpen={showDemoWarning}
        onClose={() => setShowDemoWarning(false)}
        onConfirm={handleConfirmDemoData}
        title="⚠️ Demo-Daten laden"
        message={`Achtung: Alle deine bisherigen Daten werden überschrieben! ${
          hasEntriesWithoutBackup()
            ? "🚨 Du hast keine Backup-Datei erstellt! Deine Daten sind unwiderruflich verloren wenn du fortfährst!"
            : "Stelle sicher dass du ein Backup hast bevor du fortfährst."
        }

Einträge, Einstellungen und Tätigkeitscodes werden durch die Demo-Daten ersetzt.`}
        confirmText="Ja, laden"
        confirmColor="red"
      />
    </>
  );
};

export default DataSettings;
