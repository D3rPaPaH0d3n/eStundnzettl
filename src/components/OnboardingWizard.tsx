import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, ChevronRight, Check, Upload, Cloud, Loader, CloudLightning, FolderInput, ArrowLeft, ServerCog, CheckCircle2, FileText, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "./Onboarding/steps/WelcomeStep";
import ProfileStep from "./Onboarding/steps/ProfileStep";
import LocaleStep from "./Onboarding/steps/LocaleStep";
import WorkScheduleStep from "./Onboarding/steps/WorkScheduleStep";
import WorkCodesStep, { type WorkCodePresetId } from "./Onboarding/steps/WorkCodesStep";
import CalculationStep from "./Onboarding/steps/CalculationStep";
import SummaryStep from "./Onboarding/steps/SummaryStep";
import toast from "react-hot-toast";
import { Trans, useTranslation } from "react-i18next";
import { initGoogleAuth, signInGoogle, findLatestBackup, downloadFileContent } from "../utils/googleDrive";
import { useFeatureAvailability } from "../hooks/useFeatureAvailability";
import { downloadBackup as ncDownloadBackup, initiateLoginFlow, pollLoginResult, getNextcloudErrorMessage, resolveUserId } from "../utils/nextcloudClient";
import { Browser } from "@capacitor/browser";
import { analyzeBackupData, applyBackup, readJsonFile, readBackupFromFolder, selectBackupFolder } from "../utils/storageBackup";
import ImportConflictModal from "./ImportConflictModal";
import { WORK_MODELS, WORK_CODE_PRESETS, STORAGE_KEYS } from "../hooks/constants";
import { DEMO_DATA } from "../utils/demoData";
import { setSetting } from "../db/repositories/settingsRepo";
import { storeNextcloudAppPassword } from "../utils/nextcloudSecret";
import { bulkReplaceWorkCodes } from "../db/repositories/workCodesRepo";
import { bulkInsertEntries } from "../db/repositories/entriesRepo";
import { logger } from "../utils/logger";
import type { LocaleId } from "../locales/types";
import { getLocale } from "../locales";
import {
  getDefaultCalculationConfig,
  getBlankCalculationConfig,
} from "../utils/calculationConfig";

import type { Entry, UserData, WorkCode, Theme, WorkModel, GoogleSignInResult, BackupAnalysisResult, CalculationConfig } from "../types";

const log = logger.scope("Onboarding");

interface Props {
  onComplete: () => void;
  setUserData: (data: UserData | Record<string, unknown>) => void;
  importEntries: (entries: Entry[]) => void;
  importWorkCodes: (codes: WorkCode[]) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setLocalBackupEnabled: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLocale?: (id: LocaleId) => void;
  /** Setzt die `CalculationConfig` am Ende des Wizards (von App.tsx). */
  setCalculationConfig?: (next: CalculationConfig) => void;
}

interface FormData {
  name: string;
  company: string;
  role: string;
  photo: string | null;
  workDays: number[];
  autoBackup: boolean;
  localBackupEnabled: boolean;
  minuteInput: boolean;
  simpleMode?: boolean;
  localeId: LocaleId | null;
  workCodePresetId: WorkCodePresetId;
  /** Aktuelle Rechenkonfiguration des Wizards. */
  calcConfig: CalculationConfig;
  /**
   * Nur zur Ablaufsteuerung: true wenn der User in Step 2 "Eigener Plan"
   * gewählt hat → Step 4 (CalculationStep) wird angezeigt.
   */
  customCalc: boolean;
}

interface NcCredentials {
  server: string;
  userId: string;
  loginName: string;
  appPassword: string;
}

