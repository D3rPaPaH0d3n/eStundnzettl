import { useState } from "react";
import type React from "react";
import type { TFunction } from "i18next";
import toast from "react-hot-toast";
import { applyBackup } from "../../utils/storageBackup";
import { WORK_MODELS, WORK_CODE_PRESETS, STORAGE_KEYS } from "../constants";
import { DEMO_DATA } from "../../utils/demoData";
import { setSetting } from "../../db/repositories/settingsRepo";
import { storeNextcloudAppPassword } from "../../utils/nextcloudSecret";
import { bulkReplaceWorkCodes } from "../../db/repositories/workCodesRepo";
import { bulkInsertEntries } from "../../db/repositories/entriesRepo";
import { logger } from "../../utils/logger";
import type { LocaleId } from "../../locales/types";
import { getLocale } from "../../locales";
import {
  getDefaultCalculationConfig,
  getBlankCalculationConfig,
  coerceCalculationConfig,
} from "../../utils/calculationConfig";
import type {
  Entry,
  UserData,
  WorkCode,
  Theme,
  WorkModel,
  BackupAnalysisData,
  CalculationConfig,
} from "../../types";
import type { WorkCodePresetId } from "../../components/Onboarding/steps/WorkCodesStep";
import type { NcCredentials } from "./useOnboardingNextcloudAuth";

const log = logger.scope("Onboarding");

export interface WizardFormData {
  name: string;
  company: string;
  role: string;
  photo: string | null;
  workDays: number[];
  autoBackup: boolean;
  localBackupEnabled: boolean;
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

interface FlowProps {
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

export function useOnboardingFlow(
  t: TFunction,
  props: FlowProps,
  ncCredentials: NcCredentials | null,
) {
  const {
    onComplete,
    setUserData,
    importEntries,
    importWorkCodes,
    setCloudSyncEnabled,
    setLocalBackupEnabled,
    setTheme,
    setLocale,
    setCalculationConfig,
  } = props;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRestoreFlow, setIsRestoreFlow] = useState(false);

  const [formData, setFormData] = useState<WizardFormData>({
    name: "",
    company: "",
    role: "",
    photo: null,
    workDays: WORK_MODELS[0].days,
    autoBackup: false,
    localBackupEnabled: false,
    localeId: null,
    workCodePresetId: "allgemein",
    calcConfig: getDefaultCalculationConfig(getLocale(undefined), WORK_MODELS[0].days),
    customCalc: false,
  });

  const [restoreData, setRestoreData] = useState<BackupAnalysisData | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

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
  // Locale kommt bei v7-Backups direkt aus dem Backup; nur für ältere
  // Backups ohne Locale-Feld wird sie nach dem Finish via
  // LocaleMigrationModal abgefragt (siehe App.tsx).
  const handleStartSimple = () => {
    setIsRestoreFlow(false);
    setFormData((p) => ({
      ...p,
      simpleMode: true,
      workDays: [0, 0, 0, 0, 0, 0, 0],
      localeId: "neutral",
      workCodePresetId: "allgemein",
      calcConfig: getBlankCalculationConfig([0, 0, 0, 0, 0, 0, 0]),
      customCalc: false,
    }));
    setStep(1);
  };

  const handleStartNew = () => {
    setIsRestoreFlow(false);
    setFormData((p) => ({
      ...p,
      simpleMode: false,
      customCalc: false,
    }));
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
    if (step === 1 && formData.simpleMode) {
      setStep(7);
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

  const handleSimpleModeToggle = () => {
    setFormData(p => ({ ...p, simpleMode: !p.simpleMode }));
  };

  // --- FINISH (BUGFIX: Persistenz korrigiert) ---
  const finishSetup = async () => {
    // Restore-Flow: Backup ZUERST einspielen. applyBackup schreibt u.a. den
    // Settings-Key "user" aus dem Backup. Liefe es erst NACH den
    // setSetting/setUserData-Calls unten, würde der Persist-Effekt in
    // useSettings (schreibt userData-State fire-and-forget nach SQLite) das
    // leere Wizard-Profil zeitlich nach der Snapshot-Transaktion erneut
    // persistieren — der restaurierte User wäre weg und der Onboarding-
    // Check (leerer Name) zeigte den Wizard beim nächsten Start wieder.
    if (restoreData) {
      const applied = await applyBackup(restoreData);
      if (!applied) {
        toast.error(t("onboarding.toast.restoreError"));
        return;
      }
    }

    // Im Restore-Flow werden die Profil-Steps übersprungen (Welcome →
    // Backup → Summary), formData bleibt leer — das Profil muss deshalb
    // aus dem Backup übernommen werden statt aus formData.
    const restoredUser =
      restoreData?.hasSettings && restoreData.settings
        ? (restoreData.settings as unknown as UserData & { settings?: Record<string, unknown> })
        : null;

    const userDataToSave = restoredUser
      ? {
          ...restoredUser,
          workDays:
            Array.isArray(restoredUser.workDays) && restoredUser.workDays.length === 7
              ? restoredUser.workDays
              : formData.workDays,
          settings: {
            ...restoredUser.settings,
            autoBackup: formData.autoBackup,
            theme: 'system'
          }
        }
      : {
          name: formData.name,
          company: formData.company,
          role: formData.role,
          position: formData.role,
          photo: formData.photo,
          workDays: formData.workDays,
          simpleMode: formData.simpleMode || false,
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
    // und reine Aufzeichnungsnutzer überspringen das.
    if (!isRestoreFlow && !formData.simpleMode) {
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

    // Work-Code-Preset laden (auch im einfachen Modus: Basis-Tätigkeiten bleiben optional nutzbar)
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

    if (restoreData) {
      // Restaurierte Sektionen in den React-State übernehmen — SQLite hat
      // applyBackup bereits geschrieben, aber ohne Refresh würden
      // WorkCodes/CalculationConfig/Locale erst nach App-Neustart greifen.
      if (restoreData.hasWorkCodes) {
        importWorkCodes?.(restoreData.workCodes);
      }
      if (restoreData.calculationConfig) {
        setCalculationConfig?.(
          coerceCalculationConfig(restoreData.calculationConfig, formData.calcConfig)
        );
      }
      if (restoreData.locale) {
        // Locale aus dem Backup übernehmen → LocaleMigrationModal entfällt.
        setLocale?.(restoreData.locale as LocaleId);
      }
      setTheme?.((restoreData.theme as Theme) || 'system');
      toast.success(t("onboarding.toast.restoreSuccess"));
    } else {
      setTheme?.('system');
      toast.success(t("onboarding.toast.welcome"));
    }

    onComplete();
  };

  const isSelected = (modelDays: number[] | undefined) => {
     const current = JSON.stringify(formData.workDays);
     const target = modelDays ? JSON.stringify(modelDays) : JSON.stringify([0,0,0,0,0,0,0]);
     return current === target;
  };

  return {
    step,
    setStep,
    loading,
    setLoading,
    isRestoreFlow,
    setIsRestoreFlow,
    formData,
    setFormData,
    restoreData,
    setRestoreData,
    showConflictModal,
    setShowConflictModal,
    handleStartSimple,
    handleStartNew,
    handleStartRestore,
    handleDemoMode,
    nextStep,
    prevStep,
    handlePhotoUpload,
    handleModelSelect,
    handleCustomDayChange,
    minToHours,
    totalWeeklyMinutes,
    handleSimpleModeToggle,
    finishSetup,
    isSelected,
  };
}
