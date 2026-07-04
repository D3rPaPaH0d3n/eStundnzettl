import React, { useRef, useCallback, useMemo, Suspense, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { BackupAnalysisData, BackupPayload, UserData } from "./types";
import { getLocale } from "./locales";
import { coerceCalculationConfig } from "./utils/calculationConfig";
import { applyBackup } from "./utils/storageBackup";
import { replaceFullSnapshot, type ImportSnapshot } from "./db/snapshot";

import { useWorkCodes } from "./hooks/useWorkCodes";
import { useEntries } from "./hooks/useEntries";
import { useSettings } from "./hooks/useSettings";
import { useCalculationConfig } from "./hooks/useCalculationConfig";
import { useAutoBackup } from "./hooks/useAutoBackup";
import { useAutoPdfArchive } from "./hooks/useAutoPdfArchive";
import { useLiveTimer } from "./hooks/useLiveTimer";
import { useExport } from "./hooks/useExport";
import { useImport } from "./hooks/useImport";
import { useFormState } from "./hooks/useFormState";
import { useAppData } from "./hooks/useAppData";
import { useAppActions } from "./hooks/useAppActions";
import { useAttachments } from "./hooks/useAttachments";
import { useAppState } from "./hooks/useAppState";
import { useAutoCheckoutHandler } from "./hooks/useAutoCheckoutHandler";
import { useBackButtonHandler } from "./hooks/useBackButtonHandler";
import { useLastCode } from "./hooks/useLastCode";
import { useWhatsNewModal } from "./hooks/useWhatsNewModal";
import { useUpdateAvailable } from "./hooks/useUpdateAvailable";
import { useMaterialYouPalette } from "./hooks/useMaterialYouPalette";
import { useSystemBarsTheme } from "./hooks/useSystemBarsTheme";

import AppHeader from "./components/AppHeader";
import ViewRouter from "./components/ViewRouter";
import ConfirmModal from "./components/ConfirmModal";
import SkeletonScreen from "./components/SkeletonScreen";
const UpdateAvailableBanner = React.lazy(() => import("./components/UpdateAvailableBanner"));

const OnboardingWizard = React.lazy(() => import("./components/OnboardingWizard"));
const ExportModal = React.lazy(() => import("./components/ExportModal"));
const AttachmentManager = React.lazy(() => import("./components/AttachmentManager"));
const LocaleMigrationModal = React.lazy(() => import("./components/LocaleMigrationModal"));
const ChangelogModal = React.lazy(() => import("./components/ChangelogModal"));
const SettingsUxMigrationModal = React.lazy(() => import("./components/SettingsUxMigrationModal"));
const SupportPromptModal = React.lazy(() => import("./components/SupportPromptModal"));

const SETTINGS_UX_MIGRATION_SEEN_KEY = "estundnzettl_settings_ux_migration_seen_v1";
const SUPPORT_PROMPT_FIRST_ELIGIBLE_KEY = "estundnzettl_support_prompt_first_eligible_v1";
const SUPPORT_PROMPT_DISMISSED_KEY = "estundnzettl_support_prompt_dismissed_v1";
const SUPPORT_PROMPT_MIN_AGE_MS = 5 * 24 * 60 * 60 * 1000;

// MIGRATION — run once on module import
import { migrateStorageKeys } from "./utils/migration";
migrateStorageKeys();

export default function App() {
  const { t } = useTranslation();
  // --- DATA HOOKS ---
  const {
    entries, addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries,
    setEntriesFromSnapshot,
  } = useEntries();
  const {
    userData, setUserData,
    theme, setTheme,
    materialYouEnabled, setMaterialYouEnabled,
    locale: localeId, setLocale,
    autoBackup, setAutoBackup,
    nextcloudEnabled, nextcloudUrl, nextcloudUser, nextcloudPass,
    setNextcloudEnabled, setNextcloudUrl, setNextcloudUser, setNextcloudPass,
    settingsStorageStatus,
  } = useSettings();
  // Locale-Objekt aus gespeicherter LocaleId auflösen (Fallback: AT)
  const locale = useMemo(() => getLocale(localeId), [localeId]);
  // Per-User Rechenkonfiguration (überschreibt Locale-Defaults)
  const {
    calculationConfig,
    setCalculationConfig,
    resetCalculationConfigToLocale,
  } = useCalculationConfig({ locale, localeId, userData });
  const workCodesApi = useWorkCodes();
  const {
    workCodes,
    isLoading: workCodesLoading,
    hasAnyCodes,
    addCode,
    updateCode: updateWorkCode,
    deleteCode: deleteWorkCode,
    loadPreset: loadWorkCodePreset,
    availablePresets: availableWorkCodePresets,
    clearAllCodes: clearAllWorkCodes,
    loadWorkCodes,
    setWorkCodesFromSnapshot,
  } = workCodesApi;
  const getDefaultCode = useLastCode({ hasAnyCodes, workCodes });
  const form = useFormState({ getDefaultCode });
  const { timerState, autoCheckoutData, clearAutoCheckout, startTimer, pauseTimer, resumeTimer, stopTimer } = useLiveTimer();

  const {
    attachments, addAttachment, removeAttachment, removeAttachmentsForEntry,
    getAttachmentsForEntry, getLabelSuggestions, readAttachmentFile, formatFileSize,
    attachmentCountByEntryId, labelSuggestions, reloadAttachments,
  } = useAttachments();

  // Memoisiert, damit der Auto-Backup-Debounce nicht bei jedem Render
  // neu startet (useAutoBackup nutzt das Objekt als Effect-Dependency).
  const autoBackupExtras = useMemo(() => ({
    workCodes,
    calculationConfig,
    locale: localeId,
    theme,
    attachments,
    attachmentLabels: labelSuggestions,
  }), [workCodes, calculationConfig, localeId, theme, attachments, labelSuggestions]);

  const { triggerManualBackup } = useAutoBackup(entries, userData, autoBackup, autoBackupExtras);
  const { lastRun: pdfArchiveLastRun, lastError: pdfArchiveLastError, performRun: pdfArchivePerformRun } =
    useAutoPdfArchive(entries, userData, workCodes, locale, calculationConfig);

  const exportPayloadRef = useRef<BackupPayload | null>(null);
  const { showExportModal, setShowExportModal, exportData, handleExportToFolder, handleExportShare } = useExport({
    entries, userData, workCodes, attachments, attachmentLabels: labelSuggestions,
    exportPayloadRef, calculationConfig, locale: localeId, theme,
  });

  // Atomarer Restore: schreibt alle Backup-Sektionen (Entries, UserData,
  // WorkCodes, CalculationConfig, Attachments, Locale, Theme) in einer
  // einzigen SQLite-Transaktion. Erst nach erfolgreichem COMMIT wird der
  // React-State refresht — bei Fehler bleibt sowohl DB als auch UI auf
  // dem alten Stand.
  const importSnapshot = useCallback(async (snapshot: ImportSnapshot) => {
    await replaceFullSnapshot(snapshot);
    if (snapshot.entries !== undefined) setEntriesFromSnapshot(snapshot.entries);
    if (snapshot.userData !== undefined) setUserData(snapshot.userData);
    if (snapshot.workCodes !== undefined) setWorkCodesFromSnapshot(snapshot.workCodes);
    if (snapshot.calculationConfig !== undefined) {
      const raw = snapshot.calculationConfig;
      setCalculationConfig((prev) => coerceCalculationConfig(raw, prev));
    }
    if (snapshot.locale !== undefined) setLocale(snapshot.locale);
    if (snapshot.theme !== undefined) setTheme(snapshot.theme);
    if (snapshot.attachments !== undefined || snapshot.attachmentLabels !== undefined) {
      await reloadAttachments();
    }
  }, [setEntriesFromSnapshot, setUserData, setWorkCodesFromSnapshot, setCalculationConfig, setLocale, setTheme, reloadAttachments]);

  const { handleImport } = useImport({ importSnapshot });

  // Restore über die Settings-Seite (BackupSettings → Datei-Import):
  // applyBackup schreibt nach SQLite, danach werden ALLE betroffenen
  // State-Slices aufgefrischt — sonst würde z.B. der useSettings-Persist-
  // Effekt beim nächsten Profil-Edit das stale Alt-Profil über den gerade
  // restaurierten Stand schreiben.
  const applyBackupAndRefresh = useCallback(async (analysis: BackupAnalysisData, mode: "ALL" | "ENTRIES_ONLY" = "ALL"): Promise<boolean> => {
    const ok = await applyBackup(analysis, mode);
    if (!ok) return false;

    setEntriesFromSnapshot(analysis.entries || []);
    if (analysis.hasWorkCodes) setWorkCodesFromSnapshot(analysis.workCodes);
    if (mode === "ALL" && analysis.hasSettings && analysis.settings) {
      setUserData((prev) => {
        const restored = analysis.settings as Record<string, unknown>;
        const workDays = Array.isArray(restored.workDays) && restored.workDays.length === 7
          ? (restored.workDays as number[])
          : prev.workDays;
        return { ...restored, workDays } as unknown as UserData;
      });
    }
    if (mode === "ALL" && analysis.calculationConfig) {
      const raw = analysis.calculationConfig;
      setCalculationConfig((prev) => coerceCalculationConfig(raw, prev));
    }
    if (mode === "ALL" && analysis.locale) setLocale(analysis.locale);
    if (mode === "ALL" && analysis.theme) setTheme(analysis.theme);
    if (analysis.hasAttachments || analysis.attachmentLabels?.length) {
      await reloadAttachments();
    }
    return true;
  }, [setEntriesFromSnapshot, setUserData, setWorkCodesFromSnapshot, setCalculationConfig, setLocale, setTheme, reloadAttachments]);

  // --- UI STATE ---
  const {
    currentDate, setCurrentDate,
    view, setView,
    deleteTarget, setDeleteTarget,
    showOnboarding, setShowOnboarding,
    showTour,
    attachmentEntry, setAttachmentEntry,
    handleRequestDeleteEntry, handleRequestDeleteAll,
    handleCloseDeleteModal, handleCloseAttachmentModal,
    handleTourStart, handleTourClose,
    getHeaderTitle,
  } = useAppState({ userData, settingsStorageStatus });

  // --- DERIVED DATA ---
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();
  const {
    entriesWithHolidays, groupedByWeek, stats,
    overtime, progressPercent, todayTarget,
    lastWorkEntry, uniqueProjects,
  } = useAppData({ entries, userData, viewMonth, viewYear, allEntries: entries, locale, calculationConfig });

  // --- HANDLERS ---
  const {
    handleStartLive, handleStopLive, changeMonth,
    startNewEntry, startEdit, handleSaveEntry,
    executeDelete, handleOnboardingFinish, handleManualUpdateCheck,
  } = useAppActions({
    form, entries, userData, workCodes, removeAttachmentsForEntry, getDefaultCode,
    addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries,
    startTimer, stopTimer, setUserData, setAutoBackup,
    setView, setCurrentDate, setDeleteTarget, setShowOnboarding,
    locale,
    calculationConfig,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsUxMigrationSeen, setSettingsUxMigrationSeen] = useState(
    () => localStorage.getItem(SETTINGS_UX_MIGRATION_SEEN_KEY) === "true",
  );
  const [showSupportPrompt, setShowSupportPrompt] = useState(false);

  // --- EFFECTS ---
  useAutoCheckoutHandler({ autoCheckoutData, form, setView, clearAutoCheckout, getDefaultCode });
  useBackButtonHandler({ view, setView, form });
  useSystemBarsTheme({ theme, showOnboarding });

  const handleOnboardingFinishWithTour = useCallback(() => {
    localStorage.setItem(SETTINGS_UX_MIGRATION_SEEN_KEY, "true");
    setSettingsUxMigrationSeen(true);
    handleOnboardingFinish();
    // Wizard-Restore kann Attachment-Metadaten nach SQLite geschrieben
    // haben — den useAttachments-State (vor dem Restore leer hydriert)
    // nachziehen, sonst fehlen Badges/Labels bis zum App-Neustart.
    void reloadAttachments();
    handleTourStart();
  }, [handleOnboardingFinish, handleTourStart, reloadAttachments]);

  // "Was ist neu" — zeigt das ChangelogModal automatisch beim ersten
  // App-Start nach einem Update. Wird unterdrückt während Onboarding,
  // damit Erstinstallation nicht direkt mit Versionshistorie kommt.
  const whatsNew = useWhatsNewModal();
  const showSettingsUxMigration =
    !settingsUxMigrationSeen &&
    !showOnboarding &&
    settingsStorageStatus !== "loading" &&
    !!userData?.name;
  const showWhatsNew = whatsNew.shouldShow && !showOnboarding && !showSettingsUxMigration && localeId !== null;

  useEffect(() => {
    if (
      showOnboarding ||
      showSettingsUxMigration ||
      showWhatsNew ||
      settingsStorageStatus === "loading" ||
      !userData?.name ||
      entries.length === 0 ||
      localStorage.getItem(SUPPORT_PROMPT_DISMISSED_KEY) === "true"
    ) {
      return;
    }

    const now = Date.now();
    const firstEligibleRaw = localStorage.getItem(SUPPORT_PROMPT_FIRST_ELIGIBLE_KEY);
    const firstEligible = firstEligibleRaw ? Number(firstEligibleRaw) : 0;

    if (!firstEligible || Number.isNaN(firstEligible)) {
      localStorage.setItem(SUPPORT_PROMPT_FIRST_ELIGIBLE_KEY, String(now));
      return;
    }

    if (now - firstEligible < SUPPORT_PROMPT_MIN_AGE_MS) return;

    const timer = window.setTimeout(() => setShowSupportPrompt(true), 0);
    return () => window.clearTimeout(timer);
  }, [entries.length, settingsStorageStatus, showOnboarding, showSettingsUxMigration, showWhatsNew, userData?.name]);

  const dismissSupportPrompt = useCallback(() => {
    localStorage.setItem(SUPPORT_PROMPT_DISMISSED_KEY, "true");
    setShowSupportPrompt(false);
  }, []);

  // Update-Verfügbar — nur für Sideload-Installs, prüft GitHub Releases
  // einmal pro Tag. Play Store / Amazon / Huawei sehen das nie.
  const updateInfo = useUpdateAvailable();
  useMaterialYouPalette({ enabled: materialYouEnabled, settingsStorageStatus });

  const settingsRouteProps = {
    theme,
    setTheme,
    materialYouEnabled,
    setMaterialYouEnabled,
    autoBackup,
    setAutoBackup,
    onTriggerManualBackup: triggerManualBackup,
    onExport: exportData,
    onImport: () => fileInputRef.current?.click(),
    onApplyBackup: applyBackupAndRefresh,
    onDeleteAll: handleRequestDeleteAll,
    onCheckUpdate: handleManualUpdateCheck,
    importEntries,
    importWorkCodes: loadWorkCodes,
    setUserData,
    nextcloudEnabled,
    nextcloudUrl,
    nextcloudUser,
    nextcloudPass,
    setNextcloudEnabled,
    setNextcloudUrl,
    setNextcloudUser,
    setNextcloudPass,
    pdfArchiveLastRun,
    pdfArchiveLastError,
    pdfArchivePerformRun,
    setLocale,
    setCalculationConfig,
    resetCalculationConfigToLocale,
    workCodes,
    workCodesLoading,
    hasAnyWorkCodes: hasAnyCodes,
    addWorkCode: addCode,
    updateWorkCode,
    deleteWorkCode,
    loadWorkCodePreset,
    availableWorkCodePresets,
    clearAllWorkCodes,
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen w-screen font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 overflow-x-hidden relative">
      <Toaster position="bottom-center" containerStyle={{ bottom: 40 }} toastOptions={{ style: { background: '#27272a', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }, success: { iconTheme: { primary: '#10b981', secondary: '#fff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } } }} />

      {showOnboarding && (
        <Suspense fallback={<SkeletonScreen label={t("skeleton.onboarding")} />}>
          <OnboardingWizard
            onComplete={handleOnboardingFinishWithTour}
            setUserData={setUserData}
            importEntries={importEntries}
            importWorkCodes={loadWorkCodes}
            setCloudSyncEnabled={setAutoBackup}
            setLocalBackupEnabled={() => {}}
            setTheme={setTheme}
            setLocale={setLocale}
            setCalculationConfig={setCalculationConfig}
          />
        </Suspense>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={handleCloseDeleteModal}
        onConfirm={() => executeDelete(deleteTarget)}
        title={deleteTarget?.type === 'all' ? t("app.deleteAllTitle") : t("app.deleteEntryTitle")}
        message={deleteTarget?.type === 'all' ? t("app.deleteAllMessage") : t("app.deleteEntryMessage")}
      />

      {/* Locale-Migration für bestehende User: Nur zeigen, wenn noch keine
          Locale gewählt ist UND bestehende Einträge existieren UND das
          Onboarding NICHT aktiv ist (neue User setzen die Locale dort). */}
      {!showOnboarding && localeId === null && entries.length > 0 && (
        <Suspense fallback={null}>
          <LocaleMigrationModal
            isOpen={true}
            onChoose={(id) => setLocale(id)}
          />
        </Suspense>
      )}

      {showSettingsUxMigration && (
        <Suspense fallback={null}>
          <SettingsUxMigrationModal
            isOpen={true}
            onClose={() => {
              localStorage.setItem(SETTINGS_UX_MIGRATION_SEEN_KEY, "true");
              setSettingsUxMigrationSeen(true);
            }}
            onReviewMode={() => {
              localStorage.setItem(SETTINGS_UX_MIGRATION_SEEN_KEY, "true");
              setSettingsUxMigrationSeen(true);
              setView("settings");
            }}
          />
        </Suspense>
      )}

      {showWhatsNew && (
        <Suspense fallback={null}>
          <ChangelogModal
            isOpen={true}
            onClose={whatsNew.markSeen}
          />
        </Suspense>
      )}

      {showSupportPrompt && !showOnboarding && !showSettingsUxMigration && !showWhatsNew && (
        <Suspense fallback={null}>
          <SupportPromptModal
            isOpen={true}
            onClose={dismissSupportPrompt}
          />
        </Suspense>
      )}

      {showExportModal && (
        <Suspense fallback={null}>
          <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            onSelectFolder={handleExportToFolder}
            onSelectShare={handleExportShare}
          />
        </Suspense>
      )}

      {!!attachmentEntry && (
        <Suspense fallback={null}>
          <AttachmentManager
            isOpen={!!attachmentEntry}
            onClose={handleCloseAttachmentModal}
            entry={attachmentEntry}
            attachments={getAttachmentsForEntry(attachmentEntry.id)}
            addAttachment={addAttachment}
            removeAttachment={removeAttachment}
            getLabelSuggestions={getLabelSuggestions}
            formatFileSize={formatFileSize}
          />
        </Suspense>
      )}

      <input type="file" className="hidden" ref={fileInputRef} accept="application/json" onChange={handleImport as unknown as React.ChangeEventHandler<HTMLInputElement>} />

      {!showOnboarding && (
        <AppHeader
          view={view}
          editingEntry={form.editingEntry}
          getHeaderTitle={getHeaderTitle}
          onNavigateBack={() => { setView("dashboard"); form.setEditingEntry(null); }}
          onOpenSettings={() => setView("settings")}
          onOpenReport={() => setView("report")}
        />
      )}

      {!showOnboarding && view === "dashboard" && updateInfo.available && (
        <Suspense fallback={null}>
          <UpdateAvailableBanner
            show={updateInfo.available}
            version={updateInfo.latestTag}
            htmlUrl={updateInfo.htmlUrl}
            onDismiss={updateInfo.dismiss}
          />
        </Suspense>
      )}

      <ViewRouter
        view={view}
        showOnboarding={showOnboarding}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        changeMonth={changeMonth}
        stats={stats}
        overtime={overtime}
        progressPercent={progressPercent}
        groupedByWeek={groupedByWeek}
        viewMonth={viewMonth}
        viewYear={viewYear}
        onEditEntry={startEdit}
        onDeleteEntry={handleRequestDeleteEntry}
        onManageAttachments={setAttachmentEntry}
        attachmentCountByEntryId={attachmentCountByEntryId}
        userData={userData}
        workCodes={workCodes}
        hasAnyCodes={hasAnyCodes}
        addCode={addCode}
        form={form}
        handleSaveEntry={handleSaveEntry}
        setView={setView}
        lastWorkEntry={lastWorkEntry}
        uniqueProjects={uniqueProjects}
        entries={entries}
        settings={settingsRouteProps}
        entriesWithHolidays={entriesWithHolidays}
        attachments={attachments}
        readAttachmentFile={readAttachmentFile}
        timerState={timerState}
        startNewEntry={startNewEntry}
        handleStartLive={handleStartLive}
        handleStopLive={handleStopLive}
        pauseTimer={pauseTimer}
        resumeTimer={resumeTimer}
        todayTarget={todayTarget}
        showTour={showTour}
        handleTourClose={handleTourClose}
        locale={locale}
        calculationConfig={calculationConfig}
      />
    </div>
  );
}
