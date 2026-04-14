import React, { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useTranslation } from "react-i18next";
import type { Entry, UserData, WorkCode, Attachment, FormState, BackupPayload, CalculationConfig } from "../types";
import type { PeriodStatsResult } from "../utils/timeCalculations";
import type { Locale, LocaleId } from "../locales/types";
import {
  pageVariants,
  pageTransition,
  reportVariants,
  reportTransition,
} from "../utils/motionPresets";

import Dashboard from "./Dashboard";
import LiveTimerOverlay from "./LiveTimerOverlay";
import SkeletonScreen from "./SkeletonScreen";

// LAZY LOADING
const PrintReport = React.lazy(() => import("./PrintReport"));
const Settings = React.lazy(() => import("./Settings"));
const EntryForm = React.lazy(() => import("./EntryForm"));

import type { TimerState } from "../types";

interface ViewRouterProps {
  view: string;
  showOnboarding: boolean;
  // Dashboard props
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  changeMonth: (delta: number) => void;
  stats: PeriodStatsResult;
  overtime: number;
  progressPercent: number;
  groupedByWeek: [number, Entry[]][];
  viewMonth: number;
  viewYear: number;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: number | string) => void;
  onManageAttachments: (entry: Entry) => void;
  getAttachmentsForEntry: (entryId: number | string) => Attachment[];
  userData: UserData;
  workCodes: WorkCode[];
  // EntryForm props
  form: FormState;
  handleSaveEntry: () => void;
  setView: (view: string) => void;
  lastWorkEntry: Entry | null;
  uniqueProjects: string[];
  entries: Entry[];
  // Settings props
  theme: string;
  setTheme: (t: string) => void;
  autoBackup: boolean;
  setAutoBackup: (b: boolean) => void;
  onTriggerManualBackup: () => Promise<void> | void;
  onExport: () => void;
  onImport: () => void;
  onDeleteAll: () => void;
  onCheckUpdate: () => void;
  importEntries: (entries: Entry[]) => void;
  loadWorkCodes: () => void;
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
  nextcloudEnabled: boolean;
  nextcloudUrl: string;
  nextcloudUser: string;
  nextcloudPass: string;
  setNextcloudEnabled: (b: boolean) => void;
  setNextcloudUrl: (s: string) => void;
  setNextcloudUser: (s: string) => void;
  setNextcloudPass: (s: string) => void;
  pdfArchiveLastRun: string | null;
  pdfArchiveLastError: string | null;
  pdfArchivePerformRun: (opts?: { month?: number; year?: number; force?: boolean }) => Promise<{ ok: boolean; message?: string }>;
  // PrintReport props
  entriesWithHolidays: Entry[];
  attachments: Attachment[];
  readAttachmentFile: (file: Attachment) => Promise<string>;
  // Timer props
  timerState: TimerState;
  startNewEntry: () => void;
  handleStartLive: () => void;
  handleStopLive: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  todayTarget: number;
  // Tour props
  showTour: boolean;
  handleTourClose: () => void;
  // Locale
  locale: Locale;
  setLocale: (id: LocaleId) => void;
  // Calculation Config
  calculationConfig: CalculationConfig;
  setCalculationConfig: (next: CalculationConfig | ((prev: CalculationConfig) => CalculationConfig)) => void;
  resetCalculationConfigToLocale: (newLocale: Locale, workDays: number[]) => void;
}

const AppTour = React.lazy(() => import("./AppTour"));

export default function ViewRouter(props: ViewRouterProps) {
  const { t } = useTranslation();
  const {
    view, showOnboarding,
    currentDate, setCurrentDate, changeMonth,
    stats, overtime, progressPercent, groupedByWeek,
    viewMonth, viewYear,
    onEditEntry, onDeleteEntry, onManageAttachments, getAttachmentsForEntry,
    userData, workCodes,
    form, handleSaveEntry, setView,
    lastWorkEntry, uniqueProjects, entries,
    theme, setTheme, autoBackup, setAutoBackup, onTriggerManualBackup,
    onExport, onImport, onDeleteAll, onCheckUpdate,
    importEntries, loadWorkCodes, setUserData,
    nextcloudEnabled, nextcloudUrl, nextcloudUser, nextcloudPass,
    setNextcloudEnabled, setNextcloudUrl, setNextcloudUser, setNextcloudPass,
    pdfArchiveLastRun, pdfArchiveLastError, pdfArchivePerformRun,
    entriesWithHolidays, attachments, readAttachmentFile,
    timerState, startNewEntry, handleStartLive, handleStopLive, pauseTimer, resumeTimer, todayTarget,
    showTour, handleTourClose,
    locale, setLocale,
    calculationConfig, setCalculationConfig, resetCalculationConfigToLocale,
  } = props;

  return (
    <>
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
                onEditEntry={onEditEntry}
                onDeleteEntry={onDeleteEntry}
                onManageAttachments={onManageAttachments}
                getAttachmentsForEntry={getAttachmentsForEntry}
                userData={userData}
                workCodes={workCodes}
                locale={locale}
                calculationConfig={calculationConfig}
              />
            </motion.div>
          )}

          {view === "add" && !showOnboarding && (
            <motion.div key="add" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Suspense fallback={<SkeletonScreen label={t("skeleton.entryForm")} />}>
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
                  specialManualMode={form.specialManualMode}
                  setSpecialManualMode={form.setSpecialManualMode}
                  locale={locale}
                  calculationConfig={calculationConfig}
                />
              </Suspense>
            </motion.div>
          )}

          {view === "settings" && !showOnboarding && (
            <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Suspense fallback={<SkeletonScreen label={t("skeleton.settings")} />}>
                <Settings
                  userData={userData}
                  setUserData={setUserData}
                  theme={theme}
                  setTheme={setTheme}
                  autoBackup={autoBackup}
                  setAutoBackup={setAutoBackup}
                  onTriggerManualBackup={onTriggerManualBackup}
                  onExport={onExport}
                  onImport={onImport}
                  onDeleteAll={onDeleteAll}
                  onCheckUpdate={onCheckUpdate}
                  importEntries={importEntries}
                  importWorkCodes={loadWorkCodes}
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
                  locale={locale}
                  setLocale={setLocale}
                  calculationConfig={calculationConfig}
                  setCalculationConfig={setCalculationConfig}
                  resetCalculationConfigToLocale={resetCalculationConfigToLocale}
                />
              </Suspense>
            </motion.div>
          )}

          {view === "report" && !showOnboarding && (
            <motion.div key="report" initial="initial" animate="in" exit="out" variants={reportVariants} transition={reportTransition} className="fixed inset-0 z-[200] w-full h-full">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full bg-zinc-900/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-xl flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                    <span className="font-bold text-zinc-700 dark:text-white">{t("skeleton.pdfModule")}</span>
                  </div>
                </div>
              }>
                <PrintReport
                  entries={entriesWithHolidays}
                  allEntries={entries}
                  monthDate={currentDate}
                  employeeName={userData?.name || ""}
                  onClose={() => setView("dashboard")}
                  onMonthChange={setCurrentDate}
                  userData={userData}
                  workCodes={workCodes}
                  attachments={attachments}
                  readAttachmentFile={readAttachmentFile as (file: Attachment) => Promise<string>}
                  locale={locale}
                  calculationConfig={calculationConfig}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showTour && !showOnboarding && (
        <Suspense fallback={null}>
          <AppTour onClose={handleTourClose} />
        </Suspense>
      )}

      {!showOnboarding && view === "dashboard" && (
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
  );
}
