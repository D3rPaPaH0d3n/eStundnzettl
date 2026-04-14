import { describe, it, expect } from 'vitest';
import {
  LOCALES,
  getLocale,
  DEFAULT_LOCALE_ID,
  GERMANY_LOCALE_IDS,
  SWITZERLAND_LOCALE_IDS,
  TOP_LEVEL_LOCALES,
} from '../index';

describe('LOCALES registry', () => {
  it('hat 44 Locales (neutral + at + 16 DE + 26 CH)', () => {
    expect(Object.keys(LOCALES)).toHaveLength(44);
  });

  it('enthält neutral, at, alle 16 de-XX und alle 26 ch-XX Varianten', () => {
    expect(LOCALES.neutral).toBeDefined();
    expect(LOCALES.at).toBeDefined();
    expect(LOCALES['de-by']).toBeDefined();
    expect(LOCALES['de-nw']).toBeDefined();
    expect(LOCALES['de-be']).toBeDefined();
    expect(GERMANY_LOCALE_IDS).toHaveLength(16);
    expect(LOCALES['ch-zh']).toBeDefined();
    expect(LOCALES['ch-be']).toBeDefined();
    expect(LOCALES['ch-ti']).toBeDefined();
    expect(LOCALES['ch-ge']).toBeDefined();
    expect(SWITZERLAND_LOCALE_IDS).toHaveLength(26);
  });

  it('TOP_LEVEL_LOCALES hat 4 Einträge (neutral, at, de, ch)', () => {
    expect(TOP_LEVEL_LOCALES).toEqual(['neutral', 'at', 'de', 'ch']);
  });
});

describe('getLocale()', () => {
  it('liefert die angeforderte Locale', () => {
    expect(getLocale('neutral').id).toBe('neutral');
    expect(getLocale('at').id).toBe('at');
    expect(getLocale('de-by').id).toBe('de-by');
  });

  it('fällt bei undefined auf DEFAULT_LOCALE_ID zurück (Österreich)', () => {
    expect(getLocale(undefined).id).toBe(DEFAULT_LOCALE_ID);
    expect(getLocale(null).id).toBe(DEFAULT_LOCALE_ID);
    expect(DEFAULT_LOCALE_ID).toBe('at');
  });

  it('fällt bei unbekannter ID auf Default zurück', () => {
    // @ts-expect-error — Test ungültiger ID
    expect(getLocale('xx-yy').id).toBe(DEFAULT_LOCALE_ID);
  });
});
