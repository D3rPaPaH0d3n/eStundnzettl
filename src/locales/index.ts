// ============================================================
// LOCALES REGISTRY
// ============================================================
// Zentraler Zugriffspunkt für alle verfügbaren Locales.
// Andere Teile der App importieren von hier: `getLocale`, `LOCALES`,
// `DEFAULT_LOCALE_ID`.

import type { Locale, LocaleId } from './types';
import { neutralLocale } from './neutral';
import { austriaLocale } from './austria';
import { createGermanyLocale, GERMAN_STATE_IDS } from './germany';
import { createSwitzerlandLocale, SWISS_KANTON_IDS } from './switzerland';

/**
 * Default-Locale für bestehende User und Tests, die noch keine
 * explizite Locale gesetzt haben. Bewusst 'at', damit bestehende
 * User/Tests ihr gewohntes Verhalten behalten.
 */
export const DEFAULT_LOCALE_ID: LocaleId = 'at';

/**
 * Alle verfügbaren Locales als Registry.
 */
export const LOCALES: Record<LocaleId, Locale> = {
  neutral: neutralLocale,
  at: austriaLocale,
  'de-bw': createGermanyLocale('bw'),
  'de-by': createGermanyLocale('by'),
  'de-be': createGermanyLocale('be'),
  'de-bb': createGermanyLocale('bb'),
  'de-hb': createGermanyLocale('hb'),
  'de-hh': createGermanyLocale('hh'),
  'de-he': createGermanyLocale('he'),
  'de-mv': createGermanyLocale('mv'),
  'de-ni': createGermanyLocale('ni'),
  'de-nw': createGermanyLocale('nw'),
  'de-rp': createGermanyLocale('rp'),
  'de-sl': createGermanyLocale('sl'),
  'de-sn': createGermanyLocale('sn'),
  'de-st': createGermanyLocale('st'),
  'de-sh': createGermanyLocale('sh'),
  'de-th': createGermanyLocale('th'),
  'ch-ag': createSwitzerlandLocale('ag'),
  'ch-ai': createSwitzerlandLocale('ai'),
  'ch-ar': createSwitzerlandLocale('ar'),
  'ch-be': createSwitzerlandLocale('be'),
  'ch-bl': createSwitzerlandLocale('bl'),
  'ch-bs': createSwitzerlandLocale('bs'),
  'ch-fr': createSwitzerlandLocale('fr'),
  'ch-ge': createSwitzerlandLocale('ge'),
  'ch-gl': createSwitzerlandLocale('gl'),
  'ch-gr': createSwitzerlandLocale('gr'),
  'ch-ju': createSwitzerlandLocale('ju'),
  'ch-lu': createSwitzerlandLocale('lu'),
  'ch-ne': createSwitzerlandLocale('ne'),
  'ch-nw': createSwitzerlandLocale('nw'),
  'ch-ow': createSwitzerlandLocale('ow'),
  'ch-sg': createSwitzerlandLocale('sg'),
  'ch-sh': createSwitzerlandLocale('sh'),
  'ch-so': createSwitzerlandLocale('so'),
  'ch-sz': createSwitzerlandLocale('sz'),
  'ch-tg': createSwitzerlandLocale('tg'),
  'ch-ti': createSwitzerlandLocale('ti'),
  'ch-ur': createSwitzerlandLocale('ur'),
  'ch-vd': createSwitzerlandLocale('vd'),
  'ch-vs': createSwitzerlandLocale('vs'),
  'ch-zh': createSwitzerlandLocale('zh'),
  'ch-zg': createSwitzerlandLocale('zg'),
};

/**
 * Type-Guard: prüft ob ein beliebiger Wert eine gültige LocaleId ist.
 * Zentrale Validierung für Backup-Import/-Export und Settings-Reads.
 * hasOwnProperty statt `in`, damit Prototype-Keys ("constructor",
 * "toString", …) aus manipulierten Backups nicht als Locale durchgehen.
 */
export function isLocaleId(value: unknown): value is LocaleId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LOCALES, value);
}

/**
 * Holt eine Locale per ID. Wenn `id` undefined oder nicht gefunden,
 * wird `DEFAULT_LOCALE_ID` (Österreich) zurückgegeben.
 */
export const getLocale = (id: LocaleId | undefined | null): Locale => {
  if (!id) return LOCALES[DEFAULT_LOCALE_ID];
  return LOCALES[id] ?? LOCALES[DEFAULT_LOCALE_ID];
};

/** Alle Deutschland-Locale-IDs (für UI-Bundesland-Dropdown). */
export const GERMANY_LOCALE_IDS: LocaleId[] = GERMAN_STATE_IDS.map(
  (s) => `de-${s}` as LocaleId
);

/** Alle Schweiz-Locale-IDs (für UI-Kantons-Dropdown). */
export const SWITZERLAND_LOCALE_IDS: LocaleId[] = SWISS_KANTON_IDS.map(
  (k) => `ch-${k}` as LocaleId
);

/** Alle Top-Level-Locales für den Onboarding-Picker (ohne DE-Bundesländer/CH-Kantone einzeln). */
export const TOP_LEVEL_LOCALES: ReadonlyArray<'neutral' | 'at' | 'de' | 'ch'> = [
  'neutral',
  'at',
  'de',
  'ch',
] as const;

export type { Locale, LocaleId, LocaleCountry } from './types';
export { neutralLocale } from './neutral';
export { austriaLocale } from './austria';
export { createGermanyLocale, GERMAN_STATE_IDS } from './germany';
export { GERMAN_STATE_NAMES, type GermanState } from './holidays/germany';
export { createSwitzerlandLocale, SWISS_KANTON_IDS } from './switzerland';
export { SWISS_KANTON_NAMES, type SwissKanton } from './holidays/switzerland';
