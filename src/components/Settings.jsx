import React, { Suspense, useState, useEffect } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import ProfileSettings from "./Settings/ProfileSettings";
import DataSettings from "./Settings/DataSettings";
import ThemeSettings from "./Settings/ThemeSettings";
import BackupSettings from "./Settings/BackupSettings";
import PdfArchiveSettings from "./Settings/PdfArchiveSettings";
import AppInfoSettings from "./Settings/AppInfoSettings";
import { analyzeBackupData, applyBackup, readJsonFile } from "../utils/storageBackup";
import toast from "react-hot-toast";

const ChangelogModal = React.lazy(() => import("./ChangelogModal"));
const HelpModal = React.lazy(() => import("./HelpModal"));
const WorkCodeManager = React.lazy(() => import("./WorkCodeManager"));
const ImportConflictModal = React.lazy(() => import("./ImportConflictModal"));
const DecimalDurationPicker = React.lazy(() => import("./DecimalDurationPicker"));

const Settings = ({
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

  const [pendingImport, setPendingImport] = useState(null);

  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState(null);

  const [isLocked, setIsLocked] = useState(true);

  const safeUserData = userData || {};
  const activeModelId = safeUserData.workModelId || "custom";

  useEffect(() => {
    setIsLocked(true);
  }, [activeModelId]);

  // Scrolling im Hintergrund blockieren wenn WorkCodeManager offen ist
  useEffect(() => {
    if (showWorkCodeManager) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showWorkCodeManager]);

  const openDayPicker = (index) => {
    const isCustomMode = activeModelId === "custom";
    if (!isCustomMode) {
      toast("Bitte erst 'Benutzerdefiniert' wählen", { icon: "🚫" });
      Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
    if (isLocked) {
      toast("Zum Bearbeiten erst Schloss öffnen", { icon: "🔒" });
      Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }

    setPickerTargetIndex(index);
    setShowDurationPicker(true);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleDurationConfirm = (minutes) => {
    if (pickerTargetIndex === null) return;

    const newWorkDays = [...safeUserData.workDays];
    newWorkDays[pickerTargetIndex] = minutes;

    setUserData({ ...userData, workDays: newWorkDays });
    toast.success("Zeit aktualisiert");
  };

  const toggleLock = () => {
    const isCustomMode = activeModelId === "custom";
    if (!isCustomMode) {
      toast("Nur bei 'Benutzerdefiniert' möglich");
      return;
    }
    const newState = !isLocked;
    setIsLocked(newState);
    Haptics.impact({ style: ImpactStyle.Medium });
    if (!newState) {
      toast.success("Bearbeitung freigegeben");
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const json = await readJsonFile(file);
      const analysis = await analyzeBackupData(json);
      if (!analysis.valid) {
        toast.error("Ungültiges Backup-Format");
        return;
      }
      if (analysis.integrity === "mismatch") {
        toast("⚠️ Prüfsumme stimmt nicht — Backup wurde möglicherweise verändert", { duration: 6000 });
      }
      if (analysis.hasSettings) {
        setPendingImport(analysis);
      } else {
        await applyBackup(analysis, "ALL");
        toast.success(`${analysis.entryCount} Einträge importiert!`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      toast.error("Fehler beim Lesen der Datei");
    }
    e.target.value = null;
  };

  const handleConfirmImport = async (mode) => {
    if (!pendingImport) return;
    await applyBackup(pendingImport, mode);
    toast.success("Erfolgreich wiederhergestellt!");
    setPendingImport(null);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <main className="w-full p-4 space-y-6 pb-20">
      {/* Modals */}
      {showChangelog && (
        <Suspense fallback={null}>
          <ChangelogModal
            isOpen={showChangelog}
            onClose={() => setShowChangelog(false)}
          />
        </Suspense>
      )}
      {showHelp && (
        <Suspense fallback={null}>
          <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </Suspense>
      )}
      {showWorkCodeManager && (
        <Suspense fallback={null}>
          <WorkCodeManager
            isOpen={showWorkCodeManager}
            onClose={() => setShowWorkCodeManager(false)}
          />
        </Suspense>
      )}
      {pendingImport && (
        <Suspense fallback={null}>
          <ImportConflictModal
            analysisData={pendingImport}
            onConfirm={handleConfirmImport}
            onCancel={() => setPendingImport(null)}
          />
        </Suspense>
      )}

      {showDurationPicker && (
        <Suspense fallback={null}>
          <DecimalDurationPicker
            isOpen={showDurationPicker}
            onClose={() => setShowDurationPicker(false)}
            initialMinutes={
              pickerTargetIndex !== null
                ? safeUserData.workDays[pickerTargetIndex]
                : 0
            }
            onConfirm={handleDurationConfirm}
            title={
              pickerTargetIndex !== null
                ? `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][pickerTargetIndex]} bearbeiten`
                : ""
            }
          />
        </Suspense>
      )}

      {/* 1. Profile Settings */}
      <ProfileSettings userData={userData} setUserData={setUserData} />

      {/* 2. Data Settings (includes WorkModel, Data, and Demo-Daten) */}
      <DataSettings
        userData={userData}
        setUserData={setUserData}
        setShowWorkCodeManager={setShowWorkCodeManager}
        isLocked={isLocked}
        onToggleLock={toggleLock}
        onOpenDayPicker={openDayPicker}
        entries={entries}
        lastBackup={lastBackup}
        importEntries={importEntries}
        importWorkCodes={importWorkCodes}
      />

      {/* 3. Theme Settings */}
      <ThemeSettings theme={theme} setTheme={setTheme} />

      {/* 4. Backup Settings */}
      <BackupSettings
        autoBackup={autoBackup}
        setAutoBackup={setAutoBackup}
        onExport={onExport}
        onFileImport={handleFileImport}
        // Nextcloud State
        nextcloudEnabled={nextcloudEnabled}
        nextcloudUrl={nextcloudUrl}
        nextcloudUser={nextcloudUser}
        nextcloudPass={nextcloudPass}
        setNextcloudEnabled={setNextcloudEnabled}
        setNextcloudUrl={setNextcloudUrl}
        setNextcloudUser={setNextcloudUser}
        setNextcloudPass={setNextcloudPass}
      />

      {/* 4b. PDF-Archiv (monatlich wachsendes PDF) */}
      {pdfArchivePerformRun && (
        <PdfArchiveSettings
          nextcloudEnabled={nextcloudEnabled}
          performRun={pdfArchivePerformRun}
          lastRun={pdfArchiveLastRun}
          lastError={pdfArchiveLastError}
        />
      )}

      {/* 5. App Info & Danger Zone */}
      <AppInfoSettings
        onCheckUpdate={onCheckUpdate}
        onDeleteAll={onDeleteAll}
        onShowHelp={() => setShowHelp(true)}
        onShowChangelog={() => setShowChangelog(true)}
      />
    </main>
  );
};

export default Settings;
