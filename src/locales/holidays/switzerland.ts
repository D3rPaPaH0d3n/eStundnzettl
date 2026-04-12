// ============================================================
// SCHWEIZER FEIERTAGE (nach Kanton)
// ============================================================
// Die Schweiz hat nur einen Bundesfeiertag (1. August). Alle
// anderen Feiertage werden kantonal geregelt. Wir decken die
// 26 Kantone ab.

import { getEasterSunday, addDaysStr } from './_easter';

/** Kantons-Kürzel (ISO 3166-2:CH ohne "CH-" Prefix, kleingeschrieben). */
export type SwissKanton =
  | 'ag' // Aargau
  | 'ai' // Appenzell Innerrhoden
  | 'ar' // Appenzell Ausserrhoden
  | 'be' // Bern
  | 'bl' // Basel-Landschaft
  | 'bs' // Basel-Stadt
  | 'fr' // Freiburg
  | 'ge' // Genf
  | 'gl' // Glarus
  | 'gr' // Graubünden
  | 'ju' // Jura
  | 'lu' // Luzern
  | 'ne' // Neuenburg
  | 'nw' // Nidwalden
  | 'ow' // Obwalden
  | 'sg' // St. Gallen
  | 'sh' // Schaffhausen
  | 'so' // Solothurn
  | 'sz' // Schwyz
  | 'tg' // Thurgau
  | 'ti' // Tessin
  | 'ur' // Uri
  | 'vd' // Waadt
  | 'vs' // Wallis
  | 'zh' // Zürich
  | 'zg'; // Zug

export const SWISS_KANTON_NAMES: Record<SwissKanton, string> = {
  ag: 'Aargau',
  ai: 'Appenzell Innerrhoden',
  ar: 'Appenzell Ausserrhoden',
  be: 'Bern',
  bl: 'Basel-Landschaft',
  bs: 'Basel-Stadt',
  fr: 'Freiburg',
  ge: 'Genf',
  gl: 'Glarus',
  gr: 'Graubünden',
  ju: 'Jura',
  lu: 'Luzern',
  ne: 'Neuenburg',
  nw: 'Nidwalden',
  ow: 'Obwalden',
  sg: 'St. Gallen',
  sh: 'Schaffhausen',
  so: 'Solothurn',
  sz: 'Schwyz',
  tg: 'Thurgau',
  ti: 'Tessin',
  ur: 'Uri',
  vd: 'Waadt',
  vs: 'Wallis',
  zh: 'Zürich',
  zg: 'Zug',
};

// -- Kantonsgruppen für regionale Feiertage --

/** Berchtoldstag (2. Jänner) */
const BERCHTOLDSTAG: SwissKanton[] = [
  'ag', 'be', 'fr', 'gl', 'gr', 'ju', 'lu', 'ne', 'ow', 'sh', 'so', 'tg', 'vd', 'zh', 'zg',
];

/** Karfreitag */
const KARFREITAG: SwissKanton[] = [
  'ag', 'ar', 'be', 'bl', 'bs', 'fr', 'ge', 'gl', 'gr', 'ju', 'lu', 'ne', 'nw', 'ow',
  'sg', 'sh', 'so', 'sz', 'tg', 'ur', 'vd', 'zh', 'zg',
];

/** Ostermontag */
const OSTERMONTAG: SwissKanton[] = [
  'ag', 'ai', 'ar', 'be', 'bl', 'bs', 'fr', 'ge', 'gl', 'gr', 'ju', 'lu', 'ne', 'nw', 'ow',
  'sg', 'sh', 'so', 'sz', 'tg', 'ti', 'ur', 'vd', 'vs', 'zh', 'zg',
];

/** Pfingstmontag */
const PFINGSTMONTAG: SwissKanton[] = [
  'ag', 'ai', 'ar', 'be', 'bl', 'bs', 'fr', 'ge', 'gl', 'gr', 'ju', 'lu', 'ne', 'nw', 'ow',
  'sg', 'sh', 'so', 'sz', 'tg', 'ti', 'ur', 'vd', 'zh', 'zg',
];

/** Fronleichnam (katholische Kantone) */
const FRONLEICHNAM: SwissKanton[] = [
  'ag', 'ai', 'fr', 'gr', 'ju', 'lu', 'nw', 'ow', 'so', 'sz', 'ti', 'ur', 'vs', 'zg',
];

/** Mariä Himmelfahrt (15. August) */
const MARIAE_HIMMELFAHRT: SwissKanton[] = [
  'ai', 'fr', 'gr', 'ju', 'lu', 'nw', 'ow', 'so', 'sz', 'ti', 'ur', 'vs', 'zg',
];

/** Allerheiligen (1. November) */
const ALLERHEILIGEN: SwissKanton[] = [
  'ai', 'fr', 'gl', 'gr', 'ju', 'lu', 'nw', 'ow', 'sg', 'so', 'sz', 'ti', 'ur', 'vs', 'zg',
];

