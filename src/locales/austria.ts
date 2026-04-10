// ============================================================
// ÖSTERREICH LOCALE
// ============================================================
// - 13 gesetzliche Feiertage (bundesweit)
// - Halbtage am 24.12. und 31.12.
// - Mehrarbeit/Überstunden-Split nach AZG (38,5h / 40h)
// - Krank-Aufrechnung bis Tagessoll aktiv
// Default-Arbeitszeit: Mo-Do 8,5h / Fr 4,5h (38,5h/Woche Klassik)

import type { Locale } from './types';
import { getAustrianHolidays } from './holidays/austria';

export const austriaLocale: Locale = {
  id: 'at',
  country: 'at',
  name: 'Österreich',
  description: 'Mit österreichischen Feiertagen, Halbtagen (24./31.12.) und Mehrarbeit/Überstunden nach AZG.',
  getHolidays: getAustrianHolidays,
  halfDays: ['12-24', '12-31'],
  enableOvertimeSplit: true,
  weeklyLimitMinutes: 40 * 60, // 2400
  enableSickAdjustment: true,
  // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — 38,5h klassisch
  defaultWorkDays: [0, 510, 510, 510, 510, 270, 0],
};
