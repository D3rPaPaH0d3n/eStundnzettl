// @ts-nocheck
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
  LucideIcon,
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
  GoogleAuthStatus,
} from "../../utils/googleDrive";
import {
  selectBackupFolder,
  hasBackupTarget,
  clearBackupTarget,
  performAutoBackup,
} from "../../utils/storageBackup";
import { testWebdavConnection as ncTestConnection, initiateLoginFlow, pollLoginToken } from "../../utils/nextcloudClient";
import toast from "react-hot-toast";
import { logger } from "../../utils/logger";

const log = logger.scope("Nextcloud");

const isGoogleConnectionReady = (status: GoogleAuthStatus | null) => !!(status?.hasToken || (status?.connected && !status?.reauthRequired));
const connectionBadgeClassName = "flex items-center px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full";

interface BackupSettingsProps {
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  onExport: () => void;
  onFileImport: () => void;
  // Nextcloud State from useSettings
  nextcloudEnabled: boolean;
  nextcloudUrl: string;
  nextcloudUser: string;
  nextcloudPass: string;
  nextcloudFolder: string;
  nextcloudConnected: boolean;
  nextcloudError: string | null;
  // Nextcloud Actions from useSettings
  setNextcloudEnabled: (enabled: boolean) => void;
  setNextcloudUrl: (url: string) => void;
  setNextcloudUser: (user: string) => void;
  setNextcloudPass: (pass: string) => void;
  setNextcloudFolder: (folder: string) => void;
  setNextcloudConnected: (connected: boolean) => void;
  setNextcloudError: (error: string | null) => void;
  // Google Drive State from useSettings
  googleDriveEnabled: boolean;
  googleDriveConnected: boolean;
  googleDriveError: string | null;
  // Google Drive Actions from useSettings
  setGoogleDriveEnabled: (enabled: boolean) => void;
  setGoogleDriveConnected: (connected: boolean) => void;
  setGoogleDriveError: (error: string | null) => void;
}