const OnboardingWizard: React.FC<Props> = ({ onComplete, setUserData, importEntries, importWorkCodes, setCloudSyncEnabled, setLocalBackupEnabled, setTheme, setLocale, setCalculationConfig }) => {
  const { t } = useTranslation();
  const featureAvailability = useFeatureAvailability();
  const gdriveDisabled =
    !featureAvailability.loading &&
    !featureAvailability.probeFailed &&
    featureAvailability.googleServicesAvailable === false;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRestoreFlow, setIsRestoreFlow] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    company: "",
    role: "",
    photo: null,
    workDays: WORK_MODELS[0].days,
    autoBackup: false,
    localBackupEnabled: false,
    minuteInput: false,
    localeId: null,
    workCodePresetId: "allgemein",
    calcConfig: getDefaultCalculationConfig(getLocale(undefined), WORK_MODELS[0].days),
    customCalc: false,
  });
  
  const [restoreData, setRestoreData] = useState<Record<string, unknown> | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  const [showNcRestore, setShowNcRestore] = useState(false);
  const [ncRestoreUrl, setNcRestoreUrl] = useState("");
  const [ncRestoreConnecting, setNcRestoreConnecting] = useState(false);
  const ncRestorePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nextcloud Setup State (for new setup flow)
  const [ncSetupActive, setNcSetupActive] = useState(false);
  const [ncSetupUrl, setNcSetupUrl] = useState("");
  const [ncSetupConnecting, setNcSetupConnecting] = useState(false);
  const [ncSetupConnected, setNcSetupConnected] = useState(false);
  const [ncCredentials, setNcCredentials] = useState<NcCredentials | null>(null);
  const ncSetupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initGoogleAuth().catch(() => log.debug("Google Auth Init failed silently/already initialized"));
    return () => {
      if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
      if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
    };
  }, []);

  // --- NAVIGATION ---
  // Step-Reihenfolge für neue User:
  //   0 Welcome -> 1 Profile -> 2 Locale -> 3 WorkSchedule
  //   -> (nur wenn customCalc) 4 Calculation -> 5 WorkCodes
  //   -> 6 Backup -> 7 Summary
  //
  // Step 4 (Calculation) wird nur angezeigt, wenn der User in Step 2
  // "Eigener Plan" gewählt hat. Für AT/DE/Neutral-User wird dieser
  // Step übersprungen — ihre Rechenregeln kommen direkt aus dem Locale.
  //
  // Restore-Flow überspringt alles außer Welcome(0) -> Backup(6) -> Summary(7).
  // Für Restore-User wird die Locale nach dem Finish via LocaleMigrationModal
  // abgefragt (siehe App.tsx), weil sie aus dem Backup restored werden und
  // Locale dort (noch) nicht enthalten ist.
  const handleStartNew = () => {
    setIsRestoreFlow(false);
    setStep(1);
  };

  const handleStartRestore = () => {
    setIsRestoreFlow(true);
    setStep(6);
  };

  const handleDemoMode = async () => {
    const demoEntries = DEMO_DATA.generateEntries();

    // Demo-CalculationConfig: AT-Defaults + 3 Resttage vom Vorjahr
    const demoLocale = getLocale("at");
    const demoCalcConfig = getDefaultCalculationConfig(demoLocale, DEMO_DATA.user.workDays);
    demoCalcConfig.vacationCarryoverDays = 3;

    try {
      await setSetting("user", DEMO_DATA.user);
      await setSetting("locale", "at");
      await setSetting("calculationConfig", demoCalcConfig);
      await bulkReplaceWorkCodes(DEMO_DATA.workCodes);
      await bulkInsertEntries(demoEntries);
      localStorage.setItem(STORAGE_KEYS.LOCALE, "at");
      localStorage.setItem("estundnzettl_calculation_config", JSON.stringify(demoCalcConfig));
    } catch (err) {
      log.error("Demo SQLite write failed:", err);
    }

    setUserData?.(DEMO_DATA.user);
    setLocale?.("at");
    setCalculationConfig?.(demoCalcConfig);
    importWorkCodes?.(DEMO_DATA.workCodes);
    importEntries?.(demoEntries);
    toast.success(t("onboarding.toast.demoLoaded"));
    onComplete();
  };

  const nextStep = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error(t("onboarding.toast.nameRequired"));
      return;
    }
    if (step === 2 && !formData.localeId) {
      toast.error(t("onboarding.toast.localeRequired"));
      return;
    }
    // Locale-Wahl hat Auswirkung auf Default-WorkDays: beim Verlassen von
    // Step 2 (Locale) die Default-Stunden auf die Locale-Defaults setzen,
    // außer der User hat bereits ein Modell gewählt, das vom alten Default
    // abweicht. Hier halten wir es einfach: wenn die workDays noch auf dem
    // ursprünglichen WORK_MODELS[0]-Default stehen (38,5h klassisch), dann
    // vorbelegen.
    if (step === 2 && formData.localeId) {
      const locale = getLocale(formData.localeId);
      const currentIsInitial =
        JSON.stringify(formData.workDays) === JSON.stringify(WORK_MODELS[0].days);
      if (currentIsInitial) {
        setFormData((p) => ({ ...p, workDays: [...locale.defaultWorkDays] }));
      }
    }
    // Beim Verlassen von Step 3 (WorkSchedule): `weeklyTargetMinutes` in
    // der Config neu berechnen, damit der CalculationStep (falls angezeigt)
    // den korrekten Wert anzeigt.
    if (step === 3) {
      setFormData((p) => ({
        ...p,
        calcConfig: {
          ...p.calcConfig,
          weeklyTargetMinutes: p.workDays.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0),
        },
      }));
    }
    // Step 3 → Step 5 überspringt CalculationStep wenn kein Eigener Plan
    if (step === 3 && !formData.customCalc) {
      setStep(5);
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (step === 6 && isRestoreFlow) {
      // Restore-Flow: von Backup direkt zurück zum Welcome
      setStep(0);
      return;
    }
    // Step 5 (WorkCodes) → Step 3 (WorkSchedule) überspringt CalculationStep
    // wenn kein Eigener Plan
    if (step === 5 && !formData.customCalc) {
      setStep(3);
      return;
    }
    setStep(prev => prev - 1);
  };

  // --- HANDLER ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string | null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelSelect = (model: WorkModel) => {
    const days = model.days || [0, 0, 0, 0, 0, 0, 0];
    setFormData({ ...formData, workDays: days });
  };

  const handleCustomDayChange = (dayIndex: number, value: string) => {
    const newDays = [...formData.workDays];
    newDays[dayIndex] = parseInt(value) || 0;
    setFormData({ ...formData, workDays: newDays });
  };

  const minToHours = (m: number) => (m / 60).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' h';
  const totalWeeklyMinutes = formData.workDays.reduce((a, b) => a + b, 0);

  // --- BACKUP SETUP HANDLER ---
  const handleAutoBackupToggle = async () => {
    const newValue = !formData.autoBackup;
    
    if (newValue) {
      try {
        await signInGoogle();
        toast.success(t("onboarding.toast.gdriveLinked"));
        // Erst setzen wenn Login erfolgreich war
        setFormData(p => ({...p, autoBackup: true}));
      } catch (error) {
        log.error(error);
        toast(t("onboarding.toast.gdriveLoginFailed"), { icon: "⚠️" });
        // Nicht aktivieren bei Fehler
        setFormData(p => ({...p, autoBackup: false}));
      }
    } else {
        setFormData(p => ({...p, autoBackup: false}));
    }
  };

  const handleLocalBackupToggle = async () => {
    if (!formData.localBackupEnabled) {
      try {
        const success = await selectBackupFolder();
        if (success) {
          setFormData(p => ({...p, localBackupEnabled: true}));
          toast.success(t("onboarding.toast.folderLinked"));
        }
      } catch (error) {
        log.error(error);
        toast.error(t("onboarding.toast.folderCancelled"));
      }
    } else {
      setFormData(p => ({...p, localBackupEnabled: false}));
    }
  };

  const handleNextcloudSetupToggle = () => {
    if (ncSetupConnected) {
      // Disconnect
      setNcSetupConnected(false);
      setNcCredentials(null);
      setNcSetupActive(false);
      setNcSetupUrl("");
      toast(t("onboarding.toast.ncDisconnected"));
      return;
    }
    setNcSetupActive(!ncSetupActive);
  };

  const handleNextcloudSetup = async () => {
    if (!ncSetupUrl) {
      toast.error(t("onboarding.toast.ncEnterUrl"));
      return;
    }
    try {
      setNcSetupConnecting(true);
      const startResult = await initiateLoginFlow(ncSetupUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const loginUrl = startResult.loginUrl as string;
      const token = startResult.token as string;
      const pollEndpoint = startResult.pollEndpoint as string;
      await Browser.open({ url: loginUrl });

      let attempts = 0;
      ncSetupPollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          clearInterval(ncSetupPollRef.current!);
          ncSetupPollRef.current = null;
          setNcSetupConnecting(false);
          toast.error(t("onboarding.toast.ncTimeout"));
          return;
        }
        try {
          const result = await pollLoginResult(pollEndpoint, token);
          if (!result.ok) {
            throw new Error(getNextcloudErrorMessage(result));
          }

          if (result.status === 'pending') return;

          if (result.status === 'complete') {
            if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
            ncSetupPollRef.current = null;
            try { await Browser.close(); } catch { /* browser already closed */ }

            const userId = await resolveUserId(result.server as string, result.loginName as string, result.appPassword as string);
            setNcCredentials({
              server: (result.server as string).replace(/\/+$/, ''),
              userId,
              loginName: result.loginName as string,
              appPassword: result.appPassword as string,
            });
            setNcSetupConnected(true);
            setNcSetupConnecting(false);
            toast.success(t("onboarding.toast.ncConnected"));
          }
        } catch (error) {
          if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
          ncSetupPollRef.current = null;
          setNcSetupConnecting(false);
          toast.error((error as Error)?.message || t("onboarding.toast.ncLoginFailed"));
        }
      }, 3000);
    } catch (error) {
      setNcSetupConnecting(false);
      toast.error((error as Error)?.message || t("onboarding.toast.ncServerUnreachable"));
    }
  };

  const handleMinuteInputToggle = () => {
    setFormData(p => ({...p, minuteInput: !p.minuteInput}));
  };

  const handleSimpleModeToggle = () => {
    setFormData(p => {
      const newSimple = !p.simpleMode;
      return {
        ...p,
        simpleMode: newSimple,
        workDays: newSimple ? [0, 0, 0, 0, 0, 0, 0] : WORK_MODELS[0].days,
      };
    });
  };

  // --- FINISH (BUGFIX: Persistenz korrigiert) ---
  const finishSetup = async () => {
    const userDataToSave = {
      name: formData.name,
      company: formData.company,
      role: formData.role,
      position: formData.role,
      photo: formData.photo,
      workDays: formData.workDays,
      simpleMode: formData.simpleMode || false,
      minuteInput: formData.minuteInput,
      settings: {
        autoBackup: formData.autoBackup,
        theme: 'system'
      }
    };
    
    // FIX: Zuerst direkt in SQLite schreiben, DANN State updaten
    try {
      await setSetting("user", userDataToSave);
      await setSetting("cloud_sync_enabled", formData.autoBackup);
      await setSetting("local_backup_enabled", formData.localBackupEnabled);
    } catch {
      // Fortfahren, State wird unten aktualisiert
    }
    
    // Nextcloud Credentials speichern
    if (ncCredentials) {
      try {
        const secretResult = await storeNextcloudAppPassword(ncCredentials.appPassword);
        if (secretResult.status !== "ready") {
          throw new Error(secretResult.message || "Secure Nextcloud password storage unavailable");
        }
        await setSetting("nextcloud_url", ncCredentials.server);
        await setSetting("nextcloud_user", ncCredentials.userId);
        await setSetting("nextcloud_enabled", true);
      } catch (err) {
        log.error("Nextcloud settings save failed:", err);
      }
    }

    // CalculationConfig persistieren — unabhängig davon ob customCalc
    // oder Locale-Default-Config. Bestehende User im Restore-Flow
    // überspringen das (ihre Config kommt aus dem Backup oder der Migration).
    if (!isRestoreFlow) {
      try {
        await setSetting("calculationConfig", formData.calcConfig);
      } catch (err) {
        log.error("CalculationConfig save failed:", err);
      }
      setCalculationConfig?.(formData.calcConfig);
    }

    // Locale persistieren (nur wenn neuer User — Restore bekommt
    // LocaleMigrationModal nach dem Abschluss angezeigt)
    if (!isRestoreFlow && formData.localeId) {
      try {
        await setSetting("locale", formData.localeId);
      } catch (err) {
        log.error("Locale setting save failed:", err);
      }
      setLocale?.(formData.localeId);
    }

    // Work-Code-Preset laden (nur wenn neuer User)
    if (!isRestoreFlow) {
      const preset = WORK_CODE_PRESETS[formData.workCodePresetId];
      if (preset) {
        try {
          await bulkReplaceWorkCodes(preset.codes);
          importWorkCodes?.(preset.codes);
        } catch (err) {
          log.error("Work code preset load failed:", err);
        }
      }
    }

    // Jetzt State updaten
    setUserData?.(userDataToSave);
    setCloudSyncEnabled?.(formData.autoBackup);
    setLocalBackupEnabled?.(formData.localBackupEnabled);
    setTheme?.('system');

    if (restoreData) {
      await applyBackup(restoreData);
      toast.success(t("onboarding.toast.restoreSuccess"));
    } else {
      toast.success(t("onboarding.toast.welcome"));
    }

    onComplete();
  };

  // --- RESTORE LOGIC ---
  const handleGoogleDriveRestore = async () => {
    try {
      setLoading(true);
      const user = await signInGoogle();
      if (!user) throw new Error(t("onboarding.toast.signinFailed"));

      const token = (user as GoogleSignInResult).authentication?.accessToken;
      if (!token) throw new Error(t("onboarding.toast.tokenMissing"));

      // Nutzt jetzt automatisch die neue Logik aus googleDrive.js (inkl. Legacy Fallback)
      const file = await findLatestBackup();
      if (!file) throw new Error(t("onboarding.toast.backupNotFound"));

      const content = await downloadFileContent(token as string, file.id as string);
      if (!content) throw new Error(t("onboarding.toast.backupEmpty"));

      const { isValid, data } = await analyzeBackupData(content);
      if (isValid) {
        setRestoreData(data);
        toast.success(t("onboarding.toast.backupLoaded"));
        setStep(7);
      } else {
        toast.error(t("onboarding.toast.backupInvalid"));
      }
    } catch (err) {
      log.error(err);
      toast.error((err as Error).message || t("onboarding.toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleFolderRestore = async () => {
    try {
      setLoading(true);
      const backupContent = await readBackupFromFolder();
      if (backupContent) {
          const { isValid, data } = await analyzeBackupData(backupContent);
          if (isValid) {
              setRestoreData(data);
              toast.success(t("onboarding.toast.backupLoaded"));
              setStep(7);
          } else {
              toast.error(t("onboarding.toast.backupInvalidShort"));
          }
      } else {
          toast.error(t("onboarding.toast.backupNotFound"));
      }
    } catch {
        toast.error(t("onboarding.toast.folderAccessError"));
    } finally {
        setLoading(false);
    }
  };

  const handleLocalFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const content = await readJsonFile(file);
      const { isValid, data } = await analyzeBackupData(content);
      if (isValid) {
        if ((data as BackupAnalysisResult).integrity === "mismatch") {
          toast(t("onboarding.toast.integrityMismatch"), { duration: 6000 });
        }
        setRestoreData(data);
        toast.success(t("onboarding.toast.backupLoaded"));
        setStep(7);
      } else {
        toast.error(t("onboarding.toast.backupInvalidFormat"));
      }
    } catch {
      toast.error(t("onboarding.toast.fileReadError"));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleNextcloudRestore = async () => {
    if (!ncRestoreUrl) {
      toast.error(t("onboarding.toast.ncEnterUrl"));
      return;
    }
    try {
      setNcRestoreConnecting(true);
      const startResult = await initiateLoginFlow(ncRestoreUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const loginUrl = startResult.loginUrl as string;
      const token = startResult.token as string;
      const pollEndpoint = startResult.pollEndpoint as string;
      await Browser.open({ url: loginUrl });

      let attempts = 0;
      ncRestorePollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
          setNcRestoreConnecting(false);
          toast.error(t("onboarding.toast.ncTimeout"));
          return;
        }
        try {
          const result = await pollLoginResult(pollEndpoint, token);
          if (!result.ok) {
            throw new Error(getNextcloudErrorMessage(result));
          }

          if (result.status === 'pending') {
            return;
          }

          if (result.status === 'complete') {
            if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
            try { await Browser.close(); } catch { /* browser already closed */ }
            setNcRestoreConnecting(false);
            setLoading(true);
            try {
              const userId = await resolveUserId(result.server as string, result.loginName as string, result.appPassword as string);
              const content = await ncDownloadBackup(result.server as string, userId, result.appPassword as string);
              if (!content) {
                toast.error(t("onboarding.toast.ncRestoreNotFound"));
                setLoading(false);
                return;
              }
              const { isValid, data } = await analyzeBackupData(content);
              if (isValid) {
                setRestoreData(data);
                toast.success(t("onboarding.toast.ncRestoreLoaded"));
                setShowNcRestore(false);
                setStep(7);
              } else {
                toast.error(t("onboarding.toast.ncRestoreInvalid"));
              }
            } catch (err) {
              toast.error((err as Error).message || t("onboarding.toast.loadError"));
            } finally {
              setLoading(false);
            }
          }
        } catch (error) {
          if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
          setNcRestoreConnecting(false);
          toast.error((error as Error)?.message || t("onboarding.toast.ncLoginFailed"));
        }
      }, 3000);
    } catch (error) {
      setNcRestoreConnecting(false);
      toast.error((error as Error)?.message || t("onboarding.toast.ncServerUnreachableRestore"));
    }
  };

  const isSelected = (modelDays: number[] | undefined) => {
     const current = JSON.stringify(formData.workDays);
     const target = modelDays ? JSON.stringify(modelDays) : JSON.stringify([0,0,0,0,0,0,0]);
     return current === target;
  };

  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 z-50 flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {step > 0 && (
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-700 w-full">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{
                // Gesamte Schrittzahl hängt davon ab, ob der User einen
                // Eigenen Plan konfiguriert (→ +1 Step für CalculationStep).
                width: `${(step / (formData.customCalc ? 7 : 6)) * 100}%`,
              }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            
            {/* SCHRITT 0 */}
            {step === 0 && (
              <WelcomeStep
                onStartNew={handleStartNew}
                onStartRestore={handleStartRestore}
                onDemoMode={handleDemoMode}
              />
            )}

            {/* SCHRITT 1: PROFIL */}
            {step === 1 && (
              <ProfileStep
                formData={formData}
                setFormData={setFormData}
                photoInputRef={photoInputRef as React.RefObject<HTMLInputElement>}
                onPhotoUpload={handlePhotoUpload}
              />
            )}

            {/* SCHRITT 2: LOCALE / STUNDENBERECHNUNG */}
            {step === 2 && (
              <LocaleStep
                selectedLocaleId={formData.localeId}
                customPlanSelected={formData.customCalc}
                onSelect={(id) =>
                  setFormData((p) => ({
                    ...p,
                    localeId: id,
                    customCalc: false,
                    calcConfig: getDefaultCalculationConfig(getLocale(id), p.workDays),
                  }))
                }
                onSelectCustomPlan={() =>
                  setFormData((p) => ({
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
            {step === 3 && (
              <WorkScheduleStep
                formData={formData}
                onModelSelect={handleModelSelect}
                onCustomDayChange={handleCustomDayChange}
                isSelected={isSelected}
                totalWeeklyMinutes={totalWeeklyMinutes}
                minToHours={minToHours}
                onMinuteInputToggle={handleMinuteInputToggle}
                onSimpleModeToggle={handleSimpleModeToggle}
              />
            )}

            {/* SCHRITT 4: RECHENLOGIK-BAUKASTEN (nur bei "Eigener Plan") */}
            {step === 4 && formData.customCalc && (
              <CalculationStep
                config={formData.calcConfig}
                onChange={(next) => setFormData((p) => ({ ...p, calcConfig: next }))}
                workDays={formData.workDays}
              />
            )}

            {/* SCHRITT 5: TÄTIGKEITEN (Work Codes) */}
            {step === 5 && (
              <WorkCodesStep
                selectedPresetId={formData.workCodePresetId}
                onSelect={(id) => setFormData((p) => ({ ...p, workCodePresetId: id }))}
              />
            )}

            {/* SCHRITT 6: BACKUP / DATEN */}
            {step === 6 && (
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
                    {isRestoreFlow ? t("onboarding.backup.titleRestore") : t("onboarding.backup.titleSetup")}
                 </h2>
                 <p className="text-zinc-500 dark:text-zinc-400">
                    {isRestoreFlow ? t("onboarding.backup.subtitleRestore") : t("onboarding.backup.subtitleSetup")}
                 </p>
               </div>

               {!isRestoreFlow && (
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
                 {!isRestoreFlow && (
                   <>
                     {/* 1. CLOUD BACKUP — versteckt wenn Google Play Services fehlen */}
                     {!gdriveDisabled && (
                     <div
                        onClick={handleAutoBackupToggle}
                        className={`w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                          formData.autoBackup
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                        }`}
                      >
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${formData.autoBackup ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                  <CloudLightning size={20}/>
                             </div>
                             <div className="text-left">
                                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.backup.gdrive.title")}</div>
                                <div className="text-xs text-zinc-500">{t("onboarding.backup.gdrive.subtitle")}</div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            formData.autoBackup ? "border-blue-500 bg-blue-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {formData.autoBackup && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>
                      )}

                      {/* 2. LOKALES BACKUP */}
                      <div 
                        onClick={handleLocalBackupToggle}
                        className={`w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                          formData.localBackupEnabled 
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm" 
                              : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                        }`}
                      >
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${formData.localBackupEnabled ? 'bg-green-100 dark:bg-green-900/50 text-green-600' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                  <FolderInput size={20}/>
                             </div>
                             <div className="text-left">
                                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.backup.local.title")}</div>
                                <div className="text-xs text-zinc-500">{t("onboarding.backup.local.subtitle")}</div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            formData.localBackupEnabled ? "border-green-500 bg-green-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {formData.localBackupEnabled && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>

                      {/* 3. NEXTCLOUD BACKUP */}
                      <div 
                        onClick={!ncSetupConnecting ? handleNextcloudSetupToggle : undefined}
                        className={`w-full p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                          ncSetupConnected 
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-sm" 
                              : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                        }`}
                      >
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${ncSetupConnected ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                  <ServerCog size={20}/>
                             </div>
                             <div className="text-left">
                                <div className="font-bold text-zinc-800 dark:text-white">{t("onboarding.backup.nextcloud.title")}</div>
                                <div className="text-xs text-zinc-500">
                                  {ncSetupConnected
                                    ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <CheckCircle2 size={12} /> {t("onboarding.backup.nextcloud.connectedAs", { user: ncCredentials?.loginName || ncCredentials?.userId })}
                                      </span>
                                    : t("onboarding.backup.nextcloud.subtitle")}
                                </div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ncSetupConnected ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {ncSetupConnected && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>

                      {!formData.autoBackup && !formData.localBackupEnabled && !ncSetupConnected && (
                        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 italic pt-1">
                          {t("onboarding.backup.skipHint")}
                        </p>
                      )}

                      {/* Nextcloud Setup Expanded */}
                      {ncSetupActive && !ncSetupConnected && (
                        <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 space-y-2">
                          {ncSetupConnecting ? (
                            <div className="flex flex-col items-center gap-2 py-3">
                              <Loader size={20} className="animate-spin text-orange-500" />
                              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                {t("onboarding.backup.nextcloud.awaiting")}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ncSetupPollRef.current) {
                                    clearInterval(ncSetupPollRef.current);
                                    ncSetupPollRef.current = null;
                                  }
                                  setNcSetupConnecting(false);
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
                                value={ncSetupUrl}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setNcSetupUrl(e.target.value)}
                                placeholder={t("onboarding.backup.nextcloud.urlPlaceholder")}
                                className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNextcloudSetup();
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
                 {isRestoreFlow && (
                    <div className="grid grid-cols-1 gap-2">
                        {!gdriveDisabled && (
                        <button
                          onClick={handleGoogleDriveRestore}
                          disabled={loading}
                          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                              {loading ? <Loader size={18} className="animate-spin text-zinc-400"/> : <Cloud size={18} className="text-blue-500" />}
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-sm text-zinc-800 dark:text-white">{t("onboarding.backup.restoreFromGdrive")}</div>
                            </div>
                        </button>
                        )}

                        <button
                          onClick={() => setShowNcRestore(!showNcRestore)}
                          disabled={loading}
                          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                              <Cloud size={18} className="text-orange-500" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-sm text-zinc-800 dark:text-white">{t("onboarding.backup.restoreFromNextcloud")}</div>
                            </div>
                        </button>

                        {showNcRestore && (
                          <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 space-y-2">
                            {ncRestoreConnecting ? (
                              <div className="flex flex-col items-center gap-2 py-3">
                                <Loader size={20} className="animate-spin text-orange-500" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                  {t("onboarding.backup.nextcloud.awaiting")}
                                </span>
                                <button
                                  onClick={() => {
                                    if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
                                    setNcRestoreConnecting(false);
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
                                  value={ncRestoreUrl}
                                  onChange={(e) => setNcRestoreUrl(e.target.value)}
                                  placeholder={t("onboarding.backup.nextcloud.urlPlaceholder")}
                                  className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                                />
                                <button
                                  onClick={handleNextcloudRestore}
                                  disabled={loading}
                                  className="w-full py-2 text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-1.5"
                                >
                                  {loading ? <Loader size={14} className="animate-spin" /> : null}
                                  {loading ? t("onboarding.backup.ncLoading") : t("onboarding.backup.nextcloud.connectButton")}
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <button
                            onClick={handleFolderRestore}
                            disabled={loading}
                            className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                            >
                                <FolderInput size={20} className="text-yellow-500" />
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("onboarding.backup.restoreFromFolder")}</span>
                            </button>

                            <div className="relative">
                                <input type="file" ref={fileInputRef} onChange={handleLocalFileRestore} className="hidden" accept=".json" />
                                <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
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
            {step === 7 && (
              <SummaryStep hasRestoreData={!!restoreData} onFinish={finishSetup} />
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation (Steps 1..6, nicht auf Welcome & Summary) */}
        {step > 0 && step < 7 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 backdrop-blur-sm">

            <button
              onClick={prevStep}
              className="px-4 py-2 font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={18} /> {t("onboarding.nav.back")}
            </button>

            {!isRestoreFlow && (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-zinc-900/10"
              >
                {step === 6 ? t("onboarding.nav.finish") : t("onboarding.nav.next")} <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}

      </div>
      
      <ImportConflictModal
        analysisData={showConflictModal ? restoreData : null}
        onCancel={() => setShowConflictModal(false)}
        onConfirm={() => {
            setShowConflictModal(false);
            setStep(7);
        }}
      />

    </div>
  );
};

export default OnboardingWizard;
