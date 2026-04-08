/**
 * speechParser.ts — Parst deutsche Spracheingaben in Entry-Daten.
 *
 * Unterstützte Eingabeformate:
 *   "6 Uhr bis 16 Uhr 30 mit 30 Minuten Pause, Projekt Test und Code Umbau"
 *   "Urlaub heute"
 *   "Krank"
 *   "Zeitausgleich"
 *   "halb 7 bis viertel nach 4 mit einer Stunde Pause"
 *
 * Der Parser ist absichtlich fehlertolerant: Google Speech Recognition
 * liefert verschiedene Schreibweisen ("16:30", "16 Uhr 30", "sechzehn Uhr dreißig").
 */

import type { WorkCode, EntryType } from "../types";

// ─── Public Interface ───────────────────────────────────────

export interface ParsedVoiceEntry {
  type: EntryType;
  date: string;           // YYYY-MM-DD
  start: string | null;   // HH:MM
  end: string | null;     // HH:MM
  pause: number;          // minutes
  project: string | null;
  codeId: number | null;  // matched WorkCode ID
  codeLabel: string | null; // raw text that matched
  confidence: number;     // 0-1, how much of the input was understood
  warnings: string[];     // non-fatal issues
}

export interface ParseOptions {
  workCodes?: WorkCode[];
  defaultDate?: string;   // YYYY-MM-DD, defaults to today
  defaultPause?: number;  // minutes, defaults to 0
}

// ─── German Number Words ────────────────────────────────────

const GERMAN_NUMBERS: Record<string, number> = {
  null: 0, eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4,
  fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9,
  zehn: 10, elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13,
  vierzehn: 14, fünfzehn: 15, fuenfzehn: 15, sechzehn: 16,
  siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20,
  einundzwanzig: 21, zweiundzwanzig: 22, dreiundzwanzig: 23,
  dreißig: 30, dreissig: 30, vierzig: 40, fünfzig: 50, fuenfzig: 50,
};

function parseGermanNumber(text: string): number | null {
  const trimmed = text.trim().toLowerCase();
  if (GERMAN_NUMBERS[trimmed] !== undefined) return GERMAN_NUMBERS[trimmed];
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? null : num;
}

// ─── Time Parsing ───────────────────────────────────────────

/**
 * Parses a time expression from German speech into HH:MM format.
 *
 * Supported formats:
 *   "6 Uhr"           → "06:00"
 *   "16 Uhr 30"       → "16:30"
 *   "16:30"            → "16:30"
 *   "6:00"             → "06:00"
 *   "halb 7"           → "06:30"
 *   "halb sieben"      → "06:30"
 *   "viertel nach 4"   → "04:15"
 *   "viertel vor 5"    → "04:45"
 *   "dreiviertel 5"    → "04:45"
 *   "sechzehn Uhr dreißig" → "16:30"
 */