/** Mariä Empfängnis (8. Dezember) */
const MARIAE_EMPFAENGNIS: SwissKanton[] = [
  'ai', 'fr', 'gr', 'lu', 'nw', 'ow', 'so', 'sz', 'ti', 'ur', 'vs', 'zg',
];

/** Stephanstag (26. Dezember) */
const STEPHANSTAG: SwissKanton[] = [
  'ag', 'ai', 'ar', 'be', 'bl', 'bs', 'fr', 'ge', 'gl', 'gr', 'lu', 'ne', 'nw', 'ow',
  'sg', 'sh', 'so', 'sz', 'tg', 'ti', 'ur', 'vd', 'zh', 'zg',
];

/** Tag der Arbeit (1. Mai) — nicht in allen Kantonen gesetzlich */
const TAG_DER_ARBEIT: SwissKanton[] = [
  'bl', 'bs', 'ju', 'ne', 'sh', 'tg', 'ti', 'zh', 'zg',
];

/**
 * Jeûne genevois: Donnerstag nach dem ersten Sonntag im September.
 */
const getJeuneGenevois = (year: number): string => {
  // Erster Sonntag im September finden
  const sept1 = new Date(year, 8, 1);
  const dayOfWeek = sept1.getDay();
  const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  // Donnerstag danach = +4
  const d = new Date(year, 8, firstSunday + 4);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${m}-${day}`;
};

/**
 * Liefert alle Feiertage für ein Jahr und einen Kanton.
 */
export const getSwissHolidaysByKanton = (
  year: number,
  kanton: SwissKanton
): Record<string, string> => {
  const easter = getEasterSunday(year);
  const holidays: Record<string, string> = {};

  // Bundesfeiertag (einziger landesweit)
  holidays[`${year}-08-01`] = 'Bundesfeiertag';

  // Neujahr (alle Kantone)
  holidays[`${year}-01-01`] = 'Neujahr';

  // Auffahrt / Christi Himmelfahrt (alle Kantone)
  holidays[addDaysStr(easter, 39)] = 'Auffahrt';

  // Weihnachten (alle Kantone)
  holidays[`${year}-12-25`] = 'Weihnachten';

  // Berchtoldstag (2. Jänner)
  if (BERCHTOLDSTAG.includes(kanton)) {
    holidays[`${year}-01-02`] = 'Berchtoldstag';
  }

  // Karfreitag
  if (KARFREITAG.includes(kanton)) {
    holidays[addDaysStr(easter, -2)] = 'Karfreitag';
  }

  // Ostermontag
  if (OSTERMONTAG.includes(kanton)) {
    holidays[addDaysStr(easter, 1)] = 'Ostermontag';
  }

  // Tag der Arbeit
  if (TAG_DER_ARBEIT.includes(kanton)) {
    holidays[`${year}-05-01`] = 'Tag der Arbeit';
  }

  // Pfingstmontag
  if (PFINGSTMONTAG.includes(kanton)) {
    holidays[addDaysStr(easter, 50)] = 'Pfingstmontag';
  }

  // Fronleichnam
  if (FRONLEICHNAM.includes(kanton)) {
    holidays[addDaysStr(easter, 60)] = 'Fronleichnam';
  }

  // Mariä Himmelfahrt
  if (MARIAE_HIMMELFAHRT.includes(kanton)) {
    holidays[`${year}-08-15`] = 'Mariä Himmelfahrt';
  }

  // Allerheiligen
  if (ALLERHEILIGEN.includes(kanton)) {
    holidays[`${year}-11-01`] = 'Allerheiligen';
  }

  // Mariä Empfängnis
  if (MARIAE_EMPFAENGNIS.includes(kanton)) {
    holidays[`${year}-12-08`] = 'Mariä Empfängnis';
  }

  // Stephanstag
  if (STEPHANSTAG.includes(kanton)) {
    holidays[`${year}-12-26`] = 'Stephanstag';
  }

  // Genf: Jeûne genevois + Restauration
  if (kanton === 'ge') {
    holidays[getJeuneGenevois(year)] = 'Jeûne genevois';
    holidays[`${year}-12-31`] = 'Restauration';
  }

  // Näfelser Fahrt (Glarus) — erster Donnerstag im April
  if (kanton === 'gl') {
    const apr1 = new Date(year, 3, 1);
    const dayOfWeek = apr1.getDay();
    const firstThursday = dayOfWeek <= 4 ? 4 - dayOfWeek + 1 : 11 - dayOfWeek + 4 + 1;
    holidays[`${year}-04-${String(firstThursday).padStart(2, '0')}`] = 'Näfelser Fahrt';
  }

  // Heilige Drei Könige (6. Jänner) — nur wenige Kantone
  if (['gr', 'lu', 'sz', 'ti', 'ur', 'zg'].includes(kanton)) {
    holidays[`${year}-01-06`] = 'Heilige Drei Könige';
  }

  // Josefstag (19. März) — nur wenige Kantone
  if (['gr', 'lu', 'nw', 'so', 'sz', 'ti', 'ur', 'vs', 'zg'].includes(kanton)) {
    holidays[`${year}-03-19`] = 'Josefstag';
  }

  return holidays;
};
