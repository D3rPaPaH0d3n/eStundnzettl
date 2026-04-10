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
};

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

/** Alle Top-Level-Locales für den Onboarding-Picker (ohne DE-Bundesländer einzeln). */
export const TOP_LEVEL_LOCALES: ReadonlyArray<'neutral' | 'at' | 'de'> = [
  'neutral',
  'at',
  'de',
] as const;

export type { Locale, LocaleId, LocaleCountry } from './types';
export { neutralLocale } from './neutral';
export { austriaLocale } from './austria';
export { createGermanyLocale, GERMAN_STATE_IDS } from './germany';
export { GERMAN_STATE_NAMES, type GermanState } from './holidays/germany';
