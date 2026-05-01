import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, ListChecks, Calendar, Lock, Unlock, List, ChevronDown, ChevronRight, ClipboardList, Calculator } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";
import CollapsibleCard from "./CollapsibleCard";
import { getIntlLocale } from "../../utils/formatLocale";
import { WORK_MODELS, STORAGE_KEYS } from "../../hooks/constants";
import { DEMO_DATA } from "../../utils/demoData";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import PresetModal from "../PresetModal";
import ConfirmModal from "../ConfirmModal";
import { isSQLiteActive } from "../../db/storageMode";
import { setSetting, deleteSetting } from "../../db/repositories/settingsRepo";
import { bulkInsertEntries } from "../../db/repositories/entriesRepo";
import { bulkReplaceWorkCodes } from "../../db/repositories/workCodesRepo";
import { logger } from "../../utils/logger";

import type { Entry, UserData, WorkCode, WorkModel } from "../../types";

interface Props {
  userData: UserData & { workModelId?: string; minuteInput?: boolean };
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
  setShowWorkCodeManager: (show: boolean) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onOpenDayPicker: (index: number) => void;
  importEntries?: (entries: Entry[]) => void;
  importWorkCodes?: (codes: WorkCode[]) => void;
  expertMode?: boolean;
  demoTrigger?: number;
}

