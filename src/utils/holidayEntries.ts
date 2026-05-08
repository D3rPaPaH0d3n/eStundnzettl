import { getHolidayData } from "../utils";
import { getTargetMinutesForDate } from "./timeCalculations";
import type { Entry, UserData, CalculationConfig } from "../types";
import type { Locale } from "../locales/types";

/**
 * Erzeugt synthetische public_holiday-Eintraege fuer alle gesetzlichen
 * Feiertage eines Monats, die auf einen Arbeitstag fallen.
 *
 * Bewusst in einem kleinen, react-pdf-freien Modul: Das automatische
 * PDF-Archiv braucht diese Daten schon fuer den Content-Hash, soll aber
 * den schweren PDF-Renderer erst laden, wenn wirklich ein Export noetig ist.
 */
const localDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function generateHolidayEntries(
  year: number,
  month: number,
  userData: UserData | null,
  locale?: Locale,
  config?: CalculationConfig | null,
  currentDate: Date = new Date(),
): Entry[] {
  const holidayMap = getHolidayData(year, locale, config);
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = localDateString(currentDate);
  const holidays: Entry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!holidayMap[dateStr] || dateStr > todayStr) continue;

    const targetMin = getTargetMinutesForDate(
      dateStr,
      userData?.workDays,
      locale,
      config,
    );
    if (targetMin <= 0) continue;

    holidays.push({
      id: `auto-holiday-${dateStr}`,
      type: "public_holiday" as const,
      date: dateStr,
      project: holidayMap[dateStr] || "Gesetzlicher Feiertag",
      pause: 0,
      netDuration: targetMin,
    } as Entry);
  }

  return holidays;
}
