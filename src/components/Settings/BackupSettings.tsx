import React, { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  HardDrive,
  Upload,
  Loader,
  AlertTriangle,
  ServerCog,
} from "lucide-react";
import PlayServicesBanner from "./PlayServicesBanner";
import CollapsibleCard from "./CollapsibleCard";
import { isSQLiteActive } from "../../db/storageMode";
import { getSetting } from "../../db/repositories/settingsRepo";
import {
  triggerManualBackup,
} from "../../utils/storageBackup";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { logger } from "../../utils/logger";
import { getErrorMessage } from "../../utils/errorUtils";
import { useGoogleDriveBackup } from "../../hooks/useGoogleDriveBackup";
import { useLocalBackup } from "../../hooks/useLocalBackup";
import { useNextcloudBackup } from "../../hooks/useNextcloudBackup";

const log = logger.scope("Nextcloud");
const connectionBadgeClassName = "flex items-center px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full";

interface Props {
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  onExport: () => void;
  onFileImport: (file: File) => Promise<void>;
  // Nextcloud State from useSettings
  nextcloudEnabled: boolean;
  nextcloudUrl: string;
  nextcloudUser: string;
  nextcloudPass: string;
  setNextcloudEnabled: (enabled: boolean) => void;
  setNextcloudUrl: (url: string) => void;
  setNextcloudUser: (user: string) => void;
  setNextcloudPass: (pass: string) => void;
  expertMode?: boolean;
  onTriggerManualBackup?: () => Promise<void> | void;
  /**
   * Optionaler Inhalt, der am Ende der Karte angezeigt wird (etwa
   * das automatische PDF-Archiv-Panel als integrierte Erweiterung).
   * Wird nur gerendert, wenn der User die Karte aufgeklappt hat.
   */
  extraContent?: React.ReactNode;
}