const DataSettings: React.FC<Props> = ({
  userData,
  setUserData,
  setShowWorkCodeManager,
  isLocked,
  onToggleLock,
  onOpenDayPicker,
  importEntries,
  importWorkCodes,
  expertMode = false,
  demoTrigger = 0,
}) => {
  const { t } = useTranslation();
  const [isWorkModelExpanded, setIsWorkModelExpanded] = useState(true);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showPresetWarning, setShowPresetWarning] = useState(false);
  const [showDemoWarning, setShowDemoWarning] = useState(false);

  const safeUserData = userData || {};
  const activeModelId = safeUserData.workModelId || "custom";
  const isCustomMode = activeModelId === "custom";
  const activeModelLabel =
    WORK_MODELS.find((m) => m.id === activeModelId)?.label || t("settings.data.workModel.defaultLabel");

  useEffect(() => {
    // Always expand initially so existing users see the content
    setIsWorkModelExpanded(true);
  }, []);

  // External trigger for demo data dialog (from Hausmasta card)
  useEffect(() => {
    if (demoTrigger > 0) setShowDemoWarning(true);
  }, [demoTrigger]);

  const minToHours = (m: number) =>
    m === 0 ? "" : Number(m / 60).toFixed(2).replace(".", ",");

  const toggleWorkModelExpanded = () => {
    setIsWorkModelExpanded(!isWorkModelExpanded);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleShowPresetWarning = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    setShowPresetWarning(true);
  };

  const handlePresetSelect = (model: WorkModel & { days?: number[] }) => {
    const newUserData = { ...userData, workModelId: model.id };
    if (model.id !== "custom" && model.days) {
      newUserData.workDays = [...model.days];
    }
    setUserData(newUserData);
    toast.success(
      model.id === "custom" ? t("settings.data.toast.customActivated") : t("settings.data.toast.templateApplied")
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

  const handleConfirmDemoData = async () => {
    Haptics.impact({ style: ImpactStyle.Medium });
    const demoUser = { ...DEMO_DATA.user };
    const demoEntries = DEMO_DATA.generateEntries();
    const demoWorkCodes = DEMO_DATA.workCodes;

    // Dual-Write: localStorage (für Web/Dev Fallback)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(demoEntries));
    localStorage.setItem(STORAGE_KEYS.WORK_CODES, JSON.stringify(demoWorkCodes));
    localStorage.removeItem(STORAGE_KEYS.LAST_CODE);

    // SQLite (für Android)
    if (isSQLiteActive()) {
      try {
        await Promise.all([
          setSetting("user", demoUser),
          bulkInsertEntries(demoEntries),
          bulkReplaceWorkCodes(demoWorkCodes),
          deleteSetting("last_code")
        ]);
      } catch (err) {
        logger.error("[DataSettings] SQLite-Demo-Daten schreiben fehlgeschlagen:", err);
      }
    }

    // State direkt aktualisieren (kein Reload nötig)
    setUserData(demoUser);
    if (importEntries) importEntries(demoEntries);
    if (importWorkCodes) importWorkCodes(demoWorkCodes);

    toast.success(t("settings.data.toast.demoLoaded"));
  };

  // Card komplett ausblenden wenn simpleMode aktiv und kein Hausmasta-Modus
  const hasVisibleContent = expertMode || !safeUserData.simpleMode;
  if (!hasVisibleContent) return null;

  return (
    <>
      <CollapsibleCard
        title={t("settings.data.cardTitle")}
        subtitle={t("settings.data.cardSubtitle")}
        icon={
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
            <ClipboardList size={20} />
          </div>
        }
        bodyClassName="px-5 pb-5 pt-0 space-y-4"
      >
        {/* Nur Aufzeichnung Toggle — nur im Hausmasta-Modus */}
        {expertMode && (
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              {safeUserData.simpleMode
                ? <ClipboardList size={20} className="text-emerald-500" />
                : <Calculator size={20} className="text-blue-500" />
              }
              <div>
                <div className="font-bold text-sm text-zinc-800 dark:text-white">
                  {t("settings.data.simpleMode.title")}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {safeUserData.simpleMode ? t("settings.data.simpleMode.on") : t("settings.data.simpleMode.off")}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("settings.data.simpleMode.toggleAria")}
              onClick={() => {
                Haptics.impact({ style: ImpactStyle.Light });
                const newSimple = !safeUserData.simpleMode;
                setUserData((prev: UserData) => ({
                  ...prev,
                  simpleMode: newSimple,
                  workDays: newSimple ? [0, 0, 0, 0, 0, 0, 0] : (prev.workDays?.some((d: number) => d > 0) ? prev.workDays : WORK_MODELS[0].days),
                }));
                toast.success(newSimple ? t("settings.data.simpleMode.toastOn") : t("settings.data.simpleMode.toastOff"));
              }}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
                safeUserData.simpleMode ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  safeUserData.simpleMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        {/* Collapsible Work Model Section — ausgeblendet wenn simpleMode aktiv */}
        {!safeUserData.simpleMode && (
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
                  {t("settings.data.workModel.heading")}
                </h3>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                {t("settings.data.workModel.currentLabel")}
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
                <List size={14} /> {t("settings.data.workModel.templatesButton")}
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
                  {t("settings.data.workModel.weekHours", {
                    hours: (safeUserData.workDays.reduce((a, b) => a + b, 0) / 60).toLocaleString(getIntlLocale()),
                  })}
                </span>
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-2">
                {[
                  { label: t("settings.weekdays.mon"), dayIndex: 1 },
                  { label: t("settings.weekdays.tue"), dayIndex: 2 },
                  { label: t("settings.weekdays.wed"), dayIndex: 3 },
                  { label: t("settings.weekdays.thu"), dayIndex: 4 },
                  { label: t("settings.weekdays.fri"), dayIndex: 5 },
                  { label: t("settings.weekdays.sat"), dayIndex: 6 },
                  { label: t("settings.weekdays.sun"), dayIndex: 0 },
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
        )}

        {/* Divider — nur wenn es Expert-Content darunter gibt */}
        {expertMode && !safeUserData.simpleMode && (
          <div className="border-t border-zinc-100 dark:border-zinc-700" />
        )}

        {/* Minütige Zeiteingabe — nur im Hausmasta-Modus */}
        {expertMode && (
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="text-xl">⏱️</div>
              <div>
                <div className="font-medium text-zinc-700 dark:text-white">
                  {t("settings.data.minuteInput.title")}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {userData?.minuteInput ? t("settings.data.minuteInput.on") : t("settings.data.minuteInput.off")}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setUserData((p: UserData) => ({ ...p, minuteInput: !p?.minuteInput }))
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
        )}

        {/* Tätigkeitscodes — nur im Hausmasta-Modus */}
        {expertMode && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <ListChecks size={18} className="text-sky-500" />
                <div>
                  <div className="font-medium text-zinc-700 dark:text-white">
                    {t("settings.data.workCodes.title")}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t("settings.data.workCodes.subtitle")}
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
                <ListChecks size={16} /> {t("settings.data.workCodes.manageButton")}
              </button>
            </div>
          </div>
        )}

      </CollapsibleCard>

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
        title={t("settings.data.presetWarning.title")}
        message={t("settings.data.presetWarning.message")}
        confirmText={t("settings.data.presetWarning.confirm")}
        confirmColor="red"
      />

      <ConfirmModal
        isOpen={showDemoWarning}
        onClose={() => setShowDemoWarning(false)}
        onConfirm={handleConfirmDemoData}
        title={t("settings.data.demoWarning.title")}
        message={t("settings.data.demoWarning.messageTemplate", {
          hint: hasEntriesWithoutBackup()
            ? t("settings.data.demoWarning.noBackupHint")
            : t("settings.data.demoWarning.withBackupHint"),
        })}
        confirmText={t("settings.data.demoWarning.confirm")}
        confirmColor="red"
      />

    </>
  );
};

export default DataSettings;
