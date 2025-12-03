import React, { useState, useRef } from "react";
import { User, Briefcase, Calendar, Save, ShieldCheck, Camera, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// PRESETS DEFINITION (Minuten pro Tag: So, Mo, Di, Mi, Do, Fr, Sa)
const WORK_PRESETS = [
  {
    id: "kogler_standard",
    label: "Kogler Standard",
    sub: "Mo-Do 8,5h | Fr 4,5h",
    days: [0, 510, 510, 510, 510, 270, 0] // 0=Sonntag, 1=Montag...
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

const OnboardingWizard = ({ onFinish, initialData }) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // Für Animation
  const fileInputRef = useRef(null);

  // ZWISCHEN-SPEICHER
  // Falls initialData vorhanden ist (Migration), nutzen wir diese Werte als Start
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    position: initialData?.position || "", 
    photo: initialData?.photo || null,
    workProfileId: "kogler_standard",
    customDays: [...WORK_PRESETS[0].days], // Kopie der Standardwerte
    autoBackup: true
  });

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
    setFormData(prev => ({
      ...prev,
      workProfileId: preset.id,
      customDays: [...preset.days]
    }));
  };

  const handleCustomDayChange = (dayIndex, minutes) => {
    const newDays = [...formData.customDays];
    newDays[dayIndex] = parseInt(minutes) || 0;
    setFormData(prev => ({
      ...prev,
      workProfileId: "custom",
      customDays: newDays
    }));
  };

  const finishSetup = () => {
    // Daten final übergeben
    onFinish(formData);
  };

  // Helper für Minuten -> Stunden Anzeige (Dezimal)
  // 510 min -> "8,5 h"
  const formatH = (m) => {
    const h = m / 60;
    return h.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " h";
  };

  // Gesamtsumme der Woche berechnen
  const totalWeeklyMinutes = formData.customDays.reduce((acc, curr) => acc + curr, 0);

  // ANIMATION VARIANTS
  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 })
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* BACKGROUND DEKO */}
      <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 dark:bg-orange-500 rounded-b-[3rem] shadow-2xl z-0" />
      
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[700px]">
        
        {/* HEADER */}
        <div className="p-6 pb-2 text-center">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Willkommen! 👋</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Richten wir deine App kurz ein.</p>
          
          {/* PROGRESS DOTS */}
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-8 bg-orange-500" : "w-2 bg-slate-200 dark:bg-slate-700"}`} />
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 relative overflow-hidden p-6">
          <AnimatePresence custom={direction} mode="wait">
            
            {/* SCHRITT 1: PROFIL */}
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

            {/* SCHRITT 2: ARBEITSZEIT */}
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

                {/* MANUELLE SLIDER */}
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

                {/* NEU: GESAMTSUMME ANZEIGE */}
                <div className="mt-4 flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Wochenstunden Gesamt:</span>
                    <span className="text-xl font-black text-orange-500 tabular-nums">{formatH(totalWeeklyMinutes)}</span>
                </div>

              </motion.div>
            )}

            {/* SCHRITT 3: BACKUP */}
            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="absolute inset-0 p-6 flex flex-col justify-center text-center gap-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 mb-4">
                  <ShieldCheck size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Daten-Sicherheit</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Soll die App jeden Tag automatisch ein Backup auf deinem Handy speichern?
                  </p>
                </div>

                <div 
                  onClick={() => setFormData(prev => ({ ...prev, autoBackup: !prev.autoBackup }))}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${formData.autoBackup ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-slate-200 dark:border-slate-700"}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.autoBackup ? "border-green-500 bg-green-500" : "border-slate-300 dark:border-slate-600"}`}>
                    {formData.autoBackup && <Check size={14} className="text-white" strokeWidth={4} />}
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-slate-800 dark:text-white">Automatisches Backup</span>
                    <span className="text-xs text-slate-500">Empfohlen: Ja</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCHRITT 4: FERTIG */}
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

        {/* FOOTER NAV */}
        {step < 4 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <button 
              onClick={prevStep} 
              disabled={step === 1}
              className="px-4 py-2 text-slate-400 font-bold disabled:opacity-30 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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

      </div>
    </div>
  );
};

export default OnboardingWizard;