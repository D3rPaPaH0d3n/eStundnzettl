/**
 * Demo / Test Data for eStundnzettl
 * Generates realistic sample entries for 3 months with "Thomas Berger"
 */
import { WORK_CODE, WORK_MODELS } from "../hooks/constants";
import { toLocalDateString } from "../utils";
import { calculateEntryNetDuration } from "./timeCalculations";
import type { Entry, WorkCode } from '../types';

interface DemoUser {
  name: string;
  position: string;
  company: string;
  workDays: number[];
  workModelId: string;
  photo: string | null;
}

const DEMO_USER: DemoUser = {
  name: "Thomas Berger",
  position: "Monteur",
  company: "Berger Elektrotechnik GmbH",
  workDays: [...WORK_MODELS[0].days], // 38,5h Standard: Mo-Do 8,5h / Fr 4,5h
  workModelId: "38.5-classic",
  photo: null,
};

const DEMO_WORK_CODES: WorkCode[] = [
  { id: 1, label: "01 - Montage" },
  { id: 2, label: "02 - Büro" },
  { id: 3, label: "03 - Besprechung" },
  { id: 4, label: "04 - Material" },
  { id: 5, label: "05 - Wartung" },
  { id: 6, label: "06 - Reparatur" },
  { id: WORK_CODE.DRIVE, label: "19 - Fahrzeit" },
  { id: WORK_CODE.ARRIVAL, label: "19 - An/Abreise" },
  { id: WORK_CODE.OFFICE, label: "70 - Büro" },
];

// Generate a date string N days ago
const _daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
};

// Generate work entry
const _workEntry = (date: string, start: string, end: string, pause: number, project: string, code: number): Entry => ({
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

// Hilfsfunktion: Zufallsauswahl
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generate entries for the past 3 months
export const generateDemoEntries = (): Entry[] => {
  const entries: Entry[] = [];
  const today = new Date();
  let id = 1700000000000;

  const projects = [
    "BV Maier - Neubau",
    "BV Stadler - Sanierung",
    "BV Gemeinde Hof",
    "Lager / Werkstatt",
    "BV Kirchner - Umbau",
  ];
  const workCodes = [1, 3, 4, 5, 6];

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    // Nicht in der Zukunft
    if (d > today) continue;
    const dateStr = toLocalDateString(d);
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Random sick days (~2 per month)
    if (Math.random() < 0.07) {
      const target = dayOfWeek === 5 ? 270 : 510;
      entries.push({
        id: id++,
        type: "sick",
        date: dateStr,
        start: null,
        end: null,
        pause: 0,
        project: "Krank",
        code: null,
        netDuration: target,
      });
      continue;
    }

    // Random vacation days (~1 per month)
    if (Math.random() < 0.04) {
      const target = dayOfWeek === 5 ? 270 : 510;
      entries.push({
        id: id++,
        type: "vacation",
        date: dateStr,
        start: null,
        end: null,
        pause: 0,
        project: "Urlaub",
        code: null,
        netDuration: target,
      });
      continue;
    }

    // Freitag: kürzerer Tag (4,5h Soll)
    const isFriday = dayOfWeek === 5;
    const project = pick(projects);
    const code = pick(workCodes);

    let startH: number, startM: number, endH: number, endM: number, pause: number;

    if (isFriday) {
      startH = pick([6, 7, 7]);
      startM = pick([0, 0, 30]);
      endH = startH + pick([5, 5, 6]);
      endM = pick([0, 15, 30]);
      pause = pick([0, 15, 30]);
    } else {
      startH = pick([6, 6, 7, 7]);
      startM = pick([0, 0, 15, 30]);
      endH = startH + pick([9, 9, 10, 10]);
      endM = pick([0, 15, 30, 45]);
      pause = pick([30, 30, 30, 45]);
    }

    const start = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
    const end = `${String(Math.min(endH, 20)).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

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
        userData: DEMO_USER,
        code,
      }),
    });

    // ~30% der Tage: zusätzlicher Fahrzeit-Eintrag (An/Abreise)
    if (Math.random() < 0.3) {
      const driveStart = `${String(startH - 1).padStart(2, "0")}:00`;
      const driveEnd = `${String(startH).padStart(2, "0")}:00`;
      entries.push({
        id: id++,
        type: "work",
        date: dateStr,
        start: driveStart,
        end: driveEnd,
        pause: 0,
        project,
        code: WORK_CODE.ARRIVAL,
        netDuration: calculateEntryNetDuration({
          entryType: "work",
          startTime: driveStart,
          endTime: driveEnd,
          pauseDuration: 0,
          formDate: dateStr,
          userData: DEMO_USER,
          code: WORK_CODE.ARRIVAL,
        }),
      });
    }
  }

  return entries;
};

export const DEMO_DATA = {
  user: DEMO_USER,
  workCodes: DEMO_WORK_CODES,
  generateEntries: generateDemoEntries,
};