const BackupSettings: React.FC<Props> = ({
  autoBackup,
  setAutoBackup,
  onExport,
  onFileImport,
  // Nextcloud State from useSettings
  nextcloudEnabled,
  nextcloudUrl,
  nextcloudUser,
  nextcloudPass,
  setNextcloudEnabled,
  setNextcloudUrl,
  setNextcloudUser,
  setNextcloudPass,
  expertMode = false,
  onTriggerManualBackup,
  extraContent,
}) => {
  const { t } = useTranslation();
  const googleBackup = useGoogleDriveBackup({ autoBackup, setAutoBackup, t });
  const localBackup = useLocalBackup({ autoBackup, setAutoBackup, t });
  const nextcloudBackup = useNextcloudBackup({
    autoBackup,
    setAutoBackup,
    nextcloudUrl,
    nextcloudUser,
    nextcloudPass,
    setNextcloudEnabled,
    setNextcloudUrl,
    setNextcloudUser,
    setNextcloudPass,
    t,
  });
  const gdriveDisabled = googleBackup.gdriveDisabled;
  const importInputRef = useRef<HTMLInputElement>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRetryingBackup, setIsRetryingBackup] = useState(false);

  const formatLastBackup = (isoString: string) => {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("settings.backup.last.now");
    if (mins < 60) return t("settings.backup.last.minutes", { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("settings.backup.last.hours", { count: hrs });
    const days = Math.floor(hrs / 24);
    return t("settings.backup.last.days", { count: days });
  };

  // Load initial data (last_backup-Slice)
  useEffect(() => {
    // SQLite nachladen
    if (isSQLiteActive()) {
      (async () => {
        try {
          const sqlLastBackup = await getSetting("last_backup");
          if (sqlLastBackup) setLastBackupDate(sqlLastBackup as string);
        } catch { /* keep localStorage values */ }
      })();
    }
  }, []);

  const handleManualBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const result = await triggerManualBackup();

      if (result?.success) {
        const now = new Date().toISOString();
        setLastBackupDate(now);

        // Differenzierte Erfolgsmeldung
        const localLabel = t("settings.backup.targetLocal");
        const parts = [];
        if (result.gdrive) parts.push("Google Drive");
        if (result.local) parts.push(localLabel);
        if (result.nextcloud) parts.push("Nextcloud");
        toast.success(t("settings.backup.toast.backupCreated", { targets: parts.join(", ") }));

        // Warnung für fehlgeschlagene Ziele
        const failed = [];
        if (result.gdrive === false) failed.push("Google Drive");
        if (result.local === false) failed.push(localLabel);
        if (result.nextcloud === false) failed.push("Nextcloud");
        if (failed.length > 0) {
          toast.error(t("settings.backup.toast.backupPartialFailed", { targets: failed.join(", ") }));
          // Debug: Zeige detaillierte Fehlermeldung in Alert (scrollbar)
          const details: string[] = [];
          if (result.nextcloud === false && result.nextcloudError) {
            details.push(`Nextcloud: ${result.nextcloudError}`);
          }
          if (details.length > 0) {
            setTimeout(() => alert(t("settings.backup.toast.backupDebugTitle", { details: details.join("\n\n") })), 500);
          }
        }
      } else {
        toast.error(getErrorMessage(result, t("settings.backup.toast.backupFailed")));
      }
    } catch (error) {
      log.error(error);
      toast.error(t("settings.backup.toast.backupFailed"));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileImportInternal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onFileImport(file);
    e.target.value = "";
  };

  const activeBackupTargets = [
    !gdriveDisabled && googleBackup.isCloudConnected ? "Google Drive" : null,
    nextcloudEnabled ? "Nextcloud" : null,
    localBackup.hasBackupFolder ? t("settings.backup.targetLocal") : null,
  ].filter((target): target is string => Boolean(target));
  const lastBackupLabel = lastBackupDate ? formatLastBackup(lastBackupDate) : null;

  // =====================
  // RENDER
  // =====================

  return (
    <CollapsibleCard
      title={t("settings.backup.header")}
      subtitle={t("settings.backup.subtitle")}
      icon={
        <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Upload size={20} />
        </div>
      }
      defaultExpanded={false}
      bodyClassName="px-4 pb-4 pt-0"
    >
      <PlayServicesBanner show={gdriveDisabled} />

      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
            {t("settings.backup.status.title")}
          </div>
          <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
            {t("settings.backup.status.targets", {
              targets:
                activeBackupTargets.length > 0
                  ? activeBackupTargets.join(", ")
                  : t("settings.backup.status.noTargets"),
            })}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("settings.backup.status.last", {
              time: lastBackupLabel ?? t("settings.backup.last.never"),
            })}
          </div>
        </div>

        {/* Warning for failed backups */}
        {!gdriveDisabled && googleBackup.isCloudConnected && (!googleBackup.isTokenValid || googleBackup.backupFailCount >= 3) && (
          <div className="flex flex-col gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {googleBackup.isTokenValid
                    ? t("settings.backup.warning.gdriveFailed")
                    : t("settings.backup.warning.gdriveReconnect")}
                </span>
                {googleBackup.backupLastError && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 break-words">
                    {googleBackup.backupLastError}
                  </span>
                )}
              </div>
            </div>
            {googleBackup.isTokenValid && onTriggerManualBackup && (
              <button
                type="button"
                disabled={isRetryingBackup}
                onClick={async () => {
                  setIsRetryingBackup(true);
                  try {
                    await onTriggerManualBackup();
                    const [failCount, lastError] = await Promise.all([
                      getSetting("backup_fail_count"),
                      getSetting("backup_last_error"),
                    ]);
                    googleBackup.setBackupFailCount(parseInt(String(failCount || "0"), 10));
                    googleBackup.setBackupLastError(String(lastError || ""));
                  } finally {
                    setIsRetryingBackup(false);
                  }
                }}
                className="self-start px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold rounded-md transition-colors"
              >
                {isRetryingBackup ? t("settings.backup.warning.retrying") : t("settings.backup.warning.retryNow")}
              </button>
            )}
          </div>
        )}

        {nextcloudEnabled && nextcloudBackup.nextcloudBackupFailCount > 0 && (
          <div className="flex flex-col gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 break-words">
                {nextcloudBackup.nextcloudBackupLastError
                  ? t("settings.backup.warning.nextcloudWithError", { error: nextcloudBackup.nextcloudBackupLastError })
                  : t("settings.backup.warning.nextcloudGeneric")}
              </span>
            </div>
            {onTriggerManualBackup && nextcloudBackup.nextcloudBackupFailCount >= 3 && (
              <button
                type="button"
                disabled={isRetryingBackup}
                onClick={async () => {
                  setIsRetryingBackup(true);
                  try {
                    await onTriggerManualBackup();
                    const [failCount, lastError] = await Promise.all([
                      getSetting("nextcloud_backup_fail_count"),
                      getSetting("nextcloud_backup_last_error"),
                    ]);
                    nextcloudBackup.setNextcloudBackupFailCount(parseInt(String(failCount || "0"), 10));
                    nextcloudBackup.setNextcloudBackupLastError(String(lastError || ""));
                  } finally {
                    setIsRetryingBackup(false);
                  }
                }}
                className="self-start px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold rounded-md transition-colors"
              >
                {isRetryingBackup ? t("settings.backup.warning.retrying") : t("settings.backup.warning.retryNow")}
              </button>
            )}
          </div>
        )}

        {/* Google Drive */}
        <div
          className={`flex items-center justify-between p-3 rounded-xl ${
            gdriveDisabled
              ? "bg-zinc-50 dark:bg-zinc-800/50 opacity-60"
              : "bg-zinc-100 dark:bg-zinc-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                gdriveDisabled
                  ? "bg-zinc-200 text-zinc-400"
                  : googleBackup.isCloudConnected
                  ? "bg-green-100 text-green-600"
                  : "bg-zinc-200 text-zinc-400"
              }`}
            >
              {googleBackup.isCloudConnected && !gdriveDisabled ? <Cloud size={20} /> : <CloudOff size={20} />}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                  Google Drive
                </span>
                {googleBackup.isCloudConnected && googleBackup.isTokenValid && !gdriveDisabled && (
                  <span className={connectionBadgeClassName}>{t("settings.backup.badge.connected")}</span>
                )}
              </div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {gdriveDisabled
                  ? t("settings.backup.unavailable.hint")
                  : googleBackup.isCloudConnected
                  ? (googleBackup.isTokenValid
                    ? (googleBackup.googleAccountLabel
                      ? t("settings.backup.gdrive.connectedAs", { label: googleBackup.googleAccountLabel })
                      : t("settings.backup.gdrive.activeAppData"))
                    : t("settings.backup.gdrive.expired"))
                  : t("settings.backup.gdrive.notConnected")}
              </span>
            </div>
          </div>
          <button type="button"
            onClick={googleBackup.handleGoogleToggle}
            disabled={gdriveDisabled}
            title={gdriveDisabled ? t("settings.backup.unavailable.hint") : undefined}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${
              gdriveDisabled
                ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                : googleBackup.isCloudConnected
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {googleBackup.isCloudConnected && !gdriveDisabled ? t("settings.backup.gdrive.disconnect") : t("settings.backup.gdrive.connect")}
          </button>
        </div>

        {/* Nextcloud — nur im Hausmasta-Modus */}
        {expertMode && (<>
        <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                nextcloudEnabled
                  ? "bg-green-100 text-green-600"
                  : nextcloudBackup.ncConnecting
                  ? "bg-orange-100 text-orange-600"
                  : "bg-zinc-200 text-zinc-400"
              }`}
            >
              <ServerCog size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                  Nextcloud
                </span>
                {nextcloudEnabled && (
                  <span className={connectionBadgeClassName}>
                    {t("settings.backup.badge.connected")}
                  </span>
                )}
              </div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {nextcloudEnabled
                  ? t("settings.backup.nextcloud.connectedAs", { user: nextcloudBackup.ncLoginName || nextcloudUser })
                  : nextcloudBackup.ncConnecting
                    ? t("settings.backup.nextcloud.awaitingLogin")
                    : t("settings.backup.nextcloud.notConfigured")}
              </span>
            </div>
          </div>
          <button type="button"
            onClick={nextcloudEnabled ? nextcloudBackup.handleNcDisconnect : () => nextcloudBackup.setNcExpanded(!nextcloudBackup.ncExpanded)}
            disabled={nextcloudBackup.ncConnecting}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${
              nextcloudEnabled
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {nextcloudEnabled ? t("settings.backup.nextcloud.disconnect") : t("settings.backup.nextcloud.setup")}
          </button>
        </div>

        {/* Nextcloud Login Flow v2 */}
        {nextcloudBackup.ncExpanded && !nextcloudEnabled && (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-200 dark:border-zinc-600 pt-3">
            {nextcloudBackup.ncConnecting ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader size={24} className="animate-spin text-orange-500" />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {t("settings.backup.nextcloud.pollingTitle")}
                </span>
                <span className="text-xs text-zinc-400">
                  {t("settings.backup.nextcloud.pollingHint")}
                </span>
                <button type="button"
                  onClick={() => {
                    nextcloudBackup.cleanupLifecycle();
                    nextcloudBackup.setNcConnecting(false);
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="nextcloud-server-url" className="block text-xs font-bold text-zinc-500 mb-1">{t("settings.backup.nextcloud.serverUrlLabel")}</label>
                  <input
                    id="nextcloud-server-url"
                    type="url"
                    value={nextcloudUrl}
                    onChange={(e) => setNextcloudUrl(e.target.value)}
                    placeholder={t("settings.backup.nextcloud.serverUrlPlaceholder")}
                    className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none focus:border-orange-400"
                  />
                </div>
                <button type="button"
                  onClick={nextcloudBackup.handleNcConnect}
                  className="w-full py-2.5 text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ServerCog size={16} />
                  {t("settings.backup.nextcloud.connectButton")}
                </button>
                {nextcloudUrl && nextcloudUser && nextcloudPass && (
                  <button type="button"
                    onClick={nextcloudBackup.handleNcTest}
                    className="w-full py-2 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    {t("settings.backup.nextcloud.testConnection")}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        </>)}

        {/* Local Backup */}
        <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                localBackup.hasBackupFolder
                  ? "bg-green-100 text-green-600"
                  : "bg-zinc-200 text-zinc-400"
              }`}
            >
              {localBackup.hasBackupFolder ? (
                <CheckCircle2 size={20} />
              ) : (
                <HardDrive size={20} />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                  {t("settings.backup.local.title")}
                </span>
                {localBackup.hasBackupFolder && (
                  <span className={connectionBadgeClassName}>{t("settings.backup.badge.connected")}</span>
                )}
              </div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {localBackup.hasBackupFolder ? t("settings.backup.local.activeDaily") : t("settings.backup.local.notConfigured")}
              </span>
            </div>
          </div>
          <button type="button"
            onClick={localBackup.handleLocalToggle}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${
              localBackup.hasBackupFolder
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {localBackup.hasBackupFolder ? t("settings.backup.local.disconnect") : t("settings.backup.local.select")}
          </button>
        </div>

        {/* Manual Backup */}
        {(googleBackup.isCloudConnected || localBackup.hasBackupFolder || nextcloudEnabled) && (
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600">
                {isBackingUp ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <HardDrive size={18} />
                )}
              </div>
              <div>
                <span className="block font-bold text-sm text-emerald-700 dark:text-emerald-300">
                  {isBackingUp ? t("settings.backup.manual.saving") : t("settings.backup.manual.title")}
                </span>
                <span className="block text-xs text-emerald-600 dark:text-emerald-400">
                  {lastBackupDate
                    ? t("settings.backup.last.lastAt", { time: formatLastBackup(lastBackupDate) })
                    : t("settings.backup.last.never")}
                </span>
              </div>
            </div>
            <button type="button"
              onClick={handleManualBackup}
              disabled={isBackingUp}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isBackingUp ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {isBackingUp ? t("settings.backup.manual.saving") : t("settings.backup.manual.saveNow")}
            </button>
          </div>
        )}

        {/* Basis-Export/Import ist absichtlich immer sichtbar: Backup ist kein Expert-Feature. */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button"
            onClick={onExport}
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-700 text-white font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} className="rotate-180" /> {t("settings.backup.export")}
          </button>

          <button type="button"
            onClick={() => importInputRef.current?.click()}
            className="w-full py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} /> {t("settings.backup.import")}
          </button>

          <input
            type="file"
            ref={importInputRef}
            className="hidden"
            accept="application/json"
            onChange={handleFileImportInternal}
          />
        </div>
      </div>

      {extraContent}
    </CollapsibleCard>
  );
};

export default BackupSettings;
