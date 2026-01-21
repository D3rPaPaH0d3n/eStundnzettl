import React, { useState, useRef, useEffect, useMemo } from "react";
import { User, Briefcase, ShieldCheck, Camera, ChevronRight, Check, Upload, Play, Cloud, Loader, CloudLightning, FolderInput, ArrowLeft, RefreshCw, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { initGoogleAuth, signInGoogle, findLatestBackup, downloadFileContent } from "../utils/googleDrive";
import { analyzeBackupData, applyBackup, readJsonFile, readBackupFromFolder, selectBackupFolder } from "../utils/storageBackup";
import ImportConflictModal from "./ImportConflictModal";
import { WORK_MODELS, STORAGE_KEYS } from "../hooks/constants";

const OnboardingWizard = ({ onComplete }) => {
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
    localBackupEnabled: false 
  });
  
  const [restoreData, setRestoreData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    initGoogleAuth().catch(() => console.log("Google Auth Init failed silently/already initialized"));
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
        console.error(error);
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
        console.error(error);
        toast.error("Auswahl abgebrochen");
      }
    } else {
      setFormData(p => ({...p, localBackupEnabled: false}));
    }
  };

  // --- FINISH (BUGFIX: Persistenz korrigiert) ---
  const finishSetup = () => {
    // 1. User Daten speichern
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
      name: formData.name,
      company: formData.company,
      role: formData.role,
      position: formData.role, 
      photo: formData.photo,
      workDays: formData.workDays,
      // Legacy settings im User-Objekt (optional, für Rückwärtskompatibilität)
      settings: {
        autoBackup: formData.autoBackup,
        theme: 'system' 
      }
    }));

    // 2. Backup-Einstellungen EXPLIZIT setzen (Single Source of Truth)
    // Damit useSettings und useAutoBackup den Status sofort erkennen
    if (formData.autoBackup) {
        localStorage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, "true");
    } else {
        localStorage.removeItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED);
    }

    if (formData.localBackupEnabled) {
        localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED, "true");
    } else {
        localStorage.removeItem(STORAGE_KEYS.LOCAL_BACKUP_ENABLED);
    }

    // 3. Theme Default setzen
    localStorage.setItem(STORAGE_KEYS.THEME, 'system');

    if (restoreData) {
       applyBackup(restoreData);
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

      const { isValid, data } = analyzeBackupData(content);
      if (isValid) {
        setRestoreData(data);
        toast.success("Backup geladen!");
        setStep(4);
      } else {
        toast.error("Format ungültig.");
      }
    } catch (err) {
      console.error(err);
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
          const { isValid, data } = analyzeBackupData(backupContent);
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
    } catch (error) {
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
      const { isValid, data } = analyzeBackupData(content);
      if (isValid) {
        setRestoreData(data);
        toast.success("Backup geladen!");
        setStep(4);
      } else {
        toast.error("Ungültiges Format.");
      }
    } catch (error) {
      toast.error("Datei konnte nicht gelesen werden.");
    } finally {
      setLoading(false);
      e.target.value = null;
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
              <motion.div 
                key="step0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 flex flex-col items-center justify-center h-full py-6"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                    <img src="/icon.png" alt="Logo" className="w-12 h-12 brightness-0 invert" onError={(e) => e.target.style.display='none'} /> 
                    <ShieldCheck size={40} className="text-white absolute" style={{opacity: 0.2}}/>
                  </div>
                  <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    eStundnzettl
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto">
                    Die moderne Zeiterfassung für Profis. Wie möchtest du starten?
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <button 
                    onClick={handleStartNew}
                    className="w-full p-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    <Play size={20} fill="currentColor" />
                    Neu starten
                  </button>

                  <button 
                    onClick={handleStartRestore}
                    className="w-full p-5 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold text-lg hover:border-emerald-200 dark:hover:border-zinc-600 hover:bg-emerald-50/50 dark:hover:bg-zinc-700/50 transition-all flex items-center justify-center gap-3"
                  >
                    <RefreshCw size={20} />
                    Backup laden
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCHRITT 1: PROFIL */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <User size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Dein Profil</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Wer nutzt die App?</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div 
                      onClick={() => photoInputRef.current?.click()}
                      className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-700 border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center cursor-pointer overflow-hidden relative group"
                    >
                      {formData.photo ? (
                        <img src={formData.photo} alt="Profil" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-white" />
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400">Profilbild (optional)</span>
                    <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Dein Name</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-bold text-zinc-900 dark:text-white"
                        placeholder="Max Mustermann"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Firma</label>
                      <div className="relative">
                        <input 
                            type="text" 
                            value={formData.company}
                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                            className="w-full p-4 pl-12 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200"
                            placeholder="Firmenname GmbH"
                        />
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Tätigkeit / Anstellung</label>
                      <input 
                        type="text" 
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none transition-all font-medium text-zinc-800 dark:text-zinc-200"
                        placeholder="z.B. Monteur, Techniker, Büro..."
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCHRITT 2: ARBEITSZEIT */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                 <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                    <Briefcase size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Arbeitszeit</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Wähle dein Modell.</p>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {WORK_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                        isSelected(model.days)
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="font-bold text-zinc-800 dark:text-white">{model.label}</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">{model.description}</div>
                      {isSelected(model.days) && (
                        <div className="absolute top-4 right-4 text-blue-500">
                          <Check size={20} />
                        </div>
                      )}
                    </button>
                  ))}
                  
                  {isCustomModelActive && (
                      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                              <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">Tagesstunden anpassen</h3>
                              <div className="space-y-3">
                                  {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((dayName, idx) => (
                                      <div key={idx} className="flex items-center gap-3">
                                          <span className={`text-xs font-bold w-6 ${idx === 0 || idx === 6 ? 'text-red-400' : 'text-zinc-500'}`}>{dayName}</span>
                                          <input 
                                            type="range" 
                                            min="0" max="720" step="15"
                                            value={formData.workDays[idx]}
                                            onChange={(e) => handleCustomDayChange(idx, e.target.value)}
                                            className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                          />
                                          <span className="text-xs font-mono font-bold w-12 text-right">{minToHours(formData.workDays[idx])}</span>
                                      </div>
                                  ))}
                              </div>
                              <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                                  <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Wochenstunden:</span>
                                  <span className="text-lg font-bold text-emerald-500">{minToHours(totalWeeklyMinutes)}</span>
                              </div>
                          </div>
                      </div>
                  )}
                </div>
              </motion.div>
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
               <motion.div 
               key="step4"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="space-y-6 text-center py-4"
             >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300">
                  <Check size={40} strokeWidth={3} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Alles bereit!</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {restoreData 
                      ? "Daten erfolgreich wiederhergestellt." 
                      : "Dein Profil wurde erfolgreich erstellt."}
                  </p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={finishSetup}
                    className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    App starten <Play size={20} fill="currentColor" />
                  </button>
                </div>
             </motion.div>
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