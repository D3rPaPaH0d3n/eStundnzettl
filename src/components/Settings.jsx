import React, { useRef, useState } from "react";
import { User, Sun, AlertTriangle, Camera, Trash2, Upload, Loader, Info, History, BookOpen, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card, APP_VERSION } from "../utils"; 
import ChangelogModal from "./ChangelogModal";
import HelpModal from "./HelpModal";

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
  onCheckUpdate // <--- NEUE PROP
}) => {
  const fileInputRef = useRef(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // --- BILD KOMPRIMIERUNG ---
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          // Max 1024px für gute Qualität bei kleiner Größe
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // 90% Qualität JPEG
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(dataUrl);
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
      toast.success("📸 Profilbild gespeichert");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (err) {
      console.error(err);
      toast.error("❌ Fehler beim Bearbeiten des Bildes");
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
    toast.success("🗑️ Profilbild entfernt");
  };

  const handleThemeChange = (newTheme) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setTheme(newTheme);
  };

  return (
    <main className="w-full p-4 space-y-6 pb-20">
      
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

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

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            Dein Name
          </label>
          <input
            type="text"
            value={userData.name}
            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-bold text-slate-800 dark:text-white outline-none focus:border-orange-500 transition-colors"
            placeholder="Max Mustermann"
          />
        </div>
      </Card>

      {/* 2. THEME */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
          <Sun size={18} className="text-orange-400" />
          <span>Design / Theme</span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => handleThemeChange("light")} className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors ${theme === "light" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>Hell</button>
          <button onClick={() => handleThemeChange("dark")} className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors ${theme === "dark" ? "border-orange-500 bg-slate-700 text-orange-400" : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>Dunkel</button>
          <button onClick={() => handleThemeChange("system")} className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors ${theme === "system" ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>System</button>
        </div>
      </Card>

      {/* 3. BACKUP */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-white">Daten & Backup</h3>
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-xl mb-2">
          <div>
            <span className="block font-bold text-sm text-slate-800 dark:text-white">Automatisches Backup</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Speichert 1x täglich lokal.</span>
          </div>
          <button
            onClick={() => {
              Haptics.impact({ style: ImpactStyle.Light });
              if (!autoBackup) localStorage.removeItem("kogler_last_backup_date");
              setAutoBackup(!autoBackup);
            }}
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${autoBackup ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${autoBackup ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onExport} className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 flex items-center justify-center gap-2 transition-colors">
            <Upload size={18} className="rotate-180" /> Daten exportieren
          </button>
          <button onClick={onImport} className="w-full py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors">
            <Upload size={18} /> Daten importieren
          </button>
        </div>
      </Card>

      {/* 4. APP INFO */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={20} className="text-blue-500" />
          <h3 className="font-bold text-slate-700 dark:text-white">Über die App</h3>
        </div>
        
        <div className="space-y-2">
          {/* NEUER BUTTON: AUF UPDATES PRÜFEN */}
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
        </div>
      </Card>

      {/* 5. DANGER ZONE */}
      <Card className="p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
          <h3 className="font-bold text-red-700 dark:text-red-400">Gefahrenzone</h3>
        </div>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4 font-medium">
          Hier kannst du alle gespeicherten Einträge unwiderruflich löschen.
        </p>
        <button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Medium });
            onDeleteAll();
          }}
          className="w-full py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shadow-sm"
        >
          Alle Daten löschen
        </button>
      </Card>
      
      {/* 6. FOOTER */}
      <div className="text-center space-y-1 pb-4">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
          Version {APP_VERSION} • "Damit keine Stunde im Schacht verschwindet"
        </p>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 font-medium">
          Developed with ❤️ by Markus Kainer
        </p>
      </div>
    </main>
  );
};

export default Settings;