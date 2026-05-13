import React from "react";
import { ListChecks } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useTranslation } from "react-i18next";
import { Card } from "../../utils";

interface Props {
  onManage: () => void;
}

const WorkCodesSettings: React.FC<Props> = ({ onManage }) => {
  const { t } = useTranslation();

  return (
    <Card className="overflow-visible">
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 shrink-0">
            <ListChecks size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-800 dark:text-white">
              {t("settings.workCodesCard.title")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {t("settings.workCodesCard.subtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light });
            onManage();
          }}
          className="px-4 py-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 font-medium rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/40 transition-colors flex items-center gap-2 shrink-0"
        >
          <ListChecks size={16} /> {t("settings.workCodesCard.manageButton")}
        </button>
      </div>
    </Card>
  );
};

export default WorkCodesSettings;
