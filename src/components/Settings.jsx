import React, { useRef, useState, useEffect } from "react";
import { 
  User, Sun, AlertTriangle, Camera, Trash2, Upload, Loader, 
  History, BookOpen, RefreshCw, Briefcase, Calendar, 
  Cloud, CloudOff, CheckCircle2, HardDrive, List, Lock, Unlock 
} from "lucide-react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card, APP_VERSION } from "../utils"; 
import ChangelogModal from "./ChangelogModal";
import HelpModal from "./HelpModal";
import { initGoogleAuth, signInGoogle, signOutGoogle } from "../utils/googleDrive";
import { selectBackupFolder, hasBackupTarget, clearBackupTarget, analyzeBackupData, applyBackup, readJsonFile } from "../utils/storageBackup";
import ImportConflictModal from "./ImportConflictModal";
import PresetModal from "./PresetModal";
import DecimalDurationPicker from "./DecimalDurationPicker"; 
import { WORK_MODELS } from "../hooks/constants";

const Settings = ({
  userData,
  setUserData,
  theme,
  setTheme,
  autoBackup,
  setAutoBackup,
  onExport,
  onImport,
  onDeleteAll,
  onCheckUpdate
}) => {
  const fileInputRef = useRef(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Cloud & Backup State
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [hasBackupFolder, setHasBackupFolder] = useState(false);

  // Import State
  const [pendingImport, setPendingImport] = useState(null); 
  const importInputRef = useRef(null);

  // Modal States
  const [showPresetModal, setShowPresetModal] = useState(false);
  
  // Picker State
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState(null); 

  // Derived State für Arbeitszeitmodell
  const activeModelId = userData.workModelId || 'custom';
  const isCustomMode = activeModelId === 'custom';
  const activeModelLabel = WORK_MODELS.find(m => m.id === activeModelId)?.label || "Benutzerdefiniert";

  // LOCK STATE: Auch bei Custom standardmäßig "true" (geschlossen)
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    // 1. Google Auth & Cloud Status initialisieren
    initGoogleAuth();
    setIsCloudConnected(localStorage.getItem("kogler_cloud_sync") === "true");

    // 2. Lokaler Backup Status prüfen
    setHasBackupFolder(hasBackupTarget());
  }, []);

  // Wenn man das Modell wechselt, immer wieder sperren
  useEffect(() => {
    setIsLocked(true);
  }, [activeModelId]);

  // =========================================================================
  // 1. ARBEITSZEIT LOGIK
  // =========================================================================
  
  const minToHours = (m) => (m === 0 ? "" : Number(m / 60).toFixed(2).replace('.', ','));

  // Handler: Picker für einen bestimmten Tag öffnen
  const openDayPicker = (index) => {
    // 1. Check: Sind wir im Custom Mode?
    if (!isCustomMode) {
      toast("Bitte erst 'Benutzerdefiniert' wählen", { icon: "🚫" });
      Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
    // 2. Check: Ist das Schloss offen?
    if (isLocked) {
      toast("Zum Bearbeiten erst Schloss öffnen", { icon: "🔒" });
      Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }

    setPickerTargetIndex(index);
    setShowDurationPicker(true);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleDurationConfirm = (minutes) => {
    if (pickerTargetIndex === null) return;
    
    const newWorkDays = [...userData.workDays];
    newWorkDays[pickerTargetIndex] = minutes;
    
    // Speichern (Modell-ID bleibt 'custom')
    setUserData({ ...userData, workDays: newWorkDays });
    toast.success("Zeit aktualisiert");
  };

  const handlePresetSelect = (model) => {
    const newUserData = { ...userData, workModelId: model.id };
    
    // Wenn es ein echtes Preset ist, überschreiben wir die Tage
    if (model.id !== 'custom' && model.days) {
      newUserData.workDays = [...model.days];
    }
    
    setUserData(newUserData);
    toast.success(model.id === 'custom' ? "Benutzerdefiniert aktiviert" : "Vorlage übernommen");
    Haptics.impact({ style: ImpactStyle.Medium });
  };

  const toggleLock = () => {
      if (!isCustomMode) {
          toast("Nur bei 'Benutzerdefiniert' möglich");
          return;
      }
      const newState = !isLocked;
      setIsLocked(newState);
      Haptics.impact({ style: ImpactStyle.Medium });
      if (!newState) {
          toast.success("Bearbeitung freigegeben");
      }
  };


  // =========================================================================
  // 2. IMPORT / EXPORT / CLOUD / IMAGE
  // =========================================================================
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const json = await readJsonFile(file);
      processImport(json);
    } catch (err) {
      toast.error("Fehler beim Lesen der Datei");
    }
    e.target.value = null; // Input resetten
  };

  const processImport = (data) => {
    const analysis = analyzeBackupData(data);

    if (!analysis.valid) {
      toast.error("Ungültiges Backup-Format");
      return;
    }

    if (analysis.hasSettings) {
      setPendingImport(analysis);
    } else {
      applyBackup(analysis, 'ALL');
      toast.success(`${analysis.entryCount} Einträge importiert!`);
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleConfirmImport = (mode) => {
    if (!pendingImport) return;
    applyBackup(pendingImport, mode);
    toast.success("Erfolgreich wiederhergestellt!");
    setPendingImport(null);
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleGoogleToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });
    
    if (isCloudConnected) {
        try {
            await signOutGoogle();
            localStorage.removeItem("kogler_cloud_sync");
            setIsCloudConnected(false);
            toast.success("Cloud getrennt");
        } catch (e) {
            console.error(e);
            localStorage.removeItem("kogler_cloud_sync");
            setIsCloudConnected(false);
        }
    } else {
        try {
            const user = await signInGoogle();
            if (user && user.authentication.accessToken) {
                localStorage.setItem("kogler_cloud_sync", "true");
                setIsCloudConnected(true);
                if (!autoBackup) setAutoBackup(true);
                toast.success(`Verbunden: ${user.givenName || "Drive"}`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Anmeldung abgebrochen");
        }
    }
  };

  const handleLocalToggle = async () => {
    Haptics.impact({ style: ImpactStyle.Light });

    if (hasBackupFolder) {
        clearBackupTarget();
        setHasBackupFolder(false);
        setAutoBackup(false);
        toast("Backup-Ordner getrennt");
    } else {
        try {
            const success = await selectBackupFolder();
            if (success) {
                setHasBackupFolder(true);
                setAutoBackup(true);
                toast.success("Backup aktiviert!");
            }
        } catch (err) {
            toast.error("Auswahl abgebrochen");
        }
    }
  };

  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImg(true);
    try {
      const compressedBase64 = await processImage(file);
      setUserData({ ...userData, photo: compressedBase64 });
      toast.success("Profilbild aktualisiert");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Bild");
    } finally {
      setIsProcessingImg(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    Haptics.impact({ style: ImpactStyle.Medium });
    const newData = { ...userData };
    delete newData.photo;
    setUserData(newData);
    toast.success("Bild entfernt");
  };

  const handleThemeChange = (newTheme) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setTheme(newTheme);
  };

  return (
    <main className="w-full p-4 space-y-6 pb-20">
      
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <ImportConflictModal 
        analysisData={pendingImport} 
        onConfirm={handleConfirmImport} 
        onCancel={() => setPendingImport(null)} 
      />
      
      <PresetModal 
        isOpen={showPresetModal} 
        onClose={() => setShowPresetModal(false)} 
        onSelect={handlePresetSelect} 
        currentModelId={activeModelId} 
      />
      
      {/* DECIMAL PICKER */}
      <DecimalDurationPicker
        isOpen={showDurationPicker}
        onClose={() => setShowDurationPicker(false)}
        initialMinutes={pickerTargetIndex !== null ? userData.workDays[pickerTargetIndex] : 0}
        onConfirm={handleDurationConfirm}
        title={pickerTargetIndex !== null ? `${["So","Mo","Di","Mi","Do","Fr","Sa"][pickerTargetIndex]} bearbeiten` : ""}
      />

      {/* 1. USER DATA */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="relative group shrink-0">
            <div 
              onClick={() => !isProcessingImg && fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-transparent hover:border-orange-500 transition-all shadow-inner relative"
            >
              {isProcessingImg ? (
                <Loader className="animate-spin text-orange-500" size={24} />
              ) : userData.photo ? (
                <img src={userData.photo} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-slate-400 dark:text-slate-500" />
              )}
              {!isProcessingImg && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            {userData.photo && !isProcessingImg && (
              <button 
                onClick={removePhoto}
                className="absolute -bottom-1 -right-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 p-1.5 rounded-full shadow-sm hover:scale-110 transition-transform border border-white dark:border-slate-800"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg dark:text-white truncate">Benutzerdaten</h3>
            <p className="text-xs text-slate-400">Tippe auf das Bild, um es zu ändern.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dein Name</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 mt-1 focus-within:border-orange-500 transition-colors">
               <User size={18} className="text-slate-400" />
               <input
                type="text"
                value={userData.name || ""}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                placeholder="Max Mustermann"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Position / Job</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 mt-1 focus-within:border-orange-500 transition-colors">
               <Briefcase size={18} className="text-slate-400" />
               <input
                type="text"
                value={userData.position || ""}
                onChange={(e) => setUserData({ ...userData, position: e.target.value })}
                className="w-full bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                placeholder="Monteur"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 2. ARBEITSZEIT MODELL */}
      <Card className="p-5 space-y-4 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex justify-between items-start gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-400" />
                    <h3 className="font-bold text-slate-700 dark:text-white">Arbeitszeit Modell</h3>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                   Aktuell: <span className="font-bold text-slate-800 dark:text-slate-200">{activeModelLabel}</span>
                </p>
            </div>
            
            <div className="flex gap-2">
                {/* Schloss Icon (Nur bei Custom Mode relevant) */}
                {isCustomMode && (
                    <button 
                        onClick={toggleLock}
                        className={`p-2 rounded-lg border transition-all ${
                            isLocked 
                             ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500" 
                             : "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-900 text-orange-600"
                        }`}
                    >
                        {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                )}
                
                <button 
                    onClick={() => setShowPresetModal(true)}
                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:border-orange-500 hover:text-orange-500 transition-all shadow-sm shrink-0"
                >
                    <List size={14} /> Vorlagen
                </button>
            </div>
        </div>

        {/* WARNSCHILD - IMMER SICHTBAR */}
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
             <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={18} />
             <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
               <strong>Achtung:</strong> Änderungen wirken sich auf die Überstunden aller bisherigen Einträge aus!
             </div>
        </div>

        {/* Manuelle Eingabe */}
        <div className="grid grid-cols-7 gap-2">
            {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((dayName, idx) => {
                // Bedingung für Interaktivität: Muss Custom sein UND Schloss offen
                const isInteractive = isCustomMode && !isLocked;
                
                return (
                    <div key={idx} className="flex flex-col gap-1">
                        <label className={`text-[10px] font-bold text-center uppercase ${idx === 0 || idx === 6 ? 'text-red-400' : 'text-slate-500'}`}>
                            {dayName}
                        </label>
                        <div 
                            onClick={() => openDayPicker(idx)}
                            className={`w-full text-center p-2 rounded-lg text-xs font-bold border transition-colors relative h-[34px] flex items-center justify-center
                                ${isInteractive 
                                  ? "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white shadow-sm cursor-pointer hover:border-orange-500" 
                                  : "bg-transparent border-transparent text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-80"
                                }
                            `}
                        >
                            {userData.workDays[idx] > 0 ? minToHours(userData.workDays[idx]) : "-"}
                            
                            {userData.workDays[idx] > 0 && (
                                 <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isInteractive ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="text-center">
            <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-bold rounded-full">
                Wochenstunden: {(userData.workDays.reduce((a,b)=>a+b,0)/60).toLocaleString('de-DE')} h
            </span>
        </div>
      </Card>

      {/* 3. THEME */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
            <Sun size={18} className="text-orange-400" />
            <span>Design / Theme</span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {['light', 'dark', 'system'].map(mode => (
            <button 
                key={mode} 
                onClick={() => handleThemeChange(mode)} 
                className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors capitalize 
                    ${theme === mode 
                        ? "border-orange-500 bg-orange-50 dark:bg-slate-700 text-orange-600 dark:text-orange-400" 
                        : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
            >
              {mode === 'system' ? 'System' : (mode === 'light' ? 'Hell' : 'Dunkel')}
            </button>
          ))}
        </div>
      </Card>

      {/* 4. DATEN & BACKUP */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold text-slate-700 dark:text-white">Daten & Backup</h3>
        
        {/* Google Drive Status */}
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-xl">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isCloudConnected ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"}`}>
                    {isCloudConnected ? <Cloud size={20} /> : <CloudOff size={20} />}
                </div>
                <div>
                    <span className="block font-bold text-sm text-slate-800 dark:text-white">Google Drive</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {isCloudConnected ? "Sync Aktiv" : "Nicht verbunden"}
                    </span>
                </div>
            </div>
            <button 
                onClick={handleGoogleToggle} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${isCloudConnected ? "border-red-200 bg-red-50 text-red-600" : "border-slate-300 bg-white text-slate-700"}`}
            >
                {isCloudConnected ? "Trennen" : "Verbinden"}
            </button>
        </div>

        {/* Lokales Backup Status */}
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-xl">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${hasBackupFolder ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-400"}`}>
                    {hasBackupFolder ? <CheckCircle2 size={20} /> : <HardDrive size={20} />}
                </div>
                <div>
                    <span className="block font-bold text-sm text-slate-800 dark:text-white">Lokales Backup</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {hasBackupFolder ? "Aktiv (Täglich)" : "Nicht konfiguriert"}
                    </span>
                </div>
            </div>
            <button 
                onClick={handleLocalToggle} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors min-w-[90px] ${hasBackupFolder ? "border-red-200 bg-red-50 text-red-600" : "border-slate-300 bg-white text-slate-700"}`}
            >
                {hasBackupFolder ? "Trennen" : "Wählen"}
            </button>
        </div>
        
        {/* Import / Export Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button 
            onClick={onExport} 
            className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} className="rotate-180" /> Export
          </button>
          
          <button 
            onClick={() => importInputRef.current?.click()} 
            className="w-full py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} /> Import
          </button>
          
          <input 
            type="file" 
            ref={importInputRef} 
            className="hidden" 
            accept="application/json" 
            onChange={handleFileImport} 
          />
        </div>
      </Card>

      {/* 5. APP & INFORMATIONEN */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-white">App & Informationen</h3>
        
        <button 
            onClick={() => {
              Haptics.impact({ style: ImpactStyle.Light });
              onCheckUpdate();
            }}
            className="w-full py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <RefreshCw size={18} /> Auf Updates prüfen
          </button>

          <button 
            onClick={() => {
              Haptics.impact({ style: ImpactStyle.Light });
              setShowHelp(true);
            }}
            className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <BookOpen size={18} /> Anleitung & Hilfe
          </button>

          <button 
            onClick={() => {
              Haptics.impact({ style: ImpactStyle.Light });
              setShowChangelog(true);
            }}
            className="w-full py-3 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
          >
            <History size={18} /> Änderungsprotokoll
          </button>
      </Card>

      {/* 6. DANGER ZONE */}
      <Card className="p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            <h3 className="font-bold text-red-700 dark:text-red-400">Gefahrenzone</h3>
        </div>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4 font-medium">Alle Daten löschen.</p>
        <button 
            onClick={() => { Haptics.impact({ style: ImpactStyle.Medium }); onDeleteAll(); }} 
            className="w-full py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shadow-sm"
        >
            Alle Daten löschen
        </button>
      </Card>
      
      {/* 7. FOOTER */}
      <div className="text-center space-y-1 pb-4">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Version {APP_VERSION}</p>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 font-medium">Developed with ❤️ by Markus Kainer & Gemini</p>
      </div>
    </main>
  );
};

export default Settings;