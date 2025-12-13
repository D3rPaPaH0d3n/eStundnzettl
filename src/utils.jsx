import React from "react";

// -------------------------------------------------------
// KONFIGURATION
// -------------------------------------------------------
export const WORK_CODES = [
  { id: 1, label: "01 - Schienen, Bunse" },
  { id: 2, label: "02 - Umlenkrollen, Rollenrost" },
  { id: 3, label: "03 - TWR mechanisch" },
  { id: 4, label: "04 - Heber, Joch, Seile" },
  { id: 5, label: "05 - GGW, Fangrahmen, Geschw. Regler" },
  { id: 6, label: "06 - TWR elektrisch, Steuerung" },
  { id: 7, label: "07 - Schachttüren, Schachtverblechung" },
  { id: 8, label: "08 - E-Installation, Schachtlicht" },
  { id: 9, label: "09 - Kabine mechanisch, Türantrieb, Auskleidung" },
  { id: 10, label: "10 - Kabine elektrisch, Lichtschranken, Dachsteuerung" },
  { id: 11, label: "11 - Einstellung, Fertigstellung, TÜV-Abnahme" },
  { id: 12, label: "12 - Transport" },
  { id: 13, label: "13 - Diverses, Besprechung, Vermessung" },
  { id: 14, label: "14 - Wartung" },
  { id: 15, label: "15 - Störung" },
  { id: 16, label: "16 - Garantie" },
  { id: 17, label: "17 - Regie" },
  { id: 18, label: "18 - Materialvorbereitung" },
  { id: 19, label: "19 - Fahrzeit" },
  { id: 20, label: "20 - Diverse Zusätze, Stahlschacht" },
  { id: 21, label: "21 - Reparaturen" },
  { id: 22, label: "22 - Umbau, Sanierungen" },
  { id: 23, label: "23 - TÜV-Mängel" },
  { id: 24, label: "24 - Demontage" },
  { id: 25, label: "25 - Gerüstbau" },
  { id: 190, label: "19 - An/Abreise" },
  { id: 70, label: "70 - Büro" },
];

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
    {children}
  </div>
);

// -------------------------------------------------------
// HELPER-FUNKTIONEN
// -------------------------------------------------------

