// @ts-nocheck
import { WORK_CODE, HALF_DAYS } from "../hooks/constants";

type UserData = {
  name: string;
  position: string;
  photo: string | null;
  workDays: number[];
};

type OvertimeSplit = {
  mehrarbeit: number;
  ueberstunden: number;
};

type PeriodStats = {
  work: number;
  drive: number;
  holiday: number;
  vacation: number;
  sick: number;
  timeComp: number;
  totalIst: number;
  totalTarget: number;
  totalSaldo: number;
  overtimeSplit: OvertimeSplit;
};

type DayBalanceMeta = {
  dayIndex: number;
  isEvenDay: boolean;
  showBalance: boolean;
  balance: number;
  totalMinutes: number;
};

type WeekRange = {
  start: Date;
  end: Date;
};

export type EntryForCalculation = {
  date: string; // YYYY-MM-DD format
  type: string;
  code?: number;
  netDuration?: number;
  start?: string; // HH:MM format
  end?: string; // HH:MM format
  pauseMinutes?: number;
  workCodeId?: string | null;
  description?: string;
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

type CalculateEntryNetDurationParams = {
  entryType: string;
  startTime?: string;
  endTime?: string;
  pauseDuration?: number;
  formDate?: string;
  userData?: UserData;
  code?: number;
  specialManualMode?: boolean;
};

export const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const getDayOfWeek = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

export const getTargetMinutesForDate = (dateStr: string, customWorkDays?: number[]): number => {
  const isHalfDay = HALF_DAYS.some((suffix) => dateStr.endsWith(`-${suffix}`));

  let dailyTarget = 0;
  const day = getDayOfWeek(dateStr);

  if (
    customWorkDays &&
    Array.isArray(customWorkDays) &&
    customWorkDays.length === 7
  ) {
    dailyTarget = customWorkDays[day];
  } else {
    if (day >= 1 && day <= 4) dailyTarget = 510;
    else if (day === 5) dailyTarget = 270;
    else dailyTarget = 0;
  }

  if (isHalfDay && dailyTarget > 0) {
    return Math.round(dailyTarget / 2);
  }

  return dailyTarget;
};

export const getWeekNumber = (d: Date): number => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const calculateOvertimeSplit = (balanceMinutes: number, targetMinutes: number): OvertimeSplit => {
  if (balanceMinutes <= 0) return { mehrarbeit: 0, ueberstunden: 0 };

  const WEEKLY_LIMIT_MINUTES = 40 * 60;
  const mehrarbeitBuffer = Math.max(0, WEEKLY_LIMIT_MINUTES - targetMinutes);

  const mehrarbeit = Math.min(balanceMinutes, mehrarbeitBuffer);
  const ueberstunden = Math.max(0, balanceMinutes - mehrarbeit);

  return { mehrarbeit, ueberstunden };
};

export const calculateEntryNetDuration = ({
  entryType,
  startTime,
  endTime,
  pauseDuration = 0,
  formDate,
  userData,
  code,
  specialManualMode = false,
}: CalculateEntryNetDurationParams): number => {
  const isDrive = entryType === "drive" || code === WORK_CODE.DRIVE;
  const isSpecial =
    entryType === "vacation" || entryType === "sick" || entryType === "time_comp";

  if (entryType === "work" || isDrive) {
    const startMinutes = parseTime(startTime!);
    const endMinutes = parseTime(endTime!);
    const usedPause = isDrive ? 0 : pauseDuration;
    return Math.max(0, endMinutes - startMinutes - usedPause);
  }

  // Krank/Urlaub/ZA im Manual-Modus: Stunden werden direkt aus Start/Ende
  // berechnet, genau wie bei einem normalen Eintrag (ohne Pause-Abzug).
  if (isSpecial && specialManualMode && startTime && endTime) {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    return Math.max(0, endMinutes - startMinutes);
  }

  return Math.max(
    0,
    getTargetMinutesForDate(formDate!, userData?.workDays)
  );
};

export const calculateDisplayedDayMinutes = (entries: EntryForCalculation[]): number => {
  return entries.reduce((acc, entry) => {
    if (entry.type === "work" && entry.code === WORK_CODE.DRIVE) {
      return acc;
    }
    return acc + (entry.netDuration || 0);
  }, 0);
};

export const buildDayBalanceMetaMap = (entries: EntryForCalculation[], userData?: UserData): Record<number, DayBalanceMeta> => {
  const map: Record<number, DayBalanceMeta> = {};
  const dayTotals: Record<string, number> = {};
  let currentDateStr = "";
  let dayIndex = 0;

  entries.forEach((entry) => {
    dayTotals[entry.date] = (dayTotals[entry.date] || 0);
    if (!(entry.type === "work" && entry.code === WORK_CODE.DRIVE)) {
      dayTotals[entry.date] += entry.netDuration || 0;
    }
  });

  entries.forEach((entry, idx) => {
    if (entry.date !== currentDateStr) {
      dayIndex++;
      currentDateStr = entry.date;
    }

    const target = getTargetMinutesForDate(entry.date, userData?.workDays);
    const nextEntry = entries[idx + 1];
    const isLastOfDay = !nextEntry || nextEntry.date !== entry.date;

    const key = `${entry.date}-${entry.type}-${entry.code || ''}`;
    map[key] = {
      dayIndex,
      isEvenDay: dayIndex % 2 === 0,
      showBalance: isLastOfDay && target > 0,
      balance: dayTotals[entry.date] - target,
      totalMinutes: dayTotals[entry.date],
    };
  });

  return map;
};

export const calculatePeriodStats = (
  entries: EntryForCalculation[],
  userData?: UserData,
  periodStart?: Date,
  periodEnd?: Date,
  allEntries?: EntryForCalculation[]
): PeriodStats => {
  const stats: PeriodStats = {
    work: 0,
    drive: 0,
    holiday: 0,
    vacation: 0,
    sick: 0,
    timeComp: 0,
    totalIst: 0,
    totalTarget: 0,
    totalSaldo: 0,
    overtimeSplit: { mehrarbeit: 0, ueberstunden: 0 },
  };

  if (!periodStart || !periodEnd) {
    return stats;
  }

  const startStr = [
    periodStart.getFullYear(),
    String(periodStart.getMonth() + 1).padStart(2, "0"),
    String(periodStart.getDate()).padStart(2, "0"),
  ].join("-");
  const endStr = [
    periodEnd.getFullYear(),
    String(periodEnd.getMonth() + 1).padStart(2, "0"),
    String(periodEnd.getDate()).padStart(2, "0"),
  ].join("-");

  entries.forEach((e) => {
    if (e.date < startStr || e.date > endStr) return;

    if (e.type === "work") {
      if (e.code === WORK_CODE.DRIVE) stats.drive += e.netDuration || 0;
      else stats.work += e.netDuration || 0;
    }
    if (e.type === "vacation") stats.vacation += e.netDuration || 0;
    if (e.type === "sick") stats.sick += e.netDuration || 0;
    if (e.type === "public_holiday") stats.holiday += e.netDuration || 0;
    if (e.type === "time_comp") stats.timeComp += e.netDuration || 0;
  });

  stats.totalIst =
    stats.work + stats.vacation + stats.sick + stats.holiday + stats.timeComp;

  const loopDate = new Date(periodStart);
  loopDate.setHours(0, 0, 0, 0);
  const loopEnd = new Date(periodEnd);
  loopEnd.setHours(23, 59, 59, 999);

  while (loopDate <= loopEnd) {
    const dateStr = [
      loopDate.getFullYear(),
      String(loopDate.getMonth() + 1).padStart(2, "0"),
      String(loopDate.getDate()).padStart(2, "0"),
    ].join("-");

    const target = getTargetMinutesForDate(dateStr, userData?.workDays);
    stats.totalTarget += target;

    loopDate.setDate(loopDate.getDate() + 1);
  }

  stats.totalSaldo = stats.totalIst - stats.totalTarget;

  // ───── Mehrarbeit / Überstunden per voller ISO-Woche ─────
  //
  // Die Wochensumme wird IMMER über die komplette Woche (Mo–So) berechnet,
  // damit sie nicht davon abhängt, wie die Periode in die Woche hineinschneidet.
  // Zuordnung nach ISO-Regel: Eine Woche zählt zu dem Zeitraum, in dem ihr
  // Donnerstag liegt. Dadurch wird jede Woche genau einmal aggregiert
  // (keine Doppelzählung bei Monatsübergängen, keine Lücken).
  //
  // Für in-Periode liegende Tage werden die gefilterten `entries` verwendet
  // (inkl. evtl. synthetisch ergänzter Feiertage), für out-of-period Tage
  // die optionalen `allEntries` (Roh-Liste aus useEntries). Fällt
  // `allEntries` weg (z.B. Unit-Tests, calculateWeekStats), gilt der
  // historische Single-Source-Modus.
  const periodDayStart = new Date(periodStart);
  periodDayStart.setHours(0, 0, 0, 0);
  const periodDayEnd = new Date(periodEnd);
  periodDayEnd.setHours(0, 0, 0, 0);

  const boundarySource = allEntries || entries;

  const seenWeeks = new Set<string>();
  const weekCursor = new Date(periodDayStart);
  while (weekCursor <= periodDayEnd) {
    const monday = getISOWeekMonday(weekCursor);
    const mondayKey = toLocalDateStr(monday);

    if (!seenWeeks.has(mondayKey)) {
      seenWeeks.add(mondayKey);

      const thursday = new Date(monday);
      thursday.setDate(monday.getDate() + 3);
      const thursdayInPeriod =
        thursday >= periodDayStart && thursday <= periodDayEnd;

      if (thursdayInPeriod) {
        let weekTarget = 0;
        let weekActual = 0;

        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const dayStr = toLocalDateStr(dayDate);

          weekTarget += getTargetMinutesForDate(dayStr, userData?.workDays);

          const inPeriod = dayStr >= startStr && dayStr <= endStr;
          const source = inPeriod ? entries : boundarySource;

          source.forEach((e) => {
            if (e.date !== dayStr) return;
            if (e.type === "work" && e.code === WORK_CODE.DRIVE) return;
            weekActual += e.netDuration || 0;
          });
        }

        const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
          weekActual - weekTarget,
          weekTarget
        );
        stats.overtimeSplit.mehrarbeit += mehrarbeit;
        stats.overtimeSplit.ueberstunden += ueberstunden;
      }
    }

    weekCursor.setDate(weekCursor.getDate() + 1);
  }

  return stats;
};

