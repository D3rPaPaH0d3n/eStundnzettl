import React, { useState, useRef, useEffect, useMemo } from "react";
import { ShieldCheck, ChevronRight, Check, Upload, Cloud, Loader, CloudLightning, FolderInput, ArrowLeft, ServerCog, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "./Onboarding/steps/WelcomeStep";
import ProfileStep from "./Onboarding/steps/ProfileStep";
import WorkScheduleStep from "./Onboarding/steps/WorkScheduleStep";
import SummaryStep from "./Onboarding/steps/SummaryStep";
import toast from "react-hot-toast";
import { initGoogleAuth, signInGoogle, findLatestBackup, downloadFileContent } from "../utils/googleDrive";
import { downloadBackup as ncDownloadBackup, initiateLoginFlow, pollLoginResult, getNextcloudErrorMessage, resolveUserId } from "../utils/nextcloudClient";
import { Browser } from "@capacitor/browser";
import { analyzeBackupData, applyBackup, readJsonFile, readBackupFromFolder, selectBackupFolder } from "../utils/storageBackup";
import ImportConflictModal from "./ImportConflictModal";
import { WORK_MODELS } from "../hooks/constants";
import { DEMO_DATA } from "../utils/demoData";
import { setSetting } from "../db/repositories/settingsRepo";
import { obfuscate } from "../utils/obfuscate";
import { bulkReplaceWorkCodes } from "../db/repositories/workCodesRepo";
import { bulkInsertEntries } from "../db/repositories/entriesRepo";
import { logger } from "../utils/logger";

const log = logger.scope("Onboarding");

const OnboardingWizard = ({ onComplete, setUserData, importEntries, importWorkCodes, setCloudSyncEnabled, setLocalBackupEnabled, setTheme }) => {
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [isRestoreFlow, setIsRestoreFlow] = useState(false); 

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    role: "", 
    photo: null,
    workDays: WORK_MODELS[0].days, 
    autoBackup: false,
    localBackupEnabled: false,
    minuteInput: false,
  });
  
  const [restoreData, setRestoreData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  const [showNcRestore, setShowNcRestore] = useState(false);
  const [ncRestoreUrl, setNcRestoreUrl] = useState("");
  const [ncRestoreConnecting, setNcRestoreConnecting] = useState(false);
  const ncRestorePollRef = useRef(null);

  // Nextcloud Setup State (for new setup flow)
  const [ncSetupActive, setNcSetupActive] = useState(false);
  const [ncSetupUrl, setNcSetupUrl] = useState("");
  const [ncSetupConnecting, setNcSetupConnecting] = useState(false);
  const [ncSetupConnected, setNcSetupConnected] = useState(false);
  const [ncCredentials, setNcCredentials] = useState(null);
  const ncSetupPollRef = useRef(null);

  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    initGoogleAuth().catch(() => log.debug("Google Auth Init failed silently/already initialized"));
    return () => {
      if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
      if (ncSetupPollRef.current) clearInterval(ncSetupPollRef.current);
    };
  }, []);

  // --- NAVIGATION ---
  const handleStartNew = () => {
    setIsRestoreFlow(false);
    setStep(1); 
  };

  const handleStartRestore = () => {
    setIsRestoreFlow(true);
    setStep(3); 
  };

  const handleDemoMode = async () => {
    const demoEntries = DEMO_DATA.generateEntries();

    try {
      await setSetting("user", DEMO_DATA.user);
      await bulkReplaceWorkCodes(DEMO_DATA.workCodes);
      await bulkInsertEntries(demoEntries);
    } catch (err) {
      log.error("Demo SQLite write failed:", err);
    }

    setUserData?.(DEMO_DATA.user);
    importWorkCodes?.(DEMO_DATA.workCodes);
    importEntries?.(demoEntries);
    toast.success("Demo-Daten geladen! Du kannst die App jetzt ausprobieren.");
    onComplete();
  };

  const nextStep = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error("Bitte gib deinen Namen ein.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (step === 3 && isRestoreFlow) {
      setStep(0);
    } else {
      setStep(prev => prev - 1);
    }
  };

  // --- HANDLER ---
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelSelect = (model) => {
    const days = model.days || [0, 0, 0, 0, 0, 0, 0];
    setFormData({ ...formData, workDays: days });
  };

  const handleCustomDayChange = (dayIndex, value) => {
    const newDays = [...formData.workDays];
    newDays[dayIndex] = parseInt(value) || 0;
    setFormData({ ...formData, workDays: newDays });
  };

  const minToHours = (m) => (m / 60).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' h';
  const totalWeeklyMinutes = formData.workDays.reduce((a, b) => a + b, 0);

  // --- BACKUP SETUP HANDLER ---
  const handleAutoBackupToggle = async () => {
    const newValue = !formData.autoBackup;
    
    if (newValue) {
      try {
        await signInGoogle();
        toast.success("Verknüpfung erfolgreich!");
        // Erst setzen wenn Login erfolgreich war
        setFormData(p => ({...p, autoBackup: true}));
      } catch (error) {
        log.error(error);
        toast("Anmeldung abgebrochen oder fehlgeschlagen.", { icon: "⚠️" });
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
          toast.success("Ordner verknüpft!");
        }
      } catch (error) {
        log.error(error);
        toast.error("Auswahl abgebrochen");
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
      toast("Nextcloud getrennt");
      return;
    }
    setNcSetupActive(!ncSetupActive);
  };

  const handleNextcloudSetup = async () => {
    if (!ncSetupUrl) {
      toast.error("Bitte Server-URL eingeben");
      return;
    }
    try {
      setNcSetupConnecting(true);
      const startResult = await initiateLoginFlow(ncSetupUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const { loginUrl, token, pollEndpoint } = startResult;
      await Browser.open({ url: loginUrl });

      let attempts = 0;
      ncSetupPollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          clearInterval(ncSetupPollRef.current);
          ncSetupPollRef.current = null;
          setNcSetupConnecting(false);
          toast.error("Zeitüberschreitung — bitte erneut versuchen");
          return;
        }
        try {
          const result = await pollLoginResult(pollEndpoint, token);
          if (!result.ok) {
            throw new Error(getNextcloudErrorMessage(result));
          }

          if (result.status === 'pending') return;

          if (result.status === 'complete') {
            clearInterval(ncSetupPollRef.current);
            ncSetupPollRef.current = null;
            try { await Browser.close(); } catch {}
            
            const userId = await resolveUserId(result.server, result.loginName, result.appPassword);
            setNcCredentials({
              server: result.server.replace(/\/+$/, ''),
              userId,
              loginName: result.loginName,
              appPassword: result.appPassword,
            });
            setNcSetupConnected(true);
            setNcSetupConnecting(false);
            toast.success("Nextcloud verbunden!");
          }
        } catch (error) {
          clearInterval(ncSetupPollRef.current);
          ncSetupPollRef.current = null;
          setNcSetupConnecting(false);
          toast.error(error?.message || "Nextcloud Login fehlgeschlagen");
        }
      }, 3000);
    } catch (error) {
      setNcSetupConnecting(false);
      toast.error(error?.message || "Server nicht erreichbar");
    }
  };

  const handleMinuteInputToggle = () => {
    setFormData(p => ({...p, minuteInput: !p.minuteInput}));
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
      minuteInput: formData.minuteInput,
      settings: {
        autoBackup: formData.autoBackup,
        theme: 'system'
      }
    };
    
    // FIX: Zuerst direkt in SQLite schreiben, DANN State updaten
    try {
      // Direkt in SQLite schreiben (synchronisiert mit localStorage via useSettings)
      await setSetting("user", userDataToSave);
    } catch {
      // Fortfahren, useSettings wird es in localStorage schreiben
    }
    
    // Nextcloud Credentials speichern
    if (ncCredentials) {
      try {
        const encryptedPass = await obfuscate(ncCredentials.appPassword);
        await setSetting("nextcloud_url", ncCredentials.server);
        await setSetting("nextcloud_user", ncCredentials.userId);
        await setSetting("nextcloud_pass", encryptedPass);
        await setSetting("nextcloud_enabled", true);
        // Auch in localStorage für sofortige Verfügbarkeit (Keys MÜSSEN mit STORAGE_KEYS übereinstimmen!)
        localStorage.setItem("estundnzettl_nextcloud_url", ncCredentials.server);
        localStorage.setItem("estundnzettl_nextcloud_user", ncCredentials.userId);
        localStorage.setItem("estundnzettl_nextcloud_pass", encryptedPass);
        localStorage.setItem("estundnzettl_nextcloud_enabled", "true");
      } catch (err) {
        log.error("Nextcloud settings save failed:", err);
      }
    }

    // Jetzt State updaten (useSettings wird auch in localStorage schreiben)
    setUserData?.(userDataToSave);
    setCloudSyncEnabled?.(formData.autoBackup);
    setLocalBackupEnabled?.(formData.localBackupEnabled);
    setTheme?.('system');

    if (restoreData) {
      await applyBackup(restoreData);
      toast.success("Daten wiederhergestellt!");
    } else {
      toast.success("Willkommen!");
    }

    onComplete();
  };

  // --- RESTORE LOGIC ---
  const handleGoogleDriveRestore = async () => {
    try {
      setLoading(true);
      const user = await signInGoogle();
      if (!user) throw new Error("Anmeldung fehlgeschlagen");

      const token = user.authentication?.accessToken;
      if (!token) throw new Error("Kein Zugriffstoken erhalten");

      // Nutzt jetzt automatisch die neue Logik aus googleDrive.js (inkl. Legacy Fallback)
      const file = await findLatestBackup(token);
      if (!file) throw new Error("Kein Backup gefunden.");

      const content = await downloadFileContent(token, file.id);
      if (!content) throw new Error("Backup leer.");

      const { isValid, data } = await analyzeBackupData(content);
      if (isValid) {
        setRestoreData(data);
        toast.success("Backup geladen!");
        setStep(4);
      } else {
        toast.error("Format ungültig.");
      }
    } catch (err) {
      log.error(err);
      toast.error(err.message || "Fehler beim Laden");
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
              toast.success("Backup geladen!");
              setStep(4);
          } else {
              toast.error("Ungültiges Backup.");
          }
      } else {
          toast.error("Kein Backup gefunden.");
      }
    } catch {
        toast.error("Fehler beim Zugriff.");
    } finally {
        setLoading(false);
    }
  };

  const handleLocalFileRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const content = await readJsonFile(file);
      const { isValid, data } = await analyzeBackupData(content);
      if (isValid) {
        if (data.integrity === "mismatch") {
          toast("⚠️ Prüfsumme stimmt nicht — Backup wurde möglicherweise verändert", { duration: 6000 });
        }
        setRestoreData(data);
        toast.success("Backup geladen!");
        setStep(4);
      } else {
        toast.error("Ungültiges Format.");
      }
    } catch {
      toast.error("Datei konnte nicht gelesen werden.");
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleNextcloudRestore = async () => {
    if (!ncRestoreUrl) {
      toast.error("Bitte Server-URL eingeben");
      return;
    }
    try {
      setNcRestoreConnecting(true);
      const startResult = await initiateLoginFlow(ncRestoreUrl);
      if (!startResult.ok) {
        throw new Error(getNextcloudErrorMessage(startResult));
      }

      const { loginUrl, token, pollEndpoint } = startResult;
      await Browser.open({ url: loginUrl });

      let attempts = 0;
      ncRestorePollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          clearInterval(ncRestorePollRef.current);
          setNcRestoreConnecting(false);
          toast.error("Zeitüberschreitung — bitte erneut versuchen");
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
            clearInterval(ncRestorePollRef.current);
            try { await Browser.close(); } catch {}
            setNcRestoreConnecting(false);
            setLoading(true);
            try {
              const userId = await resolveUserId(result.server, result.loginName, result.appPassword);
              const content = await ncDownloadBackup(result.server, userId, result.appPassword);
              if (!content) {
                toast.error("Kein Backup auf Nextcloud gefunden");
                setLoading(false);
                return;
              }
              const { isValid, data } = await analyzeBackupData(content);
              if (isValid) {
                setRestoreData(data);
                toast.success("Backup von Nextcloud geladen!");
                setShowNcRestore(false);
                setStep(4);
              } else {
                toast.error("Ungültiges Backup-Format");
              }
            } catch (err) {
              toast.error(err.message || "Fehler beim Laden");
            } finally {
              setLoading(false);
            }
          }
        } catch (error) {
          clearInterval(ncRestorePollRef.current);
          setNcRestoreConnecting(false);
          toast.error(error?.message || "Nextcloud Login fehlgeschlagen");
        }
      }, 3000);
    } catch (error) {
      setNcRestoreConnecting(false);
      toast.error(error?.message || "Server nicht erreichbar oder Login Flow v2 nicht unterstützt");
    }
  };

  const isSelected = (modelDays) => {
     const current = JSON.stringify(formData.workDays);
     const target = modelDays ? JSON.stringify(modelDays) : JSON.stringify([0,0,0,0,0,0,0]);
     return current === target;
  };

  const isCustomModelActive = useMemo(() => {
      const isStandard = WORK_MODELS.some(m => m.id !== 'custom' && JSON.stringify(m.days) === JSON.stringify(formData.workDays));
      return !isStandard; 
  }, [formData.workDays]);


  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 z-50 flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {step > 0 && (
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-700 w-full">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 4) * 100}%` }}
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
                photoInputRef={photoInputRef}
                onPhotoUpload={handlePhotoUpload}
              />
            )}

            {/* SCHRITT 2: ARBEITSZEIT */}
            {step === 2 && (
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
            )}

            {/* SCHRITT 3: BACKUP / DATEN */}
            {step === 3 && (
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
                    {isRestoreFlow ? "Daten laden" : "Backup & Sicherheit"}
                 </h2>
                 <p className="text-zinc-500 dark:text-zinc-400">
                    {isRestoreFlow ? "Wo liegt dein Backup?" : "Sichere deine Daten."}
                 </p>
               </div>

               <div className="space-y-4">
                 
                 {/* FALL A: EINRICHTUNG */}
                 {!isRestoreFlow && (
                   <>
                     {/* 1. CLOUD BACKUP */}
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
                                <div className="font-bold text-zinc-800 dark:text-white">Google Drive Backup</div>
                                <div className="text-xs text-zinc-500">Tägliche Sicherung in der Cloud</div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            formData.autoBackup ? "border-blue-500 bg-blue-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {formData.autoBackup && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>

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
                                <div className="font-bold text-zinc-800 dark:text-white">Lokales Auto-Backup</div>
                                <div className="text-xs text-zinc-500">Täglich in Dokumente/eStundnzettl</div>
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
                                <div className="font-bold text-zinc-800 dark:text-white">Nextcloud Backup</div>
                                <div className="text-xs text-zinc-500">
                                  {ncSetupConnected 
                                    ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <CheckCircle2 size={12} /> Verbunden als {ncCredentials?.loginName || ncCredentials?.userId}
                                      </span>
                                    : "Automatische Sicherung auf deiner Cloud"}
                                </div>
                             </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            ncSetupConnected ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 dark:border-zinc-500"
                          }`}>
                            {ncSetupConnected && <Check size={14} strokeWidth={3} />}
                          </div>
                      </div>

                      {/* Nextcloud Setup Expanded */}
                      {ncSetupActive && !ncSetupConnected && (
                        <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 space-y-2">
                          {ncSetupConnecting ? (
                            <div className="flex flex-col items-center gap-2 py-3">
                              <Loader size={20} className="animate-spin text-orange-500" />
                              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                Warte auf Anmeldung in Nextcloud...
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
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <>
                              <input
                                type="url"
                                value={ncSetupUrl}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setNcSetupUrl(e.target.value)}
                                placeholder="https://cloud.example.com"
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
                                Mit Nextcloud verbinden
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
                        <button
                          onClick={handleGoogleDriveRestore}
                          disabled={loading}
                          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                              {loading ? <Loader size={18} className="animate-spin text-zinc-400"/> : <Cloud size={18} className="text-blue-500" />}
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-sm text-zinc-800 dark:text-white">Aus Google Drive</div>
                            </div>
                        </button>

                        <button
                          onClick={() => setShowNcRestore(!showNcRestore)}
                          disabled={loading}
                          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                              <Cloud size={18} className="text-orange-500" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-sm text-zinc-800 dark:text-white">Aus Nextcloud</div>
                            </div>
                        </button>

                        {showNcRestore && (
                          <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 space-y-2">
                            {ncRestoreConnecting ? (
                              <div className="flex flex-col items-center gap-2 py-3">
                                <Loader size={20} className="animate-spin text-orange-500" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                  Warte auf Anmeldung in Nextcloud...
                                </span>
                                <button
                                  onClick={() => {
                                    if (ncRestorePollRef.current) clearInterval(ncRestorePollRef.current);
                                    setNcRestoreConnecting(false);
                                  }}
                                  className="mt-1 px-3 py-1 text-xs font-bold rounded-lg border border-zinc-300 bg-white text-zinc-700"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            ) : (
                              <>
                                <input
                                  type="url"
                                  value={ncRestoreUrl}
                                  onChange={(e) => setNcRestoreUrl(e.target.value)}
                                  placeholder="https://cloud.example.com"
                                  className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-800 dark:text-white outline-none"
                                />
                                <button
                                  onClick={handleNextcloudRestore}
                                  disabled={loading}
                                  className="w-full py-2 text-sm font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-1.5"
                                >
                                  {loading ? <Loader size={14} className="animate-spin" /> : null}
                                  {loading ? "Lade..." : "Mit Nextcloud verbinden"}
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
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Lokaler Ordner</span>
                            </button>

                            <div className="relative">
                                <input type="file" ref={fileInputRef} onChange={handleLocalFileRestore} className="hidden" accept=".json" />
                                <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="w-full h-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                                >
                                    <Upload size={20} className="text-purple-500" />
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Datei (.json)</span>
                                </button>
                            </div>
                        </div>
                    </div>
                 )}

               </div>
             </motion.div>
            )}

            {/* SCHRITT 4: FERTIG */}
            {step === 4 && (
              <SummaryStep hasRestoreData={!!restoreData} onFinish={finishSetup} />
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {step > 0 && step < 4 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-700 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 backdrop-blur-sm">
            
            <button 
              onClick={prevStep}
              className="px-4 py-2 font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={18} /> Zurück
            </button>

            {!isRestoreFlow && (
              <button 
                onClick={nextStep}
                className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-zinc-900/10"
              >
                Weiter <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}

      </div>
      
      <ImportConflictModal 
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onConfirm={() => {
            setShowConflictModal(false);
            setStep(4);
        }}
      />

    </div>
  );
};

export default OnboardingWizard;
