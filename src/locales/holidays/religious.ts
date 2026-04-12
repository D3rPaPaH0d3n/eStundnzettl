// ============================================================
// RELIGIÖSE FEIERTAGE (Orthodox + Islamisch)
// ============================================================
// Import-Vorlagen für den "Eigener Plan"-Baukasten.
// NICHT als Locale gedacht, sondern als Feiertags-Set, das User
// in ihre individuelle CalculationConfig importieren können.

import { addDaysStr } from './_easter';

// ─── ORTHODOXE FEIERTAGE ────────────────────────────────────
//
// Orthodoxe Ostern folgt dem julianischen Kalender (andere Formel
// als die westliche Gauss-Osterformel). Wir konvertieren das
// Ergebnis nach Gregorianisch, damit es in unsere YYYY-MM-DD-Map
// passt. Feste Feiertage (Weihnachten 7.1., Theophanie 19.1.)
// sind bereits Gregorianisch angegeben.

/**
 * Berechnet den orthodoxen Ostersonntag (julianisch → gregorianisch).
 * Algorithmus nach Meeus (Astronomical Algorithms).
 */
export const getOrthodoxEasterSunday = (year: number): Date => {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = März, 4 = April
  const day = ((d + e + 114) % 31) + 1;

  // Julianisches Datum → Gregorianisch: +13 Tage (gilt 1900–2099)
  const julian = new Date(year, month - 1, day);
  julian.setDate(julian.getDate() + 13);
  return julian;
};

/**
 * Orthodoxe Feiertage für ein Jahr.
 * Enthält die wichtigsten festen und beweglichen Feiertage.
 */
export const getOrthodoxHolidays = (year: number): Record<string, string> => {
  const easter = getOrthodoxEasterSunday(year);

  return {
    // Feste Feiertage (Gregorianische Daten)
    [`${year}-01-07`]: 'Orthodoxes Weihnachten',
    [`${year}-01-19`]: 'Theophanie (Taufe Christi)',
    [`${year}-04-07`]: 'Mariä Verkündigung',
    [`${year}-08-28`]: 'Mariä Entschlafung',

    // Bewegliche Feiertage (relativ zum orthodoxen Ostern)
    [addDaysStr(easter, -2)]: 'Orthodoxer Karfreitag',
    [addDaysStr(easter, 0)]: 'Orthodoxer Ostersonntag',
    [addDaysStr(easter, 1)]: 'Orthodoxer Ostermontag',
    [addDaysStr(easter, 39)]: 'Orthodoxe Himmelfahrt',
    [addDaysStr(easter, 49)]: 'Orthodoxer Pfingstsonntag',
    [addDaysStr(easter, 50)]: 'Orthodoxer Pfingstmontag',
  };
};

// ─── ISLAMISCHE FEIERTAGE ───────────────────────────────────
//
// Islamische Feiertage folgen dem Mondkalender (Hijri) und
// verschieben sich jedes Jahr um ~10–12 Tage. Die astronomische
// Berechnung ist komplex; wir verwenden eine Lookup-Tabelle für
// die Jahre 2024–2035 (danach Approximation).
//
// DISCLAIMER: Tatsächliche Daten können je nach Region und
// Mondsichtung ±1–2 Tage abweichen.

interface IslamicYearData {
  ramadanStart: string;     // MM-DD
  eidAlFitr: string;        // MM-DD (Ende Ramadan)
  eidAlAdha: string;        // MM-DD (Opferfest)
  islamicNewYear: string;   // MM-DD
  mawlid: string;           // MM-DD (Geburtstag des Propheten)
}

