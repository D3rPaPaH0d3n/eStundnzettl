import { describe, it, expect } from 'vitest';
import { getEasterSunday, addDaysStr } from '../holidays/_easter';

describe('Gaußsche Osterformel', () => {
  it('berechnet korrekte Ostersonntage 2024-2030', () => {
    // Bekannte Werte (Gregorianischer Kalender)
    const cases: [number, number, number][] = [
      [2024, 3, 31], // 31. März
      [2025, 4, 20], // 20. April
      [2026, 4, 5],  // 5. April
      [2027, 3, 28], // 28. März
      [2028, 4, 16], // 16. April
      [2029, 4, 1],  // 1. April
      [2030, 4, 21], // 21. April
    ];

    for (const [year, month, day] of cases) {
      const d = getEasterSunday(year);
      expect(d.getFullYear()).toBe(year);
      expect(d.getMonth()).toBe(month - 1);
      expect(d.getDate()).toBe(day);
    }
  });

  it('addDaysStr formatiert Datum + N Tage als YYYY-MM-DD', () => {
    const easter2026 = getEasterSunday(2026); // 5.4.2026
    expect(addDaysStr(easter2026, 1)).toBe('2026-04-06'); // Ostermontag
    expect(addDaysStr(easter2026, -2)).toBe('2026-04-03'); // Karfreitag
    expect(addDaysStr(easter2026, 39)).toBe('2026-05-14'); // Christi Himmelfahrt
    expect(addDaysStr(easter2026, 50)).toBe('2026-05-25'); // Pfingstmontag
    expect(addDaysStr(easter2026, 60)).toBe('2026-06-04'); // Fronleichnam
  });
});
