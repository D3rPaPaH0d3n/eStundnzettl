// ============================================================
// NEUTRAL LOCALE
// ============================================================
// Minimale Locale ohne länder-spezifische Regeln.
// - Keine automatischen Feiertage
// - Keine Halbtage (24.12./31.12.)
// - Keine Mehrarbeit/Überstunden-Aufspaltung (nur Saldo)
// - Keine Krank-Aufrechnung auf das Tagessoll
// Default-Arbeitszeit: Mo-Fr 8h (40h/Woche).

import type { Locale } from './types';

export const neutralLocale: Locale = {
  id: 'neutral',
  country: 'neutral',
  name: 'Neutral',
  description: 'Keine automatischen Feiertage oder Spezialregeln — für alle Berufe und Länder.',
  getHolidays: () => ({}),
  halfDays: [],
  enableOvertimeSplit: false,
  weeklyLimitMinutes: null,
  enableSickAdjustment: false,
  // [So, Mo, Di, Mi, Do, Fr, Sa] in Minuten — Mo-Fr 8h
  defaultWorkDays: [0, 480, 480, 480, 480, 480, 0],
};
