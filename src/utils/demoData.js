/**
 * Demo / Test Data for eStundnzettl
 * Generates realistic sample entries for 3 months with "Max Mustermann"
 */
import { WORK_CODE } from "../hooks/constants";
import { toLocalDateString } from "../utils";
import { calculateEntryNetDuration } from "./timeCalculations";

const DEMO_USER = {
  name: "Max Mustermann",
  position: "Software Developer",
  company: "Muster GmbH",
  workDays: [true, true, true, true, true, false, false], // Mo-Fr
  weeklyHours: 42,
  photo: null,
};

const DEMO_WORK_CODES = [
  { id: 1, label: "Entwicklung", color: "#10b981" },
  { id: 2, label: "Meeting", color: "#3b82f6" },
  { id: 3, label: "Dokumentation", color: "#8b5cf6" },
  { id: 4, label: "Debugging", color: "#ef4444" },
  { id: 5, label: "Review", color: "#f59e0b" },
  { id: WORK_CODE.DRIVE, label: "Fahrtzeit", color: "#6b7280" },
];

// Generate a date string N days ago
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
};

// Generate work entry
const workEntry = (date, start, end, pause, project, code) => ({
  id: Date.now() + Math.random(),
  type: "work",
  date,
  start,
  end,
  pause,
  project,
  code,
  netDuration: calculateEntryNetDuration({
    entryType: "work",
    startTime: start,
    endTime: end,
    pauseDuration: pause,
    formDate: date,
    userData: null,
    code,
  }),
});

// Generate entries for the past 3 months
export const generateDemoEntries = () => {
  const entries = [];
  const today = new Date();
  let id = 1700000000000;

  // 3 months = ~90 days
  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = toLocalDateString(d);
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Random sick days (about 2 per month)
    if (Math.random() < 0.07) {
      entries.push({
        id: id++,
        type: "sick",
        date: dateStr,
        start: null,
        end: null,
        pause: 0,
        project: "Krank",
        code: null,
        netDuration: 510,
      });
      continue;
    }

    // Random vacation days (about 3 per 3 months)
    if (Math.random() < 0.03) {
      entries.push({
        id: id++,
        type: "vacation",
        date: dateStr,
        start: null,
        end: null,
        pause: 0,
        project: "Urlaub",
        code: null,
        netDuration: 510,
      });
      continue;
    }

    // Normal work day
    const projects = ["Projekt Apollo", "Meeting", "Dokumentation", "Code Review", "Bug Fixing", "Sprint Planning"];
    const codes = [1, 2, 3, 4, 5];

    const project = projects[Math.floor(Math.random() * projects.length)];
    const code = codes[Math.floor(Math.random() * codes.length)];

    // Vary start/end times
    const startHours = [7, 8, 8, 9, 9];
    const endHours = [15, 16, 17, 17, 18];
    const pauses = [0, 30, 30, 45, 60];

    const startH = startHours[Math.floor(Math.random() * startHours.length)];
    const endH = endHours[Math.floor(Math.random() * endHours.length)];
    const pause = pauses[Math.floor(Math.random() * pauses.length)];

    const start = `${String(startH).padStart(2, "0")}:00`;
    const end = `${String(endH).padStart(2, "0")}:00`;

    entries.push({
      id: id++,
      type: "work",
      date: dateStr,
      start,
      end,
      pause,
      project,
      code,
      netDuration: calculateEntryNetDuration({
        entryType: "work",
        startTime: start,
        endTime: end,
        pauseDuration: pause,
        formDate: dateStr,
        userData: null,
        code,
      }),
    });
  }

  return entries;
};

export const DEMO_DATA = {
  user: DEMO_USER,
  workCodes: DEMO_WORK_CODES,
  generateEntries: generateDemoEntries,
};
