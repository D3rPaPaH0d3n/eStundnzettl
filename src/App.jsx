import React, { useState, useEffect, useRef, Suspense } from "react";
import { ArrowLeft, Settings as SettingsIcon, FileBarChart } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { SplashScreen } from '@capacitor/splash-screen';

import AppLogo from "./assets/logo.png";
import { toLocalDateString } from "./utils";

import { WORK_MODELS, STORAGE_KEYS, WORK_CODE } from "./hooks/constants";
import { useWorkCodes } from "./hooks/useWorkCodes";

// COMPONENTS
import Dashboard from "./components/Dashboard";
import ConfirmModal from "./components/ConfirmModal";
import LiveTimerOverlay from "./components/LiveTimerOverlay";

// CUSTOM HOOKS
import { useEntries } from "./hooks/useEntries";
import { useSettings } from "./hooks/useSettings";
import { useAutoBackup } from "./hooks/useAutoBackup";
import { useLiveTimer } from "./hooks/useLiveTimer";
import { useExport } from "./hooks/useExport";
import { useFormState } from "./hooks/useFormState";
import { useAppData } from "./hooks/useAppData";
import { useAppActions } from "./hooks/useAppActions";
import { useAttachments } from "./hooks/useAttachments";

// MIGRATION
import { migrateStorageKeys } from "./utils/migration";

// DB (Welle 4: LAST_CODE aus SQLite nachladen)
import { isSQLiteActive } from "./db/storageMode";
import { getSetting } from "./db/repositories/settingsRepo";

// LAZY LOADING
const PrintReport = React.lazy(() => import("./components/PrintReport"));
const Settings = React.lazy(() => import("./components/Settings"));
const AttachmentManager = React.lazy(() => import("./components/AttachmentManager"));
const EntryForm = React.lazy(() => import("./components/EntryForm"));
const OnboardingWizard = React.lazy(() => import("./components/OnboardingWizard"));
const ExportModal = React.lazy(() => import("./components/ExportModal"));

// ANIMATION CONFIG
const pageVariants = { initial: { opacity: 0, x: 20 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -20 } };
const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 };
const reportVariants = { initial: { y: "100%", opacity: 0 }, in: { y: 0, opacity: 1 }, out: { y: "100%", opacity: 0 } };

// Run once on module import
migrateStorageKeys();

