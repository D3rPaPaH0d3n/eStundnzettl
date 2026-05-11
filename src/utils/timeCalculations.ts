import { WORK_CODE } from "../hooks/constants";
import type { Entry, UserData, CalculationConfig } from '../types';
import { getAllEntries, updateEntryInDb } from '../db/repositories/entriesRepo';
import type { Locale } from '../locales/types';
import { getLocale } from '../locales';
import {
  resolveEffectiveRules,
  calculateAutoPause,
  type EffectiveCalculationRules,
} from './calculationConfig';

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
  locale?: Locale;
  config?: CalculationConfig | null;
}

export const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const getDayOfWeek = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

/**
 * Berechnet die Tages-Sollzeit für ein Datum in Minuten.
 *
 * Wenn `customWorkDays` gesetzt ist (7-Element-Array), wird der Wert
 * für den Wochentag genommen. Sonst fällt auf `locale.defaultWorkDays`
 * zurück (Österreich-Fallback wenn keine Locale übergeben).
 *
 * An Halbtagen wird das Ergebnis halbiert. Die Halbtags-Liste kommt
 * aus `config.halfDayMode` (falls gesetzt) oder aus `locale.halfDays`.
 */
export const getTargetMinutesForDate = (
  dateStr: string,
  customWorkDays?: number[] | null,
  locale?: Locale,
  config?: CalculationConfig | null
): number => {
  const loc = locale ?? getLocale(undefined);
  const effective = resolveEffectiveRules(loc, config);
  const isHalfDay = effective.halfDays.some((suffix) => dateStr.endsWith(`-${suffix}`));

  let dailyTarget = 0;
  const day = getDayOfWeek(dateStr);

  if (
    customWorkDays &&
    Array.isArray(customWorkDays) &&
    customWorkDays.length === 7
  ) {
    dailyTarget = customWorkDays[day];
  } else {
    dailyTarget = loc.defaultWorkDays[day] ?? 0;
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

/**
 * Teilt einen positiven Wochensaldo in Mehrarbeit und Überstunden auf.
 *
 * - Mehrarbeit: zwischen Vertragssoll (z.B. 38,5h) und Wochenlimit (z.B. 40h)
 * - Überstunden: über dem Wochenlimit
 *
 * Das Verhalten hängt vom `overtimeMode` der effektiven Regeln ab:
 *   - "split": klassischer MA/ÜS-Split auf der Wochen-Grenze
 *   - "ueberstunden_only": alles positiv → Überstunden, Mehrarbeit = 0
 *   - "none": kein Split, Mehrarbeit und Überstunden beide 0
 *     (der Caller zeigt dann nur `totalSaldo` an)
 *
 * Ohne expliziten Config-Parameter wird auf die Locale-Defaults gefallen.
 */
export const calculateOvertimeSplit = (
  balanceMinutes: number,
  targetMinutes: number,
  locale?: Locale,
  config?: CalculationConfig | null
): OvertimeSplit => {
  if (balanceMinutes <= 0) return { mehrarbeit: 0, ueberstunden: 0 };

  const loc = locale ?? getLocale(undefined);
  const effective = resolveEffectiveRules(loc, config);

  // Kein Split: Aufrufer zeigt nur Saldo, wir liefern 0/0 zurück
  if (effective.overtimeMode === "none") {
    return { mehrarbeit: 0, ueberstunden: 0 };
  }

  // Alles gilt als Überstunden (neutraler Split-Ersatz)
  if (effective.overtimeMode === "ueberstunden_only" || effective.weeklyLimitMinutes === null) {
    return { mehrarbeit: 0, ueberstunden: balanceMinutes };
  }

  const WEEKLY_LIMIT_MINUTES = effective.weeklyLimitMinutes;
  const mehrarbeitBuffer = Math.max(0, WEEKLY_LIMIT_MINUTES - targetMinutes);

  const mehrarbeit = Math.min(balanceMinutes, mehrarbeitBuffer);
  const ueberstunden = Math.max(0, balanceMinutes - mehrarbeit);

  return { mehrarbeit, ueberstunden };
};

/**
 * Berechnet die effektive Krankzeit für einen gemischten Tag
 * (Arbeit + Krank am selben Tag).
 *
 * Der Modus kommt aus `config.sickOnWorkDayMode`, fällt auf den
 * Locale-Default zurück, wenn keine Config gesetzt ist:
 *   - "cap_to_target" (AT/DE-Default): füllt nur bis zum Tagessoll auf
 *   - "additive" (Neutral-Default): Krank bleibt 1:1
 *   - "ignore": Krank wird komplett verworfen, wenn schon gearbeitet wurde
 */
export const adjustSickDuration = (
  sickNetDuration: number,
  workMinutesOnDay: number,
  dayTarget: number,
  locale?: Locale,
  config?: CalculationConfig | null
): number => {
  const loc = locale ?? getLocale(undefined);
  const effective = resolveEffectiveRules(loc, config);

  if (effective.sickMode === "additive") return sickNetDuration;

  if (effective.sickMode === "ignore") {
    return workMinutesOnDay > 0 ? 0 : sickNetDuration;
  }

  // cap_to_target
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
  locale,
  config,
}: NetDurationParams): number => {
  const isDrive = entryType === "drive" || code === WORK_CODE.DRIVE;
  const isSpecial =
    entryType === "vacation" || entryType === "sick" || entryType === "time_comp";

  if (entryType === "work" || isDrive) {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const rawDuration = Math.max(0, endMinutes - startMinutes);
    let usedPause = isDrive ? 0 : pauseDuration;

    // Auto-Pause greift nur bei echter Arbeit (kein Drive) und nur wenn
    // der User keine manuelle Pause eingetragen hat. So überschreibt die
    // Automatik nie eine bewusst gesetzte Zahl.
    if (!isDrive && usedPause === 0 && config) {
      const autoPause = calculateAutoPause(rawDuration, config.autoPauseRules);
      if (autoPause > 0) usedPause = autoPause;
    }

    return Math.max(0, rawDuration - usedPause);
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
    getTargetMinutesForDate(formDate, userData?.workDays, locale, config)
  );
};

/**
 * SINGLE SOURCE OF TRUTH für Krank- und Feiertags-Korrektur bei
 * gemischten Tagen (Arbeit + Sonderzeit am selben Tag).
 *
 * Gibt eine Kopie der Entry-Liste zurück, in der `sick` und
 * (je nach Config) `public_holiday` Einträge korrigierte
 * `netDuration`-Werte haben. Alle Downstream-Funktionen
 * (calculatePeriodStats, buildDayBalanceMetaMap,
 * calculateDisplayedDayMinutes, Dashboard, ReportDocument)
 * verwenden diese korrigierten Entries — keine zusätzliche
 * Sonderlogik nötig.
 */
export const applyEffectiveDurations = (
  entries: Entry[],
  userData: UserData | null,
  locale?: Locale,
  config?: CalculationConfig | null
): Entry[] => {
  const loc = locale ?? getLocale(undefined);
  const effective = resolveEffectiveRules(loc, config);

  // Bei sickMode "additive" UND holidayOnWorkDayMode nicht "cap_to_target": nichts zu tun
  // ("additive" und "counts_as_overtime" brauchen beide keine Duration-Korrektur)
  if (
    effective.sickMode === "additive" &&
    effective.holidayOnWorkDayMode !== "cap_to_target"
  ) {
    return entries;
  }

  // Arbeitszeit pro Tag summieren (exkl. Fahrzeit)
  const dayWorkMap: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.type === "work" && e.code !== WORK_CODE.DRIVE) {
      dayWorkMap[e.date] = (dayWorkMap[e.date] || 0) + (e.netDuration || 0);
    }
  });

  return entries.map((e) => {
    if (e.type === "sick") {
      const dayWork = dayWorkMap[e.date] || 0;
      if (dayWork <= 0) return e;
      const target = getTargetMinutesForDate(e.date, userData?.workDays, loc, config);
      const adjusted = adjustSickDuration(e.netDuration || 0, dayWork, target, loc, config);
      if (adjusted === (e.netDuration || 0)) return e;
      return { ...e, netDuration: adjusted };
    }

    if (e.type === "public_holiday" && effective.holidayOnWorkDayMode === "cap_to_target") {
      const dayWork = dayWorkMap[e.date] || 0;
      if (dayWork <= 0) return e;
      const target = getTargetMinutesForDate(e.date, userData?.workDays, loc, config);
      if (target <= 0) return { ...e, netDuration: 0 };
      if (dayWork >= target) return { ...e, netDuration: 0 };
      const capped = Math.min(e.netDuration || 0, Math.max(0, target - dayWork));
      if (capped === (e.netDuration || 0)) return e;
      return { ...e, netDuration: capped };
    }

    return e;
  });
};

