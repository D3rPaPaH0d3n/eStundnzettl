import { describe, it, expect } from 'vitest';
import {
  getGermanHolidaysBundeswide,
  getGermanHolidaysByState,
} from '../holidays/germany';
import { createGermanyLocale, GERMAN_STATE_IDS } from '../germany';

describe('deutsche Feiertage - bundesweit', () => {
  it('liefert genau 9 bundesweite Feiertage', () => {
    const holidays = getGermanHolidaysBundeswide(2026);
    expect(Object.keys(holidays)).toHaveLength(9);
  });

  it('enthält alle bundesweiten Feiertage 2026 inkl. beweglicher (Ostern 5.4.2026)', () => {
    const holidays = getGermanHolidaysBundeswide(2026);
    expect(holidays['2026-01-01']).toBe('Neujahr');
    expect(holidays['2026-04-03']).toBe('Karfreitag'); // Ostern -2
    expect(holidays['2026-04-06']).toBe('Ostermontag'); // Ostern +1
    expect(holidays['2026-05-01']).toBe('Tag der Arbeit');
    expect(holidays['2026-05-14']).toBe('Christi Himmelfahrt'); // Ostern +39
    expect(holidays['2026-05-25']).toBe('Pfingstmontag'); // Ostern +50
    expect(holidays['2026-10-03']).toBe('Tag der Deutschen Einheit');
    expect(holidays['2026-12-25']).toBe('1. Weihnachtstag');
    expect(holidays['2026-12-26']).toBe('2. Weihnachtstag');
  });
});

describe('deutsche Feiertage - Bayern (de-by)', () => {
  it('ergänzt Heilige Drei Könige, Fronleichnam, Mariä Himmelfahrt, Allerheiligen', () => {
    const holidays = getGermanHolidaysByState(2026, 'by');
    expect(holidays['2026-01-06']).toBe('Heilige Drei Könige');
    expect(holidays['2026-06-04']).toBe('Fronleichnam'); // Ostern +60
    expect(holidays['2026-08-15']).toBe('Mariä Himmelfahrt');
    expect(holidays['2026-11-01']).toBe('Allerheiligen');
  });

  it('hat keinen Reformationstag', () => {
    const holidays = getGermanHolidaysByState(2026, 'by');
    expect(holidays['2026-10-31']).toBeUndefined();
  });
});

describe('deutsche Feiertage - Berlin (de-be)', () => {
  it('hat Internationalen Frauentag', () => {
    const holidays = getGermanHolidaysByState(2026, 'be');
    expect(holidays['2026-03-08']).toBe('Internationaler Frauentag');
  });

  it('hat keinen Fronleichnam', () => {
    const holidays = getGermanHolidaysByState(2026, 'be');
    expect(holidays['2026-06-04']).toBeUndefined();
  });
});

describe('deutsche Feiertage - Sachsen (de-sn)', () => {
  it('hat Reformationstag und Buß- und Bettag', () => {
    const holidays = getGermanHolidaysByState(2026, 'sn');
    expect(holidays['2026-10-31']).toBe('Reformationstag');
    // Buß- und Bettag 2026: Mittwoch vor 23.11. → 18.11.2026
    expect(holidays['2026-11-18']).toBe('Buß- und Bettag');
  });
});

describe('deutsche Feiertage - Thüringen (de-th)', () => {
  it('hat Reformationstag und Weltkindertag', () => {
    const holidays = getGermanHolidaysByState(2026, 'th');
    expect(holidays['2026-10-31']).toBe('Reformationstag');
    expect(holidays['2026-09-20']).toBe('Weltkindertag');
  });
});

describe('deutsche Feiertage - Schleswig-Holstein (de-sh)', () => {
  it('hat nur Reformationstag als regionalen Zusatz', () => {
    const holidays = getGermanHolidaysByState(2026, 'sh');
    expect(holidays['2026-10-31']).toBe('Reformationstag');
    expect(holidays['2026-01-06']).toBeUndefined();
    expect(holidays['2026-06-04']).toBeUndefined();
    expect(holidays['2026-11-01']).toBeUndefined();
  });
});

describe('createGermanyLocale', () => {
  it('erzeugt Locale mit id, country, region, name für alle 16 Bundesländer', () => {
    expect(GERMAN_STATE_IDS).toHaveLength(16);
    for (const state of GERMAN_STATE_IDS) {
      const locale = createGermanyLocale(state);
      expect(locale.country).toBe('de');
      expect(locale.id).toBe(`de-${state}`);
      expect(locale.region).toBeDefined();
      expect(locale.name).toContain('Deutschland');
      expect(locale.halfDays).toEqual(['12-24', '12-31']);
      expect(locale.enableOvertimeSplit).toBe(true);
      expect(locale.weeklyLimitMinutes).toBe(2400);
      expect(locale.enableSickAdjustment).toBe(true);
      expect(locale.defaultWorkDays).toEqual([0, 480, 480, 480, 480, 480, 0]);
    }
  });

  it('Bayern-Locale liefert bayerische Feiertage', () => {
    const bavaria = createGermanyLocale('by');
    const holidays = bavaria.getHolidays(2026);
    expect(holidays['2026-11-01']).toBe('Allerheiligen');
  });
});
