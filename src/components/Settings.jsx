import React from "react";
import { User, Sun, AlertTriangle } from "lucide-react";
import { Card } from "../utils";

const Settings = ({
  userData,
  setUserData,
  theme,
  setTheme,
  autoBackup,
  setAutoBackup,
  onExport,
  onImport,
  onDeleteAll,
}) => {
  return (
    <main className="w-full p-4 space-y-6">
      {/* USER DATA */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">
            <User size={24} className="text-slate-600 dark:text-slate-200" />
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-white">Benutzerdaten</h3>
            <p className="text-xs text-slate-400">Wird im PDF angezeigt</p>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            Dein Name
          </label>
          <input
            type="text"
            value={userData.name}
            onChange={(e) =>
              setUserData({ ...userData, name: e.target.value })
            }
            className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-slate-800 dark:text-white outline-none focus:border-orange-500"
          />
        </div>
      </Card>

      {/* THEME */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
          <Sun size={18} className="text-orange-400" />
          <span>Design / Theme</span>
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Wähle dein bevorzugtes Erscheinungsbild.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTheme("light")}
            className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors ${
              theme === "light"
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            Hell
          </button>
          
          {/* DUNKEL Button aktiviert! */}
          <button
            onClick={() => setTheme("dark")}
            className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors ${
              theme === "dark"
                ? "border-orange-500 bg-slate-700 text-orange-400"
                : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            Dunkel
          </button>
          
          <button
            disabled
            className="py-2 px-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50"
          >
            System
          </button>
        </div>
      </Card>

      {/* BACKUP */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-white">Daten & Backup</h3>
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-xl mb-2">
          <div>
            <span className="block font-bold text-sm text-slate-800 dark:text-white">
              Automatisches Backup
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Speichert 1x täglich lokal.
            </span>
          </div>
          <button
            onClick={() => {
              if (!autoBackup) {
                localStorage.removeItem("kogler_last_backup_date");
              }
              setAutoBackup(!autoBackup);
            }}
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
              autoBackup ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                autoBackup ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onExport}
            className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600"
          >
            Daten exportieren
          </button>
          <button
            onClick={onImport}
            className="w-full py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Daten importieren
          </button>
        </div>
      </Card>

      {/* DANGER ZONE */}
      <Card className="p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
          <h3 className="font-bold text-red-700 dark:text-red-400">Gefahrenzone</h3>
        </div>
        
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4 font-medium">
          Hier kannst du alle gespeicherten Einträge unwiderruflich löschen.
        </p>

        <button
          onClick={onDeleteAll}
          className="w-full py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shadow-sm"
        >
          Alle Daten löschen
        </button>
      </Card>
      
      <p className="text-center text-xs text-slate-300 dark:text-slate-600">
        App Version 2.0.1
      </p>
    </main>
  );
};

export default Settings;