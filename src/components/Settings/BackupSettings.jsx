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
import { testConnection as ncTestConnection, initiateLoginFlow, pollLoginResult, ensureFolder as ncEnsureFolder } from "../../utils/nextcloudClient";
import { Browser } from "@capacitor/browser";
import toast from "react-hot-toast";

const BackupSettings = ({
  autoBackup,
  setAutoBackup,
  onExport,
  onFileImport,
}) => {
  const importInputRef = useRef(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [hasBackupFolder, setHasBackupFolder] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [backupFailCount, setBackupFailCount] = useState(0);

  // Nextcloud State (direkt aus localStorage geladen, kein Prop-Drilling)
  const [ncEnabled, setNcEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_ENABLED) === "true"
  );
  const [ncUrl, setNcUrl] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_URL) || ""
  );
  const [ncUser, setNcUser] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || ""
  );
  const [ncPass, setNcPass] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_PASS) || ""
  );
  const [ncExpanded, setNcExpanded] = useState(false);
  const [ncTesting, setNcTesting] = useState(false);
  const [ncStatus, setNcStatus] = useState(null); // null | "ok" | "error"
  const [ncConnecting, setNcConnecting] = useState(false);
  const [ncLoginName, setNcLoginName] = useState(
    () => localStorage.getItem(STORAGE_KEYS.NEXTCLOUD_USER) || ""
  );
  const ncPollInterval = useRef(null);

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

  // Cleanup Polling bei Unmount
  useEffect(() => () => {
    if (ncPollInterval.current) clearInterval(ncPollInterval.current);
  }, []);

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

  // Nextcloud: Credentials in localStorage + SQLite speichern
  const saveNcSetting = (key, sqlKey, value) => {
    localStorage.setItem(key, value);
    if (isSQLiteActive()) {
      import("../../db/repositories/settingsRepo").then(({ setSetting }) => {
        setSetting(sqlKey, value).catch(() => {});
      });
    }
  };

  const clearNcSettings = () => {
    [STORAGE_KEYS.NEXTCLOUD_ENABLED, STORAGE_KEYS.NEXTCLOUD_URL, STORAGE_KEYS.NEXTCLOUD_USER, STORAGE_KEYS.NEXTCLOUD_PASS].forEach(k => localStorage.removeItem(k));
    if (isSQLiteActive()) {
      import("../../db/repositories/settingsRepo").then(({ deleteSetting }) => {
        ["nextcloud_enabled", "nextcloud_url", "nextcloud_user", "nextcloud_pass"].forEach(k => deleteSetting(k).catch(() => {}));
      });
    }
  };

  const handleNcConnect = async () => {
    if (!ncUrl) {
      toast.error("Bitte Server-URL eingeben");
      return;
    }
    try {
      setNcConnecting(true);
      const { loginUrl, pollToken, pollEndpoint } = await initiateLoginFlow(ncUrl);

      // Browser öffnen
      await Browser.open({ url: loginUrl });

      // Polling starten
      let attempts = 0;
      ncPollInterval.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) { // ~5 Min bei 3s Intervall
          clearInterval(ncPollInterval.current);
          setNcConnecting(false);
          toast.error("Zeitüberschreitung — bitte erneut versuchen");
          return;
        }
        try {
          const result = await pollLoginResult(pollEndpoint, pollToken);
          if (result) {
            clearInterval(ncPollInterval.current);
            // Credentials speichern
            const serverUrl = result.server.replace(/\/+$/, '');
            saveNcSetting(STORAGE_KEYS.NEXTCLOUD_URL, "nextcloud_url", serverUrl);
            saveNcSetting(STORAGE_KEYS.NEXTCLOUD_USER, "nextcloud_user", result.loginName);
            saveNcSetting(STORAGE_KEYS.NEXTCLOUD_PASS, "nextcloud_pass", result.appPassword);
            saveNcSetting(STORAGE_KEYS.NEXTCLOUD_ENABLED, "nextcloud_enabled", "true");
            setNcUrl(serverUrl);
            setNcUser(result.loginName);
            setNcPass(result.appPassword);
            setNcLoginName(result.loginName);
            setNcEnabled(true);
            setNcStatus("ok");
            setNcExpanded(false);
            setNcConnecting(false);
            if (!autoBackup) setAutoBackup(true);
            toast.success(`Verbunden als ${result.loginName}`);
            // Verbindungstest + Ordner anlegen
            try {
              await ncTestConnection(serverUrl, result.loginName, result.appPassword);
              await ncEnsureFolder(serverUrl, result.loginName, result.appPassword);
            } catch { /* nicht kritisch */ }
          }
        } catch {
          clearInterval(ncPollInterval.current);
          setNcConnecting(false);
          toast.error("Nextcloud Login fehlgeschlagen");
        }
      }, 3000);
    } catch (err) {
      setNcConnecting(false);
      toast.error("Server nicht erreichbar oder Login Flow v2 nicht unterstützt");
    }
  };

  const handleNcDisconnect = () => {
    Haptics.impact({ style: ImpactStyle.Light });
    if (ncPollInterval.current) clearInterval(ncPollInterval.current);
    clearNcSettings();
    setNcEnabled(false);
    setNcUrl("");
    setNcUser("");
    setNcPass("");
    setNcLoginName("");
    setNcExpanded(false);
    setNcStatus(null);
    setNcConnecting(false);
    toast("Nextcloud getrennt");
  };

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
      } catch (err) {
        // Partiellen State bereinigen (dualWrite könnte BACKUP_TARGET bereits gesetzt haben)
        await clearBackupTarget();
        setHasBackupFolder(false);
        toast.error("Backup konnte nicht aktiviert werden");
      }
    }
  };

  const handleManualBackup = async () => {
    if (isBackingUp) return;
    Haptics.impact({ style: ImpactStyle.Light });
    setIsBackingUp(true);
    try {
      const result = await triggerManualBackup();
      if (result.success) {
        const now = new Date().toISOString();
        setLastBackupDate(now);
        const targets = [
          result.gdrive && "Drive",
          result.nextcloud && "Nextcloud",
          result.local && "Lokal",
        ].filter(Boolean);
        if (targets.length > 0) {
          toast.success(`Backup gespeichert (${targets.join(" + ")})`);
        }
      } else {
        toast.error(result.message || "Backup fehlgeschlagen");
      }
    } catch (e) {
      toast.error("Backup fehlgeschlagen");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileImportInternal = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileImport?.(e);
    e.target.value = null;
  };

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-bold text-zinc-700 dark:text-white">
        Daten & Backup
      </h3>

      <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-3 rounded-xl">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${
              isCloudConnected
                ? "bg-blue-100 text-blue-600"
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
              {isCloudConnected && !isTokenValid && (
                <span
                  title="Token abgelaufen — bitte neu anmelden"
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full"
                >
                  <AlertTriangle size={10} /> Offline
                </span>
              )}
            </div>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {isCloudConnected
                ? isTokenValid
                  ? "Sync Aktiv"
                  : "Token abgelaufen"
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

      {/* Nextcloud Backup */}
      <div className="bg-zinc-100 dark:bg-zinc-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                ncEnabled
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
                {ncEnabled && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full">
                    ✅ Verbunden
                  </span>
                )}
              </div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {ncEnabled
                  ? `Verbunden als ${ncLoginName || ncUser}`
                  : ncConnecting
                    ? "Warte auf Anmeldung..."
                    : "Nicht konfiguriert"}
              </span>
            </div>
          </div>
          <button
            onClick={ncEnabled ? handleNcDisconnect : () => setNcExpanded(!ncExpanded)}
            disabled={ncConnecting}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${
              ncEnabled
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {ncEnabled ? "Trennen" : "Einrichten"}
          </button>
        </div>

        {/* Nextcloud Login Flow v2 */}
        {ncExpanded && !ncEnabled && (
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
                    if (ncPollInterval.current) clearInterval(ncPollInterval.current);
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
                    value={ncUrl}
                    onChange={(e) => setNcUrl(e.target.value)}
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
              </>
            )}
          </div>
        )}
      </div>

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

      {isCloudConnected && backupFailCount >= 3 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            ⚠️ Letzte Backups fehlgeschlagen. Bitte Google Drive Verbindung prüfen.
          </span>
        </div>
      )}

      {(isCloudConnected || hasBackupFolder || ncEnabled) && (
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
    </Card>
  );
};

export default BackupSettings;
