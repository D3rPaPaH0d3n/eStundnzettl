import React, { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Settings as SettingsIcon, FileBarChart } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { DatePicker } from "@capacitor-community/date-picker";
import toast, { Toaster } from "react-hot-toast";

import KoglerLogo from "./assets/kogler_time_icon.png";
import { getHolidayData, getDayOfWeek, getWeekNumber, parseTime, getTargetMinutesForDate, WORK_CODES } from "./utils";

import Dashboard from "./components/Dashboard";
import EntryForm from "./components/EntryForm";
import Settings from "./components/Settings";
import PrintReport from "./components/PrintReport";

export default function App() {
  const [entries, setEntries] = useState(() => JSON.parse(localStorage.getItem("kogler_entries") || "[]"));
  const [userData, setUserData] = useState(() => JSON.parse(localStorage.getItem("kogler_user") || '{"name":"Markus Mustermann"}'));
  
  // THEME STATE
  const [theme, setTheme] = useState(() => localStorage.getItem("kogler_theme") || "light");
  
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem("kogler_auto_backup") === "true");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("dashboard");
  const [editingEntry, setEditingEntry] = useState(null);
  
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryType, setEntryType] = useState("work");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("16:30");
  const [project, setProject] = useState("");
  const [code, setCode] = useState(WORK_CODES[0].id);
  const [pauseDuration, setPauseDuration] = useState(30);

  const fileInputRef = useRef(null);

  useEffect(() => localStorage.setItem("kogler_entries", JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem("kogler_user", JSON.stringify(userData)), [userData]);
  useEffect(() => localStorage.setItem("kogler_auto_backup", autoBackup), [autoBackup]);
  
  // ** DARK MODE LOGIC **
  useEffect(() => {
    localStorage.setItem("kogler_theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", () => {
      if (view !== "dashboard") { setView("dashboard"); setEditingEntry(null); } 
      else CapacitorApp.exitApp();
    });
    return () => handler.remove();
  }, [view]);

  useEffect(() => {
    const performAutoBackup = async () => {
      if (!autoBackup || !Capacitor.isNativePlatform() || entries.length === 0) return;
      const today = new Date().toISOString().split("T")[0];
      if (localStorage.getItem("kogler_last_backup_date") === today) return;

      try {
        const payload = { user: userData, entries, exportedAt: new Date().toISOString(), note: "Auto" };
        const fileName = `kogler_autobackup_${today}.json`;
        await Filesystem.writeFile({ path: fileName, data: JSON.stringify(payload), directory: Directory.Documents, encoding: Encoding.UTF8 });
        localStorage.setItem("kogler_last_backup_date", today);
      } catch (err) { console.error("Backup failed", err); }
    };
    const timer = setTimeout(performAutoBackup, 2000);
    return () => clearTimeout(timer);
  }, [entries, userData, autoBackup]);

  // CALCULATION LOGIC
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const entriesWithHolidays = useMemo(() => {
    const holidayMap = getHolidayData(viewYear);
    const holidays = Object.keys(holidayMap);
    
    const realEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });

    const holidayEntries = [];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (holidays.includes(dateStr)) {
        const dow = getDayOfWeek(dateStr);
        if (dow >= 1 && dow <= 5) {
          holidayEntries.push({
            id: `auto-holiday-${dateStr}`,
            type: "public_holiday",
            date: dateStr,
            project: holidayMap[dateStr] || "Gesetzlicher Feiertag",
            netDuration: dow === 5 ? 270 : 510,
          });
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
    let actualMinutes = 0;
    let driveMinutes = 0;
    let holidayMinutes = 0;
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

  // ACTIONS
  const startNewEntry = () => {
    setEditingEntry(null); setEntryType("work"); setFormDate(new Date().toISOString().split("T")[0]);
    setStartTime("06:00"); setEndTime("16:30"); setPauseDuration(30); setProject(""); setCode(WORK_CODES[0].id);
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
    setView("add");
  };

  const saveEntry = (e) => {
    e.preventDefault();
    const isDrive = entryType === "drive";
    let net = 0; let label = "";
    if (entryType === "work" || isDrive) {
        const s = parseTime(startTime); const en = parseTime(endTime);
        if (en <= s) { toast.error("⚠️ Endzeit muss nach Startzeit liegen!"); return; }
        const usedPause = isDrive ? 0 : pauseDuration; const usedCode = isDrive ? 19 : code;
        net = en - s - usedPause;
        label = WORK_CODES.find((c) => c.id === usedCode)?.label || (isDrive ? "Fahrzeit" : "Arbeit");
    } else {
        net = getTargetMinutesForDate(formDate); label = entryType === "vacation" ? "Urlaub" : "Krank";
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

    setEntries(editingEntry ? entries.map((e) => (e.id === editingEntry.id ? newEntry : e)) : [newEntry, ...entries]);
    toast.success(editingEntry ? "✏️ Eintrag aktualisiert" : "💾 Eintrag gespeichert");
    setEditingEntry(null); setProject(""); setEntryType("work"); setView("dashboard");
  };

  const deleteEntry = (id) => { 
    if (confirm("Eintrag wirklich löschen?")) {
      setEntries(entries.filter((e) => e.id !== id)); 
      toast.success("🗑️ Eintrag gelöscht");
    }
  };
  
  const changeMonth = (delta) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + delta); setCurrentDate(d); };
  
  const openMonthPicker = async () => {
    try {
        const res = await DatePicker.present({ mode: "date", locale: "de-AT", theme: "light", format: "yyyy-MM", presentation: "date" });
        if (res?.value) { const d = new Date(res.value); d.setDate(1); setCurrentDate(d); }
    } catch (e) { console.error(e); }
  };

  const exportData = async () => {
    const fileName = `kogler_export_${new Date().toISOString().slice(0, 10)}.json`;
    const json = JSON.stringify({ user: userData, entries, exportedAt: new Date().toISOString() }, null, 2);
    if (!Capacitor.isNativePlatform()) {
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); 
        toast.success("📤 Export erfolgreich heruntergeladen!"); return;
    }
    try {
        const res = await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Documents, encoding: Encoding.UTF8 });
        await Share.share({ title: "Export", url: res.uri });
        toast.success("📤 Export bereitgestellt!");
    } catch (e) { toast.error("❌ Fehler beim Exportieren."); }
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try { const d = JSON.parse(e.target.result); if(d.entries) setEntries(d.entries); if(d.user) setUserData(d.user); toast.success("📥 Daten erfolgreich importiert!"); }
        catch { toast.error("❌ Fehler: Datei ungültig."); } finally { event.target.value = ""; }
    };
    reader.readAsText(file);
  };

  if (view === "report") return <PrintReport entries={entriesWithHolidays} monthDate={currentDate} employeeName={userData.name} onClose={() => setView("dashboard")} />;

  return (
    // ** DARK MODE BG: dark:bg-slate-950 dark:text-slate-100 **
    <div className="min-h-screen w-screen font-sans pb-24 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <Toaster position="bottom-center" containerStyle={{ bottom: 40 }} toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }, success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } } }} />
      <input type="file" className="hidden" ref={fileInputRef} accept="application/json" onChange={handleImport} />
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 pb-4 shadow-lg sticky top-0 z-10 w-full" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {view !== "dashboard" ? (
              <button onClick={() => { setView("dashboard"); setEditingEntry(null); }} className="p-1 hover:bg-slate-700 rounded-full"><ArrowLeft /></button>
            ) : (
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900"><img src={KoglerLogo} alt="Logo" className="w-full h-full object-contain" /></div>
            )}
            <div><h1 className="font-bold text-lg leading-tight">Stundenzettel</h1>{view === "dashboard" && <p className="text-xs text-slate-400">Kogler Aufzugsbau</p>}</div>
          </div>
          {view === "dashboard" && (
            <div className="flex gap-2">
              <button onClick={() => setView("settings")} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg"><SettingsIcon size={18} className="text-slate-300" /></button>
              <button onClick={() => setView("report")} className="bg-orange-500 hover:bg-orange-600 p-2 rounded-lg"><FileBarChart size={18} className="text-white" /></button>
            </div>
          )}
        </div>
      </header>

      {/* VIEWS */}
      {view === "dashboard" && (
        <Dashboard 
            currentDate={currentDate} openMonthPicker={openMonthPicker} changeMonth={changeMonth}
            stats={stats} overtime={overtime} progressPercent={progressPercent}
            groupedByWeek={groupedByWeek} viewMonth={viewMonth} viewYear={viewYear}
            onStartNewEntry={startNewEntry} onEditEntry={startEdit} onDeleteEntry={deleteEntry}
        />
      )}

      {view === "add" && (
        <EntryForm 
            onCancel={() => { setView("dashboard"); setEditingEntry(null); }}
            onSubmit={saveEntry}
            entryType={entryType} setEntryType={setEntryType}
            code={code} setCode={setCode}
            pauseDuration={pauseDuration} setPauseDuration={setPauseDuration}
            formDate={formDate} setFormDate={setFormDate}
            startTime={startTime} setStartTime={setStartTime}
            endTime={endTime} setEndTime={setEndTime}
            project={project} setProject={setProject}
        />
      )}

      {view === "settings" && (
        <Settings 
            userData={userData} setUserData={setUserData}
            theme={theme} setTheme={setTheme}
            autoBackup={autoBackup} setAutoBackup={setAutoBackup}
            onExport={exportData} onImport={() => fileInputRef.current?.click()}
            onDeleteAll={() => { if(confirm("Wirklich ALLES löschen?")) { setEntries([]); toast.success("🧹 Alle Daten bereinigt"); } }}
        />
      )}
    </div>
  );
}