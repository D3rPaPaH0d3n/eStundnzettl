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

interface Props {
  onCheckUpdate?: () => void;
  onDeleteAll?: () => void;
  onShowHelp?: () => void;
  onShowChangelog?: () => void;
}

const AppInfoSettings: React.FC<Props> = ({
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
          className="w-full py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <RefreshCw size={18} /> Im Play Store öffnen
        </button>

        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onShowHelp?.();
          }}
          className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <BookOpen size={18} /> Anleitung & Hilfe
        </button>

        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onShowChangelog?.();
          }}
          className="w-full py-3 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
        >
          <History size={18} /> Änderungsprotokoll
        </button>
      </Card>

      {/* Danger Zone */}
      <Card className="p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle
            className="text-red-600 dark:text-red-400"
            size={20}
          />
          <h3 className="font-bold text-red-700 dark:text-red-400">
            Gefahrenzone
          </h3>
        </div>

        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4 font-medium leading-relaxed">
          Hier kannst du die App komplett zurücksetzen und alle lokalen Daten
          unwiderruflich löschen. Das ermöglicht dir einen frischen Start – ideal,
          wenn du z.B. den Einrichtungs-Assistenten erneut durchlaufen möchtest,
          um dein Stundenmodell oder deine Arbeitszeiten zu ändern.
        </p>

        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Medium });
            onDeleteAll?.();
          }}
          className="w-full py-3 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={18} /> Alles löschen & App zurücksetzen
        </button>
      </Card>

      {/* Footer */}
      <div className="text-center space-y-1 pb-4">
        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
          Version {APP_VERSION}
        </p>
        <p className="text-[10px] text-zinc-300 dark:text-zinc-600 font-medium">
          Ausgetüftelt 💭 von Markus 👨 und mit Herz ❤️, Hirn 🧠 und KI-Agenten 🤖 gebaut!
        </p>
      </div>
    </>
  );
};

export default AppInfoSettings;
