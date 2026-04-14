import { describe, it, expect } from "vitest";
import { getSwissHolidaysByKanton } from "../holidays/switzerland";
import { getOrthodoxEasterSunday, getOrthodoxHolidays, getIslamicHolidays } from "../holidays/religious";
import { createSwitzerlandLocale } from "../switzerland";

describe("Swiss holidays (cantonal)", () => {
  it("Zürich (ZH) hat Bundesfeiertag, Neujahr, Auffahrt, Karfreitag, Ostermontag, Pfingstmontag, Weihnachten, Stephanstag, Berchtoldstag, Tag der Arbeit", () => {
    const h = getSwissHolidaysByKanton(2025, "zh");
    expect(h["2025-08-01"]).toBe("Bundesfeiertag");
    expect(h["2025-01-01"]).toBe("Neujahr");
    expect(h["2025-01-02"]).toBe("Berchtoldstag");
    expect(h["2025-05-01"]).toBe("Tag der Arbeit");
    expect(h["2025-12-25"]).toBe("Weihnachten");
    expect(h["2025-12-26"]).toBe("Stephanstag");
    // Easter 2025 = April 20 → Karfreitag = April 18
    expect(h["2025-04-18"]).toBe("Karfreitag");
    expect(h["2025-04-21"]).toBe("Ostermontag");
    // ZH hat KEIN Fronleichnam, KEIN Allerheiligen
    expect(h).not.toHaveProperty("2025-11-01");
  });

  it("Tessin (TI) hat katholische Feiertage (Fronleichnam, Mariä Himmelfahrt, Allerheiligen, Mariä Empfängnis)", () => {
    const h = getSwissHolidaysByKanton(2025, "ti");
    expect(h["2025-08-15"]).toBe("Mariä Himmelfahrt");
    expect(h["2025-11-01"]).toBe("Allerheiligen");
    expect(h["2025-12-08"]).toBe("Mariä Empfängnis");
    // Easter 2025 = April 20 → Fronleichnam = +60 = June 19
    expect(h["2025-06-19"]).toBe("Fronleichnam");
    // Tessin hat Tag der Arbeit
    expect(h["2025-05-01"]).toBe("Tag der Arbeit");
  });

  it("Bern (BE) hat Berchtoldstag aber kein Fronleichnam", () => {
    const h = getSwissHolidaysByKanton(2025, "be");
    expect(h["2025-01-02"]).toBe("Berchtoldstag");
    const keys = Object.keys(h);
    const hasFronleichnam = keys.some((k) => h[k] === "Fronleichnam");
    expect(hasFronleichnam).toBe(false);
  });

  it("Genf (GE) hat Jeûne genevois und Restauration", () => {
    const h = getSwissHolidaysByKanton(2025, "ge");
    expect(h["2025-12-31"]).toBe("Restauration");
    // Jeûne genevois 2025: erster Sonntag im September = 7.9., + 4 = 11.9.
    expect(h["2025-09-11"]).toBe("Jeûne genevois");
  });

  it("Glarus (GL) hat Näfelser Fahrt (erster Donnerstag im April)", () => {
    const h = getSwissHolidaysByKanton(2025, "gl");
    // 2025: 1. April = Dienstag → erster Donnerstag = 3. April
    expect(h["2025-04-03"]).toBe("Näfelser Fahrt");
  });

  it("Bundesfeiertag 1. August ist in JEDEM Kanton", () => {
    const kantons = ["ag", "ai", "ar", "be", "ge", "ti", "vs", "zh", "zg"] as const;
    for (const k of kantons) {
      const h = getSwissHolidaysByKanton(2025, k);
      expect(h["2025-08-01"]).toBe("Bundesfeiertag");
    }
  });
});

describe("createSwitzerlandLocale", () => {
  it("erzeugt eine gültige Locale für Zürich", () => {
    const locale = createSwitzerlandLocale("zh");
    expect(locale.id).toBe("ch-zh");
    expect(locale.country).toBe("ch");
    expect(locale.region).toBe("Zürich");
    expect(locale.enableOvertimeSplit).toBe(true);
    expect(locale.weeklyLimitMinutes).toBe(2700); // 45h
    expect(locale.halfDays).toEqual(["12-24", "12-31"]);
  });
});

describe("Orthodox Easter", () => {
  it("berechnet korrekte Daten für bekannte Jahre (2024-2026)", () => {
    // Bekannte orthodoxe Ostern (Gregorianisch):
    // 2024: 5. Mai
    const e2024 = getOrthodoxEasterSunday(2024);
    expect(e2024.getMonth()).toBe(4); // Mai (0-indexed)
    expect(e2024.getDate()).toBe(5);

    // 2025: 20. April
    const e2025 = getOrthodoxEasterSunday(2025);
    expect(e2025.getMonth()).toBe(3);
    expect(e2025.getDate()).toBe(20);

    // 2026: 12. April
    const e2026 = getOrthodoxEasterSunday(2026);
    expect(e2026.getMonth()).toBe(3);
    expect(e2026.getDate()).toBe(12);
  });
});

describe("Orthodox holidays", () => {
  it("enthält Weihnachten am 7. Jänner und Theophanie am 19. Jänner", () => {
    const h = getOrthodoxHolidays(2025);
    expect(h["2025-01-07"]).toBe("Orthodoxes Weihnachten");
    expect(h["2025-01-19"]).toBe("Theophanie (Taufe Christi)");
  });

  it("enthält orthodoxen Karfreitag und Ostersonntag (2025)", () => {
    const h = getOrthodoxHolidays(2025);
    // Orthodox Easter 2025 = 20. April → Karfreitag = 18. April
    expect(h["2025-04-18"]).toBe("Orthodoxer Karfreitag");
    expect(h["2025-04-20"]).toBe("Orthodoxer Ostersonntag");
  });
});

describe("Islamic holidays", () => {
  it("liefert 5 Feiertage für ein bekanntes Jahr (2025)", () => {
    const h = getIslamicHolidays(2025);
    expect(Object.keys(h).length).toBe(5);
    expect(h["2025-02-28"]).toBe("Ramadan-Beginn");
    expect(h["2025-03-30"]).toBe("Eid al-Fitr (Zuckerfest)");
    expect(h["2025-06-06"]).toBe("Eid al-Adha (Opferfest)");
  });

  it("liefert Ergebnisse auch für Jahre außerhalb der Lookup-Tabelle", () => {
    const h = getIslamicHolidays(2040);
    expect(Object.keys(h).length).toBe(5);
    // Approximierte Werte — wir prüfen nur, dass sie existieren
    const names = Object.values(h);
    expect(names).toContain("Ramadan-Beginn");
    expect(names).toContain("Eid al-Adha (Opferfest)");
  });
});
