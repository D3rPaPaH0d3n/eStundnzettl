import { describe, it, expect } from 'vitest';
import { austriaLocale } from '../austria';

describe('austriaLocale', () => {
  it('hat 13 Feiertage 2026', () => {
    const holidays = austriaLocale.getHolidays(2026);
    expect(Object.keys(holidays)).toHaveLength(13);
  });

  it('enthält alle festen österreichischen Feiertage 2026', () => {
    const holidays = austriaLocale.getHolidays(2026);
    expect(holidays['2026-01-01']).toBe('Neujahr');
    expect(holidays['2026-01-06']).toBe('Heilige Drei Könige');
    expect(holidays['2026-05-01']).toBe('Staatsfeiertag');
    expect(holidays['2026-08-15']).toBe('Mariä Himmelfahrt');
    expect(holidays['2026-10-26']).toBe('Nationalfeiertag');
    expect(holidays['2026-11-01']).toBe('Allerheiligen');
    expect(holidays['2026-12-08']).toBe('Mariä Empfängnis');
    expect(holidays['2026-12-25']).toBe('Christtag');
    expect(holidays['2026-12-26']).toBe('Stefanitag');
  });

  it('berechnet bewegliche Feiertage 2026 über Ostern (5.4.2026) korrekt', () => {
    const holidays = austriaLocale.getHolidays(2026);
    expect(holidays['2026-04-06']).toBe('Ostermontag');       // Ostern +1
    expect(holidays['2026-05-14']).toBe('Christi Himmelfahrt'); // Ostern +39
    expect(holidays['2026-05-25']).toBe('Pfingstmontag');      // Ostern +50
    expect(holidays['2026-06-04']).toBe('Fronleichnam');       // Ostern +60
  });

  it('hat Halbtage 24.12. und 31.12.', () => {
    expect(austriaLocale.halfDays).toEqual(['12-24', '12-31']);
  });

  it('hat MA/ÜS-Split aktiviert mit 40h-Grenze', () => {
    expect(austriaLocale.enableOvertimeSplit).toBe(true);
    expect(austriaLocale.weeklyLimitMinutes).toBe(2400);
  });

  it('hat Krank-Aufrechnung aktiviert', () => {
    expect(austriaLocale.enableSickAdjustment).toBe(true);
  });

  it('hat 38,5h klassisch als Default (Mo-Do 8,5h / Fr 4,5h)', () => {
    expect(austriaLocale.defaultWorkDays).toEqual([0, 510, 510, 510, 510, 270, 0]);
  });
});
