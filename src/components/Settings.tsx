// @ts-nocheck
import React, { Suspense, useState, useEffect } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import ProfileSettings from "./Settings/ProfileSettings";
import DataSettings from "./Settings/DataSettings";
import ThemeSettings from "./Settings/ThemeSettings";
import BackupSettings from "./Settings/BackupSettings";
import PdfArchiveSettings from "./Settings/PdfArchiveSettings";
import AppInfoSettings from "./Settings/AppInfoSettings";

import toast from "react-hot-toast";
import { TimeEntry, WorkCode, UserData } from "../types";

const ChangelogModal = React.lazy(() => import("./ChangelogModal"));
const HelpModal = React.lazy(() => import("./HelpModal"));
const WorkCodeManager = React.lazy(() => import("./WorkCodeManager"));
const ImportConflictModal = React.lazy(() => import("./ImportConflictModal"));
const DecimalDurationPicker = React.lazy(() => import("./DecimalDurationPicker"));

interface SettingsProps {
  userData: UserData;
  setUserData: (data: UserData) => void;
  theme: string;
  setTheme: (theme: string) => void;
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  entries?: TimeEntry[];
  lastBackup?: string | null;
  importEntries: (entries: TimeEntry[]) => void;
  importWorkCodes: (codes: WorkCode[]) => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteAll: () => void;
  onCheckUpdate: () => void;
  // Nextcloud State
  nextcloudEnabled: boolean;
  nextcloudUrl: string;
  nextcloudUser: string;
  nextcloudPass: string;
  setNextcloudEnabled: (enabled: boolean) => void;
  setNextcloudUrl: (url: string) => void;
  setNextcloudUser: (user: string) => void;
  setNextcloudPass: (pass: string) => void;
  // PDF-Archiv
  pdfArchiveLastRun: string | null;
  pdfArchiveLastError: string | null;
  pdfArchivePerformRun: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  userData,
  setUserData,
  theme,
  setTheme,
  autoBackup,
  setAutoBackup,
  entries = [],
  lastBackup = null,
  importEntries,
  importWorkCodes,
  onExport,
  onImport: _onImport,
  onDeleteAll,
  onCheckUpdate,
  // Nextcloud State
  nextcloudEnabled,
  nextcloudUrl,
  nextcloudUser,
  nextcloudPass,
  setNextcloudEnabled,
  setNextcloudUrl,
  setNextcloudUser,
  setNextcloudPass,
  // PDF-Archiv
  pdfArchiveLastRun,
  pdfArchiveLastError,
  pdfArchivePerformRun,
}) => {
  const [showChangelog, setShowChangelog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showWorkCodeManager, setShowWorkCodeManager] = useState(false);
  const [showImportConflict, setShowImportConflict] = useState(false);
  const [showDecimalPicker, setShowDecimalPicker] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importAnalysis, setImportAnalysis] = useState<any>(null);

  const readJsonFile = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = JSON.parse(event.target?.result as string);
            resolve(content);
          } catch (error) {
            reject(new Error('Invalid JSON format'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      };
      
      input.click();
    });
  };

  const analyzeBackupData = (data: any) => {
    return {
      entriesCount: data.entries?.length || 0,
      workCodesCount: data.workCodes?.length || 0,
      hasSettings: !!(data.userData || data.settings),
      conflicts: []
    };
  };

  const applyBackup = async (data: any, options: any) => {
    if (data.entries && options.onEntries) {
      options.onEntries(data.entries);
    }
    if (data.workCodes && options.onWorkCodes) {
      options.onWorkCodes(data.workCodes);
    }
    if (data.userData && options.onUserData) {
      options.onUserData(data.userData);
    }
    return true;
  };

  const handleImport = async () => {
    try {
      const data = await readJsonFile();
      const analysis = analyzeBackupData(data);
      setImportData(data);
      setImportAnalysis(analysis);
      
      if (analysis.conflicts.length > 0) {
        setShowImportConflict(true);
      } else {
        applyBackup(data, importEntries, importWorkCodes, setUserData);
        toast.success("Daten erfolgreich importiert");
        Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Import fehlgeschlagen");
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  };

  const handleResolveConflict = (strategy: "keep" | "replace" | "merge") => {
    if (!importData) return;
    
    applyBackup(importData, importEntries, importWorkCodes, setUserData, strategy);
    setShowImportConflict(false);
    setImportData(null);
    setImportAnalysis(null);
    
    toast.success(`Daten importiert (${strategy})`);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleDecimalDurationSelect = (hours: number) => {
    setUserData({
      ...userData,
      monthlyTargetMinutes: Math.round(hours * 60),
    });
    setShowDecimalPicker(false);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  return (
    <div className="space-y-6">
      <ProfileSettings
        userData={userData}
        setUserData={setUserData}
        onOpenWorkCodeManager={() => setShowWorkCodeManager(true)}
        onOpenDecimalPicker={() => setShowDecimalPicker(true)}
      />
      
      <DataSettings
        entries={entries}
        lastBackup={lastBackup}
        onExport={onExport}
        onImport={handleImport}
        onDeleteAll={onDeleteAll}
      />
      
      <ThemeSettings
        theme={theme}
        setTheme={setTheme}
      />
      
      <BackupSettings
        autoBackup={autoBackup}
        setAutoBackup={setAutoBackup}
        nextcloudEnabled={nextcloudEnabled}
        nextcloudUrl={nextcloudUrl}
        nextcloudUser={nextcloudUser}
        nextcloudPass={nextcloudPass}
        setNextcloudEnabled={setNextcloudEnabled}
        setNextcloudUrl={setNextcloudUrl}
        setNextcloudUser={setNextcloudUser}
        setNextcloudPass={setNextcloudPass}
      />
      
      <PdfArchiveSettings
        lastRun={pdfArchiveLastRun}
        lastError={pdfArchiveLastError}
        performRun={pdfArchivePerformRun}
      />
      
      <AppInfoSettings
        onShowChangelog={() => setShowChangelog(true)}
        onShowHelp={() => setShowHelp(true)}
        onCheckUpdate={onCheckUpdate}
      />

      {/* Modals */}
      <Suspense fallback={<div className="p-4 text-center">Laden...</div>}>
        {showChangelog && (
          <ChangelogModal onClose={() => setShowChangelog(false)} />
        )}
        
        {showHelp && (
          <HelpModal onClose={() => setShowHelp(false)} />
        )}
        
        {showWorkCodeManager && (
          <WorkCodeManager onClose={() => setShowWorkCodeManager(false)} />
        )}
        
        {showImportConflict && importAnalysis && (
          <ImportConflictModal
            analysis={importAnalysis}
            onResolve={handleResolveConflict}
            onCancel={() => {
              setShowImportConflict(false);
              setImportData(null);
              setImportAnalysis(null);
            }}
          />
        )}
        
        {showDecimalPicker && (
          <DecimalDurationPicker
            currentHours={userData.monthlyTargetMinutes / 60}
            onSelect={handleDecimalDurationSelect}
            onClose={() => setShowDecimalPicker(false)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Settings;