export function parseTimeExpression(text: string): string | null {
  const t = text.trim().toLowerCase();

  // Pattern: "HH:MM" or "H:MM"
  const colonMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // Pattern: "halb X" → (X-1):30
  const halbMatch = t.match(/^halb\s+(.+)$/);
  if (halbMatch) {
    const hour = parseGermanNumber(halbMatch[1]);
    if (hour !== null && hour >= 1 && hour <= 24) {
      const h = hour - 1;
      return `${String(h).padStart(2, '0')}:30`;
    }
  }

  // Pattern: "viertel nach X" → X:15
  const viertelNachMatch = t.match(/^viertel\s+nach\s+(.+)$/);
  if (viertelNachMatch) {
    const hour = parseGermanNumber(viertelNachMatch[1]);
    if (hour !== null && hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(2, '0')}:15`;
    }
  }

  // Pattern: "viertel vor X" → (X-1):45
  const viertelVorMatch = t.match(/^viertel\s+vor\s+(.+)$/);
  if (viertelVorMatch) {
    const hour = parseGermanNumber(viertelVorMatch[1]);
    if (hour !== null && hour >= 1 && hour <= 24) {
      return `${String(hour - 1).padStart(2, '0')}:45`;
    }
  }

  // Pattern: "dreiviertel X" → (X-1):45
  const dreiviertelMatch = t.match(/^dreiviertel\s+(.+)$/);
  if (dreiviertelMatch) {
    const hour = parseGermanNumber(dreiviertelMatch[1]);
    if (hour !== null && hour >= 1 && hour <= 24) {
      return `${String(hour - 1).padStart(2, '0')}:45`;
    }
  }

  // Pattern: "X Uhr Y" or "X uhr Y" (with word-numbers)
  const uhrMatch = t.match(/^(.+?)\s*uhr\s*(.*)$/);
  if (uhrMatch) {
    const hour = parseGermanNumber(uhrMatch[1]);
    const minuteText = uhrMatch[2].trim();
    if (hour !== null && hour >= 0 && hour <= 23) {
      let min = 0;
      if (minuteText) {
        const parsedMin = parseGermanNumber(minuteText);
        if (parsedMin !== null && parsedMin >= 0 && parsedMin <= 59) {
          min = parsedMin;
        }
      }
      return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }

  // Reject strings that look like invalid HH:MM (e.g. "12:60")
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    return null; // already tried colonMatch above and failed validation
  }

  // Pattern: bare number (e.g. "6" → "06:00", "16" → "16:00")
  const bareNumber = parseGermanNumber(t);
  if (bareNumber !== null && bareNumber >= 0 && bareNumber <= 23) {
    return `${String(bareNumber).padStart(2, '0')}:00`;
  }

  return null;
}

// ─── Entry Type Detection ───────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: EntryType }> = [
  { pattern: /\b(urlaub|ferien)\b/i, type: "vacation" },
  { pattern: /\b(krank|krankmeldung|krankheit)\b/i, type: "sick" },
  { pattern: /\b(zeitausgleich|za\b|gleitzeit)/i, type: "time_comp" },
  { pattern: /\b(feiertag)\b/i, type: "public_holiday" },
];

function detectEntryType(text: string): EntryType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return "work";
}

// ─── Time Range Extraction ──────────────────────────────────

interface TimeRange {
  start: string; // HH:MM
  end: string;   // HH:MM
}

/**
 * Extracts start and end time from text like:
 *   "6 Uhr bis 16 Uhr 30"
 *   "von 7 bis 15:30"
 *   "8 Uhr 30 bis halb 5"
 */
function extractTimeRange(text: string): { range: TimeRange | null; consumed: string } {
  const t = text.toLowerCase();

  // Strategy: find "bis" and split around it
  const bisIndex = t.search(/\bbis\b/);
  if (bisIndex === -1) return { range: null, consumed: "" };

  const beforeBis = t.substring(0, bisIndex).trim();
  const afterBis = t.substring(bisIndex + 3).trim();

  // Extract start time: find the time expression closest to "bis"
  // Remove leading context words like "gestern", "heute", "von", "ab"
  const startText = beforeBis
    .replace(/^.*?\b(von|ab)\s+/i, '')
    .replace(/^(gestern|heute|morgen|vorgestern)\s*/i, '')
    .trim();

  // If startText still has multiple parts, try to find the time at the end
  const startTime = parseTimeExpression(startText) || findTimeInText(startText);

  // For end time: try to parse from the beginning of afterBis
  const endCandidates = extractLeadingTimeExpression(afterBis);

  if (startTime && endCandidates.time) {
    const consumed = t.substring(
      Math.max(0, bisIndex - beforeBis.length - 1),
      bisIndex + 3 + (endCandidates.length || 0)
    ).trim();
    return { range: { start: startTime, end: endCandidates.time }, consumed };
  }

  return { range: null, consumed: "" };
}

/**
 * Tries to find a time expression anywhere in a text fragment.
 * Useful when the text before "bis" contains extra words.
 */
function findTimeInText(text: string): string | null {
  // Try HH:MM pattern anywhere
  const colonMatch = text.match(/(\d{1,2}:\d{2})/);
  if (colonMatch) {
    const parsed = parseTimeExpression(colonMatch[1]);
    if (parsed) return parsed;
  }

  // Try "X Uhr Y" pattern
  const uhrMatch = text.match(/(\d{1,2})\s*uhr\s*(\d{0,2})/i);
  if (uhrMatch) {
    const candidate = uhrMatch[0];
    const parsed = parseTimeExpression(candidate);
    if (parsed) return parsed;
  }

  // Try from the end of the text (most likely position for the time)
  const words = text.split(/\s+/);
  for (let start = Math.max(0, words.length - 4); start < words.length; start++) {
    for (let end = words.length; end > start; end--) {
      const candidate = words.slice(start, end).join(' ');
      const parsed = parseTimeExpression(candidate);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Tries to parse a time expression from the beginning of a string.
 * Returns the parsed time and how many characters were consumed.
 */
function extractLeadingTimeExpression(text: string): { time: string | null; length: number } {
  // First try: HH:MM at the start (colon format doesn't split well on spaces)
  const colonMatch = text.match(/^(\d{1,2}:\d{2})/);
  if (colonMatch) {
    const parsed = parseTimeExpression(colonMatch[1]);
    if (parsed) return { time: parsed, length: colonMatch[1].length };
  }

  const words = text.split(/[\s,]+/);

  // Try progressively more words (max 4: "viertel nach vier uhr")
  for (let len = Math.min(words.length, 4); len >= 1; len--) {
    const candidate = words.slice(0, len).join(' ');
    const parsed = parseTimeExpression(candidate);
    if (parsed) {
      // Calculate actual character length consumed
      const charLength = text.indexOf(words[len - 1]) + words[len - 1].length;
      return { time: parsed, length: charLength };
    }
  }

  return { time: null, length: 0 };
}

// ─── Pause Extraction ───────────────────────────────────────

/**
 * Extracts pause duration from text like:
 *   "30 Minuten Pause"
 *   "mit 45 min Pause"
 *   "halbe Stunde Pause"
 *   "eine Stunde Pause"
 *   "1,5 Stunden Pause"
 */
export function extractPause(text: string): { minutes: number; consumed: string } {
  const t = text.toLowerCase();

  // Pattern: "X Minuten Pause" or "X min Pause"
  const minMatch = t.match(/(mit\s+)?(\d+)\s*(minuten?|min)\s*pause/i);
  if (minMatch) {
    return { minutes: parseInt(minMatch[2], 10), consumed: minMatch[0] };
  }

  // Pattern: "X Stunden Pause" or "X,Y Stunden Pause"
  const hourMatch = t.match(/(mit\s+)?(\d+)[,.]?(\d*)\s*(stunden?|std)\s*pause/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[2], 10);
    const frac = hourMatch[3] ? parseInt(hourMatch[3], 10) / Math.pow(10, hourMatch[3].length) : 0;
    return { minutes: Math.round((hours + frac) * 60), consumed: hourMatch[0] };
  }

  // Pattern: "halbe Stunde Pause"
  const halbeMatch = t.match(/(mit\s+)?(einer?\s+)?halbe[n]?\s*stunde\s*pause/i);
  if (halbeMatch) {
    return { minutes: 30, consumed: halbeMatch[0] };
  }

  // Pattern: "eine Stunde Pause"
  const eineMatch = t.match(/(mit\s+)?eine[r]?\s*stunde\s*pause/i);
  if (eineMatch) {
    return { minutes: 60, consumed: eineMatch[0] };
  }

  // Pattern: "ohne Pause"
  const ohneMatch = t.match(/ohne\s*pause/i);
  if (ohneMatch) {
    return { minutes: 0, consumed: ohneMatch[0] };
  }

  return { minutes: -1, consumed: "" }; // -1 = not specified
}

// ─── Project Extraction ─────────────────────────────────────

/**
 * Extracts project name from text like:
 *   "Projekt Test"
 *   "Projekt Muster Haus"
 */
export function extractProject(text: string): { project: string | null; consumed: string } {
  // Greedy match: capture everything after "Projekt" until a stop-keyword or end
  const match = text.match(/\bprojekt\s+(.+?)(?:\s+(?:und\s+code|code|arbeitscode|mit\s+\d|pause)|$)/i);
  if (match) {
    const project = match[1].trim().replace(/[,.]$/, '').trim();
    if (project) {
      return { project, consumed: match[0] };
    }
  }

  // Fallback: grab the next word(s) after "Projekt"
  const simpleMatch = text.match(/\bprojekt\s+(\S+(?:\s+\S+)?)/i);
  if (simpleMatch) {
    return { project: simpleMatch[1].trim(), consumed: simpleMatch[0] };
  }

  return { project: null, consumed: "" };
}

// ─── Work Code Matching ─────────────────────────────────────

/**
 * Extracts work code reference and fuzzy-matches against available codes.
 *
 * Input patterns:
 *   "Code Umbau"
 *   "Arbeitscode Montage"
 *   "Tätigkeitscode 3"
 *   "Code 7"
 */
export function extractWorkCode(
  text: string,
  workCodes: WorkCode[]
): { codeId: number | null; codeLabel: string | null; consumed: string } {
  if (!workCodes || workCodes.length === 0) {
    return { codeId: null, codeLabel: null, consumed: "" };
  }

  // Greedy match: capture everything after "Code" until stop-keyword or end
  const match = text.match(/\b(?:code|arbeitscode|tätigkeitscode|taetigkeitscode)\s+(.+?)(?:\s+(?:und\s+projekt|projekt|mit\s+\d|pause)|[,.]|$)/i);
  if (!match) return { codeId: null, codeLabel: null, consumed: "" };

  const searchText = match[1].trim().toLowerCase();
  const consumed = match[0];

  // 1. Try numeric ID match
  const numId = parseInt(searchText, 10);
  if (!isNaN(numId)) {
    const byId = workCodes.find(c => c.id === numId);
    if (byId) return { codeId: byId.id, codeLabel: byId.label, consumed };
  }

  // 2. Exact label match (case-insensitive)
  const exact = workCodes.find(c => c.label.toLowerCase() === searchText);
  if (exact) return { codeId: exact.id, codeLabel: exact.label, consumed };

  // 3. Label contains search text
  const contains = workCodes.find(c => c.label.toLowerCase().includes(searchText));
  if (contains) return { codeId: contains.id, codeLabel: contains.label, consumed };

  // 4. Search text contains label keyword (e.g. "Umbau" matches "09 - Kabine mechanisch, Umbau")
  const reverseMatch = workCodes.find(c => {
    const labelWords = c.label.toLowerCase().split(/[\s,-]+/);
    return labelWords.some(word => word.length > 2 && word === searchText);
  });
  if (reverseMatch) return { codeId: reverseMatch.id, codeLabel: reverseMatch.label, consumed };

  // 5. Partial match — search text starts with a word in the label
  const partial = workCodes.find(c => {
    const labelWords = c.label.toLowerCase().split(/[\s,-]+/);
    return labelWords.some(word => word.length > 2 && (word.startsWith(searchText) || searchText.startsWith(word)));
  });
  if (partial) return { codeId: partial.id, codeLabel: partial.label, consumed };

  return { codeId: null, codeLabel: searchText, consumed };
}

// ─── Date Extraction ────────────────────────────────────────

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extracts date references like "heute", "gestern", "morgen", or specific dates.
 */
export function extractDate(text: string, defaultDate?: string): { date: string; consumed: string } {
  const today = new Date();
  const fallback = defaultDate || toLocalDateString(today);

  if (/\bgestern\b/i.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return { date: toLocalDateString(d), consumed: "gestern" };
  }

  if (/\bmorgen\b/i.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: toLocalDateString(d), consumed: "morgen" };
  }

  if (/\bvorgestern\b/i.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return { date: toLocalDateString(d), consumed: "vorgestern" };
  }

  if (/\bheute\b/i.test(text)) {
    return { date: toLocalDateString(today), consumed: "heute" };
  }

  // Pattern: "am 5. April" or "am 5.4." or "am 05.04."
  const dateMatch = text.match(/\bam\s+(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : today.getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return {
        date: `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        consumed: dateMatch[0],
      };
    }
  }

  return { date: fallback, consumed: "" };
}

