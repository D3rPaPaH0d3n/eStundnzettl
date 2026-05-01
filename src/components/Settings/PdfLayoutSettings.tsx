import React from "react";
import { Layout } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";
import PdfDisplayToggles from "./PdfDisplayToggles";
import type { CalculationConfig } from "../../types";

/**
 * PdfLayoutSettings — Settings-Tab fuer die PDF-Anzeige-Toggles.
 *
 * Sichtbar nur im Hausmasta-Modus (`userData.expertMode === true`,
 * Gate sitzt im Aufrufer `Settings.tsx`).
 *
 * Die Toggle-Liste lebt in `PdfDisplayToggles` und wird auch vom
 * Slide-in-Panel im Vorschau-Screen wiederverwendet — beide schreiben
 * in dieselbe `CalculationConfig.pdfDisplay`.
 */

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

      <PdfDisplayToggles
        calculationConfig={calculationConfig}
        setCalculationConfig={setCalculationConfig}
      />
    </Card>
  );
};

export default PdfLayoutSettings;
