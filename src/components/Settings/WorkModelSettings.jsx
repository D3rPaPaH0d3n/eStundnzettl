import React from "react";
import { Calendar, Lock, Unlock, List } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";
import { WORK_MODELS } from "../../hooks/constants";
import toast from "react-hot-toast";

const WorkModelSettings = ({
  userData,
  setUserData,
  isLocked,
  onToggleLock,
  onOpenDayPicker,
  onShowPresetWarning,
}) => {
  const safeUserData = userData || {};
  const activeModelId = safeUserData.workModelId || "custom";
  const isCustomMode = activeModelId === "custom";
  const activeModelLabel =
    WORK_MODELS.find((m) => m.id === activeModelId)?.label || "Benutzerdefiniert";

  const minToHours = (m) =>
    m === 0 ? "" : Number(m / 60).toFixed(2).replace(".", ",");

  return (
    <Card className="p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-800/50">
      <div className="flex justify-between items-start gap-4">
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
              onClick={onToggleLock}
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
            onClick={onShowPresetWarning}
            className="bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 px-3 py-2 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm shrink-0"
          >
            <List size={14} /> Vorlagen
          </button>
        </div>
      </div>

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

      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
          Wochenstunden:{" "}
          {(safeUserData.workDays.reduce((a, b) => a + b, 0) / 60).toLocaleString(
            "de-DE"
          )}{" "}
          h
        </span>
      </div>
    </Card>
  );
};

export default WorkModelSettings;