export const formatTime = (minutes) => {
  const abs = Math.max(0, Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

export const formatSignedTime = (minutes) => {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
};

export const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const getDayOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

export const getTargetMinutesForDate = (dateStr, customWorkDays) => {
  const day = getDayOfWeek(dateStr); 
  if (customWorkDays && Array.isArray(customWorkDays) && customWorkDays.length === 7) {
    return customWorkDays[day];
  }
  if (day >= 1 && day <= 4) return 510;
  if (day === 5) return 270;
  return 0;
};

export const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

export const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * Kernlogik für Mehrarbeit vs. Überstunden (Österreich)
 * Bis 40h = Mehrarbeit (MA). Darüber = Überstunden (ÜS).
 */
export const calculateOvertimeSplit = (balanceMinutes, targetMinutes) => {
  if (balanceMinutes <= 0) return { mehrarbeit: 0, ueberstunden: 0 };

  const WEEKLY_LIMIT_MINUTES = 40 * 60; 
  const mehrarbeitBuffer = Math.max(0, WEEKLY_LIMIT_MINUTES - targetMinutes);

  const mehrarbeit = Math.min(balanceMinutes, mehrarbeitBuffer);
  const ueberstunden = Math.max(0, balanceMinutes - mehrarbeit);

  return { mehrarbeit, ueberstunden };
};

/**
 * ZENTRALE STATISTIK-BERECHNUNG
 * Berechnet Summen, Sollzeit und MA/ÜS-Split für einen beliebigen Zeitraum.
 */
export const calculatePeriodStats = (entries, userData, periodStart, periodEnd) => {
  let stats = {
    work: 0, drive: 0, holiday: 0, vacation: 0, sick: 0, timeComp: 0,
    totalIst: 0, totalTarget: 0, totalSaldo: 0,
    overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 }
  };

  // 1. Einträge filtern und summieren
  const relevantEntries = entries.filter(e => {
    const d = new Date(e.date);
    // Wir setzen die Zeitkomponente zurück für sauberen Datumsvergleich
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOnly = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
    const endOnly = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
    return dOnly >= startOnly && dOnly <= endOnly;
  });

  relevantEntries.forEach(e => {
    if (e.type === "work") {
      if (e.code === 19) stats.drive += e.netDuration;
      else stats.work += e.netDuration;
    }
    if (e.type === "vacation") stats.vacation += e.netDuration;
    if (e.type === "sick") stats.sick += e.netDuration;
    if (e.type === "public_holiday") stats.holiday += e.netDuration;
    if (e.type === "time_comp") stats.timeComp += e.netDuration;
  });

  stats.totalIst = stats.work + stats.vacation + stats.sick + stats.holiday + stats.timeComp;

  // 2. Sollzeit berechnen (Tag für Tag)
  let loopDate = new Date(periodStart);
  loopDate.setHours(0,0,0,0);
  const loopEnd = new Date(periodEnd);
  loopEnd.setHours(23,59,59,999);

  const weeklyMap = {}; // Zum Sammeln für die 40h Regel

  while (loopDate <= loopEnd) {
    const dateStr = loopDate.toISOString().split("T")[0];
    const target = getTargetMinutesForDate(dateStr, userData?.workDays);
    stats.totalTarget += target;

    const weekNum = getWeekNumber(new Date(loopDate));
    if (!weeklyMap[weekNum]) weeklyMap[weekNum] = { target: 0, actual: 0 };
    weeklyMap[weekNum].target += target;

    loopDate.setDate(loopDate.getDate() + 1);
  }

  stats.totalSaldo = stats.totalIst - stats.totalTarget;

  // 3. MA/ÜS Split berechnen (Wochenweise Summierung)
  relevantEntries.forEach(e => {
    // Ausfallsprinzip: Alles außer Fahrzeit zählt zur Basis
    if (!(e.type === "work" && e.code === 19)) {
      const w = getWeekNumber(new Date(e.date));
      if (weeklyMap[w]) {
        weeklyMap[w].actual += e.netDuration;
      }
    }
  });

  Object.values(weeklyMap).forEach(week => {
    const diff = week.actual - week.target;
    const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(diff, week.target);
    stats.overtimeSplit.mehrarbeit += mehrarbeit;
    stats.overtimeSplit.ueberstunden += ueberstunden;
  });

  return stats;
};

// -------------------------------------------------------
// FEIERTAGE
// -------------------------------------------------------
export const getHolidayData = (year) => {
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(year, month - 1, day);

  const holidays = {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-01-06`]: "Heilige Drei Könige",
    [addDays(easterDate, 1)]: "Ostermontag",
    [`${year}-05-01`]: "Staatsfeiertag",
    [addDays(easterDate, 39)]: "Christi Himmelfahrt",
    [addDays(easterDate, 50)]: "Pfingstmontag",
    [addDays(easterDate, 60)]: "Fronleichnam",
    [`${year}-08-15`]: "Mariä Himmelfahrt",
    [`${year}-10-26`]: "Nationalfeiertag",
    [`${year}-11-01`]: "Allerheiligen",
    [`${year}-12-08`]: "Mariä Empfängnis",
    [`${year}-12-25`]: "Christtag",
    [`${year}-12-26`]: "Stefanitag",
  };

  return holidays;
};

// -------------------------------------------------------
// UPDATE CHECKER
// -------------------------------------------------------
// Du kannst das 'v' hier behalten, wie du es möchtest:
export const APP_VERSION = "v5.0.5"; 

const compareVersions = (v1, v2) => {
  // Wir entfernen ALLES, was keine Zahl oder ein Punkt ist.
  // Aus "v5.0.5" wird "5.0.5", aus "5.0.5-beta" wird "5.0.5"
  const cleanV1 = v1.replace(/[^0-9.]/g, ''); 
  const cleanV2 = v2.replace(/[^0-9.]/g, '');

  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }
  return 0;
};

export const checkForUpdate = async () => {
  try {
    const GITHUB_USER = "D3rPaPaH0d3n"; 
    const REPO_NAME = "kogler-zeit";
    const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/releases/latest`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // GitHub Tag ist z.B. "v5.0.6". 
    // Wir übergeben es direkt an compareVersions, da unsere neue Funktion das 'v' selbst entfernt.
    const latestVersion = data.tag_name; 

    if (compareVersions(latestVersion, APP_VERSION) > 0) {
      return {
        version: latestVersion, // Zeigt z.B. "v5.0.6" im PopUp an
        notes: data.body,
        downloadUrl: data.assets.find(a => a.name.endsWith(".apk"))?.browser_download_url || data.html_url,
        date: new Date(data.published_at).toLocaleDateString("de-DE")
      };
    }
    return null; 
  } catch (error) { return null; }
};