import { WORK_CODE, HALF_DAYS } from "../hooks/constants";
import type { Entry, UserData } from '../types';
import { getAllEntries, updateEntryInDb } from '../db/repositories/entriesRepo';

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

export interface PeriodStatsResult {
  work: number;
  drive: number;
  holiday: number;
  vacation: number;
  sick: number;
  timeComp: number;
  totalIst: number;
  totalTarget: number;
  totalSaldo: number;
  normalstunden: number;
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

/**
 * Berechnet die effektive Krankzeit für einen gemischten Tag
 * (Arbeit + Krank am selben Tag).
 *
 * Regel: Krankzeit füllt nur bis zur Tages-Sollzeit auf.
 * Wenn bereits genug gearbeitet wurde → Krankzeit = 0.
 */
export const adjustSickDuration = (
  sickNetDuration: number,
  workMinutesOnDay: number,
  dayTarget: number
): number => {
  if (dayTarget <= 0) return 0;
  if (workMinutesOnDay >= dayTarget) return 0;
  return Math.min(sickNetDuration, Math.max(0, dayTarget - workMinutesOnDay));
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

/**
 * SINGLE SOURCE OF TRUTH für Krank-Korrektur.
 *
 * Gibt eine Kopie der Entry-Liste zurück, in der Sick-Entries bei
 * gemischten Tagen (Arbeit + Krank) korrigierte netDuration-Werte haben.
 * Alle Downstream-Funktionen (calculatePeriodStats, buildDayBalanceMetaMap,
 * calculateDisplayedDayMinutes, Dashboard, ReportDocument) verwenden diese
 * korrigierten Entries — keine zusätzliche Sonderlogik nötig.
 */
export const applyEffectiveDurations = (entries: Entry[], userData: UserData | null): Entry[] => {
  // Arbeitszeit pro Tag summieren (exkl. Fahrzeit)
  const dayWorkMap: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.type === "work" && e.code !== WORK_CODE.DRIVE) {
      dayWorkMap[e.date] = (dayWorkMap[e.date] || 0) + (e.netDuration || 0);
    }
  });

  return entries.map((e) => {
    if (e.type !== "sick") return e;
    const dayWork = dayWorkMap[e.date] || 0;
    if (dayWork <= 0) return e;
    const target = getTargetMinutesForDate(e.date, userData?.workDays);
    const adjusted = adjustSickDuration(e.netDuration || 0, dayWork, target);
    if (adjusted === (e.netDuration || 0)) return e;
    return { ...e, netDuration: adjusted };
  });
};

