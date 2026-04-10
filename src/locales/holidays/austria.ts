// ============================================================
// ÖSTERREICHISCHE FEIERTAGE
// ============================================================
// 13 bundesweit gültige gesetzliche Feiertage in Österreich.
// Bewegliche Feiertage werden über den Ostersonntag berechnet.

import { getEasterSunday, addDaysStr } from './_easter';

/**
 * Liefert alle österreichischen Feiertage für ein Jahr.
 * @returns Map `YYYY-MM-DD` → Feiertagsname
 */
export const getAustrianHolidays = (year: number): Record<string, string> => {
  const easter = getEasterSunday(year);

  return {
    [`${year}-01-01`]: 'Neujahr',
    [`${year}-01-06`]: 'Heilige Drei Könige',
    [addDaysStr(easter, 1)]: 'Ostermontag',
    [`${year}-05-01`]: 'Staatsfeiertag',
    [addDaysStr(easter, 39)]: 'Christi Himmelfahrt',
    [addDaysStr(easter, 50)]: 'Pfingstmontag',
    [addDaysStr(easter, 60)]: 'Fronleichnam',
    [`${year}-08-15`]: 'Mariä Himmelfahrt',
    [`${year}-10-26`]: 'Nationalfeiertag',
    [`${year}-11-01`]: 'Allerheiligen',
    [`${year}-12-08`]: 'Mariä Empfängnis',
    [`${year}-12-25`]: 'Christtag',
    [`${year}-12-26`]: 'Stefanitag',
  };
};
