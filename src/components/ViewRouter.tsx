import React, { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useTranslation } from "react-i18next";
import type { Entry, UserData, WorkCode, Attachment, FormState, CalculationConfig, Theme, PdfArchiveRunOptions } from "../types";
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

interface SettingsRouteProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  onTriggerManualBackup: () => Promise<void> | void;
  onExport: () => void;
  onImport: () => void;
  onDeleteAll: () => void;
  onCheckUpdate: () => void;
  importEntries: (entries: Entry[]) => void;
  importWorkCodes: (codes: WorkCode[]) => void;
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
  nextcloudEnabled: boolean;
  nextcloudUrl: string;
  nextcloudUser: string;
  nextcloudPass: string;
  setNextcloudEnabled: (enabled: boolean) => void;
  setNextcloudUrl: (url: string) => void;
  setNextcloudUser: (user: string) => void;
  setNextcloudPass: (pass: string) => void;
  pdfArchiveLastRun: string | null;
  pdfArchiveLastError: string | null;
  pdfArchivePerformRun: (opts?: PdfArchiveRunOptions) => Promise<{ ok: boolean; message?: string }>;
  setLocale: (id: LocaleId) => void;
  setCalculationConfig: (next: CalculationConfig | ((prev: CalculationConfig) => CalculationConfig)) => void;
  resetCalculationConfigToLocale: (newLocale: Locale, workDays: number[]) => void;
  // Work codes (forwarded to <Settings>)
  workCodes: WorkCode[];
  workCodesLoading: boolean;
  hasAnyWorkCodes: boolean;
  addWorkCode: (label: string) => boolean;
  updateWorkCode: (id: number, label: string) => boolean;
  deleteWorkCode: (id: number) => void;
  loadWorkCodePreset: (presetId: string) => boolean;
  availableWorkCodePresets: Array<{ id: string; name: string; description: string; codes: WorkCode[] }>;
  clearAllWorkCodes: () => void;
}

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
  attachmentCountByEntryId?: Map<Entry["id"], number>;
  userData: UserData;
  workCodes: WorkCode[];
  hasAnyCodes: boolean;
  addCode: (label: string) => boolean;
  // EntryForm props
  form: FormState;
  handleSaveEntry: (e: React.FormEvent) => Promise<void>;
  setView: (view: string) => void;
  lastWorkEntry: Entry | null;
  uniqueProjects: string[];
  entries: Entry[];
  settings: SettingsRouteProps;
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
  // Calculation Config
  calculationConfig: CalculationConfig;
}

const AppTour = React.lazy(() => import("./AppTour"));

export default function ViewRouter(props: ViewRouterProps) {
  const { t } = useTranslation();
  const {
    view, showOnboarding,
    currentDate, setCurrentDate, changeMonth,
    stats, overtime, progressPercent, groupedByWeek,
    viewMonth, viewYear,
    onEditEntry, onDeleteEntry, onManageAttachments, attachmentCountByEntryId,
    userData, workCodes, hasAnyCodes, addCode,
    form, handleSaveEntry, setView,
    lastWorkEntry, uniqueProjects, entries,
    settings,
    entriesWithHolidays, attachments, readAttachmentFile,
    timerState, startNewEntry, handleStartLive, handleStopLive, pauseTimer, resumeTimer, todayTarget,
    showTour, handleTourClose,
    locale,
    calculationConfig,
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
                attachmentCountByEntryId={attachmentCountByEntryId}
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
                  workCodes={workCodes}
                  hasAnyCodes={hasAnyCodes}
                  addCode={addCode}
                />
              </Suspense>
            </motion.div>
          )}

          {view === "settings" && !showOnboarding && (
            <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Suspense fallback={<SkeletonScreen label={t("skeleton.settings")} />}>
                <Settings
                  userData={userData}
                  {...settings}
                  locale={locale}
                  calculationConfig={calculationConfig}
                />
              </Suspense>
            </motion.div>
          )}

          {view === "report" && !showOnboarding && (
            <motion.div key="report" initial="initial" animate="in" exit="out" variants={reportVariants} transition={reportTransition} className="fixed inset-0 z-[200] w-full h-full">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full bg-zinc-900/55">
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
                  readAttachmentFile={readAttachmentFile}
                  locale={locale}
                  calculationConfig={calculationConfig}
                  setCalculationConfig={settings.setCalculationConfig}
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
          onPause={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); pauseTimer(); }}
          onResume={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); resumeTimer(); }}
          targetMinutes={todayTarget}
        />
      )}
    </>
  );
}
