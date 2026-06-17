import React, { useEffect } from "react";
import { ShieldCheck, ChevronRight, Check, Upload, Cloud, Loader, CloudLightning, FolderInput, ArrowLeft, ServerCog, CheckCircle2, FileText, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "./Onboarding/steps/WelcomeStep";
import ProfileStep from "./Onboarding/steps/ProfileStep";
import LocaleStep from "./Onboarding/steps/LocaleStep";
import WorkScheduleStep from "./Onboarding/steps/WorkScheduleStep";
import WorkCodesStep from "./Onboarding/steps/WorkCodesStep";
import CalculationStep from "./Onboarding/steps/CalculationStep";
import SummaryStep from "./Onboarding/steps/SummaryStep";
import { Trans, useTranslation } from "react-i18next";
import { initGoogleAuth } from "../utils/googleDrive";
import { useFeatureAvailability } from "../hooks/useFeatureAvailability";
import ImportConflictModal from "./ImportConflictModal";
import { activateOnEnterOrSpace } from "../utils/keyboardActivation";
import { logger } from "../utils/logger";
import type { LocaleId } from "../locales/types";
import { getLocale } from "../locales";
import {
  getDefaultCalculationConfig,
  getBlankCalculationConfig,
} from "../utils/calculationConfig";
import { useOnboardingNextcloudAuth } from "../hooks/onboarding/useOnboardingNextcloudAuth";
import { useOnboardingFlow } from "../hooks/onboarding/useOnboardingFlow";
import { useOnboardingRestore } from "../hooks/onboarding/useOnboardingRestore";
import type { WizardFormData } from "../hooks/onboarding/useOnboardingFlow";

import type { Entry, UserData, WorkCode, Theme, CalculationConfig } from "../types";

const log = logger.scope("Onboarding");

interface Props {
  onComplete: () => void;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  importEntries: (entries: Entry[]) => void;
  importWorkCodes: (codes: WorkCode[]) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setLocalBackupEnabled: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLocale?: (id: LocaleId) => void;
  /** Setzt die `CalculationConfig` am Ende des Wizards (von App.tsx). */
  setCalculationConfig?: (next: CalculationConfig) => void;
}

export type { WizardFormData };

const OnboardingWizard: React.FC<Props> = ({ onComplete, setUserData, importEntries, importWorkCodes, setCloudSyncEnabled, setLocalBackupEnabled, setTheme, setLocale, setCalculationConfig }) => {
  const { t } = useTranslation();
  const featureAvailability = useFeatureAvailability();
  const gdriveDisabled =
    !featureAvailability.loading &&
    !featureAvailability.probeFailed &&
    featureAvailability.googleServicesAvailable === false;

  const ncAuth = useOnboardingNextcloudAuth(t);

  const flow = useOnboardingFlow(
    t,
    { onComplete, setUserData, importEntries, importWorkCodes, setCloudSyncEnabled, setLocalBackupEnabled, setTheme, setLocale, setCalculationConfig },
    ncAuth.ncCredentials,
  );

  const restore = useOnboardingRestore({
    t,
    formData: flow.formData,
    setFormData: flow.setFormData,
    setStep: flow.setStep,
    setRestoreData: flow.setRestoreData,
    setLoading: flow.setLoading,
  });
  const { fileInputRef, photoInputRef } = restore;

  useEffect(() => {
    initGoogleAuth().catch(() => log.debug("Google Auth Init failed silently/already initialized"));
  }, []);

  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 z-50 flex flex-col items-center justify-center p-4">

      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {flow.step > 0 && (
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-700 w-full">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{
                // Gesamte Schrittzahl hängt davon ab, ob der User einen
                // Eigenen Plan konfiguriert (→ +1 Step für CalculationStep).
                width: flow.step === 7 ? "100%" : (flow.step === 1 && flow.formData.simpleMode) ? "50%" : `${(flow.step / (flow.formData.customCalc ? 7 : 6)) * 100}%`,
              }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <AnimatePresence mode="wait">

            {/* SCHRITT 0 */}
            {flow.step === 0 && (
              <WelcomeStep
                onStartSimple={flow.handleStartSimple}
                onStartNew={flow.handleStartNew}
                onStartRestore={flow.handleStartRestore}
                onDemoMode={flow.handleDemoMode}
              />
            )}

            {/* SCHRITT 1: PROFIL */}
            {flow.step === 1 && (
              <ProfileStep
                formData={flow.formData}
                setFormData={flow.setFormData}
                photoInputRef={photoInputRef}
                onPhotoUpload={flow.handlePhotoUpload}
              />
            )}

            {/* SCHRITT 2: LOCALE / STUNDENBERECHNUNG */}
            {flow.step === 2 && (
              <LocaleStep
                selectedLocaleId={flow.formData.localeId}
                customPlanSelected={flow.formData.customCalc}
                onSelect={(id) =>
                  flow.setFormData((p) => ({
                    ...p,
                    localeId: id,
                    customCalc: false,
                    calcConfig: getDefaultCalculationConfig(getLocale(id), p.workDays),
                  }))
                }
                onSelectCustomPlan={() =>
                  flow.setFormData((p) => ({
                    ...p,
                    // Unter der Haube Neutral-Locale als Basis, damit
                    // Feiertage/Halbtage/MA-Split nicht aus AT/DE kommen.
                    localeId: "neutral",
                    customCalc: true,
                    calcConfig: getBlankCalculationConfig(p.workDays),
                  }))
                }
              />
            )}

            {/* SCHRITT 3: ARBEITSZEIT */}
            {flow.step === 3 && (
              <WorkScheduleStep
                formData={flow.formData}
                onModelSelect={flow.handleModelSelect}
                onCustomDayChange={flow.handleCustomDayChange}
                isSelected={flow.isSelected}
                totalWeeklyMinutes={flow.totalWeeklyMinutes}
                minToHours={flow.minToHours}
                onSimpleModeToggle={flow.handleSimpleModeToggle}
              />
            )}

            {/* SCHRITT 4: RECHENLOGIK-BAUKASTEN (nur bei "Eigener Plan") */}
            {flow.step === 4 && flow.formData.customCalc && (
              <CalculationStep
                config={flow.formData.calcConfig}
                onChange={(next) => flow.setFormData((p) => ({ ...p, calcConfig: next }))}
                workDays={flow.formData.workDays}
              />
            )}

            {/* SCHRITT 5: TÄTIGKEITEN (Work Codes) */}
            {flow.step === 5 && (
              <WorkCodesStep
                selectedPresetId={flow.formData.workCodePresetId}
                onSelect={(id) => flow.setFormData((p) => ({ ...p, workCodePresetId: id }))}
              />
            )}

            {/* SCHRITT 6: BACKUP / DATEN */}
            {flow.step === 6 && (
               <motion.div
               key="step3"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-6"
             >
                <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
                   <ShieldCheck size={32} />
                 </div>
                 <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {flow.isRestoreFlow ? t("onboarding.backup.titleRestore") : t("onboarding.backup.titleSetup")}
                 </h2>
                 <p className="text-zinc-500 dark:text-zinc-400">
                    {flow.isRestoreFlow ? t("onboarding.backup.subtitleRestore") : t("onboarding.backup.subtitleSetup")}
                 </p>
               </div>

               {!flow.isRestoreFlow && (
                 <div className="space-y-2">
                   <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40">
                     <Info size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                     <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
                       <Trans i18nKey="onboarding.backup.optionalHint" components={{ b: <span className="font-bold" /> }} />
                     </p>
                   </div>
                   <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                     <FileText size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                     <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed">
                       <Trans i18nKey="onboarding.backup.bonusHint" components={{ b: <span className="font-bold" /> }} />
                     </p>
                   </div>
                 </div>
               )}

               <div className="space-y-4">

                 {/* FALL A: EINRICHTUNG */}
                 {!flow.isRestoreFlow && (
                   <>
                     {/* 1. CLOUD BACKUP — versteckt wenn Google Play Services fehlen */}
                     {!gdriveDisabled && (
                     <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={flow.formData.autoBackup}
                        onClick={restore.handleAutoBackupToggle}
                        /* c8 ignore next -- keyboard glue delegates to tested helper */
                        onKeyDown={(event) => activateOnEnterOrSpace(event, restore.handleAutoBackupToggle)}
                        className={`w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                          flow.formData.autoBackup
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                        }`}
                      >
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${flow.formData.autoBackup ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                  <CloudLightning size={20}/>
                             </div>
                             <div className="text-left">
                                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.backup.gdrive.title")}</div>
                                <div className="text-xs text-zinc-500">{t("onboarding.backup.gdrive.subtitle")}</div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            flow.formData.autoBackup ? "border-blue-500 bg-blue-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {flow.formData.autoBackup && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>
                      )}

                      {/* 2. LOKALES BACKUP */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={flow.formData.localBackupEnabled}
                        onClick={restore.handleLocalBackupToggle}
                        /* c8 ignore next -- keyboard glue delegates to tested helper */
                        onKeyDown={(event) => activateOnEnterOrSpace(event, restore.handleLocalBackupToggle)}
                        className={`w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                          flow.formData.localBackupEnabled
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                        }`}
                      >
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${flow.formData.localBackupEnabled ? 'bg-green-100 dark:bg-green-900/50 text-green-600' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                  <FolderInput size={20}/>
                             </div>
                             <div className="text-left">
                                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.backup.local.title")}</div>
                                <div className="text-xs text-zinc-500">{t("onboarding.backup.local.subtitle")}</div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            flow.formData.localBackupEnabled ? "border-green-500 bg-green-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {flow.formData.localBackupEnabled && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>

                      {/* 3. NEXTCLOUD BACKUP */}
                      <div
                        role="button"
                        tabIndex={ncAuth.ncSetupConnecting ? -1 : 0}
                        aria-pressed={ncAuth.ncSetupConnected}
                        aria-disabled={ncAuth.ncSetupConnecting}
                        onClick={!ncAuth.ncSetupConnecting ? ncAuth.handleNextcloudSetupToggle : undefined}
                        /* c8 ignore next 3 -- keyboard glue delegates to tested helper */
                        onKeyDown={(event) => {
                          if (!ncAuth.ncSetupConnecting) activateOnEnterOrSpace(event, ncAuth.handleNextcloudSetupToggle);
                        }}
                        className={`w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                          ncAuth.ncSetupConnected
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                        }`}
                      >
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${ncAuth.ncSetupConnected ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                  <ServerCog size={20}/>
                             </div>
                             <div className="text-left">
                                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.backup.nextcloud.title")}</div>
                                <div className="text-xs text-zinc-500">
                                  {ncAuth.ncSetupConnected
                                    ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <CheckCircle2 size={12} /> {t("onboarding.backup.nextcloud.connectedAs", { user: ncAuth.ncCredentials?.loginName || ncAuth.ncCredentials?.userId })}
                                      </span>
                                    : t("onboarding.backup.nextcloud.subtitle")}
                                </div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ncAuth.ncSetupConnected ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {ncAuth.ncSetupConnected && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>

                      {!flow.formData.autoBackup && !flow.formData.localBackupEnabled && !ncAuth.ncSetupConnected && (
                        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 italic pt-1">
                          {t("onboarding.backup.skipHint")}
                        </p>
                      )}

                      {/* Nextcloud Setup Expanded */}
                      {ncAuth.ncSetupActive && !ncAuth.ncSetupConnected && (
                        <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 space-y-2">
                          {ncAuth.ncSetupConnecting ? (
                            <div className="flex flex-col items-center gap-2 py-3">
                              <Loader size={20} className="animate-spin text-orange-500" />
                              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                {t("onboarding.backup.nextcloud.awaiting")}
                              </span>
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  ncAuth.clearNcSetupPoll();
                                  ncAuth.setNcSetupConnecting(false);
                                }}
                                className="mt-1 px-3 py-1 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700"
                              >
                                {t("common.cancel")}
                              </button>
                            </div>
                          ) : (
                            <>
                              <input
                                type="url"
                                value={ncAuth.ncSetupUrl}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => ncAuth.setNcSetupUrl(e.target.value)}
                                placeholder={t("onboarding.backup.nextcloud.urlPlaceholder")}
                                className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                              />
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  ncAuth.handleNextcloudSetup();
                                }}
                                className="w-full py-2 text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-1.5"
                              >
                                <ServerCog size={14} />
                                {t("onboarding.backup.nextcloud.connectButton")}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                   </>
                 )}

                 {/* FALL B: WIEDERHERSTELLUNG */}
                 {flow.isRestoreFlow && (
                    <div className="grid grid-cols-1 gap-2">
                        {!gdriveDisabled && (
                        <button type="button"
                          onClick={restore.handleGoogleDriveRestore}
                          disabled={flow.loading}
                          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                              {flow.loading ? <Loader size={18} className="animate-spin text-zinc-400"/> : <Cloud size={18} className="text-blue-500" />}
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-sm text-zinc-800 dark:text-white">{t("onboarding.backup.restoreFromGdrive")}</div>
                            </div>
                        </button>
                        )}

                        <button type="button"
                          onClick={() => restore.setShowNcRestore(!restore.showNcRestore)}
                          disabled={flow.loading}
                          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                              <Cloud size={18} className="text-orange-500" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-sm text-zinc-800 dark:text-white">{t("onboarding.backup.restoreFromNextcloud")}</div>
                            </div>
                        </button>

                        {restore.showNcRestore && (
                          <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 space-y-2">
                            {restore.ncRestoreConnecting ? (
                              <div className="flex flex-col items-center gap-2 py-3">
                                <Loader size={20} className="animate-spin text-orange-500" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                  {t("onboarding.backup.nextcloud.awaiting")}
                                </span>
                                <button type="button"
                                  onClick={() => {
                                    if (restore.ncRestorePollRef.current) clearInterval(restore.ncRestorePollRef.current);
                                    restore.setNcRestoreConnecting(false);
                                  }}
                                  className="mt-1 px-3 py-1 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700"
                                >
                                  {t("common.cancel")}
                                </button>
                              </div>
                            ) : (
                              <>
                                <input
                                  type="url"
                                  value={restore.ncRestoreUrl}
                                  onChange={(e) => restore.setNcRestoreUrl(e.target.value)}
                                  placeholder={t("onboarding.backup.nextcloud.urlPlaceholder")}
                                  className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                                />
                                <button type="button"
                                  onClick={restore.handleNextcloudRestore}
                                  disabled={flow.loading}
                                  className="w-full py-2 text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-1.5"
                                >
                                  {flow.loading ? <Loader size={14} className="animate-spin" /> : null}
                                  {flow.loading ? t("onboarding.backup.ncLoading") : t("onboarding.backup.nextcloud.connectButton")}
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <button type="button"
                            onClick={restore.handleFolderRestore}
                            disabled={flow.loading}
                            className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                            >
                                <FolderInput size={20} className="text-yellow-500" />
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("onboarding.backup.restoreFromFolder")}</span>
                            </button>

                            <div className="relative">
                                <input type="file" ref={fileInputRef} onChange={restore.handleLocalFileRestore} className="hidden" accept=".json" />
                                <button type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={flow.loading}
                                className="w-full h-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                                >
                                    <Upload size={20} className="text-purple-500" />
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("onboarding.backup.restoreFromFile")}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                 )}

               </div>
             </motion.div>
            )}

            {/* SCHRITT 7: FERTIG */}
            {flow.step === 7 && (
              <SummaryStep
                hasRestoreData={!!flow.restoreData}
                onFinish={flow.finishSetup}
                onBack={flow.formData.simpleMode && !flow.isRestoreFlow ? () => flow.setStep(1) : undefined}
              />
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation (Steps 1..6, nicht auf Welcome & Summary) */}
        {flow.step > 0 && flow.step < 7 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 backdrop-blur-sm">

            <button type="button"
              onClick={flow.prevStep}
              className="px-4 py-2 font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={18} /> {t("onboarding.nav.back")}
            </button>

            {!flow.isRestoreFlow && (
              <button type="button"
                onClick={flow.nextStep}
                className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-zinc-900/10"
              >
                {flow.step === 6 ? t("onboarding.nav.finish") : t("onboarding.nav.next")} <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}

      </div>

      <ImportConflictModal
        analysisData={flow.showConflictModal ? flow.restoreData : null}
        onCancel={() => flow.setShowConflictModal(false)}
        onConfirm={() => {
            flow.setShowConflictModal(false);
            flow.setStep(7);
        }}
      />

    </div>
  );
};

export default OnboardingWizard;
