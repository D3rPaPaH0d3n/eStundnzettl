import React from "react";
import { Download, X, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Browser } from "@capacitor/browser";

interface Props {
  /** True only when an actually-newer release was detected and not dismissed. */
  show: boolean;
  /** Tag string of the new release (e.g. "v4.3.0"). */
  version: string | null;
  /** GitHub release HTML URL — opened in the in-app browser. */
  htmlUrl: string | null;
  /** Persistently mark this version as dismissed. */
  onDismiss: () => void;
}

/**
 * UpdateAvailableBanner — dezenter Hinweis im Dashboard für Sideload-User
 * dass auf GitHub eine neuere Version vorliegt. Nur sichtbar wenn das
 * useUpdateAvailable-Hook eine echte neue Version meldet — Play-Store-,
 * Amazon-, Huawei-Installs sehen das nie.
 *
 * Stilistisch identisch zum PlayServicesBanner (Zinc/Emerald-Theme,
 * lucide-Icons, dismissible) damit es zur App passt.
 */
export default function UpdateAvailableBanner({
  show,
  version,
  htmlUrl,
  onDismiss,
}: Props): React.ReactElement | null {
  const { t } = useTranslation();
  if (!show || !version || !htmlUrl) return null;

  const handleOpen = (): void => {
    void Browser.open({ url: htmlUrl }).catch(() => {
      // Fallback auf einfaches window.open, falls Capacitor.Browser nicht
      // verfügbar (Web-Build / Devmode).
      try {
        window.open(htmlUrl, "_blank");
      } catch {
        /* ignore */
      }
    });
  };

  return (
    <div
      role="status"
      data-testid="update-available-banner"
      className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
    >
      <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
        <Sparkles size={16} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold">{t("updates.available.title")}</p>
        <p className="mt-0.5 text-xs text-emerald-800/90 dark:text-emerald-100/80">
          {t("updates.available.body", { version })}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            <Download size={12} />
            {t("updates.available.download")}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-800/80 transition hover:bg-emerald-100 dark:text-emerald-100/80 dark:hover:bg-emerald-900/40"
          >
            {t("updates.available.dismiss")}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("updates.available.dismiss")}
        className="rounded p-1 text-emerald-800/60 transition hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-100/60 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
