import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { ArrowLeft, Settings as SettingsIcon, FileBarChart, Plus } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

import KoglerLogo from "./assets/kogler_time_icon.png";
import { 
  getHolidayData, 
  getDayOfWeek, 
  getWeekNumber, 
  parseTime, 
  getTargetMinutesForDate, 
  WORK_CODES,
  checkForUpdate 
} from "./utils";

// COMPONENTS
import Dashboard from "./components/Dashboard";
import EntryForm from "./components/EntryForm";
import Settings from "./components/Settings";
import ConfirmModal from "./components/ConfirmModal";
import UpdateModal from "./components/UpdateModal";
import LiveTimerOverlay from "./components/LiveTimerOverlay"; // WICHTIG: Import hier!

// CUSTOM HOOKS
import { useEntries } from "./hooks/useEntries";
import { useSettings } from "./hooks/useSettings";
import { useAutoBackup } from "./hooks/useAutoBackup";
import { useLiveTimer } from "./hooks/useLiveTimer";

// LAZY LOADING
const PrintReport = React.lazy(() => import("./components/PrintReport"));

// ANIMATION CONFIG
const pageVariants = { initial: { opacity: 0, x: 20 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -20 } };
const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 };
const reportVariants = { initial: { y: "100%", opacity: 0 }, in: { y: 0, opacity: 1 }, out: { y: "100%", opacity: 0 } };

