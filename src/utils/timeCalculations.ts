import { WORK_CODE, HALF_DAYS } from "../hooks/constants";
import type { Entry, UserData } from '../types';

interface OvertimeSplit {
  mehrarbeit: number;
  ueberstunden: number;
}

interface DayBalanceMeta {
  dayIndex: number;
  isEvenDay: boolean;
  showBalance: boolean;
  balance: number;
  totalMinutes: number;
}

interface PeriodStatsResult {
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
}

interface NetDurationParams {
  entryType: string;
  startTime: string;
  endTime: string;
  pauseDuration?: number;
  formDate: string;
  userData: UserData | null;
  code: number | null;
  specialManualMode?: boolean;
}

export const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const getDayOfWeek = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

export const getTargetMinutesForDate = (dateStr: string, customWorkDays?: number[] | null): number => {
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
}: NetDurationParams): number => {
  const isDrive = entryType === "drive" || code === WORK_CODE.DRIVE;
  const isSpecial =
    entryType === "vacation" || entryType === "sick" || entryType === "time_comp";

  if (entryType === "work" || isDrive) {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
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
    getTargetMinutesForDate(formDate, userData?.workDays)
  );
};

export const calculateDisplayedDayMinutes = (entries: Entry[]): number => {
  return entries.reduce((acc, entry) => {
    if (entry.type === "work" && entry.code === WORK_CODE.DRIVE) {
      return acc;
    }
    return acc + (entry.netDuration || 0);
  }, 0);
};

export const buildDayBalanceMetaMap = (entries: Entry[], userData: UserData | null): Record<string | number, DayBalanceMeta> => {
  const map: Record<string | number, DayBalanceMeta> = {};
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

    map[entry.id] = {
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
  entries: Entry[],
  userData: UserData | null,
  periodStart: Date,
  periodEnd: Date,
  allEntries?: Entry[]
): PeriodStatsResult => {
  const stats = {
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
      if (e.code === WORK_CODE.DRIVE) stats.drive += e.netDuration;
      else stats.work += e.netDuration;
    }
    if (e.type === "vacation") stats.vacation += e.netDuration;
    if (e.type === "sick") stats.sick += e.netDuration;
    if (e.type === "public_holiday") stats.holiday += e.netDuration;
    if (e.type === "time_comp") stats.timeComp += e.netDuration;
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

  // ───── Mehrarbeit / Überstunden per ISO-Woche (Donnerstag-Regel) ─────
  //
  // Rechtliche Grundlage (Österreich, AZG):
  //   - Mehrarbeit = Stunden zwischen Vertragssoll (z.B. 38,5h) und 40h/Woche
  //   - Überstunden = Stunden über 40h/Woche
  //   - Berechnung erfolgt pro voller ISO-Woche (Mo–So)
  //
  // Zuordnung (Donnerstag-Regel):
  //   - Eine Woche gehört zu dem Monat, in dem ihr Donnerstag liegt.
  //   - Liegt der Donnerstag im Monat → volle Woche MA/ÜS (kein Split).
  //   - Liegt der Donnerstag NICHT im Monat → nur die Rand-Tage dieses
  //     Monats werden auf tägliche ÜS geprüft (IST > SOLL → ÜS).
  //     Keine Mehrarbeit für Rand-Tage (wöchentliche Schwelle unerreichbar).
  //
  // Für in-Periode liegende Tage werden die gefilterten `entries` verwendet
  // (inkl. evtl. synthetisch ergänzter Feiertage), für out-of-period Tage
  // die optionalen `allEntries` (Roh-Liste aus useEntries).
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

      let weekTarget = 0;
      let weekActual = 0;
      let workDaysInPeriod = 0;
      let workDaysTotal = 0;

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        const dayStr = toLocalDateStr(dayDate);

        const dayTarget = getTargetMinutesForDate(dayStr, userData?.workDays);
        weekTarget += dayTarget;

        // Zähle Arbeitstage (Target > 0) für proportionale Aufteilung
        if (dayTarget > 0) {
          workDaysTotal++;
          if (dayStr >= startStr && dayStr <= endStr) workDaysInPeriod++;
        }

        const inPeriod = dayStr >= startStr && dayStr <= endStr;
        const source = inPeriod ? entries : boundarySource;

        source.forEach((e) => {
          if (e.date !== dayStr) return;
          if (e.type === "work" && e.code === WORK_CODE.DRIVE) return;
          weekActual += e.netDuration || 0;
        });
      }

      // Nur wenn mindestens ein Arbeitstag dieser Woche im Zeitraum liegt
      if (workDaysInPeriod > 0) {
        // Donnerstag der Woche bestimmen (Monday + 3 Tage)
        const thursday = new Date(monday);
        thursday.setDate(monday.getDate() + 3);
        const thursdayStr = toLocalDateStr(thursday);
        const thursdayInPeriod = thursdayStr >= startStr && thursdayStr <= endStr;

        if (thursdayInPeriod) {
          // ── DONNERSTAG IM MONAT: volle Woche, kein proportionaler Split ──
          const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
            weekActual - weekTarget,
            weekTarget
          );
          stats.overtimeSplit.mehrarbeit += mehrarbeit;
          stats.overtimeSplit.ueberstunden += ueberstunden;
        } else {
          // ── RAND-TAGE: Woche gehört anderem Monat → nur tägliche ÜS ──
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            const dayStr = toLocalDateStr(dayDate);
            if (dayStr < startStr || dayStr > endStr) continue;

            const dayTarget = getTargetMinutesForDate(dayStr, userData?.workDays);
            if (dayTarget === 0) continue;

            let dayActual = 0;
            entries.forEach((e) => {
              if (e.date !== dayStr) return;
              if (e.type === "work" && e.code === WORK_CODE.DRIVE) return;
              dayActual += e.netDuration || 0;
            });

            if (dayActual > dayTarget) {
              stats.overtimeSplit.ueberstunden += (dayActual - dayTarget);
            }
          }
        }
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

export const getWeekRangeInMonth = (dateInWeek: Date, viewDate?: Date): { start: Date; end: Date } => {
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
export const calculateWeekStats = (weekEntries: Entry[], userData: UserData | null): PeriodStatsResult => {
  const dateRef = weekEntries.length > 0 ? new Date(weekEntries[0].date) : new Date();
  // Volle Woche ohne Monats-Clipping (kein viewDate)
  const { start, end } = getWeekRangeInMonth(dateRef);
  return calculatePeriodStats(weekEntries, userData, start, end);
};
