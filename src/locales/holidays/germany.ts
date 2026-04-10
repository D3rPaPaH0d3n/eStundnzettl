// ============================================================
// DEUTSCHE FEIERTAGE
// ============================================================
// Deutschland hat 9 bundesweit gültige Feiertage plus mehrere
// regionale Feiertage, die je nach Bundesland hinzukommen.

import { getEasterSunday, addDaysStr } from './_easter';

/** ISO 3166-2:DE Bundesland-Codes (ohne "DE-" Prefix, kleingeschrieben). */
export type GermanState =
  | 'bw' // Baden-Württemberg
  | 'by' // Bayern
  | 'be' // Berlin
  | 'bb' // Brandenburg
  | 'hb' // Bremen
  | 'hh' // Hamburg
  | 'he' // Hessen
  | 'mv' // Mecklenburg-Vorpommern
  | 'ni' // Niedersachsen
  | 'nw' // Nordrhein-Westfalen
  | 'rp' // Rheinland-Pfalz
  | 'sl' // Saarland
  | 'sn' // Sachsen
  | 'st' // Sachsen-Anhalt
  | 'sh' // Schleswig-Holstein
  | 'th'; // Thüringen

export const GERMAN_STATE_NAMES: Record<GermanState, string> = {
  bw: 'Baden-Württemberg',
  by: 'Bayern',
  be: 'Berlin',
  bb: 'Brandenburg',
  hb: 'Bremen',
  hh: 'Hamburg',
  he: 'Hessen',
  mv: 'Mecklenburg-Vorpommern',
  ni: 'Niedersachsen',
  nw: 'Nordrhein-Westfalen',
  rp: 'Rheinland-Pfalz',
  sl: 'Saarland',
  sn: 'Sachsen',
  st: 'Sachsen-Anhalt',
  sh: 'Schleswig-Holstein',
  th: 'Thüringen',
};

/**
 * 9 bundesweit gültige Feiertage in Deutschland.
 */
export const getGermanHolidaysBundeswide = (year: number): Record<string, string> => {
  const easter = getEasterSunday(year);

  return {
    [`${year}-01-01`]: 'Neujahr',
    [addDaysStr(easter, -2)]: 'Karfreitag',
    [addDaysStr(easter, 1)]: 'Ostermontag',
    [`${year}-05-01`]: 'Tag der Arbeit',
    [addDaysStr(easter, 39)]: 'Christi Himmelfahrt',
    [addDaysStr(easter, 50)]: 'Pfingstmontag',
    [`${year}-10-03`]: 'Tag der Deutschen Einheit',
    [`${year}-12-25`]: '1. Weihnachtstag',
    [`${year}-12-26`]: '2. Weihnachtstag',
  };
};

// -- Bundesland-Zuordnungen der regionalen Feiertage --
const HEILIGE_DREI_KOENIGE_STATES: GermanState[] = ['bw', 'by', 'st'];
const FRAUENTAG_STATES: GermanState[] = ['be', 'mv'];
const FRONLEICHNAM_STATES: GermanState[] = ['bw', 'by', 'he', 'nw', 'rp', 'sl'];
const MARIAE_HIMMELFAHRT_STATES: GermanState[] = ['by', 'sl'];
const WELTKINDERTAG_STATES: GermanState[] = ['th'];
const REFORMATIONSTAG_STATES: GermanState[] = [
  'bb',
  'hb',
  'hh',
  'mv',
  'ni',
  'sn',
  'st',
  'sh',
  'th',
];
const ALLERHEILIGEN_STATES: GermanState[] = ['bw', 'by', 'nw', 'rp', 'sl'];
const BUSS_UND_BETTAG_STATES: GermanState[] = ['sn'];

/**
 * Buß- und Bettag: Mittwoch vor dem 23. November (16.-22. November).
 */
const getBussUndBettag = (year: number): string => {
  // Start: 22. November
  const d = new Date(year, 10, 22); // Monat 10 = November (0-indexed)
  // Wochentag: 0 = Sonntag, 3 = Mittwoch
  while (d.getDay() !== 3) {
    d.setDate(d.getDate() - 1);
  }
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${m}-${day}`;
};

/**
 * Liefert alle deutschen Feiertage für ein Jahr und Bundesland.
 * Bundesweite Feiertage + regionale Feiertage des gewählten Landes.
 */
export const getGermanHolidaysByState = (
  year: number,
  state: GermanState
): Record<string, string> => {
  const easter = getEasterSunday(year);
  const holidays: Record<string, string> = { ...getGermanHolidaysBundeswide(year) };

  if (HEILIGE_DREI_KOENIGE_STATES.includes(state)) {
    holidays[`${year}-01-06`] = 'Heilige Drei Könige';
  }
  if (FRAUENTAG_STATES.includes(state)) {
    holidays[`${year}-03-08`] = 'Internationaler Frauentag';
  }
  if (FRONLEICHNAM_STATES.includes(state)) {
    holidays[addDaysStr(easter, 60)] = 'Fronleichnam';
  }
  if (MARIAE_HIMMELFAHRT_STATES.includes(state)) {
    holidays[`${year}-08-15`] = 'Mariä Himmelfahrt';
  }
  if (WELTKINDERTAG_STATES.includes(state)) {
    holidays[`${year}-09-20`] = 'Weltkindertag';
  }
  if (REFORMATIONSTAG_STATES.includes(state)) {
    holidays[`${year}-10-31`] = 'Reformationstag';
  }
  if (ALLERHEILIGEN_STATES.includes(state)) {
    holidays[`${year}-11-01`] = 'Allerheiligen';
  }
  if (BUSS_UND_BETTAG_STATES.includes(state)) {
    holidays[getBussUndBettag(year)] = 'Buß- und Bettag';
  }

  return holidays;
};
