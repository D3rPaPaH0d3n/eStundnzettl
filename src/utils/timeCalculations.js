import { WORK_CODE, HALF_DAYS } from "../hooks/constants";

export const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const getDayOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

export const getTargetMinutesForDate = (dateStr, customWorkDays) => {
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

export const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

export const calculateOvertimeSplit = (balanceMinutes, targetMinutes) => {
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
}) => {
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

export const calculateDisplayedDayMinutes = (entries) => {
  return entries.reduce((acc, entry) => {
    if (entry.type === "work" && entry.code === WORK_CODE.DRIVE) {
      return acc;
    }
    return acc + (entry.netDuration || 0);
  }, 0);
};

export const buildDayBalanceMetaMap = (entries, userData) => {
  const map = {};
  const dayTotals = {};
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
  entries,
  userData,
  periodStart,
  periodEnd
) => {
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

  const relevantEntries = [];
  const weeklyMap = {};

  entries.forEach((e) => {
    if (e.date < startStr || e.date > endStr) return;
    relevantEntries.push(e);

    if (e.type === "work") {
      if (e.code === WORK_CODE.DRIVE) stats.drive += e.netDuration;
      else stats.work += e.netDuration;
    }
    if (e.type === "vacation") stats.vacation += e.netDuration;
    if (e.type === "sick") stats.sick += e.netDuration;
    if (e.type === "public_holiday") stats.holiday += e.netDuration;
    if (e.type === "time_comp") stats.timeComp += e.netDuration;

    if (!(e.type === "work" && e.code === WORK_CODE.DRIVE)) {
      const weekNum = getWeekNumber(new Date(e.date));
      if (!weeklyMap[weekNum]) weeklyMap[weekNum] = { target: 0, actual: 0 };
      weeklyMap[weekNum].actual += e.netDuration;
    }
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

    const weekNum = getWeekNumber(new Date(loopDate));
    if (!weeklyMap[weekNum]) weeklyMap[weekNum] = { target: 0, actual: 0 };
    weeklyMap[weekNum].target += target;

    loopDate.setDate(loopDate.getDate() + 1);
  }

  stats.totalSaldo = stats.totalIst - stats.totalTarget;

  Object.values(weeklyMap).forEach((week) => {
    const diff = week.actual - week.target;
    const { mehrarbeit, ueberstunden } = calculateOvertimeSplit(
      diff,
      week.target
    );
    stats.overtimeSplit.mehrarbeit += mehrarbeit;
    stats.overtimeSplit.ueberstunden += ueberstunden;
  });

  return stats;
};

export const getWeekRangeInMonth = (dateInWeek, viewDate) => {
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
export const calculateWeekStats = (weekEntries, userData) => {
  const dateRef = weekEntries.length > 0 ? new Date(weekEntries[0].date) : new Date();
  // Volle Woche ohne Monats-Clipping (kein viewDate)
  const { start, end } = getWeekRangeInMonth(dateRef);
  return calculatePeriodStats(weekEntries, userData, start, end);
};
