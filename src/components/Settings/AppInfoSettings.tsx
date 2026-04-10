import React, { useState } from "react";
import {
  RefreshCw,
  BookOpen,
  History,
  AlertTriangle,
  Trash2,
  Wrench,
  Calculator,
  FlaskConical,
  Shield,
  Globe,
  Code2,
  Coffee,
} from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Browser } from "@capacitor/browser";
import toast from "react-hot-toast";
import { Card } from "../../utils";
import { APP_VERSION } from "../../hooks/constants";
import ConfirmModal from "../ConfirmModal";
import { recalculateAllEntries } from "../../utils/timeCalculations";
import { logger } from "../../utils/logger";
import type { UserData } from "../../types";
import type { Locale } from "../../locales/types";

interface Props {
  onCheckUpdate?: () => void;
  onDeleteAll?: () => void;
  onShowHelp?: () => void;
  onShowChangelog?: () => void;
  onLoadDemoData?: () => void;
  userData: UserData;
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
  locale?: Locale;
}

const AppInfoSettings: React.FC<Props> = ({
  onCheckUpdate,
  onDeleteAll,
  onShowHelp,
  onShowChangelog,
  onLoadDemoData,
  userData,
  setUserData,
  locale,
}) => {
  const expertMode = userData?.expertMode ?? false;
  const [showRecalcWarning, setShowRecalcWarning] = useState(false);

  const handleConfirmRecalculate = async () => {
    Haptics.impact({ style: ImpactStyle.Medium });
    try {
      const { total, fixed } = await recalculateAllEntries(userData, locale);
      if (fixed > 0) {
        toast.success(`${fixed} von ${total} Einträgen korrigiert`);
      } else {
        toast.success(`Alle ${total} Einträge sind korrekt`);
      }
    } catch (err) {
      logger.error("[AppInfoSettings] Neuberechnung fehlgeschlagen:", err);
      toast.error("Fehler bei der Neuberechnung");
    }
  };

  const openExternalLink = async (url: string) => {
    Haptics.impact({ style: ImpactStyle.Light });
    try {
      await Browser.open({ url });
    } catch (err) {
      logger.error("[AppInfoSettings] Link konnte nicht geöffnet werden:", err);
      toast.error("Link konnte nicht geöffnet werden");
    }
  };

  const toggleExpertMode = () => {
    Haptics.impact({ style: ImpactStyle.Medium });
    const next = !expertMode;
    setUserData((prev: UserData) => ({ ...prev, expertMode: next }));
    toast(next ? "Hausmasta-Modus aktiviert" : "Hausmasta-Modus deaktiviert", {
      icon: next ? "\uD83D\uDD27" : "\uD83D\uDD12",
    });
  };
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

      {/* Über — Links zu Datenschutz, Website, GitHub */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-zinc-700 dark:text-white">
          Über
        </h3>

        <button
          onClick={() => openExternalLink("https://d3rpapah0d3n.github.io/eStundnzettl/privacy.html")}
          className="w-full py-3 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          <Shield size={18} /> Datenschutzerklärung
        </button>

        <button
          onClick={() => openExternalLink("https://d3rpapah0d3n.github.io/eStundnzettl/")}
          className="w-full py-3 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          <Globe size={18} /> Website
        </button>

        <button
          onClick={() => openExternalLink("https://github.com/D3rPaPaH0d3n/eStundnzettl")}
          className="w-full py-3 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          <Code2 size={18} /> Quellcode auf GitHub
        </button>

        <button
          onClick={() => openExternalLink("https://revolut.me/mkainer/pocket/HpwaG0mwAw")}
          className="w-full py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800"
        >
          <Coffee size={18} /> A Scherzl spendier'n
        </button>
      </Card>

      {/* Hausmasta-Modus Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${expertMode ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"}`}>
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-800 dark:text-white">
                Hausmasta-Modus
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {expertMode ? "Alle Einstellungen sichtbar" : "Erweiterte Einstellungen ausgeblendet"}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={expertMode}
              onChange={toggleExpertMode}
            />
            <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-amber-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        {expertMode && (
          <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/30 flex gap-2">
            <button
              onClick={() => setShowRecalcWarning(true)}
              className="flex-1 py-2 px-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <Calculator size={14} />
              Neu berechnen
            </button>
            <button
              onClick={onLoadDemoData}
              className="flex-1 py-2 px-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <FlaskConical size={14} />
              Demo-Daten
            </button>
          </div>
        )}
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

      <ConfirmModal
        isOpen={showRecalcWarning}
        onClose={() => setShowRecalcWarning(false)}
        onConfirm={() => {
          setShowRecalcWarning(false);
          handleConfirmRecalculate();
        }}
        title="Einträge neu berechnen?"
        message="Alle gespeicherten Arbeitszeit-Einträge werden anhand von Start, Ende und Pause neu berechnet. Dies korrigiert fehlerhafte Werte aus älteren App-Versionen. Korrekte Einträge bleiben unverändert."
        confirmText="Neu berechnen"
        confirmColor="emerald"
      />
    </>
  );
};

export default AppInfoSettings;
