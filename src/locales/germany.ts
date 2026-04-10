// ============================================================
// DEUTSCHLAND LOCALE (mit Bundesland-Varianten)
// ============================================================
// Für jedes der 16 Bundesländer wird eine Locale-Variante erzeugt
// (z.B. 'de-by' für Bayern). Die Feiertagsliste enthält die 9
// bundesweiten Feiertage plus die jeweiligen regionalen.

import type { Locale, LocaleId } from './types';
import {
  GERMAN_STATE_NAMES,
  getGermanHolidaysByState,
  type GermanState,
} from './holidays/germany';

/**
 * Erzeugt eine Locale für ein deutsches Bundesland.
 */
export const createGermanyLocale = (state: GermanState): Locale => ({
  id: `de-${state}` as LocaleId,
  country: 'de',
  region: GERMAN_STATE_NAMES[state],
  name: `Deutschland (${GERMAN_STATE_NAMES[state]})`,
  description: `Mit bundesweiten und regionalen Feiertagen für ${GERMAN_STATE_NAMES[state]}, Halbtagen (24./31.12.) und Mehrarbeit/Überstunden ab 40h/Woche.`,
  getHolidays: (year: number) => getGermanHolidaysByState(year, state),
  halfDays: ['12-24', '12-31'],
  enableOvertimeSplit: true,
  weeklyLimitMinutes: 40 * 60, // 2400
  enableSickAdjustment: true,
  // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — 40h klassisch (Mo-Fr 8h)
  defaultWorkDays: [0, 480, 480, 480, 480, 480, 0],
});

/** Alle 16 deutschen Bundesland-Codes in sinnvoller UI-Reihenfolge. */
export const GERMAN_STATE_IDS: GermanState[] = [
  'bw',
  'by',
  'be',
  'bb',
  'hb',
  'hh',
  'he',
  'mv',
  'ni',
  'nw',
  'rp',
  'sl',
  'sn',
  'st',
  'sh',
  'th',
];
