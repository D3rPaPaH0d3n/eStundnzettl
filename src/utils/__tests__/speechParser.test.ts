import { describe, it, expect } from "vitest";
import {
  parseTimeExpression,
  extractPause,
  extractProject,
  extractWorkCode,
  extractDate,
  parseVoiceEntry,
} from "../speechParser";
import type { WorkCode } from "../../types";

// ─── Test Work Codes ────────────────────────────────────────

const TEST_CODES: WorkCode[] = [
  { id: 1, label: "01 - Schienen, Bunse" },
  { id: 3, label: "03 - TWR mechanisch" },
  { id: 6, label: "06 - TWR elektrisch, Steuerung" },
  { id: 9, label: "09 - Kabine mechanisch, Türantrieb, Auskleidung" },
  { id: 11, label: "11 - Einstellung, Fertigstellung, TÜV-Abnahme" },
  { id: 12, label: "12 - Umbau" },
  { id: 14, label: "14 - Montage" },
  { id: 19, label: "19 - Fahrzeit" },
  { id: 70, label: "70 - Büro" },
];

// ═══════════════════════════════════════════════════════════
// parseTimeExpression
// ═══════════════════════════════════════════════════════════

describe("parseTimeExpression", () => {
  it("parses HH:MM format", () => {
    expect(parseTimeExpression("16:30")).toBe("16:30");
    expect(parseTimeExpression("6:00")).toBe("06:00");
    expect(parseTimeExpression("0:00")).toBe("00:00");
    expect(parseTimeExpression("23:59")).toBe("23:59");
  });

  it("parses 'X Uhr' format", () => {
    expect(parseTimeExpression("6 Uhr")).toBe("06:00");
    expect(parseTimeExpression("16 Uhr")).toBe("16:00");
    expect(parseTimeExpression("0 Uhr")).toBe("00:00");
  });

  it("parses 'X Uhr Y' format", () => {
    expect(parseTimeExpression("16 Uhr 30")).toBe("16:30");
    expect(parseTimeExpression("6 Uhr 15")).toBe("06:15");
    expect(parseTimeExpression("7 Uhr 45")).toBe("07:45");
  });

  it("parses German word numbers with Uhr", () => {
    expect(parseTimeExpression("sechs Uhr")).toBe("06:00");
    expect(parseTimeExpression("sechzehn Uhr dreißig")).toBe("16:30");
    expect(parseTimeExpression("sieben Uhr fünfzehn")).toBe("07:15");
    expect(parseTimeExpression("zwanzig Uhr")).toBe("20:00");
  });

  it("parses 'halb X' format", () => {
    expect(parseTimeExpression("halb 7")).toBe("06:30");
    expect(parseTimeExpression("halb sieben")).toBe("06:30");
    expect(parseTimeExpression("halb 5")).toBe("04:30");
    expect(parseTimeExpression("halb 1")).toBe("00:30");
  });

  it("parses 'viertel nach X' format", () => {
    expect(parseTimeExpression("viertel nach 4")).toBe("04:15");
    expect(parseTimeExpression("viertel nach vier")).toBe("04:15");
    expect(parseTimeExpression("viertel nach 12")).toBe("12:15");
  });

  it("parses 'viertel vor X' format", () => {
    expect(parseTimeExpression("viertel vor 5")).toBe("04:45");
    expect(parseTimeExpression("viertel vor fünf")).toBe("04:45");
  });

  it("parses 'dreiviertel X' format", () => {
    expect(parseTimeExpression("dreiviertel 5")).toBe("04:45");
    expect(parseTimeExpression("dreiviertel fünf")).toBe("04:45");
  });

  it("parses bare numbers as hours", () => {
    expect(parseTimeExpression("6")).toBe("06:00");
    expect(parseTimeExpression("16")).toBe("16:00");
    expect(parseTimeExpression("0")).toBe("00:00");
  });

  it("returns null for invalid input", () => {
    expect(parseTimeExpression("")).toBeNull();
    expect(parseTimeExpression("abc")).toBeNull();
    expect(parseTimeExpression("25:00")).toBeNull();
    expect(parseTimeExpression("12:60")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(parseTimeExpression("6 UHR 30")).toBe("06:30");
    expect(parseTimeExpression("HALB 7")).toBe("06:30");
    expect(parseTimeExpression("Viertel Nach 4")).toBe("04:15");
  });
});

// ═══════════════════════════════════════════════════════════
// extractPause
// ═══════════════════════════════════════════════════════════

describe("extractPause", () => {
  it("extracts minutes pause", () => {
    expect(extractPause("mit 30 Minuten Pause").minutes).toBe(30);
    expect(extractPause("mit 45 min Pause").minutes).toBe(45);
    expect(extractPause("30 Minuten Pause").minutes).toBe(30);
    expect(extractPause("15 Minute Pause").minutes).toBe(15);
  });

  it("extracts hour-based pause", () => {
    expect(extractPause("mit 1 Stunde Pause").minutes).toBe(60);
    expect(extractPause("2 Stunden Pause").minutes).toBe(120);
  });

  it("extracts 'halbe Stunde Pause'", () => {
    expect(extractPause("mit einer halben Stunde Pause").minutes).toBe(30);
    expect(extractPause("halbe Stunde Pause").minutes).toBe(30);
  });

  it("extracts 'eine Stunde Pause'", () => {
    expect(extractPause("mit einer Stunde Pause").minutes).toBe(60);
    expect(extractPause("eine Stunde Pause").minutes).toBe(60);
  });

  it("extracts 'ohne Pause'", () => {
    expect(extractPause("ohne Pause").minutes).toBe(0);
  });

  it("returns -1 when no pause mentioned", () => {
    expect(extractPause("6 Uhr bis 16 Uhr").minutes).toBe(-1);
    expect(extractPause("Urlaub heute").minutes).toBe(-1);
  });
});

// ═══════════════════════════════════════════════════════════
// extractProject
// ═══════════════════════════════════════════════════════════

describe("extractProject", () => {
  it("extracts simple project name", () => {
    expect(extractProject("Projekt Test").project).toBe("Test");
    expect(extractProject("Projekt Musterhaus").project).toBe("Musterhaus");
  });

  it("extracts multi-word project name", () => {
    expect(extractProject("Projekt Muster Haus und Code 3").project).toBe("Muster Haus");
  });

  it("stops at keyword boundaries", () => {
    expect(extractProject("Projekt Test mit 30 Minuten Pause").project).toBe("Test");
    expect(extractProject("Projekt ABC und Code Umbau").project).toBe("ABC");
  });

  it("returns null when no project", () => {
    expect(extractProject("6 Uhr bis 16 Uhr").project).toBeNull();
    expect(extractProject("Urlaub heute").project).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// extractWorkCode
// ═══════════════════════════════════════════════════════════

describe("extractWorkCode", () => {
  it("matches by numeric ID", () => {
    const result = extractWorkCode("Code 12", TEST_CODES);
    expect(result.codeId).toBe(12);
    expect(result.codeLabel).toBe("12 - Umbau");
  });

  it("matches by label text (contains)", () => {
    const result = extractWorkCode("Code Umbau", TEST_CODES);
    expect(result.codeId).toBe(12);
  });

  it("matches by label text (Montage)", () => {
    const result = extractWorkCode("Code Montage", TEST_CODES);
    expect(result.codeId).toBe(14);
  });

  it("matches by label text (Büro)", () => {
    const result = extractWorkCode("Code Büro", TEST_CODES);
    expect(result.codeId).toBe(70);
  });

  it("matches with 'Arbeitscode' prefix", () => {
    const result = extractWorkCode("Arbeitscode Fahrzeit", TEST_CODES);
    expect(result.codeId).toBe(19);
  });

  it("returns null for no match", () => {
    const result = extractWorkCode("Code Hausbau", TEST_CODES);
    expect(result.codeId).toBeNull();
    expect(result.codeLabel).toBe("hausbau");
  });

  it("returns null when no code keyword", () => {
    const result = extractWorkCode("6 Uhr bis 16 Uhr", TEST_CODES);
    expect(result.codeId).toBeNull();
  });

  it("returns null with empty work codes", () => {
    const result = extractWorkCode("Code Umbau", []);
    expect(result.codeId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// extractDate
// ═══════════════════════════════════════════════════════════

describe("extractDate", () => {
  it("extracts 'heute'", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(extractDate("heute").date).toBe(expected);
  });

  it("extracts 'gestern'", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(extractDate("gestern").date).toBe(expected);
  });

  it("extracts 'morgen'", () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(extractDate("morgen").date).toBe(expected);
  });

  it("extracts 'am DD.MM.'", () => {
    const thisYear = new Date().getFullYear();
    expect(extractDate("am 5.4.").date).toBe(`${thisYear}-04-05`);
    expect(extractDate("am 15.12.").date).toBe(`${thisYear}-12-15`);
  });

  it("extracts 'am DD.MM.YYYY'", () => {
    expect(extractDate("am 5.4.2026").date).toBe("2026-04-05");
  });

  it("uses default date when no date mentioned", () => {
    expect(extractDate("6 Uhr bis 16 Uhr", "2026-01-15").date).toBe("2026-01-15");
  });

  it("uses today when no date and no default", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(extractDate("6 Uhr bis 16 Uhr").date).toBe(expected);
  });
});

// ═══════════════════════════════════════════════════════════
// parseVoiceEntry — Full Integration Tests
// ═══════════════════════════════════════════════════════════

describe("parseVoiceEntry", () => {
  const defaultDate = "2026-04-08";
  const opts = { workCodes: TEST_CODES, defaultDate };

  it("parses the canonical example", () => {
    const result = parseVoiceEntry(
      "6 Uhr bis 16 Uhr 30 mit 30 Minuten Pause, Projekt Test und Code Umbau",
      opts
    );
    expect(result.type).toBe("work");
    expect(result.date).toBe("2026-04-08");
    expect(result.start).toBe("06:00");
    expect(result.end).toBe("16:30");
    expect(result.pause).toBe(30);
    expect(result.project).toBe("Test");
    expect(result.codeId).toBe(12); // Umbau
    expect(result.warnings).toHaveLength(0);
  });

  it("parses simple time entry without extras", () => {
    const result = parseVoiceEntry("7 Uhr bis 15 Uhr 30", opts);
    expect(result.type).toBe("work");
    expect(result.start).toBe("07:00");
    expect(result.end).toBe("15:30");
    expect(result.pause).toBe(0); // defaultPause
    expect(result.project).toBeNull();
    expect(result.codeId).toBeNull();
  });

  it("parses with 'von ... bis' pattern", () => {
    const result = parseVoiceEntry("von 8 Uhr bis 16 Uhr", opts);
    expect(result.start).toBe("08:00");
    expect(result.end).toBe("16:00");
  });

  it("parses with German word times", () => {
    const result = parseVoiceEntry("halb 7 bis viertel nach 4", opts);
    expect(result.start).toBe("06:30");
    expect(result.end).toBe("04:15");
    // Warning about end before start
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("parses vacation entry", () => {
    const result = parseVoiceEntry("Urlaub heute", opts);
    expect(result.type).toBe("vacation");
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("parses sick entry", () => {
    const result = parseVoiceEntry("Krank", opts);
    expect(result.type).toBe("sick");
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("parses time compensation entry", () => {
    const result = parseVoiceEntry("Zeitausgleich", opts);
    expect(result.type).toBe("time_comp");
  });

  it("parses ZA abbreviation", () => {
    const result = parseVoiceEntry("ZA heute", opts);
    expect(result.type).toBe("time_comp");
  });

  it("parses with colon time format", () => {
    const result = parseVoiceEntry("6:00 bis 16:30 mit 30 Minuten Pause", opts);
    expect(result.start).toBe("06:00");
    expect(result.end).toBe("16:30");
    expect(result.pause).toBe(30);
  });

  it("parses entry with yesterday date", () => {
    const result = parseVoiceEntry("gestern 7 Uhr bis 15 Uhr", opts);
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(result.date).toBe(expected);
    expect(result.start).toBe("07:00");
    expect(result.end).toBe("15:00");
  });

  it("parses entry with code number", () => {
    const result = parseVoiceEntry("7 Uhr bis 16 Uhr Code 3", opts);
    expect(result.codeId).toBe(3);
    expect(result.codeLabel).toBe("03 - TWR mechanisch");
  });

  it("uses default pause when not specified", () => {
    const result = parseVoiceEntry("7 Uhr bis 16 Uhr", { ...opts, defaultPause: 30 });
    expect(result.pause).toBe(30);
  });

  it("warns when no time range found for work entry", () => {
    const result = parseVoiceEntry("Arbeit heute", opts);
    expect(result.type).toBe("work");
    expect(result.warnings).toContain("Keine Zeitangabe erkannt (Start/Ende fehlt)");
  });

  it("does not warn about missing time for non-work entries", () => {
    const result = parseVoiceEntry("Urlaub", opts);
    expect(result.warnings.filter(w => w.includes("Zeitangabe"))).toHaveLength(0);
  });

  it("warns when code label not found", () => {
    const result = parseVoiceEntry("7 Uhr bis 16 Uhr Code Hausbau", opts);
    expect(result.warnings.some(w => w.includes("nicht gefunden"))).toBe(true);
  });

  it("provides confidence score", () => {
    const full = parseVoiceEntry(
      "6 Uhr bis 16 Uhr 30 mit 30 Minuten Pause Projekt Test und Code Umbau",
      opts
    );
    expect(full.confidence).toBeGreaterThan(0.5);

    const minimal = parseVoiceEntry("bla bla bla", opts);
    expect(minimal.confidence).toBe(0);
  });

  it("handles empty input", () => {
    const result = parseVoiceEntry("", opts);
    expect(result.type).toBe("work");
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("parses 'eine Stunde Pause'", () => {
    const result = parseVoiceEntry("8 Uhr bis 17 Uhr mit einer Stunde Pause", opts);
    expect(result.pause).toBe(60);
  });

  it("parses 'ohne Pause'", () => {
    const result = parseVoiceEntry("6 Uhr bis 14 Uhr ohne Pause", opts);
    expect(result.pause).toBe(0);
  });

  it("parses holiday entry", () => {
    const result = parseVoiceEntry("Feiertag", opts);
    expect(result.type).toBe("public_holiday");
  });
});
