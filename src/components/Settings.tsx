import React, { Suspense, useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import ProfileSettings from "./Settings/ProfileSettings";
import DataSettings from "./Settings/DataSettings";
import ThemeSettings from "./Settings/ThemeSettings";
import LocaleSettings from "./Settings/LocaleSettings";
import CalculationSettings from "./Settings/CalculationSettings";
import CollapsibleCard from "./Settings/CollapsibleCard";
import BackupSettings from "./Settings/BackupSettings";
import PdfArchiveSettings from "./Settings/PdfArchiveSettings";
import AppInfoSettings from "./Settings/AppInfoSettings";
import { analyzeBackupData, applyBackup, readJsonFile } from "../utils/storageBackup";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import type { Entry, UserData, Theme, WorkCode, PdfArchiveRunOptions, CalculationConfig } from "../types";
import type { Locale, LocaleId } from "../locales/types";

const ChangelogModal = React.lazy(() => import("./ChangelogModal"));
const HelpModal = React.lazy(() => import("./HelpModal"));
const WorkCodeManager = React.lazy(() => import("./WorkCodeManager"));
const ImportConflictModal = React.lazy(() => import("./ImportConflictModal"));
const DecimalDurationPicker = React.lazy(() => import("./DecimalDurationPicker"));

interface Props {
  userData: UserData & { workModelId?: string };
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  onTriggerManualBackup?: () => Promise<void> | void;
  entries?: Entry[];
  lastBackup?: string | null;
  importEntries: (entries: Entry[]) => void;
  importWorkCodes: (codes: WorkCode[]) => void;
  onExport: () => void;
  onImport: (data: unknown) => void;
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
  pdfArchiveLastRun?: string | null;
  pdfArchiveLastError?: string | null;
  pdfArchivePerformRun?: (opts: PdfArchiveRunOptions) => Promise<Record<string, unknown>>;
  // Locale (Stundenberechnung)
  locale?: Locale;
  setLocale?: (id: LocaleId) => void;
  // Rechenkonfiguration
  calculationConfig?: CalculationConfig | null;
  setCalculationConfig?: (next: CalculationConfig | ((prev: CalculationConfig) => CalculationConfig)) => void;
  resetCalculationConfigToLocale?: (newLocale: Locale, workDays: number[]) => void;
}

const Settings: React.FC<Props> = ({
  userData,
  setUserData,
  theme,
  setTheme,
  autoBackup,
  setAutoBackup,
  onTriggerManualBackup,
  entries: _entries = [],
  lastBackup: _lastBackup = null,
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
  // Locale
  locale,
  setLocale,
  // Calculation Config
  calculationConfig,
  setCalculationConfig,
  resetCalculationConfigToLocale,
}) => {
  const { t } = useTranslation();
  const [showChangelog, setShowChangelog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showWorkCodeManager, setShowWorkCodeManager] = useState(false);

  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);

  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);

  const [isLocked, setIsLocked] = useState(true);
  const [demoTrigger, setDemoTrigger] = useState(0);

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

  const openDayPicker = (index: number) => {
    const isCustomMode = activeModelId === "custom";
    if (!isCustomMode) {
      toast(t("settings.toast.customModeRequired"), { icon: "🚫" });
      Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
    if (isLocked) {
      toast(t("settings.toast.unlockRequired"), { icon: "🔒" });
      Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }

    setPickerTargetIndex(index);
    setShowDurationPicker(true);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleDurationConfirm = (minutes: number) => {
    if (pickerTargetIndex === null) return;

    const newWorkDays = [...safeUserData.workDays];
    newWorkDays[pickerTargetIndex] = minutes;

    setUserData({ ...userData, workDays: newWorkDays });
    toast.success(t("settings.toast.timeUpdated"));
  };

  const toggleLock = () => {
    const isCustomMode = activeModelId === "custom";
    if (!isCustomMode) {
      toast(t("settings.toast.customOnly"));
      return;
    }
    const newState = !isLocked;
    setIsLocked(newState);
    Haptics.impact({ style: ImpactStyle.Medium });
    if (!newState) {
      toast.success(t("settings.toast.unlocked"));
    }
  };

  const handleFileImportFromFile = async (file: File) => {
    try {
      const json = await readJsonFile(file);
      const analysis = await analyzeBackupData(json);
      if (!analysis.valid) {
        toast.error(t("settings.toast.invalidBackup"));
        return;
      }
      if (analysis.integrity === "mismatch") {
        toast(t("settings.toast.integrityMismatch"), { duration: 6000 });
      }
      if (analysis.hasSettings) {
        setPendingImport(analysis);
      } else {
        await applyBackup(analysis, "ALL");
        importEntries?.(analysis.entries || []);
        if (analysis.workCodes?.length) importWorkCodes?.(analysis.workCodes);
        toast.success(t("settings.toast.entriesImported", { count: analysis.entryCount }));
      }
    } catch {
      toast.error(t("settings.toast.fileReadError"));
    }
  };

  const handleConfirmImport = async (mode: string) => {
    if (!pendingImport) return;
    await applyBackup(pendingImport, mode);
    importEntries?.(pendingImport.entries || []);
    if (pendingImport.workCodes?.length) importWorkCodes?.(pendingImport.workCodes);
    toast.success(t("settings.toast.restoreSuccess"));
    setPendingImport(null);
  };

  return (
    <main className="w-full p-4 space-y-6 pb-6">
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
                ? t("settings.editDay", {
                    weekday: t(
                      `settings.weekdays.${(["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[pickerTargetIndex]}`,
                    ),
                  })
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
        importEntries={importEntries}
        importWorkCodes={importWorkCodes}
        expertMode={userData?.expertMode ?? false}
        demoTrigger={demoTrigger}
      />

      {/* 3. Berechnung (Stundenberechnung + Berechnungsregeln in EINER
          Card). Im Hausmasta-Modus enthält sie zusätzlich den Locale-
          Picker (Stundenberechnung). Default zugeklappt, da sehr viel
          Inhalt. */}
      <CollapsibleCard
        title={t("settings.calc.combinedTitle")}
        subtitle={t("settings.calc.combinedSubtitle")}
        icon={
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
            <Calculator size={20} />
          </div>
        }
        defaultExpanded={false}
        bodyClassName="px-4 pb-4 pt-0 space-y-4"
      >
        {(userData?.expertMode ?? false) && (
          <LocaleSettings
            mode="stundenberechnung"
            locale={locale}
            setLocale={setLocale}
            workDays={userData?.workDays}
            onAfterLocaleChange={resetCalculationConfigToLocale}
          />
        )}
        <CalculationSettings
          unwrapped
          userData={userData}
          locale={locale}
          calculationConfig={calculationConfig}
          setCalculationConfig={setCalculationConfig}
        />
      </CollapsibleCard>

      {/* 4. Backup & Export — inkl. integriertem PDF-Archiv im
          Hausmasta-Modus. Beide zusammen in einer einklappbaren Karte. */}
      <BackupSettings
        autoBackup={autoBackup}
        setAutoBackup={setAutoBackup}
        onExport={onExport}
        onFileImport={handleFileImportFromFile}
        onTriggerManualBackup={onTriggerManualBackup}
        nextcloudEnabled={nextcloudEnabled}
        nextcloudUrl={nextcloudUrl}
        nextcloudUser={nextcloudUser}
        nextcloudPass={nextcloudPass}
        setNextcloudEnabled={setNextcloudEnabled}
        setNextcloudUrl={setNextcloudUrl}
        setNextcloudUser={setNextcloudUser}
        setNextcloudPass={setNextcloudPass}
        expertMode={userData?.expertMode ?? false}
        extraContent={
          (userData?.expertMode ?? false) && pdfArchivePerformRun ? (
            <PdfArchiveSettings
              unwrapped
              nextcloudEnabled={nextcloudEnabled}
              performRun={pdfArchivePerformRun}
              lastRun={pdfArchiveLastRun}
              lastError={pdfArchiveLastError}
            />
          ) : null
        }
      />

      {/* 5. Sprache (kosmetisch, weiter unten) */}
      <LocaleSettings
        mode="language"
        locale={locale}
        setLocale={setLocale}
        workDays={userData?.workDays}
        onAfterLocaleChange={resetCalculationConfigToLocale}
      />

      {/* 6. Design (kosmetisch, weiter unten) */}
      <ThemeSettings theme={theme} setTheme={setTheme} />

      {/* 7. App Info & Danger Zone */}
      <AppInfoSettings
        onCheckUpdate={onCheckUpdate}
        onDeleteAll={onDeleteAll}
        onShowHelp={() => setShowHelp(true)}
        onShowChangelog={() => setShowChangelog(true)}
        onLoadDemoData={() => setDemoTrigger((n) => n + 1)}
        userData={userData}
        setUserData={setUserData}
        locale={locale}
        calculationConfig={calculationConfig}
      />
    </main>
  );
};

export default Settings;
