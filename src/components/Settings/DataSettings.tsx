import React, { useState, useEffect } from "react";
import { Calendar, Lock, Unlock, List, ChevronDown, ChevronRight } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import CollapsibleCard from "./CollapsibleCard";
import { getIntlLocale } from "../../utils/formatLocale";
import { WORK_MODELS, STORAGE_KEYS } from "../../hooks/constants";
import { DEMO_DATA } from "../../utils/demoData";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import PresetModal from "../PresetModal";
import ConfirmModal from "../ConfirmModal";
import { isSQLiteActive } from "../../db/storageMode";
import { deleteSetting } from "../../db/repositories/settingsRepo";
import { replaceFullSnapshot } from "../../db/snapshot";
import { logger } from "../../utils/logger";
import { activateOnEnterOrSpace } from "../../utils/keyboardActivation";

import type { Entry, UserData, WorkCode, WorkModel } from "../../types";

interface Props {
  userData: UserData & { workModelId?: string };
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
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

  // External trigger for demo data dialog (from Hausmasta card)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- counter-as-event from parent to open the dialog
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

    if (isSQLiteActive()) {
      try {
        // Atomarer Demo-Load: Profil, Einträge und Codes in einer
        // Transaktion. Vor dem Refactor liefen diese drei als
        // Promise.all parallel — bei Teilfehler blieb ein Mischzustand.
        await replaceFullSnapshot({
          userData: demoUser,
          entries: demoEntries,
          workCodes: demoWorkCodes,
        });
        // Last-Code-Cache liegt außerhalb des Snapshots; ein Fehler hier
        // ist unkritisch (User wählt eh gleich neu).
        try { await deleteSetting("last_code"); } catch (e) {
          logger.warn("[DataSettings] last_code-Reset nach Demo-Load fehlgeschlagen:", e);
        }
      } catch (err) {
        logger.error("[DataSettings] SQLite-Demo-Daten schreiben fehlgeschlagen:", err);
        toast.error(t("settings.data.toast.demoFailed", { defaultValue: "Demo-Daten konnten nicht geladen werden" }));
        return;
      }
    }

    // State direkt aktualisieren (kein Reload nötig)
    setUserData(demoUser);
    if (importEntries) importEntries(demoEntries);
    if (importWorkCodes) importWorkCodes(demoWorkCodes);

    toast.success(t("settings.data.toast.demoLoaded"));
  };

  return (
    <>
      <CollapsibleCard
        title={t("settings.data.cardTitle")}
        subtitle={t("settings.data.cardSubtitle")}
        icon={
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
            <Calendar size={20} />
          </div>
        }
        defaultExpanded={false}
        bodyClassName="px-5 pb-5 pt-0 space-y-4"
      >
        {safeUserData.simpleMode && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              {t("settings.data.simpleWorkScheduleHint")}
            </p>
          </div>
        )}

        {/* Collapsible Work Model Section — ausgeblendet wenn simpleMode aktiv */}
        {!safeUserData.simpleMode && (
        <div className="space-y-3">
          {/* Collapsible Header */}
          <div
            role="button"
            tabIndex={0}
            aria-expanded={isWorkModelExpanded}
            onClick={toggleWorkModelExpanded}
            onKeyDown={(event) => activateOnEnterOrSpace(event, toggleWorkModelExpanded)}
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
                <button type="button"
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

              <button type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowPresetWarning();
                }}
                className="bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 px-3 py-2 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm shrink-0"
              >
                <List size={14} /> {t("settings.data.workModel.templatesButton")}
              </button>

              <button type="button"
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
                      <div
                        className={`text-[10px] font-bold text-center uppercase ${
                          dayIndex === 0 || dayIndex === 6
                            ? "text-red-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {label}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDayPicker(dayIndex)}
                        disabled={!isInteractive}
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
                          <span
                            className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                              isInteractive
                                ? "bg-emerald-500"
                                : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                          />
                        )}
                      </button>
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