// ─── Main Parser ────────────────────────────────────────────

/**
 * Parses a German speech input into structured entry data.
 *
 * @param input  Raw text from speech recognition
 * @param opts   Work codes for fuzzy matching, default date, etc.
 * @returns      Parsed entry data with confidence score and warnings
 *
 * @example
 *   parseVoiceEntry("6 Uhr bis 16 Uhr 30 mit 30 Minuten Pause, Projekt Test und Code Umbau")
 *   // → { type: "work", start: "06:00", end: "16:30", pause: 30, project: "Test", ... }
 *
 *   parseVoiceEntry("Urlaub heute")
 *   // → { type: "vacation", date: "2026-04-08", start: null, end: null, ... }
 */
export function parseVoiceEntry(input: string, opts: ParseOptions = {}): ParsedVoiceEntry {
  const { workCodes = [], defaultDate, defaultPause = 0 } = opts;
  const warnings: string[] = [];
  let understood = 0;
  const totalWords = input.trim().split(/\s+/).length;

  // 1. Detect entry type
  const type = detectEntryType(input);
  if (type !== "work") understood += 1;

  // 2. Extract date
  const { date, consumed: dateConsumed } = extractDate(input, defaultDate);
  if (dateConsumed) understood += 1;

  // 3. Extract time range
  const { range, consumed: timeConsumed } = extractTimeRange(input);
  if (timeConsumed) {
    understood += timeConsumed.split(/\s+/).length;
  }

  // 4. Extract pause
  const { minutes: pauseMinutes, consumed: pauseConsumed } = extractPause(input);
  const pause = pauseMinutes >= 0 ? pauseMinutes : defaultPause;
  if (pauseConsumed) {
    understood += pauseConsumed.split(/\s+/).length;
  }

  // 5. Extract project
  const { project, consumed: projectConsumed } = extractProject(input);
  if (projectConsumed) {
    understood += projectConsumed.split(/\s+/).length;
  }

  // 6. Extract work code
  const { codeId, codeLabel, consumed: codeConsumed } = extractWorkCode(input, workCodes);
  if (codeConsumed) {
    understood += codeConsumed.split(/\s+/).length;
  }

  // Warnings
  if (type === "work" && !range) {
    warnings.push("Keine Zeitangabe erkannt (Start/Ende fehlt)");
  }
  if (range && range.start >= range.end) {
    warnings.push("Endzeit liegt vor oder auf Startzeit");
  }
  if (codeLabel && !codeId) {
    warnings.push(`Arbeitscode "${codeLabel}" nicht gefunden`);
  }

  // Confidence: how much of the input did we understand?
  const confidence = Math.min(1, understood / Math.max(1, totalWords));

  return {
    type,
    date,
    start: range?.start ?? null,
    end: range?.end ?? null,
    pause,
    project,
    codeId,
    codeLabel,
    confidence,
    warnings,
  };
}
