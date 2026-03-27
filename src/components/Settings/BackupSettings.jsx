import React, { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  HardDrive,
  Upload,
  Loader,
  AlertTriangle,
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
} from "../../utils/googleDrive";
import {
  selectBackupFolder,
  hasBackupTarget,
  clearBackupTarget,
  triggerManualBackup,
} from "../../utils/storageBackup";
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

    try {
      const stored = JSON.parse(
        localStorage.getItem("google_auth_state") || "null"
      );
      setIsTokenValid(!!stored?.accessToken);
    } catch {
      setIsTokenValid(false);
    }

    const failCount = parseInt(localStorage.getItem(STORAGE_KEYS.BACKUP_FAIL_COUNT) || "0", 10);
    setBackupFailCount(failCount);

    // 2) SQLite nachladen (async, überschreibt wenn vorhanden)
    if (isSQLiteActive()) {
      (async () => {
        try {
          const [sqlLastBackup, sqlFailCount] = await Promise.all([
            getSetting("last_backup"),
            getSetting("backup_fail_count"),
          ]);
          if (sqlLastBackup) setLastBackupDate(sqlLastBackup);
          if (sqlFailCount !== null) {
            setBackupFailCount(parseInt(String(sqlFailCount), 10) || 0);
          }
        } catch { /* keep localStorage values */ }
      })();
    }
  }, []);

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
        if (result.gdrive && result.local) {
          toast.success("Backup gespeichert (Drive + Lokal)");
        } else if (result.gdrive) {
          toast.success("Backup zu Google Drive gesendet");
        } else {
          toast.success("Lokales Backup erstellt");
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

      {(isCloudConnected || hasBackupFolder) && (
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
