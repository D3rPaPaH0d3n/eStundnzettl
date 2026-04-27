import React, { useState } from "react";
import { Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const DISMISS_KEY = "pgs_banner_dismissed_v1";

interface Props {
  /** True only when the runtime probe explicitly reports no Google Services. */
  show: boolean;
}

/**
 * PlayServicesBanner — dismissible info card shown above BackupSettings
 * when Google Play Services aren't available on the device. Explains
 * which features are affected so users don't think backups are broken.
 *
 * Intentionally low-key: a tinted card, not a modal, not a toast.
 * Once dismissed (localStorage, key versioned), it stays dismissed
 * across sessions.
 */
export default function PlayServicesBanner({ show }: Props): React.ReactElement | null {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!show || dismissed) return null;

  const handleDismiss = (): void => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage unavailable — accept transient dismiss.
    }
  };

  return (
    <div
      role="status"
      data-testid="play-services-banner"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">{t("settings.backup.unavailable.bannerTitle")}</p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
          {t("settings.backup.unavailable.bannerBody")}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t("settings.backup.unavailable.dismiss")}
        className="rounded p-1 text-amber-900/70 transition hover:bg-amber-100 hover:text-amber-900 dark:text-amber-100/70 dark:hover:bg-amber-900/40 dark:hover:text-amber-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