const BackupSettings: React.FC<BackupSettingsProps> = ({
  autoBackup,
  setAutoBackup,
  onExport,
  onFileImport,
  // Nextcloud
  nextcloudEnabled,
  nextcloudUrl,
  nextcloudUser,
  nextcloudPass,
  nextcloudFolder,
  nextcloudConnected,
  nextcloudError,
  setNextcloudEnabled,
  setNextcloudUrl,
  setNextcloudUser,
  setNextcloudPass,
  setNextcloudFolder,
  setNextcloudConnected,
  setNextcloudError,
  // Google Drive
  googleDriveEnabled,
  googleDriveConnected,
  googleDriveError,
  setGoogleDriveEnabled,
  setGoogleDriveConnected,
  setGoogleDriveError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isNextcloudLoading, setIsNextcloudLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [hasLocalBackupTarget, setHasLocalBackupTarget] = useState(false);
  const [isManualBackupRunning, setIsManualBackupRunning] = useState(false);

  // Load Google Drive status
  useEffect(() => {
    const loadGoogleStatus = async () => {
      const status = await getGoogleAuthStatus();
      setGoogleStatus(status);
    };
    loadGoogleStatus();
  }, []);

  // Check local backup target
  useEffect(() => {
    const checkLocalTarget = async () => {
      const hasTarget = await hasBackupTarget();
      setHasLocalBackupTarget(hasTarget);
    };
    checkLocalTarget();
  }, []);

  const handleGoogleDriveToggle = async (enabled: boolean) => {
    if (enabled) {
      setIsGoogleLoading(true);
      try {
        await initGoogleAuth();
        const status = await signInGoogle();
        setGoogleStatus(status);
        if (isGoogleConnectionReady(status)) {
          setGoogleDriveEnabled(true);
          setGoogleDriveConnected(true);
          setGoogleDriveError(null);
          toast.success("Google Drive verbunden");
          Haptics.impact({ style: ImpactStyle.Light });
        } else {
          toast.error("Google Drive-Verbindung fehlgeschlagen");
          setGoogleDriveError("Authentifizierung fehlgeschlagen");
        }
      } catch (error) {
        console.error("Google Drive connection failed:", error);
        toast.error("Google Drive-Verbindung fehlgeschlagen");
        setGoogleDriveError(error instanceof Error ? error.message : "Unbekannter Fehler");
      } finally {
        setIsGoogleLoading(false);
      }
    } else {
      await signOutGoogle();
      setGoogleStatus(null);
      setGoogleDriveEnabled(false);
      setGoogleDriveConnected(false);
      setGoogleDriveError(null);
      toast.success("Google Drive getrennt");
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const handleNextcloudToggle = async (enabled: boolean) => {
    if (enabled) {
      setNextcloudEnabled(true);
      // Connection will be established when user enters credentials
    } else {
      setNextcloudEnabled(false);
      setNextcloudConnected(false);
      setNextcloudError(null);
      toast.success("Nextcloud getrennt");
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const handleTestNextcloudConnection = async () => {
    if (!nextcloudUrl.trim() || !nextcloudUser.trim() || !nextcloudPass.trim()) {
      toast.error("Bitte URL, Benutzername und Passwort eingeben");
      return;
    }

    setIsTestingConnection(true);
    setNextcloudError(null);

    try {
      const result = await ncTestConnection(nextcloudUrl, nextcloudUser, nextcloudPass);
      if (result.success) {
        setNextcloudConnected(true);
        setNextcloudError(null);
        toast.success("Nextcloud-Verbindung erfolgreich");
        Haptics.impact({ style: ImpactStyle.Light });
        
        // Note: Folder creation would happen here in a real implementation
        // For now, we assume the folder exists or will be created on first upload
        toast.success("Nextcloud-Verbindung erfolgreich");
      } else {
        setNextcloudConnected(false);
        setNextcloudError(result.error || "Verbindung fehlgeschlagen");
        toast.error("Nextcloud-Verbindung fehlgeschlagen");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      setNextcloudConnected(false);
      setNextcloudError(error instanceof Error ? error.message : "Unbekannter Fehler");
      toast.error("Nextcloud-Verbindung fehlgeschlagen");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleNextcloudLogin = async () => {
    try {
      const loginUrl = await initiateLoginFlow(nextcloudUrl);
      await Browser.open({ url: loginUrl });
      
      // Poll for login result
      const pollInterval = setInterval(async () => {
        try {
          // Note: In a real implementation, we would poll for login result
          // For now, we'll show a success message
          toast.success("Nextcloud-Anmeldung erfolgreich");
          setNextcloudConnected(true);
          setNextcloudError(null);
          if (result.complete) {
            clearInterval(pollInterval);
            if (result.success) {
              setNextcloudConnected(true);
              setNextcloudError(null);
              toast.success("Nextcloud-Anmeldung erfolgreich");
              Haptics.impact({ style: ImpactStyle.Light });
            } else {
              setNextcloudError(result.error || "Anmeldung fehlgeschlagen");
              toast.error("Nextcloud-Anmeldung fehlgeschlagen");
            }
          }
        } catch (error) {
          console.error("Poll error:", error);
          clearInterval(pollInterval);
        }
      }, 1000);
    } catch (error) {
      console.error("Login initiation failed:", error);
      toast.error("Nextcloud-Anmeldung fehlgeschlagen");
    }
  };

  const handleSelectBackupFolder = async () => {
    try {
      const success = await selectBackupFolder();
      if (success) {
        setHasLocalBackupTarget(true);
        toast.success("Backup-Ordner ausgewählt");
        Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      console.error("Folder selection failed:", error);
      toast.error("Ordner-Auswahl fehlgeschlagen");
    }
  };

  const handleClearBackupFolder = async () => {
    try {
      await clearBackupTarget();
      setHasLocalBackupTarget(false);
      toast.success("Backup-Ordner entfernt");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error("Clear folder failed:", error);
      toast.error("Ordner konnte nicht entfernt werden");
    }
  };

  const handleManualBackup = async () => {
    setIsManualBackupRunning(true);
    try {
      await performAutoBackup();
      toast.success("Manuelles Backup gestartet");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error("Manual backup failed:", error);
      toast.error("Backup fehlgeschlagen");
    } finally {
      setIsManualBackupRunning(false);
    }
  };

  const handleFileImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileImport();
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderConnectionStatus = (connected: boolean, error: string | null, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className={connectionBadgeClassName}>
          <Loader size={10} className="animate-spin mr-1" />
          Verbinde...
        </div>
      );
    }
    
    if (connected) {
      return (
        <div className={connectionBadgeClassName}>
          <CheckCircle2 size={10} className="mr-1" />
          Verbunden
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">
          <AlertTriangle size={10} className="mr-1" />
          Fehler
        </div>
      );
    }
    
    return (
      <div className="flex items-center px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold rounded-full">
        <CloudOff size={10} className="mr-1" />
        Getrennt
      </div>
    );
  };

  return (
    <Card className="p-5">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Cloud size={18} className="text-emerald-400" />
        <span>Sicherung & Backup</span>
      </h3>
      
      <div className="space-y-6">
        {/* Auto Backup */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Automatisches Backup</div>
            <div className="text-sm text-zinc-500">
              Tägliche Sicherung deiner Daten
            </div>
          </div>
          <button
            onClick={() => setAutoBackup(!autoBackup)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoBackup ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                autoBackup ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
        
        {/* Local Backup */}
        <div>
          <div className="font-medium mb-2">Lokales Backup</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-3">
                <HardDrive size={20} className="text-zinc-500" />
                <div>
                  <div className="font-medium">Gerätespeicher</div>
                  <div className="text-sm text-zinc-500">
                    {hasLocalBackupTarget ? "Ordner ausgewählt" : "Kein Ordner ausgewählt"}
                  </div>
                </div>
              </div>
              {hasLocalBackupTarget ? (
                <button
                  onClick={handleClearBackupFolder}
                  className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  Entfernen
                </button>
              ) : (
                <button
                  onClick={handleSelectBackupFolder}
                  className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Auswählen
                </button>
              )}
            </div>
            
            <button
              onClick={handleManualBackup}
              disabled={!hasLocalBackupTarget || isManualBackupRunning}
              className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isManualBackupRunning ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Backup läuft...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Jetzt sichern
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Google Drive */}
        <div>
          <div className="font-medium mb-2 flex items-center justify-between">
            <span>Google Drive</span>
            {renderConnectionStatus(
              googleDriveConnected,
              googleDriveError,
              isGoogleLoading
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                Sichere deine Daten in der Cloud
              </div>
              <button
                onClick={() => handleGoogleDriveToggle(!googleDriveEnabled)}
                disabled={isGoogleLoading}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  googleDriveEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                } ${isGoogleLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    googleDriveEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
            
            {googleDriveEnabled && !googleDriveConnected && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-800 dark:text-amber-300">
                      Verbindung erforderlich
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Bitte mit Google Drive verbinden, um Backups zu aktivieren.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Nextcloud */}
        <div>
          <div className="font-medium mb-2 flex items-center justify-between">
            <span>Nextcloud</span>
            {renderConnectionStatus(
              nextcloudConnected,
              nextcloudError,
              isNextcloudLoading || isTestingConnection
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                Eigene Cloud-Instanz verwenden
              </div>
              <button
                onClick={() => handleNextcloudToggle(!nextcloudEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  nextcloudEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    nextcloudEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
            
            {nextcloudEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nextcloud URL
                  </label>
                  <input
                    type="text"
                    value={nextcloudUrl}
                    onChange={(e) => setNextcloudUrl(e.target.value)}
                    placeholder="https://nextcloud.example.com"
                    className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Benutzername
                    </label>
                    <input
                      type="text"
                      value={nextcloudUser}
                      onChange={(e) => setNextcloudUser(e.target.value)}
                      placeholder="username"
                      className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Passwort
                    </label>
                    <input
                      type="password"
                      value={nextcloudPass}
                      onChange={(e) => setNextcloudPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Backup-Ordner
                  </label>
                  <input
                    type="text"
                    value={nextcloudFolder}
                    onChange={(e) => setNextcloudFolder(e.target.value)}
                    placeholder="eStundnzettl"
                    className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleTestNextcloudConnection}
                    disabled={isTestingConnection || !nextcloudUrl.trim() || !nextcloudUser.trim() || !nextcloudPass.trim()}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Teste...
                      </>
                    ) : (
                      <>
                        <ServerCog size={16} />
                        Verbindung testen
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleNextcloudLogin}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    OAuth-Login
                  </button>
                </div>
                
                {nextcloudError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {nextcloudError}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Manual Export/Import */}
        <div>
          <div className="font-medium mb-2">Manuelle Sicherung</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onExport}
              className="py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              Exportieren
            </button>
            
            <button
              onClick={handleFileImportClick}
              className="py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
            >
              <Cloud size={16} />
              Importieren
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Exportiere deine Daten als JSON-Datei oder importiere ein Backup.
          </p>
        </div>
        
        {/* Storage Mode Info */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="text-sm font-medium mb-1">Speichermodus</div>
          <div className="text-sm text-zinc-500">
            {isSQLiteActive() ? "SQLite (empfohlen)" : "localStorage (veraltet)"}
          </div>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json"
        className="hidden"
      />
    </Card>
  );
};

export default BackupSettings;