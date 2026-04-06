import React from "react";
import {
  RefreshCw,
  BookOpen,
  History,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";
import { APP_VERSION } from "../../hooks/constants";

interface AppInfoSettingsProps {
  onCheckUpdate: () => void;
  onDeleteAll: () => void;
  onShowHelp: () => void;
  onShowChangelog: () => void;
}

const AppInfoSettings: React.FC<AppInfoSettingsProps> = ({
  onCheckUpdate,
  onDeleteAll,
  onShowHelp,
  onShowChangelog,
}) => {
  return (
    <>
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-zinc-700 dark:text-white">
          App & Informationen
        </h3>

        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onCheckUpdate?.();
          }}
          className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className="text-zinc-500" />
            <div>
              <div className="font-medium">Auf Updates prüfen</div>
              <div className="text-sm text-zinc-500">
                Aktuelle Version: {APP_VERSION}
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onShowHelp?.();
          }}
          className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-zinc-500" />
            <div>
              <div className="font-medium">Hilfe & Anleitung</div>
              <div className="text-sm text-zinc-500">
                Wie die App funktioniert
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onShowChangelog?.();
          }}
          className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <History size={18} className="text-zinc-500" />
            <div>
              <div className="font-medium">Changelog</div>
              <div className="text-sm text-zinc-500">
                Was ist neu in der App
              </div>
            </div>
          </div>
        </button>
      </Card>

      <Card className="p-5 space-y-3 mt-4">
        <h3 className="font-bold text-zinc-700 dark:text-white text-red-600 dark:text-red-400">
          Gefährliche Aktionen
        </h3>

        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Medium });
            onDeleteAll?.();
          }}
          className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Trash2 size={18} className="text-red-600 dark:text-red-400" />
            <div>
              <div className="font-medium text-red-600 dark:text-red-400">
                Alle Daten löschen
              </div>
              <div className="text-sm text-red-500 dark:text-red-300">
                Einträge, Tätigkeiten, Einstellungen
              </div>
            </div>
          </div>
          <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
        </button>
      </Card>
    </>
  );
};

export default AppInfoSettings;