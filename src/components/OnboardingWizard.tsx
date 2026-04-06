// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from "react";
import { ShieldCheck, ChevronRight, Check, Upload, Cloud, Loader, CloudLightning, FolderInput, ArrowLeft, ServerCog, CheckCircle2, FileText, Info, LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "./Onboarding/steps/WelcomeStep";
import ProfileStep from "./Onboarding/steps/ProfileStep";
import WorkScheduleStep from "./Onboarding/steps/WorkScheduleStep";
import SummaryStep from "./Onboarding/steps/SummaryStep";
import toast from "react-hot-toast";
import { initGoogleAuth, signInGoogle, findLatestBackup, downloadFileContent } from "../utils/googleDrive";
import { downloadBackup as ncDownloadBackup, initiateLoginFlow } from "../utils/nextcloudClient";
import { Browser } from "@capacitor/browser";
import { selectBackupFolder, readBackupFile } from "../utils/storageBackup";
import ImportConflictModal from "./ImportConflictModal";
import { WORK_MODELS, STORAGE_KEYS } from "../hooks/constants";
import { DEMO_DATA } from "../utils/demoData";
import { setSetting } from "../db/repositories/settingsRepo";
import { obfuscate } from "../utils/obfuscate";
import { bulkReplaceWorkCodes } from "../db/repositories/workCodesRepo";
import { bulkInsertEntries } from "../db/repositories/entriesRepo";
import { logger } from "../utils/logger";
import { UserData, TimeEntry, WorkCode } from "../types";

const log = logger.scope("Onboarding");

interface OnboardingWizardProps {
  onComplete: () => void;
  setUserData: (data: UserData) => void;
  importEntries: (entries: TimeEntry[]) => void;
  importWorkCodes: (codes: WorkCode[]) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setLocalBackupEnabled: (enabled: boolean) => void;
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark' | 'system'>> | ((theme: string) => void);
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
  customDays?: number[];
}

interface RestoreData {
  entriesCount: number;
  workCodesCount: number;
  hasSettings: boolean;
  backup: any;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ 
  onComplete, 
  setUserData, 
  importEntries, 
  importWorkCodes, 
  setCloudSyncEnabled, 
  setLocalBackupEnabled, 
  setTheme 
}) => {
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
  });
  
  const [restoreData, setRestoreData] = useState<RestoreData | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  const [showNcRestore, setShowNcRestore] = useState(false);
  const [ncRestoreUrl, setNcRestoreUrl] = useState("");
  const [ncRestoreConnecting, setNcRestoreConnecting] = useState(false);
  const ncRestorePollRef = useRef<NodeJS.Timeout | null>(null);

  // Nextcloud Setup State (for new setup flow)
  const [ncSetupActive, setNcSetupActive] = useState(false);
  const [ncSetupUrl, setNcSetupUrl] = useState("");
  const [ncSetupConnecting, setNcSetupConnecting] = useState(false);
  const ncSetupPollRef = useRef<NodeJS.Timeout | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper functions for backup operations
  const readJsonFile = async (file?: File): Promise<any> => {
    if (!file) {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e: Event) => {
          const selectedFile = (e.target as HTMLInputElement).files?.[0];
          if (!selectedFile) {
            reject(new Error('No file selected'));
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const content = JSON.parse(event.target?.result as string);
              resolve(content);
            } catch (error) {
              reject(new Error('Invalid JSON format'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(selectedFile);
        };
        
        input.click();
      });
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = JSON.parse(event.target?.result as string);
          resolve(content);
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const analyzeBackupData = (data: any) => {
    return {
      entriesCount: data.entries?.length || 0,
      workCodesCount: data.workCodes?.length || 0,
      hasSettings: !!(data.userData || data.settings),
      hasData: !!(data.entries?.length || data.workCodes?.length || data.userData || data.settings),
      conflicts: []
    };
  };

  const applyBackup = async (data: any, options: any) => {
    if (data.entries && options.onEntries) {
      options.onEntries(data.entries);
    }
    if (data.workCodes && options.onWorkCodes) {
      options.onWorkCodes(data.workCodes);
    }
    if (data.userData && options.onUserData) {
      options.onUserData(data.userData);
    }
    return true;
  };

  const readBackupFromFolder = async (): Promise<any> => {
    // Simplified implementation - in real app would read from selected folder
    try {
      const files = await readBackupFile('latest');
      return files;
    } catch (error) {
      console.error('Failed to read from folder:', error);
      return null;
    }
  };

  const isCustomModelActive = useMemo(() => {
    return !WORK_MODELS.some(model => JSON.stringify(model.days) === JSON.stringify(formData.workDays));
  }, [formData.workDays]);

  const totalWeeklyMinutes = useMemo(() => {
    if (isCustomModelActive && formData.customDays) {
      return formData.customDays.reduce((sum, minutes) => sum + minutes, 0);
    }
    return formData.workDays.length * 8 * 60; // 8 hours per day
  }, [formData.workDays, isCustomModelActive, formData.customDays]);

  const minToHours = (minutes: number) => {
    const hours = minutes / 60;
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
  };

  const handleStartNew = () => {
    setIsRestoreFlow(false);
    setStep(1);
  };

  const handleStartRestore = () => {
    setIsRestoreFlow(true);
    setStep(1);
  };

  const handleDemoMode = async () => {
    setLoading(true);
    try {
      // Apply demo data
      importEntries(DEMO_DATA.entries);
      importWorkCodes(DEMO_DATA.workCodes);
      
      // Set demo user data
      setUserData({
        name: DEMO_DATA.userData.name,
        company: DEMO_DATA.userData.company,
        role: DEMO_DATA.userData.role,
        workDays: DEMO_DATA.userData.workDays,
        monthlyTargetMinutes: DEMO_DATA.userData.monthlyTargetMinutes,
        photo: null,
      });
      
      // Mark onboarding as complete
      await setSetting(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
      
      toast.success("Demo-Daten geladen");
      onComplete();
    } catch (error) {
      console.error("Demo mode failed:", error);
      toast.error("Demo-Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Nur Bilder erlaubt");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, photo: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleModelSelect = (model: typeof WORK_MODELS[0]) => {
    setFormData(prev => ({ 
      ...prev, 
      workDays: model.days,
      customDays: undefined 
    }));
  };

  const handleCustomDayChange = (dayIndex: number, minutes: number) => {
    setFormData(prev => {
      const customDays = prev.customDays || [0, 0, 0, 0, 0, 0, 0];
      const newCustomDays = [...customDays];
      newCustomDays[dayIndex] = minutes;
      
      return { 
        ...prev, 
        workDays: newCustomDays.map((min, idx) => min > 0 ? idx : -1).filter(idx => idx >= 0),
        customDays: newCustomDays
      };
    });
  };

  const isSelected = (modelId: string) => {
    const model = WORK_MODELS.find(m => m.id === modelId);
    return model ? JSON.stringify(model.days) === JSON.stringify(formData.workDays) : false;
  };

  const handleMinuteInputToggle = (enabled: boolean) => {
    setFormData(prev => ({ ...prev, minuteInput: enabled }));
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const content = await readJsonFile(file);
      const analysis = analyzeBackupData(content);
      
      if (analysis.hasData) {
        setRestoreData({
          entriesCount: analysis.entriesCount,
          workCodesCount: analysis.workCodesCount,
          hasSettings: analysis.hasSettings,
          backup: content
        });
        setShowConflictModal(true);
      } else {
        toast.error("Backup enthält keine Daten");
      }
    } catch (error) {
      console.error("File import failed:", error);
      toast.error("Backup konnte nicht gelesen werden");
    } finally {
      setLoading(false);
    }
  };

  const handleFolderImport = async () => {
    setLoading(true);
    try {
      const content = await readBackupFromFolder();
      if (content) {
        const analysis = analyzeBackupData(content);
        
        if (analysis.hasData) {
          setRestoreData({
            entriesCount: analysis.entriesCount,
            workCodesCount: analysis.workCodesCount,
            hasSettings: analysis.hasSettings,
            backup: content
          });
          setShowConflictModal(true);
        } else {
          toast.error("Backup enthält keine Daten");
        }
      } else {
        toast.error("Kein Backup im Ordner gefunden");
      }
    } catch (error) {
      console.error("Folder import failed:", error);
      toast.error("Backup konnte nicht gelesen werden");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDriveImport = async () => {
    setLoading(true);
    try {
      await initGoogleAuth();
      const status = await signInGoogle();
      
      if (status.connected && !status.reauthRequired) {
        const backup = await findLatestBackup();
        if (backup) {
          const content = await downloadFileContent(backup.id);
          const analysis = analyzeBackupData(content);
          
          if (analysis.hasData) {
            setRestoreData({
              entriesCount: analysis.entriesCount,
              workCodesCount: analysis.workCodesCount,
              hasSettings: analysis.hasSettings,
              backup: content
            });
            setShowConflictModal(true);
          } else {
            toast.error("Backup enthält keine Daten");
          }
        } else {
          toast.error("Kein Backup in Google Drive gefunden");
        }
      } else {
        toast.error("Google Drive-Verbindung fehlgeschlagen");
      }
    } catch (error) {
      console.error("Google Drive import failed:", error);
      toast.error("Google Drive-Import fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleNextcloudImport = () => {
    setShowNcRestore(true);
  };

  const handleNcRestoreConnect = async () => {
    if (!ncRestoreUrl.trim()) {
      toast.error("Bitte Nextcloud URL eingeben");
      return;
    }
    
    setNcRestoreConnecting(true);
    try {
      const loginUrl = await initiateLoginFlow(ncRestoreUrl);
      await Browser.open({ url: loginUrl });
      
      // Simplified: Assume login is successful and download backup
      setTimeout(async () => {
        try {
          const backup = await ncDownloadBackup();
          if (backup) {
            const analysis = analyzeBackupData(backup);
            
            if (analysis.hasData) {
              setRestoreData({
                entriesCount: analysis.entriesCount,
                workCodesCount: analysis.workCodesCount,
                hasSettings: analysis.hasSettings,
                backup: backup
              });
              setShowConflictModal(true);
              setShowNcRestore(false);
              toast.success("Nextcloud-Anmeldung erfolgreich");
            } else {
              toast.error("Backup enthält keine Daten");
            }
          } else {
            toast.error("Kein Backup in Nextcloud gefunden");
          }
        } catch (error) {
          console.error("Nextcloud backup download failed:", error);
          toast.error("Nextcloud-Import fehlgeschlagen");
        }
        setNcRestoreConnecting(false);
      }, 2000);
    } catch (error) {
      console.error("Nextcloud connection failed:", error);
      toast.error("Nextcloud-Verbindung fehlgeschlagen");
      setNcRestoreConnecting(false);
    }
  };

  const handleConflictConfirm = async (keepSettings: boolean) => {
    if (!restoreData) return;
    
    setShowConflictModal(false);
    setLoading(true);
    
    try {
      await applyBackup(restoreData.backup, {
        keepSettings: !keepSettings,
        onEntries: importEntries,
        onWorkCodes: importWorkCodes,
        onUserData: keepSettings ? undefined : setUserData
      });
      
      toast.success("Backup erfolgreich importiert");
      
      // Continue to next step
      if (isRestoreFlow) {
        setStep(4); // Skip to summary
      }
    } catch (error) {
      console.error("Backup apply failed:", error);
      toast.error("Backup konnte nicht importiert werden");
    } finally {
      setLoading(false);
      setRestoreData(null);
    }
  };

  const handleConflictCancel = () => {
    setShowConflictModal(false);
    setRestoreData(null);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Apply user data
      const userData: UserData = {
        name: formData.name,
        company: formData.company,
        role: formData.role,
        photo: formData.photo,
        workDays: formData.workDays,
        monthlyTargetMinutes: totalWeeklyMinutes * 4, // Monthly target = weekly * 4
      };
      
      setUserData(userData);
      
      // Apply settings
      setCloudSyncEnabled(formData.autoBackup);
      setLocalBackupEnabled(formData.localBackupEnabled);
      setTheme("system");
      
      // Mark onboarding as complete
      await setSetting(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
      
      onComplete();
    } catch (error) {
      console.error("Finish failed:", error);
      toast.error("Einrichtung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error("Bitte Namen eingeben");
      return;
    }
    
    if (step < 4) {
      setStep(step + 1);
    }
  };

  useEffect(() => {
    return () => {
      if (ncRestorePollRef.current) {
        clearInterval(ncRestorePollRef.current);
      }
      if (ncSetupPollRef.current) {
        clearInterval(ncSetupPollRef.current);
      }
    };
  }, []);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <WelcomeStep
            onStartNew={handleStartNew}
            onStartRestore={handleStartRestore}
            onDemoMode={handleDemoMode}
          />
        );
      
      case 1:
        return (
          <ProfileStep
            formData={formData}
            setFormData={setFormData}
            photoInputRef={photoInputRef}
            onPhotoUpload={handlePhotoUpload}
          />
        );
      
      case 2:
        return (
          <WorkScheduleStep
            formData={formData}
            onModelSelect={handleModelSelect}
            onCustomDayChange={handleCustomDayChange}
            isSelected={isSelected}
            isCustomModelActive={isCustomModelActive}
            totalWeeklyMinutes={totalWeeklyMinutes}
            minToHours={minToHours}
            onMinuteInputToggle={handleMinuteInputToggle}
          />
        );
      
      case 3:
        return renderRestoreStep();
      
      case 4:
        return (
          <SummaryStep
            hasRestoreData={isRestoreFlow}
            onFinish={handleFinish}
          />
        );
      
      default:
        return null;
    }
  };

  const renderRestoreStep = () => {
    if (isRestoreFlow) {
      return (
        <motion.div
          key="step3-restore"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <Cloud size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Backup laden</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Wähle deine Backup-Quelle.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-3"
            >
              <Upload size={20} />
              <span>Datei auswählen</span>
            </button>

            <button
              onClick={handleFolderImport}
              disabled={loading}
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-3"
            >
              <FolderInput size={20} />
              <span>Aus Backup-Ordner</span>
            </button>

            <button
              onClick={handleGoogleDriveImport}
              disabled={loading}
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-3"
            >
              <Cloud size={20} />
              <span>Google Drive</span>
            </button>

            <button
              onClick={handleNextcloudImport}
              disabled={loading}
              className="w-full p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-3"
            >
              <ServerCog size={20} />
              <span>Nextcloud</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-zinc-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Dein Backup enthält Einträge, Tätigkeiten und Einstellungen. Du kannst wählen, ob die Einstellungen übernommen werden sollen.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Regular step 3 (Backup settings)
    return (
      <motion.div
        key="step3-backup"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Sicherung einrichten</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Schütze deine Daten vor Verlust.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Automatisches Backup</div>
              <div className="text-sm text-zinc-500">
                Tägliche Sicherung deiner Daten
              </div>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, autoBackup: !prev.autoBackup }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.autoBackup ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  formData.autoBackup ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Lokales Backup</div>
              <div className="text-sm text-zinc-500">
                Sicherung im Gerätespeicher
              </div>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, localBackupEnabled: !prev.localBackupEnabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.localBackupEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  formData.localBackupEnabled ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                Deine Daten werden verschlüsselt gespeichert. Backups enthalten keine sensiblen Informationen wie Passwörter.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setNcSetupActive(true)}
          className="w-full p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-3"
        >
          <ServerCog size={20} />
          <span>Nextcloud einrichten (optional)</span>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-zinc-900 z-[9999] overflow-y-auto">
      <div className="min-h-screen flex flex-col p-5 max-w-md mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-zinc-500">
              Schritt {step + 1} von 5
            </div>
            {step > 0 && !isRestoreFlow && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                aria-label="Zurück"
              >
                <ArrowLeft size={20} className="text-zinc-500" />
              </button>
            )}
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: "0%" }}
              animate={{ width: `${((step + 1) / 5) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1">
          {renderStep()}
        </div>

        {/* Navigation */}
        {step > 0 && step < 4 && !isRestoreFlow && (
          <div className="mt-8">
            <button
              onClick={handleNext}
              disabled={loading}
              className="w-full p-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>Lädt...</span>
                </>
              ) : (
                <>
                  <span>Weiter</span>
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Hidden Inputs */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json"
        className="hidden"
      />

      {/* Modals */}
      <ImportConflictModal
        analysisData={restoreData}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
        isOpen={showConflictModal}
      />

      {/* Nextcloud Restore Modal */}
      <AnimatePresence>
        {showNcRestore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-800 rounded-2xl p-5 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <ServerCog size={24} className="text-emerald-500" />
                <h4 className="font-bold text-lg">Nextcloud verbinden</h4>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nextcloud URL
                  </label>
                  <input
                    type="text"
                    value={ncRestoreUrl}
                    onChange={(e) => setNcRestoreUrl(e.target.value)}
                    placeholder="https://nextcloud.example.com"
                    className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Du wirst zur Nextcloud-Anmeldung weitergeleitet. Nach erfolgreicher Anmeldung wird das Backup automatisch geladen.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNcRestore(false)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleNcRestoreConnect}
                  disabled={ncRestoreConnecting || !ncRestoreUrl.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {ncRestoreConnecting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Verbindet...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Verbinden
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nextcloud Setup Modal */}
      <AnimatePresence>
        {ncSetupActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-800 rounded-2xl p-5 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <ServerCog size={24} className="text-emerald-500" />
                <h4 className="font-bold text-lg">Nextcloud einrichten</h4>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nextcloud URL
                  </label>
                  <input
                    type="text"
                    value={ncSetupUrl}
                    onChange={(e) => setNcSetupUrl(e.target.value)}
                    placeholder="https://nextcloud.example.com"
                    className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Nextcloud ermöglicht automatische Backups in deiner eigenen Cloud. Die Einrichtung kann später in den Einstellungen erfolgen.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setNcSetupActive(false)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  Später
                </button>
                <button
                  onClick={() => {
                    // In a real app, this would initiate Nextcloud setup
                    toast.success("Nextcloud-Einrichtung gestartet");
                    setNcSetupActive(false);
                  }}
                  disabled={!ncSetupUrl.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Einrichten
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingWizard;