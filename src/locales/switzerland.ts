// ============================================================
// SCHWEIZ LOCALE (mit Kantons-Varianten)
// ============================================================
// Für jeden der 26 Kantone wird eine Locale-Variante erzeugt
// (z.B. 'ch-zh' für Zürich). Die Feiertagsliste enthält den
// Bundesfeiertag plus die jeweiligen kantonalen Feiertage.

import type { Locale, LocaleId } from './types';
import {
  SWISS_KANTON_NAMES,
  getSwissHolidaysByKanton,
  type SwissKanton,
} from './holidays/switzerland';

/**
 * Erzeugt eine Locale für einen Schweizer Kanton.
 */
export const createSwitzerlandLocale = (kanton: SwissKanton): Locale => ({
  id: `ch-${kanton}` as LocaleId,
  country: 'ch',
  region: SWISS_KANTON_NAMES[kanton],
  name: `Schweiz (${SWISS_KANTON_NAMES[kanton]})`,
  description: `Kantonale Feiertage für ${SWISS_KANTON_NAMES[kanton]}, Halbtage (24./31.12.) und Überstunden ab 45h/Woche (ArG).`,
  getHolidays: (year: number) => getSwissHolidaysByKanton(year, kanton),
  halfDays: ['12-24', '12-31'],
  enableOvertimeSplit: true,
  weeklyLimitMinutes: 45 * 60, // 2700 (ArG, konservativ)
  enableSickAdjustment: true,
  // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — 42.5h (CH-Durchschnitt)
  defaultWorkDays: [0, 510, 510, 510, 510, 270, 0],
});

/** Alle 26 Kantons-Codes in alphabetischer UI-Reihenfolge. */
export const SWISS_KANTON_IDS: SwissKanton[] = [
  'ag', 'ai', 'ar', 'be', 'bl', 'bs', 'fr', 'ge', 'gl', 'gr',
  'ju', 'lu', 'ne', 'nw', 'ow', 'sg', 'sh', 'so', 'sz', 'tg',
  'ti', 'ur', 'vd', 'vs', 'zh', 'zg',
];
