import React from "react";
import { Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFirstOpenHint } from "../hooks/useFirstOpenHint";

interface Props {
  storageKey: string;
  children: React.ReactNode;
  tone?: "blue" | "emerald";
}

const toneClasses = {
  blue: {
    box: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/70",
    icon: "text-blue-600 dark:text-blue-300",
    text: "text-blue-900 dark:text-blue-100",
    close: "text-blue-500 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100",
  },
  emerald: {
    box: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/70",
    icon: "text-emerald-600 dark:text-emerald-300",
    text: "text-emerald-900 dark:text-emerald-100",
    close: "text-emerald-500 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-100",
  },
};

const FirstOpenHint: React.FC<Props> = ({ storageKey, children, tone = "blue" }) => {
  const { t } = useTranslation();
  const { visible, dismiss } = useFirstOpenHint(storageKey);
  if (!visible) return null;

  const classes = toneClasses[tone];

  return (
    <div className={`rounded-xl border px-3 py-3 flex items-start gap-2.5 ${classes.box}`}>
      <Info size={18} className={`mt-0.5 shrink-0 ${classes.icon}`} />
      <p className={`text-sm leading-relaxed font-medium flex-1 ${classes.text}`}>
        {children}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("common.close")}
        className={`p-1 -mr-1 rounded-lg transition-colors ${classes.close}`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default FirstOpenHint;