// Vorberechnete Daten für 2024–2035 (astronomische Annäherung)
const ISLAMIC_DATES: Record<number, IslamicYearData> = {
  2024: { ramadanStart: '03-11', eidAlFitr: '04-10', eidAlAdha: '06-17', islamicNewYear: '07-08', mawlid: '09-16' },
  2025: { ramadanStart: '02-28', eidAlFitr: '03-30', eidAlAdha: '06-06', islamicNewYear: '06-27', mawlid: '09-05' },
  2026: { ramadanStart: '02-17', eidAlFitr: '03-20', eidAlAdha: '05-27', islamicNewYear: '06-17', mawlid: '08-25' },
  2027: { ramadanStart: '02-07', eidAlFitr: '03-09', eidAlAdha: '05-16', islamicNewYear: '06-06', mawlid: '08-14' },
  2028: { ramadanStart: '01-27', eidAlFitr: '02-26', eidAlAdha: '05-04', islamicNewYear: '05-25', mawlid: '08-03' },
  2029: { ramadanStart: '01-15', eidAlFitr: '02-14', eidAlAdha: '04-24', islamicNewYear: '05-14', mawlid: '07-24' },
  2030: { ramadanStart: '01-05', eidAlFitr: '02-04', eidAlAdha: '04-13', islamicNewYear: '05-04', mawlid: '07-13' },
  2031: { ramadanStart: '12-26', eidAlFitr: '01-24', eidAlAdha: '04-02', islamicNewYear: '04-23', mawlid: '07-02' },
  2032: { ramadanStart: '12-14', eidAlFitr: '01-14', eidAlAdha: '03-22', islamicNewYear: '04-11', mawlid: '06-20' },
  2033: { ramadanStart: '12-03', eidAlFitr: '01-02', eidAlAdha: '03-11', islamicNewYear: '04-01', mawlid: '06-10' },
  2034: { ramadanStart: '11-23', eidAlFitr: '12-23', eidAlAdha: '03-01', islamicNewYear: '03-21', mawlid: '05-30' },
  2035: { ramadanStart: '11-12', eidAlFitr: '12-12', eidAlAdha: '02-18', islamicNewYear: '03-10', mawlid: '05-19' },
};

/**
 * Approximiert islamische Feiertage, wenn keine Lookup-Daten
 * vorhanden sind (außerhalb 2024–2035). Verschiebt die Daten
 * von 2030 um ~10.63 Tage pro Jahr (islamisches Mondjahr
 * ≈ 354.37 Tage → Differenz ≈ 10.63 Tage/Jahr Gregorianisch).
 */
function approximateIslamicDates(year: number): IslamicYearData {
  const ref = ISLAMIC_DATES[2030];
  const diff = year - 2030;
  const shiftDays = Math.round(diff * -10.63);

  const shift = (mmdd: string): string => {
    const [mm, dd] = mmdd.split('-').map(Number);
    const d = new Date(2030, mm - 1, dd);
    d.setDate(d.getDate() + shiftDays);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return {
    ramadanStart: shift(ref.ramadanStart),
    eidAlFitr: shift(ref.eidAlFitr),
    eidAlAdha: shift(ref.eidAlAdha),
    islamicNewYear: shift(ref.islamicNewYear),
    mawlid: shift(ref.mawlid),
  };
}

/**
 * Islamische Feiertage für ein Jahr.
 * Verwendet Lookup-Daten (2024–2035) oder Approximation.
 *
 * HINWEIS: Tatsächliche Daten können je nach Region und
 * Mondsichtung um ±1–2 Tage abweichen.
 */
export const getIslamicHolidays = (year: number): Record<string, string> => {
  const data = ISLAMIC_DATES[year] ?? approximateIslamicDates(year);

  return {
    [`${year}-${data.ramadanStart}`]: 'Ramadan-Beginn',
    [`${year}-${data.eidAlFitr}`]: 'Eid al-Fitr (Zuckerfest)',
    [`${year}-${data.eidAlAdha}`]: 'Eid al-Adha (Opferfest)',
    [`${year}-${data.islamicNewYear}`]: 'Islamisches Neujahr',
    [`${year}-${data.mawlid}`]: 'Mawlid (Geburtstag d. Propheten)',
  };
};
