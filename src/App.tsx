import React, { useRef, useCallback, useMemo, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import type { Entry, BackupPayload } from "./types";
import { getLocale } from "./locales";

import { STORAGE_KEYS, WORK_CODE } from "./hooks/constants";
import { useWorkCodes } from "./hooks/useWorkCodes";
import { useEntries } from "./hooks/useEntries";
import { useSettings } from "./hooks/useSettings";
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

import AppHeader from "./components/AppHeader";
import ViewRouter from "./components/ViewRouter";
import ConfirmModal from "./components/ConfirmModal";
import SkeletonScreen from "./components/SkeletonScreen";

const OnboardingWizard = React.lazy(() => import("./components/OnboardingWizard"));
const ExportModal = React.lazy(() => import("./components/ExportModal"));
const AttachmentManager = React.lazy(() => import("./components/AttachmentManager"));
const LocaleMigrationModal = React.lazy(() => import("./components/LocaleMigrationModal"));

// MIGRATION — run once on module import
import { migrateStorageKeys } from "./utils/migration";
migrateStorageKeys();

export default function App() {
  // --- DATA HOOKS ---
  const { entries, addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries } = useEntries();
  const {
    userData, setUserData,
    theme, setTheme,
    locale: localeId, setLocale,
    autoBackup, setAutoBackup,
    nextcloudEnabled, nextcloudUrl, nextcloudUser, nextcloudPass,
    setNextcloudEnabled, setNextcloudUrl, setNextcloudUser, setNextcloudPass,
  } = useSettings();
  // Locale-Objekt aus gespeicherter LocaleId auflösen (Fallback: AT)
  const locale = useMemo(() => getLocale(localeId), [localeId]);
  const { workCodes, hasAnyCodes, loadWorkCodes } = useWorkCodes();
  const getDefaultCode = useLastCode({ hasAnyCodes, workCodes });
  const form = useFormState({ getDefaultCode });
  const { timerState, autoCheckoutData, clearAutoCheckout, startTimer, pauseTimer, resumeTimer, stopTimer } = useLiveTimer();

  const { triggerManualBackup } = useAutoBackup(entries, userData, autoBackup);
  const { lastRun: pdfArchiveLastRun, lastError: pdfArchiveLastError, performRun: pdfArchivePerformRun } =
    useAutoPdfArchive(entries, userData, workCodes);

  const {
    attachments, addAttachment, removeAttachment, removeAttachmentsForEntry,
    getAttachmentsForEntry, getLabelSuggestions, readAttachmentFile, formatFileSize,
  } = useAttachments();

  const exportPayloadRef = useRef<BackupPayload | null>(null);
  const { showExportModal, setShowExportModal, exportData, handleExportToFolder, handleExportShare } = useExport({
    entries, userData, workCodes, attachments, exportPayloadRef,
  });
  const { handleImport } = useImport({
    importEntries, setUserData, importWorkCodes: loadWorkCodes,
  });

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
  } = useAppState({ userData });

  // --- DERIVED DATA ---
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();
  const {
    entriesWithHolidays, groupedByWeek, stats,
    overtime, progressPercent, todayTarget,
    lastWorkEntry, uniqueProjects,
  } = useAppData({ entries, userData, viewMonth, viewYear, allEntries: entries, locale });

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
  });

  // --- EFFECTS ---
  useAutoCheckoutHandler({ autoCheckoutData, form, setView, clearAutoCheckout, getDefaultCode });
  useBackButtonHandler({ view, setView, form });

  const handleOnboardingFinishWithTour = useCallback(() => {
    handleOnboardingFinish();
    handleTourStart();
  }, [handleOnboardingFinish, handleTourStart]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- RENDER ---
  return (
    <div className="min-h-screen w-screen font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 overflow-x-hidden relative">
      <Toaster position="bottom-center" containerStyle={{ bottom: 40 }} toastOptions={{ style: { background: '#27272a', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }, success: { iconTheme: { primary: '#10b981', secondary: '#fff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } } }} />

      {showOnboarding && (
        <Suspense fallback={<SkeletonScreen label="Einrichtung wird geladen..." />}>
          <OnboardingWizard
            onComplete={handleOnboardingFinishWithTour}
            setUserData={setUserData}
            importEntries={importEntries}
            importWorkCodes={loadWorkCodes}
            setCloudSyncEnabled={setAutoBackup}
            setLocalBackupEnabled={() => {}}
            setTheme={setTheme}
          />
        </Suspense>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={handleCloseDeleteModal}
        onConfirm={() => executeDelete(deleteTarget)}
        title={deleteTarget?.type === 'all' ? "Alles löschen?" : "Eintrag löschen?"}
        message={deleteTarget?.type === 'all' ? "Möchtest du wirklich alle Einträge unwiderruflich löschen? Auch dein Profil wird zurückgesetzt." : "Möchtest du diesen Eintrag wirklich entfernen?"}
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
        getAttachmentsForEntry={getAttachmentsForEntry}
        userData={userData}
        workCodes={workCodes}
        form={form}
        handleSaveEntry={handleSaveEntry}
        setView={setView}
        lastWorkEntry={lastWorkEntry}
        uniqueProjects={uniqueProjects}
        entries={entries}
        theme={theme}
        setTheme={setTheme}
        autoBackup={autoBackup}
        setAutoBackup={setAutoBackup}
        onTriggerManualBackup={triggerManualBackup}
        onExport={exportData}
        onImport={() => fileInputRef.current?.click()}
        onDeleteAll={handleRequestDeleteAll}
        onCheckUpdate={handleManualUpdateCheck}
        importEntries={importEntries}
        loadWorkCodes={loadWorkCodes}
        setUserData={setUserData}
        nextcloudEnabled={nextcloudEnabled}
        nextcloudUrl={nextcloudUrl}
        nextcloudUser={nextcloudUser}
        nextcloudPass={nextcloudPass}
        setNextcloudEnabled={setNextcloudEnabled}
        setNextcloudUrl={setNextcloudUrl}
        setNextcloudUser={setNextcloudUser}
        setNextcloudPass={setNextcloudPass}
        pdfArchiveLastRun={pdfArchiveLastRun}
        pdfArchiveLastError={pdfArchiveLastError}
        pdfArchivePerformRun={pdfArchivePerformRun}
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
        setLocale={setLocale}
      />
    </div>
  );
}
