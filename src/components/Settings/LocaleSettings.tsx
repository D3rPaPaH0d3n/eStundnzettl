import React, { useState, useMemo } from "react";
import { Globe, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../../utils";
import type { Locale, LocaleId } from "../../locales/types";
import { GERMAN_STATE_IDS, GERMAN_STATE_NAMES, type GermanState } from "../../locales";
import SelectionDrawer from "../SelectionDrawer";

/**
 * Locale-Auswahl in den Settings: erlaubt dem User, die Stunden-
 * berechnung nachträglich umzustellen. Die Auswahl wirkt sich sofort
 * auf Dashboard, PDF-Export und Feiertags-Markierungen aus; vergangene
 * Einträge bleiben unverändert.
 */
interface Props {
  locale?: Locale;
  setLocale?: (id: LocaleId) => void;
}

type Group = "neutral" | "at" | "de";

const LocaleSettings: React.FC<Props> = ({ locale, setLocale }) => {
  const [stateDrawerOpen, setStateDrawerOpen] = useState(false);

  const stateOptions = useMemo(
    () => GERMAN_STATE_IDS.map((s) => ({ id: s, label: GERMAN_STATE_NAMES[s] })),
    []
  );

  if (!locale || !setLocale) return null;

  const currentGroup: Group =
    locale.id === "neutral" ? "neutral" : locale.id === "at" ? "at" : "de";

  const currentGermanState: GermanState | null =
    locale.id.startsWith("de-")
      ? (locale.id.slice(3) as GermanState)
      : null;

  const handleGroupChange = (group: Group) => {
    if (group === "neutral") {
      setLocale("neutral");
      toast.success("Auf Neutral umgestellt");
    } else if (group === "at") {
      setLocale("at");
      toast.success("Auf Österreich umgestellt");
    } else {
      // DE: aktuelle Bundesland-Wahl behalten (Default: Bayern)
      const nextId: LocaleId = (currentGermanState
        ? `de-${currentGermanState}`
        : "de-by") as LocaleId;
      setLocale(nextId);
      toast.success("Auf Deutschland umgestellt");
    }
  };

  const handleGermanStateChange = (id: string | number) => {
    const stateCode = id as GermanState;
    setLocale(`de-${stateCode}` as LocaleId);
    toast.success(`Bundesland auf ${GERMAN_STATE_NAMES[stateCode]} geändert`);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
          <Globe size={20} />
        </div>
        <div>
          <h3 className="font-bold text-zinc-800 dark:text-white">Stundenberechnung</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Feiertage, Halbtage, Mehrarbeit/Überstunden
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleGroupChange("neutral")}
          className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
            currentGroup === "neutral"
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-300"
          }`}
        >
          Neutral
        </button>
        <button
          type="button"
          onClick={() => handleGroupChange("at")}
          className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
            currentGroup === "at"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-300"
          }`}
        >
          Österreich
        </button>
        <button
          type="button"
          onClick={() => handleGroupChange("de")}
          className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
            currentGroup === "de"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-300"
          }`}
        >
          Deutschland
        </button>
      </div>

      {currentGroup === "de" && (
        <div>
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
            Bundesland
          </label>
          <button
            type="button"
            onClick={() => setStateDrawerOpen(true)}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-800 dark:text-white hover:border-blue-500 transition-colors"
          >
            <span className="flex-1 text-left">
              {GERMAN_STATE_NAMES[currentGermanState ?? "by"]}
            </span>
            <ChevronDown size={18} className="text-zinc-400 ml-2" />
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        <span className="font-bold">Aktuell aktiv:</span> {locale.name}. Zukünftige
        Berechnungen folgen der neuen Auswahl — vergangene Einträge bleiben
        unverändert.
      </p>

      <SelectionDrawer
        isOpen={stateDrawerOpen}
        onClose={() => setStateDrawerOpen(false)}
        title="Bundesland wählen"
        options={stateOptions}
        value={currentGermanState ?? "by"}
        onChange={handleGermanStateChange}
      />
    </Card>
  );
};

export default LocaleSettings;
