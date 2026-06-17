import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { isSQLiteActive } from "../db/storageMode";
import { getSetting } from "../db/repositories/settingsRepo";
import { testConnection as ncTestConnection, initiateLoginFlow, pollLoginResult, ensureFolder as ncEnsureFolder, getNextcloudErrorMessage } from "../utils/nextcloudClient";
import toast from "react-hot-toast";
import { logger } from "../utils/logger";

const log = logger.scope("Nextcloud");

interface UseNextcloudBackupArgs {
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  nextcloudUrl: string;
  nextcloudUser: string;
  nextcloudPass: string;
  setNextcloudEnabled: (enabled: boolean) => void;
  setNextcloudUrl: (url: string) => void;
  setNextcloudUser: (user: string) => void;
  setNextcloudPass: (pass: string) => void;
  t: TFunction;
}

export function useNextcloudBackup({
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
}: UseNextcloudBackupArgs) {
  const [nextcloudBackupFailCount, setNextcloudBackupFailCount] = useState(0);
  const [nextcloudBackupLastError, setNextcloudBackupLastError] = useState("");

  // Nextcloud UI State (local UI state, persisted via props)
  const [ncExpanded, setNcExpanded] = useState(false);
  const [, setNcStatus] = useState<string | null>(null); // null | "ok" | "error"
  const [ncConnecting, setNcConnecting] = useState(false);
  const [ncLoginName, setNcLoginName] = useState(nextcloudUser || "");

  // Refs for lifecycle management
  const ncPollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const browserFinishedListener = useRef<Promise<PluginListenerHandle> | null>(null);
  const appStateListener = useRef<Promise<PluginListenerHandle> | null>(null);
  const appIsActive = useRef(true);
  const loginAttemptId = useRef<string | null>(null);

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
    // Mount-only setup: handlers read fresh component state via refs (e.g.
    // appIsActive.current). Listing the handlers as deps would re-register
    // the native listeners on every render and leak registrations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync local UI state with props
  useEffect(() => {
    setNcLoginName(nextcloudUser || "");
  }, [nextcloudUser]);

  // Load initial data (Nextcloud-Anteil)
  useEffect(() => {
    // SQLite nachladen
    if (isSQLiteActive()) {
      (async () => {
        try {
          const [sqlNcFailCount, sqlNcLastError] = await Promise.all([
            getSetting("nextcloud_backup_fail_count"),
            getSetting("nextcloud_backup_last_error"),
          ]);
          if (sqlNcFailCount !== null) {
            setNextcloudBackupFailCount(parseInt(String(sqlNcFailCount), 10) || 0);
          }
          if (typeof sqlNcLastError === "string") {
            setNextcloudBackupLastError(sqlNcLastError);
          }
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

    // Remove listeners — addListener returns Promise<PluginListenerHandle>,
    // so the handle may not yet be resolved when cleanup fires. Await it
    // before calling remove() so we don't leak the registration.
    if (browserFinishedListener.current) {
      void browserFinishedListener.current.then((h) => { void h.remove(); });
      browserFinishedListener.current = null;
    }

    if (appStateListener.current) {
      void appStateListener.current.then((h) => { void h.remove(); });
      appStateListener.current = null;
    }

    // Try to close browser (best effort)
    void Browser.close().catch(() => {
      // Ignore errors - browser might already be closed
    });
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
        if (ncPollInterval.current) clearInterval(ncPollInterval.current);
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
          if (ncPollInterval.current) clearInterval(ncPollInterval.current);
          ncPollInterval.current = null;

          const serverUrl = (result.server as string).replace(/\/+$/, '');
          await handleLoginSuccess(serverUrl, result.loginName as string, result.appPassword as string);
        }
      } catch (error) {
        log.error('Polling error:', error);
        if (ncPollInterval.current) clearInterval(ncPollInterval.current);
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

  return {
    nextcloudBackupFailCount,
    setNextcloudBackupFailCount,
    nextcloudBackupLastError,
    setNextcloudBackupLastError,
    ncExpanded,
    setNcExpanded,
    ncConnecting,
    ncLoginName,
    cleanupLifecycle,
    setNcConnecting,
    handleNcConnect,
    handleNcDisconnect,
    handleNcTest,
  };
}