export const calculateDisplayedDayMinutes = (entries: Entry[]): number => {
  return entries.reduce((acc, entry) => {
    if (entry.type === "work" && entry.code === WORK_CODE.DRIVE) return acc;
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
    normalstunden: 0,
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

  // ─── Entry-Aggregation (Entries haben bereits korrigierte netDuration
  //     via applyEffectiveDurations — keine Krank-Sonderlogik nötig) ────
  const dayActualMap: Record<string, number> = {};

  entries.forEach((e) => {
    if (e.date < startStr || e.date > endStr) return;
    const dur = e.netDuration || 0;
    if (e.type === "work") {
      if (e.code === WORK_CODE.DRIVE) stats.drive += dur;
      else stats.work += dur;
    }
    if (e.type === "vacation") stats.vacation += dur;
    if (e.type === "sick") stats.sick += dur;
    if (e.type === "public_holiday") stats.holiday += dur;
    if (e.type === "time_comp") stats.timeComp += dur;

    // dayActualMap für Wochen-Berechnung (exkl. Fahrzeit)
    if (!(e.type === "work" && e.code === WORK_CODE.DRIVE)) {
      dayActualMap[e.date] = (dayActualMap[e.date] || 0) + dur;
    }
  });

  // ─── Tagesschleife: Target ────────────────────
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

  stats.totalIst =
    stats.work + stats.vacation + stats.sick + stats.holiday + stats.timeComp;
  stats.totalSaldo = stats.totalIst - stats.totalTarget;

  // ───── Mehrarbeit / Überstunden per ISO-Woche ─────────────────
  //
  // Rechtliche Grundlage (Österreich, AZG):
  //   - Mehrarbeit = Stunden zwischen Vertragssoll (z.B. 38,5h) und 40h/Woche
  //   - Überstunden = Stunden über 40h/Woche
  //   - Berechnung erfolgt pro voller ISO-Woche (Mo–So)
  //
  // Volle Woche (alle 7 Tage im Zeitraum):
  //   → MA/ÜS-Split auf 40h-Basis (voller Wochen-Target)
  //
  // Gebrochene Woche (Monatsgrenze):
  //   → Summe der Rand-Tage bilden (Ist und Soll)
  //   → Falls Ist > Soll: MA/ÜS-Split mit vollem Wochen-Target
  //     (damit der MA-Puffer von z.B. 90min korrekt greift)
  //   → Jeder Tag gehört zum Monat, in dem er liegt
  const seenWeeks = new Set<string>();
  const weekCursor = new Date(periodStart);
  weekCursor.setHours(0, 0, 0, 0);
  const periodDayEnd = new Date(periodEnd);
  periodDayEnd.setHours(0, 0, 0, 0);

  while (weekCursor <= periodDayEnd) {
    const monday = getISOWeekMonday(weekCursor);
    const mondayKey = toLocalDateStr(monday);

    if (!seenWeeks.has(mondayKey)) {
      seenWeeks.add(mondayKey);

      // Prüfen ob alle 7 Tage der Woche im Zeitraum liegen
      const sundayOfWeek = new Date(monday);
      sundayOfWeek.setDate(monday.getDate() + 6);
      const mondayStr = toLocalDateStr(monday);
      const sundayStr = toLocalDateStr(sundayOfWeek);
      const isFullWeek = mondayStr >= startStr && sundayStr <= endStr;

      if (isFullWeek) {
        // ── VOLLE WOCHE: MA/ÜS auf 40h-Basis ──
        let weekTarget = 0;
        let weekActual = 0;
        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const dayStr = toLocalDateStr(dayDate);
          weekTarget += getTargetMinutesForDate(dayStr, userData?.workDays);
          weekActual += dayActualMap[dayStr] || 0;
        }
        const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
          weekActual - weekTarget,
          weekTarget
        );
        stats.overtimeSplit.mehrarbeit += mehrarbeit;
        stats.overtimeSplit.ueberstunden += ueberstunden;
      } else {
        // ── GEBROCHENE WOCHE ──
        // IST gegen volles Wochen-Soll prüfen:
        //   < Wochen-Soll → nur tägliche ÜS (Ist > Soll pro Tag), keine MA
        //   ≥ Wochen-Soll → MA/ÜS-Split auf Wochen-Basis
        let partialActual = 0;
        let fullWeekTarget = 0;
        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const dayStr = toLocalDateStr(dayDate);
          fullWeekTarget += getTargetMinutesForDate(dayStr, userData?.workDays);
          if (dayStr >= startStr && dayStr <= endStr) {
            partialActual += dayActualMap[dayStr] || 0;
          }
        }

        if (partialActual > fullWeekTarget) {
          // Über Wochen-Soll: MA/ÜS-Split
          const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
            partialActual - fullWeekTarget,
            fullWeekTarget
          );
          stats.overtimeSplit.mehrarbeit += mehrarbeit;
          stats.overtimeSplit.ueberstunden += ueberstunden;
        } else {
          // Unter Wochen-Soll: nur tägliche ÜS
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            const dayStr = toLocalDateStr(dayDate);
            if (dayStr < startStr || dayStr > endStr) continue;
            const dayTarget = getTargetMinutesForDate(dayStr, userData?.workDays);
            const dayActual = dayActualMap[dayStr] || 0;
            if (dayActual > dayTarget) {
              stats.overtimeSplit.ueberstunden += (dayActual - dayTarget);
            }
          }
        }
      }
    }

    weekCursor.setDate(weekCursor.getDate() + 1);
  }

  // ── Defizit-Wochen verrechnen ──────────────────────────────────
  // Wochen mit negativem Saldo (z.B. KW13 -1h30m) tragen 0 zu MA/ÜS bei,
  // aber ihr Defizit muss von den gesammelten ÜS (dann MA) abgezogen werden,
  // damit MA + ÜS = max(0, Saldo) gilt.
  const maxOvertime = Math.max(0, stats.totalSaldo);
  const totalOvertimeSum = stats.overtimeSplit.mehrarbeit + stats.overtimeSplit.ueberstunden;
  if (totalOvertimeSum > maxOvertime) {
    const excess = totalOvertimeSum - maxOvertime;
    // Zuerst ÜS reduzieren, dann MA
    const uesReduction = Math.min(excess, stats.overtimeSplit.ueberstunden);
    stats.overtimeSplit.ueberstunden -= uesReduction;
    stats.overtimeSplit.mehrarbeit -= (excess - uesReduction);
  }

  // Normalstunden = IST minus Überstunden-Anteile, damit
  // Normal + MA + ÜS = IST immer aufgeht.
  stats.normalstunden = Math.max(
    0,
    stats.totalIst - stats.overtimeSplit.mehrarbeit - stats.overtimeSplit.ueberstunden
  );

  return stats;
};

/**
 * Neuberechnung aller Entries in der DB.
 * Vergleicht gespeicherte netDuration mit dem berechneten Wert und
 * aktualisiert nur Einträge mit Abweichung.
 * @returns {{ total: number, fixed: number }}
 */
export const recalculateAllEntries = async (
  userData: UserData | null
): Promise<{ total: number; fixed: number }> => {
  const entries = await getAllEntries();
  let fixed = 0;

  for (const entry of entries) {
    const hasTime = entry.start && entry.end;
    let expected: number;

    if ((entry.type === "work" || entry.type === "drive" || entry.code === WORK_CODE.DRIVE) && hasTime) {
      expected = calculateEntryNetDuration({
        entryType: entry.type,
        startTime: entry.start!,
        endTime: entry.end!,
        pauseDuration: entry.pause ?? 0,
        formDate: entry.date,
        userData,
        code: entry.code ?? null,
      });
    } else if ((entry.type === "vacation" || entry.type === "sick" || entry.type === "time_comp") && hasTime) {
      // Special entries with manual start/end
      expected = calculateEntryNetDuration({
        entryType: entry.type,
        startTime: entry.start!,
        endTime: entry.end!,
        pauseDuration: 0,
        formDate: entry.date,
        userData,
        code: entry.code ?? null,
        specialManualMode: true,
      });
    } else if (entry.type === "vacation" || entry.type === "sick" || entry.type === "time_comp" || entry.type === "public_holiday") {
      // Special entries without start/end → target minutes
      expected = getTargetMinutesForDate(entry.date, userData?.workDays);
    } else {
      continue; // unknown type, skip
    }

    if (expected !== (entry.netDuration ?? 0)) {
      await updateEntryInDb({ ...entry, netDuration: expected });
      fixed++;
    }
  }

  return { total: entries.length, fixed };
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
