import React, { useRef, useState, useEffect } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import ChangelogModal from "./ChangelogModal";
import HelpModal from "./HelpModal";
import WorkCodeManager from "./WorkCodeManager";
import ImportConflictModal from "./ImportConflictModal";
import DecimalDurationPicker from "./DecimalDurationPicker";
import ProfileSettings from "./Settings/ProfileSettings";
import DataSettings from "./Settings/DataSettings";
import ThemeSettings from "./Settings/ThemeSettings";
import BackupSettings from "./Settings/BackupSettings";
import AppInfoSettings from "./Settings/AppInfoSettings";
import { analyzeBackupData, applyBackup, readJsonFile } from "../utils/storageBackup";
import toast from "react-hot-toast";

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
  onImport,
  onDeleteAll,
  onCheckUpdate,
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
      const analysis = analyzeBackupData(json);
      if (!analysis.valid) {
        toast.error("Ungültiges Backup-Format");
        return;
      }
      if (analysis.hasSettings) {
        setPendingImport(analysis);
      } else {
        await applyBackup(analysis, "ALL");
        toast.success(`${analysis.entryCount} Einträge importiert!`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
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
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <WorkCodeManager
        isOpen={showWorkCodeManager}
        onClose={() => setShowWorkCodeManager(false)}
      />
      <ImportConflictModal
        analysisData={pendingImport}
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />

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
      />

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
