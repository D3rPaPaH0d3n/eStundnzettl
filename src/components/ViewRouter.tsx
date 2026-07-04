import React, { Suspense } from "react";
import type { SyntheticEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useTranslation } from "react-i18next";
import type { Entry, UserData, WorkCode, Attachment, FormState, CalculationConfig, Theme, PdfArchiveRunOptions, BackupAnalysisData } from "../types";
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

// LAZY LOADING
const PrintReport = React.lazy(() => import("./PrintReport"));
const Settings = React.lazy(() => import("./Settings"));
const EntryForm = React.lazy(() => import("./EntryForm"));

import type { TimerState } from "../types";

interface SettingsRouteProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  materialYouEnabled: boolean;
  setMaterialYouEnabled: (enabled: boolean) => void;
  autoBackup: boolean;
  setAutoBackup: (enabled: boolean) => void;
  onTriggerManualBackup: () => Promise<void> | void;
  onExport: () => void;
  onImport: () => void;
  onApplyBackup: (analysis: BackupAnalysisData, mode?: "ALL" | "ENTRIES_ONLY") => Promise<boolean>;
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
  handleSaveEntry: (e: SyntheticEvent) => Promise<void>;
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

function RouteLoadingFallback({ label, hint, fullscreen = false }: { label: string; hint: string; fullscreen?: boolean }) {
  const body = (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex min-h-[55vh] w-full items-center justify-center px-4"
    >
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-xl shadow-zinc-900/5 backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-900/90">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl border-2 border-zinc-200 border-t-emerald-500 animate-spin dark:border-zinc-700 dark:border-t-emerald-400" />
          <div>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{label}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
          </div>
        </div>
        <div className="space-y-3 animate-pulse" aria-hidden="true">
          <div className="h-5 w-2/3 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-20 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </motion.div>
  );

  if (!fullscreen) return body;

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
      {body}
    </div>
  );
}

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
              <Suspense fallback={<RouteLoadingFallback label={t("skeleton.entryForm")} hint={t("skeleton.preparing")} />}>
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
              <Suspense fallback={<RouteLoadingFallback label={t("skeleton.settings")} hint={t("skeleton.preparing")} />}>
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
              <Suspense fallback={<RouteLoadingFallback label={t("skeleton.pdfModule")} hint={t("skeleton.preparingPdf")} fullscreen />}>
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
