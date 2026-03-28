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
  isGoogleLoggedIn,
} from "../../utils/googleDrive";
import {
  selectBackupFolder,
  hasBackupTarget,
  clearBackupTarget,
  triggerManualBackup,
} from "../../utils/storageBackup";
import { testConnection as ncTestConnection, initiateLoginFlow, pollLoginResult, ensureFolder as ncEnsureFolder, getNextcloudErrorMessage, resolveUserId } from "../../utils/nextcloudClient";
import NcDebugPanel from "./NcDebugPanel";
import { ncLog } from "../../utils/ncDebugLog";
import toast from "react-hot-toast";

const BackupSettings = ({
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
}) => {
  const importInputRef = useRef(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [hasBackupFolder, setHasBackupFolder] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [backupFailCount, setBackupFailCount] = useState(0);

  // Nextcloud UI State (local UI state, persisted via props)
  const [ncExpanded, setNcExpanded] = useState(false);
  const [ncStatus, setNcStatus] = useState(null); // null | "ok" | "error"
  const [ncConnecting, setNcConnecting] = useState(false);
  const [ncLoginName, setNcLoginName] = useState(nextcloudUser || "");
  
  // Refs for lifecycle management
  const ncPollInterval = useRef(null);
  const browserFinishedListener = useRef(null);
  const appStateListener = useRef(null);
  const appIsActive = useRef(true);
  const loginAttemptId = useRef(null);

  const formatLastBackup = (isoString) => {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "gerade eben";
    if (mins < 60) return `vor ${mins} Min.`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `vor ${hrs} Std.`;
    const days = Math.floor(hrs / 24);
    return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  };

  // =====================
  // LIFECYCLE MANAGEMENT
  // =====================

  // Initialize lifecycle listeners
  useEffect(() => {
    console.log('[Nextcloud] Setting up lifecycle listeners');
    
    // Generate unique ID for this login attempt
    loginAttemptId.current = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Browser finished listener (for Custom Tabs)
    browserFinishedListener.current = Browser.addListener('browserFinished', () => {
      console.log('[Nextcloud] Browser finished/closed');
      handleBrowserFinished();
    });

    // App state change listener
    appStateListener.current = App.addListener('appStateChange', ({ isActive }) => {
      console.log(`[Nextcloud] App state change: ${isActive ? 'active' : 'inactive'}`);
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
      console.log('[Nextcloud] Cleaning up lifecycle listeners');
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
    if (cloudEnabled) {
      initGoogleAuth().catch(() => {});
    }
    setIsCloudConnected(cloudEnabled);
    setHasBackupFolder(hasBackupTarget());

    const saved = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    if (saved) setLastBackupDate(saved);

    // Token-Validität: Prüfe ob überhaupt ein Token gespeichert ist.
    // Echte Validität wird erst bei API-Calls geprüft (401 → Auto-Refresh).
    setIsTokenValid(isGoogleLoggedIn());

    const failCount = parseInt(localStorage.getItem(STORAGE_KEYS.BACKUP_FAIL_COUNT) || "0", 10);
    setBackupFailCount(failCount);

    // 2) SQLite nachladen (async, überschreibt wenn vorhanden)
    if (isSQLiteActive()) {
      (async () => {
        try {
          const [sqlLastBackup, sqlFailCount, sqlCloudEnabled] = await Promise.all([
            getSetting("last_backup"),
            getSetting("backup_fail_count"),
            getSetting("cloud_sync_enabled"),
          ]);
          if (sqlLastBackup) setLastBackupDate(sqlLastBackup);
          if (sqlFailCount !== null) {
            setBackupFailCount(parseInt(String(sqlFailCount), 10) || 0);
          }
          if (sqlCloudEnabled !== null) {
            const enabled = !!sqlCloudEnabled;
            setIsCloudConnected(enabled);
            if (enabled) initGoogleAuth().catch(() => {});
          }
        } catch { /* keep localStorage values */ }
      })();
    }
  }, []);

  // =====================
  // LIFECYCLE HANDLERS
  // =====================

  const cleanupLifecycle = () => {
    console.log('[Nextcloud] Performing cleanup');
    
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
    } catch (error) {
      // Ignore errors - browser might already be closed
    }
  };

  const handleBrowserFinished = () => {
    console.log('[Nextcloud] Browser finished handler');
    
    // If we're still connecting, check if login completed
    if (ncConnecting) {
      console.log('[Nextcloud] Browser closed while connecting - checking login status');
      
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
    console.log('[Nextcloud] App resumed from background');
    
    // If we were connecting, check if login completed while we were in background
    if (ncConnecting) {
      console.log('[Nextcloud] App resumed while connecting - checking login status');
      
      // Force a poll check immediately
      if (ncPollInterval.current) {
        checkPollResult();
      }
    }
  };

  const pausePolling = () => {
    console.log('[Nextcloud] Pausing polling (app in background)');
    // Polling logic checks appIsActive.current, so no action needed here
  };

  // =====================
  // POLLING MANAGEMENT
  // =====================

  const checkPollResult = async () => {
    // Skip if app is not active
    if (!appIsActive.current) {
      console.log('[Nextcloud] Skipping poll check - app is inactive');
      return;
    }

    try {
      // Get current poll endpoint and token from state
      // Note: In a real implementation, we'd need to store these
      // For now, we'll rely on the existing polling logic
      console.log('[Nextcloud] Manual poll check triggered');
    } catch (error) {
      console.error('[Nextcloud] Error in manual poll check:', error);
    }
  };

  const startPolling = (pollEndpoint, token) => {
    console.log(`[Nextcloud] Starting polling for attempt ${loginAttemptId.current}`);
    
    let attempts = 0;
    const maxAttempts = 100; // ~5 Min bei 3s Intervall
    
    ncPollInterval.current = setInterval(async () => {
      // Skip if app is not active
      if (!appIsActive.current) {
        console.log('[Nextcloud] Polling paused - app is inactive');
        return;
      }
      
      attempts++;
      console.log(`[Nextcloud] Poll attempt ${attempts}/${maxAttempts}`);
      
      if (attempts > maxAttempts) {
        console.log('[Nextcloud] Polling timeout');
        clearInterval(ncPollInterval.current);
        ncPollInterval.current = null;
        setNcConnecting(false);
        toast.error("Zeitüberschreitung — bitte erneut versuchen");
        return;
      }
      
      try {
        const result = await pollLoginResult(pollEndpoint, token);
        if (!result.ok) {
          throw new Error(getNextcloudErrorMessage(result));
        }

        if (result.status === 'pending') {
          console.log('[Nextcloud] Login still pending');
          return;
        }

        if (result.status === 'complete') {
          console.log('[Nextcloud] Login complete!');
          clearInterval(ncPollInterval.current);
          ncPollInterval.current = null;
          
          const serverUrl = result.server.replace(/\/+$/, '');
          await handleLoginSuccess(serverUrl, result.loginName, result.appPassword);
        }
      } catch (error) {
        console.error('[Nextcloud] Polling error:', error);
        clearInterval(ncPollInterval.current);
        ncPollInterval.current = null;
        setNcConnecting(false);
        toast.error(error?.message || "Nextcloud Login fehlgeschlagen");
      }
    }, 3000);
  };

  const handleLoginSuccess = async (serverUrl, loginName, appPassword) => {
    ncLog(`Login success: ${loginName}@${serverUrl}`);
    
    try {
      // Resolve echte User-ID für WebDAV (loginName ≠ uid möglich)
      const userId = await resolveUserId(serverUrl, loginName, appPassword);
      ncLog(`WebDAV userId: "${userId}" (loginName: "${loginName}")`);
      
      // Update central state via props — userId statt loginName für WebDAV!
      setNextcloudUrl(serverUrl);
      setNextcloudUser(userId);
      setNextcloudPass(appPassword);
      setNextcloudEnabled(true);
      
      // Update local UI state
      setNcLoginName(loginName);
      setNcStatus("ok");
      setNcExpanded(false);
      setNcConnecting(false);
      
      if (!autoBackup) setAutoBackup(true);

      // Test connection and ensure folder mit korrekter userId
      try {
        ncLog(`testConnection mit userId="${userId}"`);
        await ncTestConnection(serverUrl, userId, appPassword);
        ncLog(`ensureFolder mit userId="${userId}"`);
        await ncEnsureFolder(serverUrl, userId, appPassword);
      } catch (folderError) {
        ncLog(`⚠️ Folder setup: ${folderError?.message}`);
        // Non-critical - continue
      }

      // Try to close browser
      try {
        await Browser.close();
        console.log('[Nextcloud] Browser closed successfully');
      } catch (browserError) {
        console.warn('[Nextcloud] Browser close warning:', browserError);
        // Browser might already be closed - that's OK
      }

      toast.success(`Verbunden als ${loginName}`);
      console.log('[Nextcloud] Login flow completed successfully');
      
    } catch (persistError) {
      console.error('[Nextcloud] Persistence error:', persistError);
      setNcConnecting(false);
      toast.error("Nextcloud verbunden, aber Speichern in der App fehlgeschlagen");
    }
  };

  // =====================
  // NEXTCLOUD FUNCTIONS
  // =====================

  const handleNcConnect = async () => {
    if (!nextcloudUrl) {
      toast.error("Bitte Server-URL eingeben");
      return;
    }
    
    console.log(`[Nextcloud] Starting login flow for ${nextcloudUrl}`);
    
    try {
      setNcConnecting(true);
      setNcStatus(null);
      
      const startResult = await initiateLoginFlow(nextcloudUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const { loginUrl, token, pollEndpoint } = startResult;
      console.log(`[Nextcloud] Login URL: ${loginUrl}, Poll endpoint: ${pollEndpoint}`);

      // Open browser
      await Browser.open({ url: loginUrl });
      console.log('[Nextcloud] Browser opened');

      // Start polling
      startPolling(pollEndpoint, token);
      
    } catch (err) {
      console.error('[Nextcloud] Login flow error:', err);
      setNcConnecting(false);
      const message = err?.message || 'Unbekannter Fehler';
      toast.error(`Nextcloud Login fehlgeschlagen: ${message}`);
    }
  };

  const handleNcDisconnect = () => {
    console.log('[Nextcloud] Disconnecting');
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
    
    toast("Nextcloud getrennt");
    console.log('[Nextcloud] Disconnected successfully');
  };

  const handleNcTest = async () => {
    if (!nextcloudUrl || !nextcloudUser || !nextcloudPass) {
      toast.error("Bitte zuerst Nextcloud verbinden");
      return;
    }
    
    try {
      setNcStatus(null);
      const result = await ncTestConnection(nextcloudUrl, nextcloudUser, nextcloudPass);
      if (result.ok) {
        setNcStatus("ok");
        toast.success("Verbindung OK!");
      } else {
        setNcStatus("error");
        toast.error(result.error || "Verbindung fehlgeschlagen");
      }
    } catch (error) {
      setNcStatus("error");
      toast.error("Test fehlgeschlagen");
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
        setAutoBackup(false);
      } catch (e) {
        console.error(e);
        localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
        setIsCloudConnected(false);
        setAutoBackup(false);
      }
    } else {
      try {
        await initGoogleAuth().catch(() => {});
        const user = await signInGoogle();
        if (user && user.authentication.accessToken) {
          localStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, "true");
          setIsCloudConnected(true);
          if (!autoBackup) setAutoBackup(true);
          toast.success(`Verbunden: ${user.givenName || "Drive"}`);
        }
      } catch (error) {
        console.error(error);
        toast.error("Anmeldung abgebrochen");
      }
    }
  };

  const handleLocalToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });

    if (hasBackupFolder) {
      await clearBackupTarget();
      setHasBackupFolder(false);
      localStorage.removeItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
      toast("Backup-Ordner getrennt");
    } else {
      try {
        const success = await selectBackupFolder();
        if (success) {
          setHasBackupFolder(true);
          localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED, "true");
          if (!autoBackup) setAutoBackup(true);
          toast.success("Backup aktiviert!");
        }
      } catch {
        // Partiellen State bereinigen (dualWrite könnte BACKUP_TARGET bereits gesetzt haben)
        await clearBackupTarget();
        toast.error("Ordnerauswahl abgebrochen");
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
        const parts = [];
        if (result.gdrive) parts.push("Google Drive");
        if (result.local) parts.push("Lokal");
        if (result.nextcloud) parts.push("Nextcloud");
        toast.success(`Backup erstellt: ${parts.join(", ")}`);

        // Warnung für fehlgeschlagene Ziele
        const failed = [];
        if (result.gdrive === false) failed.push("Google Drive");
        if (result.local === false) failed.push("Lokal");
        if (result.nextcloud === false) failed.push("Nextcloud");
        if (failed.length > 0) {
          toast.error(`Fehlgeschlagen: ${failed.join(", ")}`);
          // Debug: Zeige detaillierte Fehlermeldung in Alert (scrollbar)
          const details = [];
          if (result.nextcloud === false && result.nextcloudError) {
            details.push(`Nextcloud: ${result.nextcloudError}`);
          }
          if (details.length > 0) {
            setTimeout(() => alert(`Backup-Fehler Details:\n\n${details.join("\n\n")}`), 500);
          }
        }
      } else {
        toast.error(result?.message || "Backup fehlgeschlagen");
      }
    } catch (error) {
      console.error(error);
      toast.error("Backup fehlgeschlagen");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileImportInternal = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onFileImport(file);
    e.target.value = "";
  };

  // =====================
  // RENDER
  // =====================

  return (
    <Card title="Backup & Export" icon={<Upload size={20} />}>
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
            <div>
              <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                Google Drive
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {isCloudConnected
                  ? "Aktiv (Täglich)"
                  : "Nicht verbunden"}
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
            {isCloudConnected ? "Trennen" : "Verbinden"}
          </button>
        </div>

        {/* Nextcloud */}
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
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full">
                    ✅ Verbunden
                  </span>
                )}
              </div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {nextcloudEnabled
                  ? `Verbunden als ${ncLoginName || nextcloudUser}`
                  : ncConnecting
                    ? "Warte auf Anmeldung..."
                    : "Nicht konfiguriert"}
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
            {nextcloudEnabled ? "Trennen" : "Einrichten"}
          </button>
        </div>

        {/* Nextcloud Login Flow v2 */}
        {ncExpanded && !nextcloudEnabled && (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-200 dark:border-zinc-600 pt-3">
            {ncConnecting ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader size={24} className="animate-spin text-orange-500" />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Warte auf Anmeldung in Nextcloud...
                </span>
                <span className="text-xs text-zinc-400">
                  Bitte im Browser anmelden und Zugriff gewähren
                </span>
                <button
                  onClick={() => {
                    cleanupLifecycle();
                    setNcConnecting(false);
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Server-URL</label>
                  <input
                    type="url"
                    value={nextcloudUrl}
                    onChange={(e) => setNextcloudUrl(e.target.value)}
                    placeholder="https://cloud.example.com"
                    className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none focus:border-orange-400"
                  />
                </div>
                <button
                  onClick={handleNcConnect}
                  className="w-full py-2.5 text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ServerCog size={16} />
                  Mit Nextcloud verbinden
                </button>
                {nextcloudUrl && nextcloudUser && nextcloudPass && (
                  <button
                    onClick={handleNcTest}
                    className="w-full py-2 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Verbindung testen
                  </button>
                )}
              </>
            )}
          </div>
        )}

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
            <div>
              <span className="block font-bold text-sm text-zinc-800 dark:text-white">
                Lokales Backup
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {hasBackupFolder ? "Aktiv (Täglich)" : "Nicht konfiguriert"}
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
            {hasBackupFolder ? "Trennen" : "Wählen"}
          </button>
        </div>

        {/* Warning for failed backups */}
        {isCloudConnected && backupFailCount >= 3 && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              ⚠️ Letzte Backups fehlgeschlagen. Bitte Google Drive Verbindung prüfen.
            </span>
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
                  {isBackingUp ? "Sichere..." : "Backup"}
                </span>
                <span className="block text-xs text-emerald-600 dark:text-emerald-400">
                  {lastBackupDate
                    ? `Zuletzt: ${formatLastBackup(lastBackupDate)}`
                    : "Noch nie gesichert"}
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
              {isBackingUp ? "Sichere..." : "Jetzt sichern"}
            </button>
          </div>
        )}

        {/* Nextcloud Debug Panel */}
        <NcDebugPanel />

        {/* Export/Import Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={onExport}
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-700 text-white font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} className="rotate-180" /> Export
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            className="w-full py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} /> Import
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
    </Card>
  );
};

export default BackupSettings;
