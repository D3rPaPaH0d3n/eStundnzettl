// ============================================================
// OSTER-BERECHNUNG (Gaußsche Osterformel)
// ============================================================
// Zentraler Helper, der von AT- und DE-Feiertagen genutzt wird.
// Liefert das Datum des Ostersonntags für ein Kalenderjahr und
// einen Helper, um relative Tage als YYYY-MM-DD-String auszugeben.

/**
 * Berechnet den Ostersonntag nach der Gaußschen Osterformel.
 * @param year Kalenderjahr (vierstellig)
 * @returns Date-Objekt (lokale Zeitzone, 00:00)
 */
export const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

/**
 * Formatiert ein Datum relativ zu einem Basis-Datum (in Tagen)
 * als YYYY-MM-DD-String.
 */
export const addDaysStr = (base: Date, days: number): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