// Interner Helper: Montag der ISO-Woche eines Datums (lokale Zeitzone).
const getISOWeekMonday = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sonntag, 1..6 = Mo..Sa
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

// Interner Helper: YYYY-MM-DD fuer lokale Zeitzone.
const toLocalDateStr = (d: Date): string =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");

export const getWeekRangeInMonth = (dateInWeek: Date, viewDate?: Date): WeekRange => {
  const d = new Date(dateInWeek);
  const day = d.getDay() || 7;

  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - day + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  if (!viewDate) return { start: startOfWeek, end: endOfWeek };

  const viewMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const viewMonthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  viewMonthEnd.setHours(23, 59, 59, 999);

  const effectiveStart = startOfWeek < viewMonthStart ? viewMonthStart : startOfWeek;
  const effectiveEnd = endOfWeek > viewMonthEnd ? viewMonthEnd : endOfWeek;

  return { start: effectiveStart, end: effectiveEnd };
};

/**
 * Berechnet Wochen-Stats immer für die VOLLE Woche (Mo-So),
 * unabhängig vom angezeigten Monat.
 * So sind Saldo und MA/ÜS-Split korrekt auf 40h-Basis.
 */
export const calculateWeekStats = (weekEntries: EntryForCalculation[], userData?: UserData): PeriodStats => {
  const dateRef = weekEntries.length > 0 ? new Date(weekEntries[0].date) : new Date();
  // Volle Woche ohne Monats-Clipping (kein viewDate)
  const { start, end } = getWeekRangeInMonth(dateRef);
  return calculatePeriodStats(weekEntries, userData, start, end);
};
