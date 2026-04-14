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
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { Card } from "../../utils";
import { STORAGE_KEYS } from "../../hooks/constants";
import { isSQLiteActive } from "../../db/storageMode";
import { getSetting } from "../../db/repositories/settingsRepo";
import {
  initGoogleAuth,
  signInGoogle,
  signOutGoogle,
  getGoogleAuthStatus,
  getStoredGoogleAuth,
} from "../../utils/googleDrive";
import {
  selectBackupFolder,
  hasBackupTarget,
  clearBackupTarget,
  triggerManualBackup,
} from "../../utils/storageBackup";
import { testConnection as ncTestConnection, initiateLoginFlow, pollLoginResult, ensureFolder as ncEnsureFolder, getNextcloudErrorMessage } from "../../utils/nextcloudClient";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { logger } from "../../utils/logger";
import { getErrorMessage } from "../../utils/errorUtils";
import type { GoogleAuthStatus, GoogleSignInResult } from "../../types";

const log = logger.scope("Nextcloud");

const isGoogleConnectionReady = (status: GoogleAuthStatus | null) => !!(status?.hasToken || (status?.connected && !status?.reauthRequired));
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
}) => {
  const { t } = useTranslation();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [hasBackupFolder, setHasBackupFolder] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [backupFailCount, setBackupFailCount] = useState(0);
  const [googleAccountLabel, setGoogleAccountLabel] = useState("");
  const [nextcloudBackupFailCount, setNextcloudBackupFailCount] = useState(0);
  const [nextcloudBackupLastError, setNextcloudBackupLastError] = useState("");
  const [backupLastError, setBackupLastError] = useState("");
  const [isRetryingBackup, setIsRetryingBackup] = useState(false);

  // Nextcloud UI State (local UI state, persisted via props)
  const [ncExpanded, setNcExpanded] = useState(false);
  const [, setNcStatus] = useState<string | null>(null); // null | "ok" | "error"
  const [ncConnecting, setNcConnecting] = useState(false);
  const [ncLoginName, setNcLoginName] = useState(nextcloudUser || "");
  
  // Refs for lifecycle management
  const ncPollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const browserFinishedListener = useRef<{ remove: () => void } | null>(null);
  const appStateListener = useRef<{ remove: () => void } | null>(null);
  const appIsActive = useRef(true);
  const loginAttemptId = useRef<string | null>(null);

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

  // =====================
  // LIFECYCLE MANAGEMENT
  // =====================

  // Initialize lifecycle listeners
  useEffect(() => {
    log.debug('Setting up lifecycle listeners');
    
    // Generate unique ID for this login attempt
    loginAttemptId.current = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Browser finished listener (for Custom Tabs)
    browserFinishedListener.current = Browser.addListener('browserFinished', () => {
      log.debug('Browser finished/closed');
      handleBrowserFinished();
    });

    // App state change listener
    appStateListener.current = App.addListener('appStateChange', ({ isActive }) => {
      log.debug(`App state change: ${isActive ? 'active' : 'inactive'}`);
      appIsActive.current = isActive;
      
      if (isActive) {
        // App came back to foreground - check if we need to finalize login
        handleAppResume();
      } else {
        // App went to background - pause polling if active
        pausePolling();
      }
    });

    // Cleanup on unmount
    return () => {
      log.debug('Cleaning up lifecycle listeners');
      cleanupLifecycle();
    };
  }, []);

  // Sync local UI state with props
  useEffect(() => {
    setNcLoginName(nextcloudUser || "");
  }, [nextcloudUser]);

  // Load initial data
  useEffect(() => {
    // 1) Sofort aus localStorage laden (schnelle UI)
    const cloudEnabled =
      localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED) === "true";
    setIsCloudConnected(cloudEnabled);
    setHasBackupFolder(hasBackupTarget());

    const saved = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    if (saved) setLastBackupDate(saved);

    Promise.resolve(getGoogleAuthStatus())
      .then((googleStatus: Record<string, unknown>) => {
        setIsTokenValid(isGoogleConnectionReady(googleStatus as GoogleAuthStatus));
        const storedAuth = getStoredGoogleAuth?.() as Record<string, unknown> | null;
        const accountLabel =
          (googleStatus?.email as string) ||
          (googleStatus?.accountEmail as string) ||
          (storedAuth?.email as string) ||
          (storedAuth?.accountEmail as string) ||
          "";
        setGoogleAccountLabel(accountLabel);
      })
      .catch(() => {
        setIsTokenValid(false);
        const storedAuth = getStoredGoogleAuth?.() as Record<string, unknown> | null;
        setGoogleAccountLabel((storedAuth?.email as string) || (storedAuth?.accountEmail as string) || "");
      });

    const failCount = parseInt(localStorage.getItem(STORAGE_KEYS.BACKUP_FAIL_COUNT) || "0", 10);
    setBackupFailCount(failCount);
    setBackupLastError(localStorage.getItem(STORAGE_KEYS.BACKUP_LAST_ERROR) || "");
    setNextcloudBackupFailCount(parseInt(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT) || "0", 10));
    setNextcloudBackupLastError(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR) || "");

    // 2) SQLite nachladen (async, überschreibt wenn vorhanden)
    if (isSQLiteActive()) {
      (async () => {
        try {
          const [sqlLastBackup, sqlFailCount, sqlCloudEnabled, sqlNcFailCount, sqlNcLastError] = await Promise.all([
            getSetting("last_backup"),
            getSetting("backup_fail_count"),
            getSetting("cloud_sync_enabled"),
            getSetting("nextcloud_backup_fail_count"),
            getSetting("nextcloud_backup_last_error"),
          ]);
          if (sqlLastBackup) setLastBackupDate(sqlLastBackup as string);
          if (sqlFailCount !== null) {
            setBackupFailCount(parseInt(String(sqlFailCount), 10) || 0);
          }
          if (sqlNcFailCount !== null) {
            setNextcloudBackupFailCount(parseInt(String(sqlNcFailCount), 10) || 0);
          }
          if (typeof sqlNcLastError === "string") {
            setNextcloudBackupLastError(sqlNcLastError);
          }
          if (sqlCloudEnabled !== null) {
            const enabled = !!sqlCloudEnabled;
            setIsCloudConnected(enabled);
          }
          const refreshedStatus = await getGoogleAuthStatus() as Record<string, unknown>;
          setIsTokenValid(isGoogleConnectionReady(refreshedStatus as GoogleAuthStatus));
          const storedAuth2 = getStoredGoogleAuth?.() as Record<string, unknown> | null;
          setGoogleAccountLabel(
            (refreshedStatus?.email as string) ||
            (refreshedStatus?.accountEmail as string) ||
            (storedAuth2?.email as string) ||
            (storedAuth2?.accountEmail as string) ||
            ""
          );
        } catch { /* keep localStorage values */ }
      })();
    }
  }, []);

  // =====================
  // LIFECYCLE HANDLERS
  // =====================

  const cleanupLifecycle = () => {
    log.debug('Performing cleanup');
    
    // Clear polling interval
    if (ncPollInterval.current) {
      clearInterval(ncPollInterval.current);
      ncPollInterval.current = null;
    }
    
    // Remove listeners
    if (browserFinishedListener.current) {
      browserFinishedListener.current.remove();
      browserFinishedListener.current = null;
    }
    
    if (appStateListener.current) {
      appStateListener.current.remove();
      appStateListener.current = null;
    }
    
    // Try to close browser (best effort)
    try {
      Browser.close();
    } catch {
      // Ignore errors - browser might already be closed
    }
  };

  const handleBrowserFinished = () => {
    log.debug('Browser finished handler');
    
    // If we're still connecting, check if login completed
    if (ncConnecting) {
      log.debug('Browser closed while connecting - checking login status');
      
      // Give a moment for the login to complete, then check
      setTimeout(() => {
        if (ncPollInterval.current) {
          // Force a poll check immediately
          checkPollResult();
        }
      }, 1000);
    }
  };

  const handleAppResume = () => {
    log.debug('App resumed from background');
    
    // If we were connecting, check if login completed while we were in background
    if (ncConnecting) {
      log.debug('App resumed while connecting - checking login status');
      
      // Force a poll check immediately
      if (ncPollInterval.current) {
        checkPollResult();
      }
    }
  };

  const pausePolling = () => {
    log.debug('Pausing polling (app in background)');
    // Polling logic checks appIsActive.current, so no action needed here
  };

  // =====================
  // POLLING MANAGEMENT
  // =====================

  const checkPollResult = async () => {
    // Skip if app is not active
    if (!appIsActive.current) {
      log.debug('Skipping poll check - app is inactive');
      return;
    }

    try {
      // Get current poll endpoint and token from state
      // Note: In a real implementation, we'd need to store these
      // For now, we'll rely on the existing polling logic
      log.debug('Manual poll check triggered');
    } catch (error) {
      log.error('Error in manual poll check:', error);
    }
  };

  const startPolling = (pollEndpoint: string, token: string) => {
    log.debug(`Starting polling for attempt ${loginAttemptId.current}`);
    
    let attempts = 0;
    const maxAttempts = 100; // ~5 Min bei 3s Intervall
    
    ncPollInterval.current = setInterval(async () => {
      // Skip if app is not active
      if (!appIsActive.current) {
        log.debug('Polling paused - app is inactive');
        return;
      }
      
      attempts++;
      log.debug(`Poll attempt ${attempts}/${maxAttempts}`);
      
      if (attempts > maxAttempts) {
        log.debug('Polling timeout');
        clearInterval(ncPollInterval.current!);
        ncPollInterval.current = null;
        setNcConnecting(false);
        toast.error(t("settings.backup.toast.pollingTimeout"));
        return;
      }

      try {
        const result = await pollLoginResult(pollEndpoint, token);
        if (!result.ok) {
          throw new Error(getNextcloudErrorMessage(result));
        }

        if (result.status === 'pending') {
          log.debug('Login still pending');
          return;
        }

        if (result.status === 'complete') {
          log.debug('Login complete!');
          clearInterval(ncPollInterval.current!);
          ncPollInterval.current = null;

          const serverUrl = (result.server as string).replace(/\/+$/, '');
          await handleLoginSuccess(serverUrl, result.loginName as string, result.appPassword as string);
        }
      } catch (error) {
        log.error('Polling error:', error);
        clearInterval(ncPollInterval.current!);
        ncPollInterval.current = null;
        setNcConnecting(false);
        toast.error((error as Error)?.message || t("settings.backup.toast.nextcloudLoginFailed"));
      }
    }, 3000);
  };

  const handleLoginSuccess = async (serverUrl: string, loginName: string, appPassword: string) => {
    
    try {
      // Für Auth immer den echten Login-Namen speichern.
      // Die WebDAV-UID wird im Client später separat aufgelöst.
      setNextcloudUrl(serverUrl);
      setNextcloudUser(loginName);
      setNextcloudPass(appPassword);
      setNextcloudEnabled(true);
      
      // Update local UI state
      setNcLoginName(loginName);
      setNcStatus("ok");
      setNcExpanded(false);
      setNcConnecting(false);
      
      if (!autoBackup) setAutoBackup(true);

      try {
        await ncTestConnection(serverUrl, loginName, appPassword);
        await ncEnsureFolder(serverUrl, loginName, appPassword);
      } catch {
        // Non-critical - continue
      }

      // Try to close browser
      try {
        await Browser.close();
        log.debug('Browser closed successfully');
      } catch (browserError) {
        log.warn('Browser close warning:', browserError);
        // Browser might already be closed - that's OK
      }

      toast.success(t("settings.backup.toast.ncConnectedAs", { loginName }));
      log.debug('Login flow completed successfully');

    } catch (persistError) {
      log.error('Persistence error:', persistError);
      setNcConnecting(false);
      toast.error(t("settings.backup.toast.ncPersistError"));
    }
  };

  // =====================
  // NEXTCLOUD FUNCTIONS
  // =====================

  const handleNcConnect = async () => {
    if (!nextcloudUrl) {
      toast.error(t("settings.backup.toast.ncEnterUrl"));
      return;
    }
    
    log.debug(`Starting login flow for ${nextcloudUrl}`);
    
    try {
      setNcConnecting(true);
      setNcStatus(null);
      
      const startResult = await initiateLoginFlow(nextcloudUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const loginUrl = startResult.loginUrl as string;
      const token = startResult.token as string;
      const pollEndpoint = startResult.pollEndpoint as string;
      log.debug(`Login URL: ${loginUrl}, Poll endpoint: ${pollEndpoint}`);

      // Open browser
      await Browser.open({ url: loginUrl });
      log.debug('Browser opened');

      // Start polling
      startPolling(pollEndpoint, token);

    } catch (err) {
      log.error('Login flow error:', err);
      setNcConnecting(false);
      const message = (err as Error)?.message || 'Unknown error';
      toast.error(t("settings.backup.toast.nextcloudLoginFailedWith", { message }));
    }
  };

  const handleNcDisconnect = () => {
    log.debug('Disconnecting');
    Haptics.impact({ style: ImpactStyle.Light });
    
    // Cleanup polling
    if (ncPollInterval.current) {
      clearInterval(ncPollInterval.current);
      ncPollInterval.current = null;
    }
    
    // Update central state
    setNextcloudEnabled(false);
    setNextcloudUrl("");
    setNextcloudUser("");
    setNextcloudPass("");
    
    // Update local UI state
    setNcLoginName("");
    setNcExpanded(false);
    setNcStatus(null);
    setNcConnecting(false);
    setNextcloudBackupFailCount(0);
    setNextcloudBackupLastError("");
    
    toast(t("settings.backup.toast.ncDisconnected"));
    log.debug('Disconnected successfully');
  };

  const handleNcTest = async () => {
    if (!nextcloudUrl || !nextcloudUser || !nextcloudPass) {
      toast.error(t("settings.backup.toast.ncConnectFirst"));
      return;
    }

    try {
      setNcStatus(null);
      const result = await ncTestConnection(nextcloudUrl, nextcloudUser, nextcloudPass);
      if (result.ok) {
        setNcStatus("ok");
        toast.success(t("settings.backup.toast.ncTestOk"));
      } else {
        setNcStatus("error");
        toast.error(result.error || t("settings.backup.toast.ncTestFailed"));
      }
    } catch {
      setNcStatus("error");
      toast.error(t("settings.backup.toast.ncTestError"));
    }
  };

  // =====================
  // GOOGLE DRIVE FUNCTIONS
  // =====================

  const handleGoogleToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });

    if (isCloudConnected) {
      try {
        await signOutGoogle();
        localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
        setIsCloudConnected(false);
        setIsTokenValid(false);
        setGoogleAccountLabel("");
        setAutoBackup(false);
      } catch (e) {
        log.error(e);
        localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
        setIsCloudConnected(false);
        setIsTokenValid(false);
        setGoogleAccountLabel("");
        setAutoBackup(false);
      }
    } else {
      try {
        await initGoogleAuth().catch(() => {});
        const user = await signInGoogle() as GoogleSignInResult;
        if (user && user.authentication?.accessToken) {
          localStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, "true");
          setIsCloudConnected(true);
          setIsTokenValid(true);
          const refreshedStatus = await getGoogleAuthStatus().catch(() => null) as GoogleAuthStatus | null;
          setGoogleAccountLabel(
            refreshedStatus?.email ||
            user.email ||
            ""
          );
          if (!autoBackup) setAutoBackup(true);
          toast.success(t("settings.backup.toast.gdriveConnected", {
            label: user.givenName || user.email || t("settings.backup.toast.gdriveDefaultLabel"),
          }));
        }
      } catch (error) {
        log.error(error);
        setIsTokenValid(false);
        const message = String((error as Error)?.message || error || "");
        if (message.includes("GOOGLE_DRIVE_AUTH_CANCELLED")) {
          toast.error(t("settings.backup.toast.gdriveCancelled"));
        } else if (message.includes("GOOGLE_DRIVE_NATIVE_UNAVAILABLE")) {
          toast.error(t("settings.backup.toast.gdriveUnavailable"));
        } else {
          toast.error(t("settings.backup.toast.gdriveFailed"));
        }
      }
    }
  };

  const handleLocalToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });

    if (hasBackupFolder) {
      await clearBackupTarget();
      setHasBackupFolder(false);
      localStorage.removeItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
      toast(t("settings.backup.toast.localDisconnected"));
    } else {
      try {
        const success = await selectBackupFolder();
        if (success) {
          setHasBackupFolder(true);
          localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED, "true");
          if (!autoBackup) setAutoBackup(true);
          toast.success(t("settings.backup.toast.localActivated"));
        }
      } catch {
        // Partiellen State bereinigen (dualWrite könnte BACKUP_TARGET bereits gesetzt haben)
        await clearBackupTarget();
        toast.error(t("settings.backup.toast.folderCancelled"));
      }
    }
  };

  const handleManualBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const result = await triggerManualBackup();

      if (result?.success) {
        const now = new Date().toISOString();
        setLastBackupDate(now);
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, now);

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

  // =====================
  // RENDER
  // =====================

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Upload size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base text-zinc-800 dark:text-white">
              {t("settings.backup.header")}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("settings.backup.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Google Drive */}
        <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                isCloudConnected
                  ? "bg-green-100 text-green-600"
                  : "bg-zinc-200 text-zinc-400"
              }`}
            >
              {isCloudConnected ? <Cloud size={20} /> : <CloudOff size={20} />}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                  Google Drive
                </span>
                {isCloudConnected && isTokenValid && (
                  <span className={connectionBadgeClassName}>{t("settings.backup.badge.connected")}</span>
                )}
              </div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {isCloudConnected
                  ? (isTokenValid
                    ? (googleAccountLabel
                      ? t("settings.backup.gdrive.connectedAs", { label: googleAccountLabel })
                      : t("settings.backup.gdrive.activeAppData"))
                    : t("settings.backup.gdrive.expired"))
                  : t("settings.backup.gdrive.notConnected")}
              </span>
            </div>
          </div>
          <button
            onClick={handleGoogleToggle}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${
              isCloudConnected
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {isCloudConnected ? t("settings.backup.gdrive.disconnect") : t("settings.backup.gdrive.connect")}
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
                  : ncConnecting
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
                  ? t("settings.backup.nextcloud.connectedAs", { user: ncLoginName || nextcloudUser })
                  : ncConnecting
                    ? t("settings.backup.nextcloud.awaitingLogin")
                    : t("settings.backup.nextcloud.notConfigured")}
              </span>
            </div>
          </div>
          <button
            onClick={nextcloudEnabled ? handleNcDisconnect : () => setNcExpanded(!ncExpanded)}
            disabled={ncConnecting}
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
        {ncExpanded && !nextcloudEnabled && (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-200 dark:border-zinc-600 pt-3">
            {ncConnecting ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader size={24} className="animate-spin text-orange-500" />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {t("settings.backup.nextcloud.pollingTitle")}
                </span>
                <span className="text-xs text-zinc-400">
                  {t("settings.backup.nextcloud.pollingHint")}
                </span>
                <button
                  onClick={() => {
                    cleanupLifecycle();
                    setNcConnecting(false);
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">{t("settings.backup.nextcloud.serverUrlLabel")}</label>
                  <input
                    type="url"
                    value={nextcloudUrl}
                    onChange={(e) => setNextcloudUrl(e.target.value)}
                    placeholder={t("settings.backup.nextcloud.serverUrlPlaceholder")}
                    className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none focus:border-orange-400"
                  />
                </div>
                <button
                  onClick={handleNcConnect}
                  className="w-full py-2.5 text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ServerCog size={16} />
                  {t("settings.backup.nextcloud.connectButton")}
                </button>
                {nextcloudUrl && nextcloudUser && nextcloudPass && (
                  <button
                    onClick={handleNcTest}
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
                hasBackupFolder
                  ? "bg-green-100 text-green-600"
                  : "bg-zinc-200 text-zinc-400"
              }`}
            >
              {hasBackupFolder ? (
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
                {hasBackupFolder && (
                  <span className={connectionBadgeClassName}>{t("settings.backup.badge.connected")}</span>
                )}
              </div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {hasBackupFolder ? t("settings.backup.local.activeDaily") : t("settings.backup.local.notConfigured")}
              </span>
            </div>
          </div>
          <button
            onClick={handleLocalToggle}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${
              hasBackupFolder
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {hasBackupFolder ? t("settings.backup.local.disconnect") : t("settings.backup.local.select")}
          </button>
        </div>

        {/* Warning for failed backups */}
        {isCloudConnected && (!isTokenValid || backupFailCount >= 3) && (
          <div className="flex flex-col gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {isTokenValid
                    ? t("settings.backup.warning.gdriveFailed")
                    : t("settings.backup.warning.gdriveReconnect")}
                </span>
                {backupLastError && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 break-words">
                    {backupLastError}
                  </span>
                )}
              </div>
            </div>
            {isTokenValid && onTriggerManualBackup && (
              <button
                type="button"
                disabled={isRetryingBackup}
                onClick={async () => {
                  setIsRetryingBackup(true);
                  try {
                    await onTriggerManualBackup();
                    // Nach dem Retry Fail-Count/Error aus localStorage neu einlesen
                    setBackupFailCount(parseInt(localStorage.getItem(STORAGE_KEYS.BACKUP_FAIL_COUNT) || "0", 10));
                    setBackupLastError(localStorage.getItem(STORAGE_KEYS.BACKUP_LAST_ERROR) || "");
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

        {nextcloudEnabled && nextcloudBackupFailCount > 0 && (
          <div className="flex flex-col gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 break-words">
                {nextcloudBackupLastError
                  ? t("settings.backup.warning.nextcloudWithError", { error: nextcloudBackupLastError })
                  : t("settings.backup.warning.nextcloudGeneric")}
              </span>
            </div>
            {onTriggerManualBackup && nextcloudBackupFailCount >= 3 && (
              <button
                type="button"
                disabled={isRetryingBackup}
                onClick={async () => {
                  setIsRetryingBackup(true);
                  try {
                    await onTriggerManualBackup();
                    setNextcloudBackupFailCount(parseInt(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_BACKUP_FAIL_COUNT) || "0", 10));
                    setNextcloudBackupLastError(localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_BACKUP_LAST_ERROR) || "");
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

        {/* Manual Backup */}
        {(isCloudConnected || hasBackupFolder || nextcloudEnabled) && (
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
            <button
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

        {/* Export/Import Buttons — nur im Hausmasta-Modus */}
        {expertMode && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={onExport}
              className="w-full py-3 bg-zinc-900 dark:bg-zinc-700 text-white font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-600 flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={18} className="rotate-180" /> {t("settings.backup.export")}
            </button>

            <button
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
        )}
      </div>
    </Card>
  );
};

export default BackupSettings;
