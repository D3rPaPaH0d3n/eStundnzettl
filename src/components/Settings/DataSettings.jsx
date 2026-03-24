import React from "react";
import { Settings as SettingsIcon, ListChecks, FlaskConical } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";
import { WORK_MODELS, STORAGE_KEYS } from "../../hooks/constants";
import { DEMO_DATA } from "../../utils/demoData";
import toast from "react-hot-toast";

const DataSettings = ({ userData, setUserData, setShowWorkCodeManager }) => {
  const handleLoadDemoData = () => {
    Haptics.impact({ style: ImpactStyle.Medium });
    if (
      window.confirm(
        "Demo-Daten laden? Alle bisherigen Daten werden ersetzt!"
      )
    ) {
      const demoUser = { ...DEMO_DATA.user };
      const demoEntries = DEMO_DATA.generateEntries();
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(demoEntries));
      localStorage.setItem(
        STORAGE_KEYS.WORK_CODES,
        JSON.stringify(DEMO_DATA.workCodes)
      );
      localStorage.removeItem(STORAGE_KEYS.LAST_CODE);
      toast.success("Demo-Daten geladen! Seite wird neu geladen...");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-bold text-zinc-700 dark:text-white flex items-center gap-2 mb-2">
        <SettingsIcon size={18} className="text-emerald-500" />
        <span>Einstellungen & Daten</span>
      </h3>

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

      {/* Demo-Daten */}
      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <FlaskConical
              size={18}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <div>
              <div className="font-medium text-zinc-700 dark:text-white">
                Demo-Daten
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Testdaten für die App laden
              </p>
            </div>
          </div>
          <button
            onClick={handleLoadDemoData}
            className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-2"
          >
            <FlaskConical size={16} /> Laden
          </button>
        </div>
      </div>
    </Card>
  );
};

export default DataSettings;