export default function App() {

  // --- 1. DATEN & LOGIK ÜBER HOOKS ---
  const { entries, addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries } = useEntries();
  const { 
    userData, 
    setUserData, 
    theme, 
    setTheme, 
    autoBackup, 
    setAutoBackup,
    nextcloudEnabled,
    nextcloudUrl,
    nextcloudUser,
    nextcloudPass,
    setNextcloudEnabled,
    setNextcloudUrl,
    setNextcloudUser,
    setNextcloudPass
  } = useSettings();

  // Work Codes Hook
  const { workCodes, hasAnyCodes, loadWorkCodes } = useWorkCodes();

  // Cached LAST_CODE (sync aus localStorage für Sofort-Zugriff, SQLite nachladen)
  const lastCodeRef = useRef(localStorage.getItem(STORAGE_KEYS.LAST_CODE));

  useEffect(() => {
    // Einmalig: LAST_CODE aus SQLite nachladen (wenn verfügbar)
    let cancelled = false;
    if (isSQLiteActive()) {
      (async () => {
        try {
          const sqlVal = await getSetting("last_code");
          if (!cancelled && sqlVal !== null) {
            lastCodeRef.current = String(sqlVal);
          }
        } catch { /* keep localStorage value */ }
      })();
    }
    return () => { cancelled = true; };
  }, []);

  // Default Code: erster aus User-Codes oder Fallback 1
  const getDefaultCode = () => {
    const lastCode = lastCodeRef.current || localStorage.getItem(STORAGE_KEYS.LAST_CODE);
    if (lastCode) return Number(lastCode);
    if (hasAnyCodes) return workCodes[0].id;
    return WORK_CODE.DEFAULT;
  };

  // --- FORM STATE (useFormState hook) ---
  const form = useFormState({ getDefaultCode });

  // --- LIVE TIMER HOOK (inkl. Auto-Checkout Logik) ---
  const { timerState, autoCheckoutData, clearAutoCheckout, startTimer, pauseTimer, resumeTimer, stopTimer } = useLiveTimer();

  // --- AUTO BACKUP ---
  useAutoBackup(entries, userData, autoBackup);

  // --- ATTACHMENTS ---
  const {
    attachments,
    addAttachment,
    removeAttachment,
    removeAttachmentsForEntry,
    getAttachmentsForEntry,
    getAttachmentsForEntries,
    getLabelSuggestions,
    readAttachmentFile,
    formatFileSize,
  } = useAttachments();

  // --- EXPORT / IMPORT ---
  const exportPayloadRef = useRef(null);
  const { showExportModal, setShowExportModal, exportData, handleExportToFolder, handleExportShare, handleImport } = useExport({
    entries,
    userData,
    workCodes,
    attachments,
    importEntries,
    setUserData,
    importWorkCodes: loadWorkCodes,
    exportPayloadRef,
  });

  // --- 2. UI STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("dashboard");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [attachmentEntry, setAttachmentEntry] = useState(null);

  const fileInputRef = useRef(null);

  // --- 3. ABGELEITETE DATEN (useAppData) ---
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const {
    entriesWithHolidays,
    groupedByWeek,
    stats,
    overtime,
    progressPercent,
    todayTarget,
    lastWorkEntry,
    uniqueProjects,
  } = useAppData({ entries, userData, viewMonth, viewYear });

  // --- 4. HANDLERS (useAppActions) ---
  const {
    handleStartLive,
    handleStopLive,
    changeMonth,
    startNewEntry,
    startEdit,
    handleSaveEntry,
    executeDelete,
    handleOnboardingFinish,
    handleManualUpdateCheck,
  } = useAppActions({
    form,
    entries,
    userData,
    workCodes,
    removeAttachmentsForEntry,
    getDefaultCode,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteAllEntries,
    importEntries,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    setUserData,
    setAutoBackup,
    setView,
    setCurrentDate,
    setDeleteTarget,
    setShowOnboarding,
  });

  // --- 5. EFFECTS ---

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  // --- ONBOARDING CHECK (INKL. MIGRATION) ---
  useEffect(() => {
    const isNewUser = userData && !userData.name;
    const isLegacyUser = userData && userData.name && !userData.workDays;

    if (isNewUser || isLegacyUser) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [userData]);

  // --- AUTO-CHECKOUT LISTENER ---
  useEffect(() => {
    if (autoCheckoutData) {
      Haptics.impact({ style: ImpactStyle.Heavy });

      const yyyy = autoCheckoutData.start.getFullYear();
      const mm = String(autoCheckoutData.start.getMonth() + 1).padStart(2, '0');
      const dd = String(autoCheckoutData.start.getDate()).padStart(2, '0');
      form.setFormDate(`${yyyy}-${mm}-${dd}`);

      form.setEntryType("work");

      const toLocalHHMM = (dateObj) => {
        const h = String(dateObj.getHours()).padStart(2, '0');
        const m = String(dateObj.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      };

      form.setStartTime(toLocalHHMM(autoCheckoutData.start));
      form.setEndTime(toLocalHHMM(autoCheckoutData.end));
      form.setPauseDuration(autoCheckoutData.pause);

      form.setProject("");
      form.setCode(getDefaultCode());

      form.setEditingEntry(null);
      form.setIsLiveEntry(true);
      setView("add");

      toast("⚠️ Automatisch ausgestempelt! Bitte prüfen.", {
        duration: 6000,
        icon: "🌙"
      });

      clearAutoCheckout();
    }
  }, [autoCheckoutData]);

  // --- NAVIGATION ---
  const getHeaderTitle = () => {
    switch (view) {
      case "settings": return "Einstellungen";
      case "add": return form.editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag";
      case "report": return "Bericht";
      default: return "eStundnzettl";
    }
  };

  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", () => {
      if (view !== "dashboard") { setView("dashboard"); form.setEditingEntry(null); }
      else CapacitorApp.exitApp();
    });
    return () => handler.remove();
  }, [view]);

  // --- RENDER ---
  return (
    <div className="min-h-screen w-screen font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 overflow-x-hidden relative">
      <Toaster position="bottom-center" containerStyle={{ bottom: 40 }} toastOptions={{ style: { background: '#27272a', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }, success: { iconTheme: { primary: '#10b981', secondary: '#fff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } } }} />

      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingWizard
            onComplete={handleOnboardingFinish}
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
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => executeDelete(deleteTarget)}
        title={deleteTarget?.type === 'all' ? "Alles löschen?" : "Eintrag löschen?"}
        message={deleteTarget?.type === 'all' ? "Möchtest du wirklich alle Einträge unwiderruflich löschen? Auch dein Profil wird zurückgesetzt." : "Möchtest du diesen Eintrag wirklich entfernen?"}
      />

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
            onClose={() => setAttachmentEntry(null)}
            entry={attachmentEntry}
            attachments={getAttachmentsForEntry(attachmentEntry.id)}
            addAttachment={addAttachment}
            removeAttachment={removeAttachment}
            getLabelSuggestions={getLabelSuggestions}
            formatFileSize={formatFileSize}
          />
        </Suspense>
      )}

      <input type="file" className="hidden" ref={fileInputRef} accept="application/json" onChange={handleImport} />

      {!showOnboarding && (
        <header className="fixed top-0 left-0 right-0 bg-zinc-900 text-white p-4 pb-6 shadow-xl z-50 w-full transition-all" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {view !== "dashboard" && view !== "report" ? (
                <button onClick={() => { setView("dashboard"); form.setEditingEntry(null); }} className="p-2 hover:bg-zinc-700 rounded-full transition-colors"><ArrowLeft size={24} /></button>
              ) : (
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-800 shadow-inner"><img src={AppLogo} alt="Logo" className="w-full h-full object-contain" /></div>
              )}
              <div>
                <h1 className="font-bold text-xl leading-tight tracking-tight">{getHeaderTitle()}</h1>
                {view === "dashboard" && <p className="text-xs text-zinc-400 font-medium mt-0.5">Mobile Zeiterfassung</p>}
              </div>
            </div>
            {view === "dashboard" && (
              <div className="flex gap-2">
                <button onClick={() => setView("settings")} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors active:scale-95"><SettingsIcon size={20} className="text-zinc-300" /></button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setView("report")} className="bg-emerald-600 hover:bg-emerald-700 p-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/20"><FileBarChart size={20} className="text-white" /></motion.button>
              </div>
            )}
          </div>
        </header>
      )}

      <div className={`pt-38 pb-24 px-1 w-full max-w-3xl mx-auto ${showOnboarding ? 'pt-0' : ''}`}>
        <AnimatePresence mode="wait">
          {view === "dashboard" && !showOnboarding && (
            <motion.div key="dashboard" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Dashboard
                currentDate={currentDate}
                onSetCurrentDate={setCurrentDate}
                changeMonth={changeMonth}
                stats={stats}
                overtime={overtime}
                progressPercent={progressPercent}
                groupedByWeek={groupedByWeek}
                viewMonth={viewMonth}
                viewYear={viewYear}
                onStartNewEntry={startNewEntry}
                onEditEntry={startEdit}
                onDeleteEntry={(id) => setDeleteTarget({ type: 'single', id })}
                onManageAttachments={setAttachmentEntry}
                getAttachmentsForEntry={getAttachmentsForEntry}
                userData={userData}
                workCodes={workCodes}
              />
            </motion.div>
          )}

          {view === "add" && !showOnboarding && (
            <motion.div key="add" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Suspense fallback={null}>
                <EntryForm
                  onCancel={() => { setView("dashboard"); form.setEditingEntry(null); }}
                  onSubmit={handleSaveEntry}
                  entryType={form.entryType}
                  setEntryType={form.setEntryType}
                  code={form.code}
                  setCode={form.setCode}
                  pauseDuration={form.pauseDuration}
                  setPauseDuration={form.setPauseDuration}
                  formDate={form.formDate}
                  setFormDate={form.setFormDate}
                  startTime={form.startTime}
                  setStartTime={form.setStartTime}
                  endTime={form.endTime}
                  setEndTime={form.setEndTime}
                  project={form.project}
                  setProject={form.setProject}
                  lastWorkEntry={lastWorkEntry}
                  existingProjects={uniqueProjects}
                  allEntries={entries}
                  isEditing={!!form.editingEntry}
                  isLiveEntry={form.isLiveEntry}
                  userData={userData}
                />
              </Suspense>
            </motion.div>
          )}

          {view === "settings" && !showOnboarding && (
            <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Suspense fallback={null}>
                <Settings
                  userData={userData}
                  setUserData={setUserData}
                  theme={theme}
                  setTheme={setTheme}
                  autoBackup={autoBackup}
                  setAutoBackup={setAutoBackup}
                  onExport={exportData}
                  onImport={() => fileInputRef.current?.click()}
                  onDeleteAll={() => setDeleteTarget({ type: 'all' })}
                  onCheckUpdate={handleManualUpdateCheck}
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
              </Suspense>
            </motion.div>
          )}

          {view === "report" && !showOnboarding && (
            <motion.div key="report" initial="initial" animate="in" exit="out" variants={reportVariants} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[200] w-full h-full">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full bg-zinc-900/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-xl flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                    <span className="font-bold text-zinc-700 dark:text-white">Lade PDF-Modul...</span>
                  </div>
                </div>
              }>
                <PrintReport
                  entries={entriesWithHolidays}
                  monthDate={currentDate}
                  employeeName={userData?.name || ""}
                  userPhoto={userData?.photo || null}
                  onClose={() => setView("dashboard")}
                onMonthChange={setCurrentDate}
                userData={userData}
                workCodes={workCodes}
                attachments={attachments}
                readAttachmentFile={readAttachmentFile}
              />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!showOnboarding && (
        <>
          {view === "dashboard" && (
            <LiveTimerOverlay
              timerState={timerState}
              onCreateEntry={() => {
                startNewEntry();
                Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
              }}
              onStart={handleStartLive}
              onStop={handleStopLive}
              onPause={() => { Haptics.impact({ style: ImpactStyle.Light }); pauseTimer(); }}
              onResume={() => { Haptics.impact({ style: ImpactStyle.Light }); resumeTimer(); }}
              targetMinutes={todayTarget}
            />
          )}
        </>
      )}

    </div>
  );
}