export const calculateDisplayedDayMinutes = (entries: Entry[]): number => {
  return entries.reduce((acc, entry) => {
    if (entry.type === "work" && entry.code === WORK_CODE.DRIVE) return acc;
    return acc + (entry.netDuration || 0);
  }, 0);
};

export const buildDayBalanceMetaMap = (
  entries: Entry[],
  userData: UserData | null,
  locale?: Locale,
  config?: CalculationConfig | null
): Record<string | number, DayBalanceMeta> => {
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

    const target = getTargetMinutesForDate(entry.date, userData?.workDays, locale, config);
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
  allEntries?: Entry[],
  locale?: Locale,
  config?: CalculationConfig | null
): PeriodStatsResult => {
  const loc = locale ?? getLocale(undefined);
  const effective: EffectiveCalculationRules = resolveEffectiveRules(loc, config);
  // allEntries wird vom Caller optional mitgegeben, wir nutzen den
  // Parameter aktuell nicht — kann für zukünftige Cross-Period-Logik
  // verwendet werden ohne die Signatur zu brechen.
  void allEntries;
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

    const target = getTargetMinutesForDate(dateStr, userData?.workDays, loc, config);
    stats.totalTarget += target;

    loopDate.setDate(loopDate.getDate() + 1);
  }

  stats.totalIst =
    stats.work + stats.vacation + stats.sick + stats.holiday + stats.timeComp;
  stats.totalSaldo = stats.totalIst - stats.totalTarget;

  // ───── Mehrarbeit / Überstunden per ISO-Woche ─────────────────
  //
  // Rechtliche Grundlage (Österreich, AZG / Deutschland analog):
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
  //
  // Locale-/Config-Abhängigkeit: Wenn der effektive overtimeMode "none"
  // ist (z.B. Neutral-Locale oder User hat in der Config "keine
  // Unterscheidung" gewählt), wird dieser Block übersprungen — der
  // Saldo wird dann nur als `totalSaldo` angezeigt, ohne MA/ÜS.
  if (effective.overtimeMode === "none") {
    stats.normalstunden = Math.max(0, stats.totalIst);
    return stats;
  }

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
          weekTarget += getTargetMinutesForDate(dayStr, userData?.workDays, loc, config);
          weekActual += dayActualMap[dayStr] || 0;
        }
        const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
          weekActual - weekTarget,
          weekTarget,
          loc,
          config
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
          fullWeekTarget += getTargetMinutesForDate(dayStr, userData?.workDays, loc, config);
          if (dayStr >= startStr && dayStr <= endStr) {
            partialActual += dayActualMap[dayStr] || 0;
          }
        }

        if (partialActual > fullWeekTarget) {
          // Über Wochen-Soll: MA/ÜS-Split
          const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
            partialActual - fullWeekTarget,
            fullWeekTarget,
            loc,
            config
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
            const dayTarget = getTargetMinutesForDate(dayStr, userData?.workDays, loc, config);
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
  userData: UserData | null,
  locale?: Locale,
  config?: CalculationConfig | null
): Promise<{ total: number; fixed: number }> => {
  const entries = await getAllEntries();
  let fixed = 0;

  for (const entry of entries) {
    let expected: number;

    if ((entry.type === "work" || entry.code === WORK_CODE.DRIVE) && entry.start && entry.end) {
      expected = calculateEntryNetDuration({
        entryType: entry.type,
        startTime: entry.start,
        endTime: entry.end,
        pauseDuration: entry.pause ?? 0,
        formDate: entry.date,
        userData,
        code: entry.code ?? null,
        locale,
        config,
      });
    } else if ((entry.type === "vacation" || entry.type === "sick" || entry.type === "time_comp") && entry.start && entry.end) {
      // Special entries with manual start/end
      expected = calculateEntryNetDuration({
        entryType: entry.type,
        startTime: entry.start,
        endTime: entry.end,
        pauseDuration: 0,
        formDate: entry.date,
        userData,
        code: entry.code ?? null,
        specialManualMode: true,
        locale,
        config,
      });
    } else if (entry.type === "vacation" || entry.type === "sick" || entry.type === "time_comp" || entry.type === "public_holiday") {
      // Special entries without start/end → target minutes
      expected = getTargetMinutesForDate(entry.date, userData?.workDays, locale, config);
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
export const calculateWeekStats = (
  weekEntries: Entry[],
  userData: UserData | null,
  locale?: Locale,
  config?: CalculationConfig | null
): PeriodStatsResult => {
  const dateRef = weekEntries.length > 0 ? new Date(weekEntries[0].date) : new Date();
  // Volle Woche ohne Monats-Clipping (kein viewDate)
  const { start, end } = getWeekRangeInMonth(dateRef);
  return calculatePeriodStats(weekEntries, userData, start, end, undefined, locale, config);
};
