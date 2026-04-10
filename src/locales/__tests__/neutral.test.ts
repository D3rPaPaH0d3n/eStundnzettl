import { describe, it, expect } from 'vitest';
import { neutralLocale } from '../neutral';

describe('neutralLocale', () => {
  it('liefert keine Feiertage für beliebiges Jahr', () => {
    expect(neutralLocale.getHolidays(2026)).toEqual({});
    expect(neutralLocale.getHolidays(2030)).toEqual({});
  });

  it('hat keine Halbtage', () => {
    expect(neutralLocale.halfDays).toEqual([]);
  });

  it('hat MA/ÜS-Split deaktiviert und kein Wochenlimit', () => {
    expect(neutralLocale.enableOvertimeSplit).toBe(false);
    expect(neutralLocale.weeklyLimitMinutes).toBeNull();
  });

  it('hat Krank-Aufrechnung deaktiviert', () => {
    expect(neutralLocale.enableSickAdjustment).toBe(false);
  });

  it('hat 40h/Woche als Default (Mo-Fr 8h)', () => {
    expect(neutralLocale.defaultWorkDays).toEqual([0, 480, 480, 480, 480, 480, 0]);
  });
});
