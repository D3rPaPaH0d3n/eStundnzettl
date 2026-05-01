import React, { useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getEffectivePdfDisplay } from "../../utils/calculationConfig";
import type { CalculationConfig, PdfDisplayConfig } from "../../types";

/**
 * PdfDisplayToggles — Reine Toggle-Liste fuer die 8 PDF-Anzeige-Felder.
 *
 * Wird ausschliesslich vom Live-Slide-in-Panel im Vorschau-Screen
 * (`PrintReport`) verwendet. Schreibt direkt in
 * `CalculationConfig.pdfDisplay`; Aenderungen werden vom debounced
 * Vorschau-Effect aufgegriffen und das PDF neu gerendert.
 */

interface ToggleDef {
  key: keyof PdfDisplayConfig;
  labelKey: string;
  descKey: string;
}

const PDF_DISPLAY_TOGGLES: ToggleDef[] = [
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
  /** Optionaler kompakter Modus fuer das Slide-in-Panel (kleinere Padding/Schrift). */
  compact?: boolean;
}

const PdfDisplayToggles: React.FC<Props> = ({
  calculationConfig,
  setCalculationConfig,
  compact = false,
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

  const rowPadding = compact ? "p-2.5" : "p-3";
  const titleSize = compact ? "text-[13px]" : "text-sm";
  const descSize = compact ? "text-[11px]" : "text-xs";

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {PDF_DISPLAY_TOGGLES.map((toggle) => {
        const isOn = display[toggle.key];
        return (
          <label
            key={toggle.key}
            className={`flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 ${rowPadding} rounded-xl cursor-pointer`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-1.5 rounded-full shrink-0 ${
                  isOn
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-zinc-200 text-zinc-400 dark:bg-zinc-600 dark:text-zinc-500"
                }`}
              >
                {isOn ? <Eye size={14} /> : <EyeOff size={14} />}
              </div>
              <div className="min-w-0">
                <span className={`block font-bold ${titleSize} text-zinc-800 dark:text-white`}>
                  {t(toggle.labelKey)}
                </span>
                <span className={`block ${descSize} text-zinc-500 dark:text-zinc-400`}>
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
  );
};

export default PdfDisplayToggles;
