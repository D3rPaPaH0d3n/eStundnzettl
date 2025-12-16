import React, { useState, useRef, useEffect } from "react";
import { User, Briefcase, Calendar, Save, ShieldCheck, Camera, ChevronRight, Check, Upload, Play, Cloud, Loader, CloudLightning, FolderInput, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { initGoogleAuth, signInGoogle, findLatestBackup, downloadFileContent } from "../utils/googleDrive";
// WICHTIG: selectBackupFolder hinzugefügt für Schritt 3
import { analyzeBackupData, applyBackup, readJsonFile, selectBackupFolder } from "../utils/storageBackup";
import ImportConflictModal from "./ImportConflictModal";

// PRESETS DEFINITION (Unverändert)
const WORK_PRESETS = [
  {
    id: "kogler_standard",
    label: "Kogler Standard",
    sub: "Mo-Do 8,5h | Fr 4,5h",
    days: [0, 510, 510, 510, 510, 270, 0] 
  },
  {
    id: "full_40",
    label: "Klassisch 40h",
    sub: "Mo-Fr 8,0h",
    days: [0, 480, 480, 480, 480, 480, 0]
  },
  {
    id: "full_38_5",
    label: "Klassisch 38,5h",
    sub: "Mo-Fr 7,7h",
    days: [0, 462, 462, 462, 462, 462, 0]
  }
];

const OnboardingWizard = ({ onFinish, onRestore, initialData }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isCloudLoading, setIsCloudLoading] = useState(false); 
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);

  // State für das Import-Konflikt-Modal
  const [pendingImport, setPendingImport] = useState(null);

  // ZWISCHEN-SPEICHER (Standardmäßig autoBackup auf FALSE, damit User aktiv wählen muss)
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    position: initialData?.position || "", 
    photo: initialData?.photo || null,
    workProfileId: "kogler_standard",
    customDays: [...WORK_PRESETS[0].days],
    autoBackup: false // Änderung: Standardmäßig aus, User muss Ordner wählen
  });

  // Google Auth Init beim Start
  useEffect(() => {
    initGoogleAuth();
  }, []);

  // --- HELPER ---
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, photo: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // --- NEUE SCHRITT 3 LOGIK: ORDNER WÄHLEN ---
  const handleSelectBackupFolder = async () => {
    try {
      const success = await selectBackupFolder();
      if (success) {
        setFormData(prev => ({ ...prev, autoBackup: true }));
        toast.success("Ordner verknüpft! Backup aktiv.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Auswahl abgebrochen");
    }
  };

  // --- IMPORT LOGIK (BEIBEHALTEN) ---

  // 1. Zentrale Verarbeitungs-Funktion
  const processImportData = (data) => {
    const analysis = analyzeBackupData(data);
    
    if (!analysis.valid) {
      toast.error("❌ Ungültiges Backup-Format");
      return;
    }

    if (analysis.hasSettings) {
      // Konflikt: Backup enthält Settings -> Modal zeigen und User fragen
      setPendingImport(analysis);
    } else {
      // Kein Konflikt: Direkt wiederherstellen (Nur Einträge, da keine Settings da)
      applyBackup(analysis, 'ENTRIES_ONLY');
      toast.success("Einträge geladen! Bitte erstelle nun dein Profil.");
      setStep(1); 
    }
  };

  // 2. Entscheidung vom Modal (Alles oder nur Einträge)
  const confirmWizardImport = (mode) => {
    applyBackup(pendingImport, mode);
    
    if (mode === 'ALL') {
       // User + Einträge sind da -> Sofort ins Dashboard (kein Reload, via onRestore prop)
       const restoreData = {
          user: pendingImport.settings,
          entries: pendingImport.entries
       };
       setPendingImport(null);
       toast.success("Willkommen zurück!");
       onRestore(restoreData); 
    } else {
       // Nur Einträge importiert -> User fehlt noch -> Weiter zu Schritt 1
       setPendingImport(null);
       toast.success("Einträge importiert. Bitte vervollständige dein Profil.");
       setStep(1); 
    }
  };

  // 3. LOKALES BACKUP
  const handleBackupUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
        const json = await readJsonFile(file);
        processImportData(json);
    } catch (err) {
        console.error(err);
        toast.error("❌ Datei ungültig oder beschädigt.");
    }
    // Input resetten
    e.target.value = null; 
  };

  // 4. CLOUD BACKUP
  const handleCloudRestore = async () => {
    setIsCloudLoading(true);
    try {
        const user = await signInGoogle();
        if (!user || !user.authentication.accessToken) {
            throw new Error("Anmeldung fehlgeschlagen");
        }
        
        toast.loading("Suche Backup...", { id: "cloud_search" });

        const latestFile = await findLatestBackup(user.authentication.accessToken);
        
        if (!latestFile) {
            toast.dismiss("cloud_search");
            toast.error("Kein Backup in Google Drive gefunden.");
            localStorage.setItem("kogler_cloud_sync", "true");
            return;
        }

        toast.loading(`Lade Backup vom ${new Date(latestFile.createdTime).toLocaleDateString()}...`, { id: "cloud_search" });
        const jsonContent = await downloadFileContent(user.authentication.accessToken, latestFile.id);

        toast.dismiss("cloud_search");
        localStorage.setItem("kogler_cloud_sync", "true");
        
        processImportData(jsonContent);

    } catch (error) {
        console.error(error);
        toast.dismiss("cloud_search");
        toast.error("Cloud-Wiederherstellung fehlgeschlagen.");
    } finally {
        setIsCloudLoading(false);
    }
  };
  // --- IMPORT LOGIK ENDE ---


  const nextStep = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error("Bitte gib deinen Namen ein.");
      return;
    }
    setDirection(1);
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  const handlePresetSelect = (preset) => {
    setFormData(prev => ({ ...prev, workProfileId: preset.id, customDays: [...preset.days] }));
  };

  const handleCustomDayChange = (dayIndex, minutes) => {
    const newDays = [...formData.customDays];
    newDays[dayIndex] = parseInt(minutes) || 0;
    setFormData(prev => ({ ...prev, workProfileId: "custom", customDays: newDays }));
  };

  const finishSetup = () => { onFinish(formData); };
  const formatH = (m) => { const h = m / 60; return h.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " h"; };
  const totalWeeklyMinutes = formData.customDays.reduce((acc, curr) => acc + curr, 0);

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 })
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Das Modal für Import-Konflikte */}
      <ImportConflictModal 
        analysisData={pendingImport}
        onConfirm={confirmWizardImport}
        onCancel={() => setPendingImport(null)}
      />

      <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 dark:bg-orange-500 rounded-b-[3rem] shadow-2xl z-0" />
      
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
        
        {/* HEADER */}
        <div className="p-6 pb-2 text-center">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Willkommen! 👋</h1>
          {step > 0 && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Richten wir deine App kurz ein.</p>}
          
          {step > 0 && (
            <div className="flex justify-center gap-2 mt-4">
                {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-8 bg-orange-500" : "w-2 bg-slate-200 dark:bg-slate-700"}`} />
                ))}
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 relative overflow-hidden p-6">
          <AnimatePresence custom={direction} mode="wait">
            
            {/* SCHRITT 0: START-AUSWAHL (NEU DESIGNT) */}
            {step === 0 && (
              <motion.div key="step0" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="absolute inset-0 p-4 flex flex-col justify-center gap-6">
                
                {/* 1. Haupt-Aktion: Neu Starten */}
                <div className="space-y-3">
                    <p className="text-center text-slate-600 dark:text-slate-300 font-medium">Ich bin neu hier</p>
                    <button 
                        onClick={() => { setDirection(1); setStep(1); }}
                        className="group w-full p-6 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl shadow-xl shadow-orange-500/20 flex flex-col items-center gap-3 transition-all active:scale-95"
                    >
                        <div className="bg-white/20 p-4 rounded-full">
                            <Play size={32} fill="currentColor" />
                        </div>
                        <span className="font-black text-xl">App einrichten</span>
                    </button>
                </div>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase font-bold tracking-wider">oder Backup laden</span>
                    </div>
                </div>

                {/* 2. Sekundär: Wiederherstellen (Kompakter) */}
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleCloudRestore}
                        disabled={isCloudLoading}
                        className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 hover:border-blue-300 text-blue-700 dark:text-blue-300 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                    >
                        {isCloudLoading ? <Loader size={24} className="animate-spin" /> : <CloudLightning size={24} />}
                        <span className="font-bold text-sm">Google Drive</span>
                    </button>

                    <button 
                        onClick={() => backupInputRef.current?.click()}
                        className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-200 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                    >
                        <Upload size={24} />
                        <span className="font-bold text-sm">Datei laden</span>
                    </button>
                </div>
                
                <input type="file" ref={backupInputRef} className="hidden" accept="application/json" onChange={handleBackupUpload} />
              </motion.div>
            )}

            {/* SCHRITT 1: PROFIL (Unverändert) */}
            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="absolute inset-0 p-6 flex flex-col gap-6 overflow-y-auto">
                <div className="text-center space-y-4">
                  <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer relative overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-orange-500 transition-colors">
                    {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" alt="Profil" /> : <Camera size={32} className="text-slate-400" />}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  <p className="text-xs text-slate-400">Profilbild tippen (optional)</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Dein Name *</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 border border-slate-200 dark:border-slate-700 focus-within:border-orange-500 transition-colors">
                      <User size={20} className="text-slate-400" />
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-transparent outline-none font-bold dark:text-white" placeholder="Max Mustermann" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Position / Job</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 border border-slate-200 dark:border-slate-700 focus-within:border-orange-500 transition-colors">
                      <Briefcase size={20} className="text-slate-400" />
                      <input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full p-3 bg-transparent outline-none font-bold dark:text-white" placeholder="Monteur" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCHRITT 2: ARBEITSZEIT (Unverändert) */}
            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="absolute inset-0 p-6 flex flex-col gap-4 overflow-y-auto">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Calendar size={20} className="text-orange-500"/> Arbeitsmodell</h3>
                
                <div className="space-y-2">
                  {WORK_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${formData.workProfileId === preset.id ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"}`}
                    >
                      <div className="font-bold text-slate-800 dark:text-white">{preset.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{preset.sub}</div>
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, workProfileId: "custom" }))}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${formData.workProfileId === "custom" ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"}`}
                  >
                    <div className="font-bold text-slate-800 dark:text-white">Manuell / Benutzerdefiniert</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Jeden Tag einzeln einstellen</div>
                  </button>
                </div>

                <div className="mt-2 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Tagesstunden (Dezimal)</p>
                  {["So","Mo","Di","Mi","Do","Fr","Sa"].map((dayName, idx) => {
                    if (idx === 0 || idx === 6) return null; 
                    return (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="w-8 text-sm font-bold text-slate-500 dark:text-slate-400">{dayName}</span>
                        <input 
                          type="range" min="0" max="720" step="15" 
                          value={formData.customDays[idx]}
                          onChange={(e) => handleCustomDayChange(idx, e.target.value)}
                          className="flex-1 mx-3 accent-orange-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="w-16 text-right text-xs font-mono font-bold dark:text-white">{formatH(formData.customDays[idx])}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Wochenstunden Gesamt:</span>
                    <span className="text-xl font-black text-orange-500 tabular-nums">{formatH(totalWeeklyMinutes)}</span>
                </div>

              </motion.div>
            )}

            {/* SCHRITT 3: BACKUP (NEU DESIGNT: ORDNER WÄHLEN) */}
            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="absolute inset-0 p-6 flex flex-col justify-center text-center gap-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 mb-4">
                  <ShieldCheck size={40} />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Automatisches Backup</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                    Damit deine Daten sicher sind, wähle bitte einen Ordner auf deinem Handy, in dem wir <strong>täglich automatisch</strong> speichern dürfen.
                  </p>
                </div>

                {/* Wenn noch kein Ordner gewählt wurde: Zeige Wahl-Button */}
                {!formData.autoBackup ? (
                    <button 
                        onClick={handleSelectBackupFolder}
                        className="w-full p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                        <FolderInput size={20} />
                        <span className="font-bold">Speicherort wählen</span>
                    </button>
                ) : (
                    /* Wenn Ordner gewählt wurde: Zeige Erfolgs-Status */
                    <div className="w-full p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-300">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <div className="text-left">
                            <span className="block font-bold text-green-800 dark:text-green-400">Aktiviert</span>
                            <span className="text-xs text-green-600 dark:text-green-300">Backup eingerichtet</span>
                        </div>
                        <button 
                           onClick={() => setFormData(prev => ({ ...prev, autoBackup: false }))}
                           className="ml-auto p-2 text-slate-400 hover:text-red-500"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                
                {/* Überspringen Link */}
                {!formData.autoBackup && (
                    <button 
                        onClick={() => setStep(4)} 
                        className="text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        Jetzt überspringen
                    </button>
                )}

              </motion.div>
            )}

            {/* SCHRITT 4: FERTIG (Unverändert) */}
            {step === 4 && (
              <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="absolute inset-0 p-6 flex flex-col justify-center text-center">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Alles bereit! 🚀</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-8">
                  Viel Erfolg beim Erfassen deiner Zeiten. <br/>
                  <span className="text-sm text-slate-400">Vergiss nicht: Links unten ist die Live-Stempeluhr!</span>
                </p>
                
                <button 
                  onClick={finishSetup}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                >
                  <Save size={20} /> Los geht's
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* FOOTER NAV (Nur sichtbar in Schritt 1, 2) */}
        {/* WICHTIG: In Schritt 3 zeigen wir eigene Buttons (Wählen oder Weiter) -> Footer ausblenden oder anpassen */}
        {/* Logik: Schritt 3 hat jetzt eigene "Flows". Wenn Backup gewählt -> Weiter Button. Wenn nicht -> Oben Select Button */}
        {/* Wir passen die Bedingung an: Footer nur 1 und 2. Schritt 3 hat eigene Logik, Schritt 4 ist Ende. */}
        {(step === 1 || step === 2) && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <button 
              onClick={prevStep} 
              className="px-4 py-2 text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Zurück
            </button>
            <button 
              onClick={nextStep}
              className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}
        
        {/* Footer für Schritt 3 (Backup) - Nur "Weiter" wenn fertig */}
        {step === 3 && (
             <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                 <button 
                   onClick={prevStep} 
                   className="px-4 py-2 text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                 >
                   Zurück
                 </button>
                 {formData.autoBackup && (
                    <button 
                      onClick={() => setStep(4)}
                      className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-green-500/20 animate-in fade-in slide-in-from-right-4"
                    >
                      Weiter <ChevronRight size={18} />
                    </button>
                 )}
            </div>
        )}

      </div>
    </div>
  );
};

export default OnboardingWizard;