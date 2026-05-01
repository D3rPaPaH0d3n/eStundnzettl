import React, { useCallback } from "react";
import { Layout, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";
import { getEffectivePdfDisplay } from "../../utils/calculationConfig";
import type { CalculationConfig, PdfDisplayConfig } from "../../types";

/**
 * PdfLayoutSettings — Granulare Anzeige-Toggles fuer das exportierte
 * Stundenzettel-PDF.
 *
 * Sichtbar nur im Hausmasta-Modus (`userData.expertMode === true`,
 * Gate sitzt im Aufrufer `Settings.tsx`).
 *
 * Persistierung erfolgt als Sub-Block `pdfDisplay` in der bestehenden
 * `CalculationConfig` — daraus ergibt sich automatisches Dual-Write
 * (localStorage + SQLite) ueber den vorhandenen Settings-Pfad. Ein
 * Wechsel wirkt sofort: die Live-Vorschau in `PrintReport` liest
 * dieselbe Config und aktualisiert das Vektor-PDF.
 */

interface ToggleDef {
  key: keyof PdfDisplayConfig;
  labelKey: string;
  descKey: string;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "showSummary",
    labelKey: "settings.pdfLayout.showSummary",
    descKey: "settings.pdfLayout.showSummaryDesc",
  },
  {
    key: "showTargetTime",
    labelKey: "settings.pdfLayout.showTargetTime",
    descKey: "settings.pdfLayout.showTargetTimeDesc",
  },
  {
    key: "showBalance",
    labelKey: "settings.pdfLayout.showBalance",
    descKey: "settings.pdfLayout.showBalanceDesc",
  },
  {
    key: "showOvertimeSplit",
    labelKey: "settings.pdfLayout.showOvertimeSplit",
    descKey: "settings.pdfLayout.showOvertimeSplitDesc",
  },
  {
    key: "showVacationBalance",
    labelKey: "settings.pdfLayout.showVacationBalance",
    descKey: "settings.pdfLayout.showVacationBalanceDesc",
  },
  {
    key: "showAttachmentsList",
    labelKey: "settings.pdfLayout.showAttachmentsList",
    descKey: "settings.pdfLayout.showAttachmentsListDesc",
  },
  {
    key: "showWorkCodeColumn",
    labelKey: "settings.pdfLayout.showWorkCodeColumn",
    descKey: "settings.pdfLayout.showWorkCodeColumnDesc",
  },
  {
    key: "showCustomNote",
    labelKey: "settings.pdfLayout.showCustomNote",
    descKey: "settings.pdfLayout.showCustomNoteDesc",
  },
];

interface Props {
  calculationConfig?: CalculationConfig | null;
  setCalculationConfig?: (
    next: CalculationConfig | ((prev: CalculationConfig) => CalculationConfig),
  ) => void;
}

const PdfLayoutSettings: React.FC<Props> = ({
  calculationConfig,
  setCalculationConfig,
}) => {
  const { t } = useTranslation();
  const display = getEffectivePdfDisplay(calculationConfig);

  const setField = useCallback(
    (key: keyof PdfDisplayConfig, value: boolean) => {
      if (!calculationConfig || !setCalculationConfig) return;
      const current = getEffectivePdfDisplay(calculationConfig);
      setCalculationConfig({
        ...calculationConfig,
        pdfDisplay: { ...current, [key]: value },
      });
    },
    [calculationConfig, setCalculationConfig],
  );

  if (!calculationConfig || !setCalculationConfig) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Layout size={20} />
        </div>
        <div>
          <h2 className="font-bold text-base text-zinc-800 dark:text-white">
            {t("settings.pdfLayout.title")}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("settings.pdfLayout.subtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {TOGGLES.map((toggle) => {
          const isOn = display[toggle.key];
          return (
            <label
              key={toggle.key}
              className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-full shrink-0 ${
                    isOn
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-zinc-200 text-zinc-400 dark:bg-zinc-600 dark:text-zinc-500"
                  }`}
                >
                  {isOn ? <Eye size={16} /> : <EyeOff size={16} />}
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                    {t(toggle.labelKey)}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {t(toggle.descKey)}
                  </span>
                </div>
              </div>
              <span className="relative inline-flex items-center shrink-0 ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isOn}
                  onChange={(e) => setField(toggle.key, e.target.checked)}
                />
                <span className="w-11 h-6 bg-zinc-200 dark:bg-zinc-600 peer-checked:bg-emerald-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </span>
            </label>
          );
        })}
      </div>
    </Card>
  );
};

export default PdfLayoutSettings;