export default function App() {
  const { entries, addEntry, updateEntry, deleteEntry, deleteAllEntries, importEntries } = useEntries();
  const { userData, setUserData, theme, setTheme, autoBackup, setAutoBackup } = useSettings();
  
  // LIVE TIMER HOOK
  const { timerState, startTimer, pauseTimer, resumeTimer, stopTimer, cancelTimer } = useLiveTimer();
  
  useAutoBackup(entries, userData, autoBackup);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("dashboard");
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [updateData, setUpdateData] = useState(null);
  
  // Flag um zu verhindern, dass Smart-Time die Live-Zeit überschreibt
  const [isLiveEntry, setIsLiveEntry] = useState(false);

  const fileInputRef = useRef(null);

  // Formular State
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryType, setEntryType] = useState("work");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("16:30");
  const [project, setProject] = useState("");
  const [code, setCode] = useState(WORK_CODES[0].id);
  const [pauseDuration, setPauseDuration] = useState(30);

  // Sollzeit für HEUTE berechnen (für das Overlay)
  const [todayTarget, setTodayTarget] = useState(510);
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    setTodayTarget(getTargetMinutesForDate(todayStr));
  }, []);

  useEffect(() => {
    const runUpdateCheck = async () => {
      if (navigator.onLine) {
        const data = await checkForUpdate();
        if (data) setUpdateData(data);
      }
    };
    const timer = setTimeout(runUpdateCheck, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleManualUpdateCheck = async () => {
    if (!navigator.onLine) {
      toast.error("Keine Internetverbindung 🌐");
      return;
    }
    const toastId = toast.loading("Suche nach Updates...");
    try {
      await new Promise(r => setTimeout(r, 800)); 
      const data = await checkForUpdate();
      toast.dismiss(toastId);
      if (data) {
        Haptics.impact({ style: ImpactStyle.Medium });
        setUpdateData(data);
      } else {
        Haptics.impact({ style: ImpactStyle.Light });
        toast.success("Alles auf dem neuesten Stand! ✨");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Prüfung fehlgeschlagen.");
    }
  };

  const getHeaderTitle = () => {
    switch (view) {
      case "settings": return "Einstellungen";
      case "add": return editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag";
      case "report": return "Bericht";
      default: return "Stundenzettel";
    }
  };

  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", () => {
      if (view !== "dashboard") { setView("dashboard"); setEditingEntry(null); } 
      else CapacitorApp.exitApp();
    });
    return () => handler.remove();
  }, [view]);

  // STATS & DATA
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const entriesWithHolidays = useMemo(() => {
    const holidayMap = getHolidayData(viewYear);
    const holidays = Object.keys(holidayMap);
    const realEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const holidayEntries = [];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (holidays.includes(dateStr)) {
        if (dateStr <= todayStr) {
          const dow = getDayOfWeek(dateStr);
          if (dow >= 1 && dow <= 5) {
            holidayEntries.push({ 
              id: `auto-holiday-${dateStr}`, 
              type: "public_holiday", 
              date: dateStr, 
              project: holidayMap[dateStr] || "Gesetzlicher Feiertag", 
              netDuration: dow === 5 ? 270 : 510 
            });
          }
        }
      }
    }
    return [...realEntries, ...holidayEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, viewYear, viewMonth]);

  const groupedByWeek = useMemo(() => {
    const map = new Map();
    entriesWithHolidays.forEach((e) => {
      const w = getWeekNumber(new Date(e.date));
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(e);
    });
    const arr = Array.from(map.entries());
    arr.forEach(([, list]) => list.sort((a, b) => new Date(b.date) - new Date(a.date)));
    return arr.sort((a, b) => b[0] - a[0]);
  }, [entriesWithHolidays]);

  const stats = useMemo(() => {
    let actualMinutes = 0; let driveMinutes = 0; let holidayMinutes = 0;
    entriesWithHolidays.forEach((e) => {
        if (e.type === "work" && e.code === 19) driveMinutes += e.netDuration;
        else if (e.type === "public_holiday") holidayMinutes += e.netDuration;
        else actualMinutes += e.netDuration;
    });
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    let targetMinutes = 0;
    for (let d = 1; d <= days; d++) {
        const dow = new Date(viewYear, viewMonth, d).getDay();
        if (dow >= 1 && dow <= 5) targetMinutes += dow === 5 ? 270 : 510;
    }
    return { actualMinutes, targetMinutes, driveMinutes, holidayMinutes };
  }, [entriesWithHolidays, viewYear, viewMonth]);

  const totalCredited = stats.actualMinutes + stats.holidayMinutes;
  const overtime = totalCredited - stats.targetMinutes;
  const progressPercent = Math.min(100, (totalCredited / (stats.targetMinutes || 1)) * 100);

  const lastWorkEntry = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).find((e) => e.type === "work");
  }, [entries]);

  const uniqueProjects = useMemo(() => {
    const projects = entries.filter((e) => e.type === "work" && e.project?.trim()).map((e) => e.project.trim());
    return [...new Set(projects)].sort();
  }, [entries]);

  // --- ACTIONS ---

  const handleStartLive = () => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    startTimer();
    toast.success("⏱️ Stempeluhr gestartet!");
  };

  const handleStopLive = () => {
    Haptics.impact({ style: ImpactStyle.Heavy });
    
    // result enthält Date Objekte!
    const result = stopTimer(); 
    
    const yyyy = result.start.getFullYear();
    const mm = String(result.start.getMonth() + 1).padStart(2, '0');
    const dd = String(result.start.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    setEntryType("work");
    setFormDate(dateStr);

    // TIMEZONE FIX: getHours() nutzt lokale Zeit
    const toLocalHHMM = (dateObj) => {
        const h = String(dateObj.getHours()).padStart(2,'0');
        const m = String(dateObj.getMinutes()).padStart(2,'0');
        return `${h}:${m}`;
    };

    setStartTime(toLocalHHMM(result.start));
    setEndTime(toLocalHHMM(result.end));
    setPauseDuration(result.pause);
    
    setProject(""); 
    const lastCode = localStorage.getItem("kogler_last_code");
    setCode(lastCode ? Number(lastCode) : WORK_CODES[0].id);

    setEditingEntry(null);
    setIsLiveEntry(true); // Verhindert überschreiben durch Smart-Time
    setView("add");
    toast("🏁 Zeit wurde gerundet (15 Min)", { icon: "✨" });
  };

  const startNewEntry = () => {
    setEditingEntry(null); setEntryType("work"); setFormDate(new Date().toISOString().split("T")[0]);
    setStartTime("06:00"); setEndTime("16:30"); setPauseDuration(30); setProject(""); 
    const lastCode = localStorage.getItem("kogler_last_code");
    setCode(lastCode ? Number(lastCode) : WORK_CODES[0].id);
    setIsLiveEntry(false); 
    setView("add");
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);
    const isDrive = entry.type === "work" && entry.code === 19;
    setEntryType(isDrive ? "drive" : entry.type);
    setFormDate(entry.date);
    if (entry.type === "work") {
        setStartTime(entry.start || "06:00"); setEndTime(entry.end || "16:30");
        setPauseDuration(isDrive ? 0 : entry.pause ?? 0); setCode(entry.code ?? WORK_CODES[0].id); setProject(entry.project || "");
    } else { setPauseDuration(0); setProject(""); }
    setIsLiveEntry(false);
    setView("add");
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const isDrive = entryType === "drive";
    let net = 0; let label = "";
    
    if (entryType === "work" || isDrive) {
        const s = parseTime(startTime); const en = parseTime(endTime);
        
        if (en <= s) { 
          toast.error("⚠️ Endzeit muss nach Startzeit liegen!"); 
          return; 
        }

        const hasOverlap = entries.some(existing => {
          if (existing.date !== formDate) return false;
          if (editingEntry && existing.id === editingEntry.id) return false;
          if (!existing.start || !existing.end) return false;

          const exStart = parseTime(existing.start);
          const exEnd = parseTime(existing.end);
          return (s < exEnd && exStart < en);
        });

        if (hasOverlap) {
          Haptics.impact({ style: ImpactStyle.Heavy });
          toast.error("⚠️ Zeitüberschneidung! Zeit ist bereits belegt.", {
            duration: 4000,
            icon: '⛔'
          });
          return;
        }

        const usedPause = isDrive ? 0 : pauseDuration; const usedCode = isDrive ? 19 : code;
        net = en - s - usedPause;
        label = WORK_CODES.find((c) => c.id === usedCode)?.label || (isDrive ? "Fahrzeit" : "Arbeit");
    } else {
        net = getTargetMinutesForDate(formDate); 
        label = entryType === "vacation" ? "Urlaub" : entryType === "sick" ? "Krank" : "Zeitausgleich";
    }
    if (net < 0) net = 0;
    
    const storedType = isDrive ? "work" : entryType;
    const usedCode = isDrive ? 19 : code;
    const usedPause = storedType === "work" ? (isDrive ? 0 : pauseDuration) : 0;
    
    const newEntry = {
        id: editingEntry ? editingEntry.id : Date.now(),
        type: storedType, date: formDate, start: storedType === "work" ? startTime : null, end: storedType === "work" ? endTime : null,
        pause: usedPause, project: storedType === "work" ? project : label, code: storedType === "work" ? usedCode : null, netDuration: net,
    };

    if (editingEntry) updateEntry(newEntry);
    else addEntry(newEntry);

    if (storedType === "work" && usedCode && usedCode !== 19 && usedCode !== 190) localStorage.setItem("kogler_last_code", usedCode);
    toast.success(editingEntry ? "✏️ Eintrag aktualisiert" : "💾 Eintrag gespeichert");
    setEditingEntry(null); setProject(""); setEntryType("work"); setView("dashboard");
  };

  const executeDelete = () => {
    if (deleteTarget?.type === 'single') {
      deleteEntry(deleteTarget.id);
      toast.success("🗑️ Eintrag gelöscht");
    } else if (deleteTarget?.type === 'all') {
      deleteAllEntries();
      toast.success("🧹 Alle Daten bereinigt");
    }
    setDeleteTarget(null);
  };
  
  const changeMonth = (delta) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + delta); setCurrentDate(d); };
  
  const exportData = async () => {
    const toastId = toast.loading("Exportiere Daten...");
    try {
      const fileName = `kogler_export_${new Date().toISOString().slice(0, 10)}.json`;
      const json = JSON.stringify({ user: userData, entries, exportedAt: new Date().toISOString() }, null, 2);

      if (Capacitor.isNativePlatform()) {
          await Filesystem.writeFile({
              path: fileName, 
              data: json, 
              directory: Directory.Cache,
              encoding: Encoding.UTF8,
              recursive: true
          });
          const uriResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
          await Share.share({ 
            title: "Vertel Backup", 
            text: `Backup vom ${new Date().toLocaleDateString("de-DE")}`,
            url: uriResult.uri,
            dialogTitle: "Backup sichern"
          });
          toast.success("📤 Export bereitgestellt!", { id: toastId });
      } else {
          const file = new File([json], fileName, { type: "application/json" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                  await navigator.share({ files: [file], title: 'Vertel Backup', text: 'Backup meiner Stunden' });
                  toast.success("📤 Export erfolgreich!", { id: toastId });
                  return; 
              } catch (shareError) {
                  if (shareError.name === 'AbortError') { toast.dismiss(toastId); return; }
              }
          }
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          toast.success("💾 Download gestartet!", { id: toastId });
      }
    } catch (e) {
      console.error("Export Fehler:", e);
      toast.error(`❌ Export Fehler: ${e.message}`, { id: toastId, duration: 5000 });
    }
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try { 
          const d = JSON.parse(e.target.result); 
          if(d.entries) importEntries(d.entries);
          if(d.user) setUserData(d.user);
          toast.success("📥 Daten erfolgreich importiert!"); 
        } catch { toast.error("❌ Fehler: Datei ungültig."); } finally { event.target.value = ""; }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen w-screen font-sans bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-x-hidden relative">
      <Toaster position="bottom-center" containerStyle={{ bottom: 40 }} toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }, success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } } }} />
      
      <ConfirmModal 
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={executeDelete}
        title={deleteTarget?.type === 'all' ? "Alles löschen?" : "Eintrag löschen?"}
        message={deleteTarget?.type === 'all' ? "Möchtest du wirklich alle Einträge unwiderruflich löschen?" : "Möchtest du diesen Eintrag wirklich entfernen?"}
      />

      {updateData && (
        <UpdateModal 
          updateData={updateData} 
          onClose={() => setUpdateData(null)} 
        />
      )}

      <input type="file" className="hidden" ref={fileInputRef} accept="application/json" onChange={handleImport} />
      
      <header className="fixed top-0 left-0 right-0 bg-slate-900 text-white p-4 pb-6 shadow-xl z-50 w-full transition-all" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {view !== "dashboard" && view !== "report" ? (
              <button onClick={() => { setView("dashboard"); setEditingEntry(null); }} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            ) : (
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-slate-800 shadow-inner"><img src={KoglerLogo} alt="Logo" className="w-full h-full object-contain" /></div>
            )}
            <div>
              <h1 className="font-bold text-xl leading-tight tracking-tight">{getHeaderTitle()}</h1>
              {view === "dashboard" && <p className="text-xs text-slate-400 font-medium mt-0.5">Kogler Aufzugsbau</p>}
            </div>
          </div>
          {view === "dashboard" && (
            <div className="flex gap-2">
              <button onClick={() => setView("settings")} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors active:scale-95"><SettingsIcon size={20} className="text-slate-300" /></button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setView("report")} className="bg-orange-500 hover:bg-orange-600 p-2.5 rounded-xl transition-colors shadow-lg shadow-orange-900/20"><FileBarChart size={20} className="text-white" /></motion.button>
            </div>
          )}
        </div>
      </header>

      <div className="pt-38 pb-24 px-1 w-full max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {view === "dashboard" && (
            <motion.div key="dashboard" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Dashboard 
                  currentDate={currentDate} onSetCurrentDate={setCurrentDate} changeMonth={changeMonth}
                  stats={stats} overtime={overtime} progressPercent={progressPercent}
                  groupedByWeek={groupedByWeek} viewMonth={viewMonth} viewYear={viewYear}
                  onStartNewEntry={startNewEntry} onEditEntry={startEdit} 
                  onDeleteEntry={(id) => setDeleteTarget({ type: 'single', id })}
              />
            </motion.div>
          )}

          {view === "add" && (
            <motion.div key="add" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <EntryForm 
                  onCancel={() => { setView("dashboard"); setEditingEntry(null); }}
                  onSubmit={handleSaveEntry} 
                  entryType={entryType} setEntryType={setEntryType}
                  code={code} setCode={setCode}
                  pauseDuration={pauseDuration} setPauseDuration={setPauseDuration}
                  formDate={formDate} setFormDate={setFormDate}
                  startTime={startTime} setStartTime={setStartTime}
                  endTime={endTime} setEndTime={setEndTime}
                  project={project} setProject={setProject}
                  lastWorkEntry={lastWorkEntry} existingProjects={uniqueProjects}
                  allEntries={entries} 
                  isEditing={!!editingEntry}
                  isLiveEntry={isLiveEntry} // HIER: Flag übergeben
              />
            </motion.div>
          )}

          {view === "settings" && (
            <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full">
              <Settings 
                  userData={userData} setUserData={setUserData}
                  theme={theme} setTheme={setTheme}
                  autoBackup={autoBackup} setAutoBackup={setAutoBackup}
                  onExport={exportData} onImport={() => fileInputRef.current?.click()}
                  onDeleteAll={() => setDeleteTarget({ type: 'all' })}
                  onCheckUpdate={handleManualUpdateCheck}
              />
            </motion.div>
          )}

          {view === "report" && (
            <motion.div key="report" initial="initial" animate="in" exit="out" variants={reportVariants} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[200] w-full h-full">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full bg-slate-900/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    <span className="font-bold text-slate-700 dark:text-white">Lade PDF-Modul...</span>
                  </div>
                </div>
              }>
                <PrintReport 
                  entries={entriesWithHolidays} 
                  monthDate={currentDate} 
                  employeeName={userData.name} 
                  userPhoto={userData.photo} 
                  onClose={() => setView("dashboard")} 
                  onMonthChange={setCurrentDate} 
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB (Rechts) */}
      <AnimatePresence>
        {view === "dashboard" && (
          <motion.button 
            initial={{ scale: 0, rotate: 90 }} 
            animate={{ scale: 1, rotate: 0 }} 
            exit={{ scale: 0, rotate: 90 }}
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { 
                e.stopPropagation();
                startNewEntry(); 
                Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
            }} 
            style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
            className="fixed right-6 bg-slate-900 dark:bg-orange-500 hover:bg-slate-800 dark:hover:bg-orange-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors z-[9999] cursor-pointer touch-manipulation"
          >
            <Plus size={28} />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Live Timer (Links) - WICHTIG: Außerhalb von AnimatePresence/Dashboard Container rendern! */}
      {view === "dashboard" && (
         <LiveTimerOverlay 
            timerState={timerState}
            onStart={handleStartLive}
            onStop={handleStopLive}
            onPause={() => { Haptics.impact({style: ImpactStyle.Light}); pauseTimer(); }}
            onResume={() => { Haptics.impact({style: ImpactStyle.Light}); resumeTimer(); }}
            targetMinutes={todayTarget}
         />
      )}

    </div>
  );
}