package com.estundnzettl.app.widget;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses German speech input into structured time entry data.
 * Java port of src/utils/speechParser.ts for use in Android Widget.
 *
 * Supported inputs:
 *   "6 Uhr bis 16 Uhr 30 mit 30 Minuten Pause, Projekt Test und Code Umbau"
 *   "Urlaub heute"
 *   "Krank"
 *   "Zeitausgleich"
 */
public class SpeechEntryParser {

    // ─── Result class ───────────────────────────────────────

    public static class ParsedEntry {
        public String type = "work";       // work, vacation, sick, time_comp, public_holiday
        public String date;                // YYYY-MM-DD
        public String start;               // HH:MM or null
        public String end;                 // HH:MM or null
        public int pause = 0;              // minutes
        public String project;             // or null
        public int codeId = -1;            // matched WorkCode ID, -1 = not found
        public String codeLabel;           // raw label or null

        @Override
        public String toString() {
            return String.format(Locale.GERMAN,
                "%s: %s %s–%s (%d min Pause) Projekt=%s Code=%s",
                type, date,
                start != null ? start : "–",
                end != null ? end : "–",
                pause, project, codeLabel);
        }
    }

    public static class WorkCode {
        public int id;
        public String label;

        public WorkCode(int id, String label) {
            this.id = id;
            this.label = label;
        }
    }

    // ─── German number words ────────────────────────────────

    private static final Map<String, Integer> GERMAN_NUMBERS = new HashMap<>();
    static {
        GERMAN_NUMBERS.put("null", 0); GERMAN_NUMBERS.put("eins", 1);
        GERMAN_NUMBERS.put("ein", 1); GERMAN_NUMBERS.put("eine", 1);
        GERMAN_NUMBERS.put("zwei", 2); GERMAN_NUMBERS.put("drei", 3);
        GERMAN_NUMBERS.put("vier", 4); GERMAN_NUMBERS.put("fünf", 5);
        GERMAN_NUMBERS.put("fuenf", 5); GERMAN_NUMBERS.put("sechs", 6);
        GERMAN_NUMBERS.put("sieben", 7); GERMAN_NUMBERS.put("acht", 8);
        GERMAN_NUMBERS.put("neun", 9); GERMAN_NUMBERS.put("zehn", 10);
        GERMAN_NUMBERS.put("elf", 11); GERMAN_NUMBERS.put("zwölf", 12);
        GERMAN_NUMBERS.put("zwoelf", 12); GERMAN_NUMBERS.put("dreizehn", 13);
        GERMAN_NUMBERS.put("vierzehn", 14); GERMAN_NUMBERS.put("fünfzehn", 15);
        GERMAN_NUMBERS.put("fuenfzehn", 15); GERMAN_NUMBERS.put("sechzehn", 16);
        GERMAN_NUMBERS.put("siebzehn", 17); GERMAN_NUMBERS.put("achtzehn", 18);
        GERMAN_NUMBERS.put("neunzehn", 19); GERMAN_NUMBERS.put("zwanzig", 20);
        GERMAN_NUMBERS.put("dreißig", 30); GERMAN_NUMBERS.put("dreissig", 30);
        GERMAN_NUMBERS.put("vierzig", 40); GERMAN_NUMBERS.put("fünfzig", 50);
    }

    private static int parseGermanNumber(String text) {
        String t = text.trim().toLowerCase();
        if (GERMAN_NUMBERS.containsKey(t)) return GERMAN_NUMBERS.get(t);
        try { return Integer.parseInt(t); } catch (NumberFormatException e) { return -1; }
    }

    // ─── Time parsing ───────────────────────────────────────

    public static String parseTimeExpression(String text) {
        String t = text.trim().toLowerCase();

        // HH:MM
        Matcher colonM = Pattern.compile("^(\\d{1,2}):(\\d{2})$").matcher(t);
        if (colonM.matches()) {
            int h = Integer.parseInt(colonM.group(1));
            int m = Integer.parseInt(colonM.group(2));
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
                return pad(h) + ":" + pad(m);
        }

        // "halb X"
        Matcher halbM = Pattern.compile("^halb\\s+(.+)$").matcher(t);
        if (halbM.matches()) {
            int hour = parseGermanNumber(halbM.group(1));
            if (hour >= 1 && hour <= 24) return pad(hour - 1) + ":30";
        }

        // "viertel nach X"
        Matcher vnM = Pattern.compile("^viertel\\s+nach\\s+(.+)$").matcher(t);
        if (vnM.matches()) {
            int hour = parseGermanNumber(vnM.group(1));
            if (hour >= 0 && hour <= 23) return pad(hour) + ":15";
        }

        // "viertel vor X"
        Matcher vvM = Pattern.compile("^viertel\\s+vor\\s+(.+)$").matcher(t);
        if (vvM.matches()) {
            int hour = parseGermanNumber(vvM.group(1));
            if (hour >= 1 && hour <= 24) return pad(hour - 1) + ":45";
        }

        // "dreiviertel X"
        Matcher dvM = Pattern.compile("^dreiviertel\\s+(.+)$").matcher(t);
        if (dvM.matches()) {
            int hour = parseGermanNumber(dvM.group(1));
            if (hour >= 1 && hour <= 24) return pad(hour - 1) + ":45";
        }

        // "X Uhr Y"
        Matcher uhrM = Pattern.compile("^(.+?)\\s*uhr\\s*(.*)$").matcher(t);
        if (uhrM.matches()) {
            int hour = parseGermanNumber(uhrM.group(1));
            String minText = uhrM.group(2).trim();
            if (hour >= 0 && hour <= 23) {
                int min = 0;
                if (!minText.isEmpty()) {
                    int parsedMin = parseGermanNumber(minText);
                    if (parsedMin >= 0 && parsedMin <= 59) min = parsedMin;
                }
                return pad(hour) + ":" + pad(min);
            }
        }

        // Invalid HH:MM (already tried above)
        if (t.matches("^\\d{1,2}:\\d{2}$")) return null;

        // Bare number
        int bare = parseGermanNumber(t);
        if (bare >= 0 && bare <= 23) return pad(bare) + ":00";

        return null;
    }

    private static String pad(int n) {
        return String.format(Locale.US, "%02d", n);
    }

    // ─── Entry type detection ───────────────────────────────

    private static String detectEntryType(String text) {
        String t = text.toLowerCase();
        if (t.matches(".*\\b(urlaub|ferien)\\b.*")) return "vacation";
        if (t.matches(".*\\b(krank|krankmeldung|krankheit)\\b.*")) return "sick";
        if (t.matches(".*\\b(zeitausgleich|gleitzeit)\\b.*") || t.matches(".*\\bza\\b.*")) return "time_comp";
        if (t.matches(".*\\b(feiertag)\\b.*")) return "public_holiday";
        return "work";
    }

    // ─── Time range extraction ──────────────────────────────

    private static String[] extractTimeRange(String text) {
        String t = text.toLowerCase();
        int bisIdx = -1;
        Matcher bisM = Pattern.compile("\\bbis\\b").matcher(t);
        if (bisM.find()) bisIdx = bisM.start();
        if (bisIdx == -1) return null;

        String before = t.substring(0, bisIdx).trim()
                .replaceAll("^.*?\\b(von|ab)\\s+", "")
                .replaceAll("^(gestern|heute|morgen|vorgestern)\\s*", "")
                .trim();
        String after = t.substring(bisIdx + 3).trim();

        String startTime = parseTimeExpression(before);
        if (startTime == null) startTime = findTimeInText(before);

        String endTime = findLeadingTime(after);

        if (startTime != null && endTime != null) {
            return new String[]{startTime, endTime};
        }
        return null;
    }

    private static String findLeadingTime(String text) {
        // Try HH:MM at start
        Matcher cm = Pattern.compile("^(\\d{1,2}:\\d{2})").matcher(text);
        if (cm.find()) {
            String parsed = parseTimeExpression(cm.group(1));
            if (parsed != null) return parsed;
        }
        // Try word combos
        String[] words = text.split("[\\s,]+");
        for (int len = Math.min(words.length, 4); len >= 1; len--) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < len; i++) {
                if (i > 0) sb.append(' ');
                sb.append(words[i]);
            }
            String parsed = parseTimeExpression(sb.toString());
            if (parsed != null) return parsed;
        }
        return null;
    }

    private static String findTimeInText(String text) {
        Matcher cm = Pattern.compile("(\\d{1,2}:\\d{2})").matcher(text);
        if (cm.find()) {
            String parsed = parseTimeExpression(cm.group(1));
            if (parsed != null) return parsed;
        }
        Matcher uhrM = Pattern.compile("(\\d{1,2})\\s*uhr\\s*(\\d{0,2})").matcher(text.toLowerCase());
        if (uhrM.find()) {
            String parsed = parseTimeExpression(uhrM.group(0));
            if (parsed != null) return parsed;
        }
        String[] words = text.split("\\s+");
        for (int start = Math.max(0, words.length - 4); start < words.length; start++) {
            for (int end = words.length; end > start; end--) {
                StringBuilder sb = new StringBuilder();
                for (int i = start; i < end; i++) {
                    if (i > start) sb.append(' ');
                    sb.append(words[i]);
                }
                String parsed = parseTimeExpression(sb.toString());
                if (parsed != null) return parsed;
            }
        }
        return null;
    }

    // ─── Pause extraction ───────────────────────────────────

    private static int extractPause(String text) {
        String t = text.toLowerCase();

        Matcher minM = Pattern.compile("(mit\\s+)?(\\d+)\\s*(minuten?|min)\\s*pause").matcher(t);
        if (minM.find()) return Integer.parseInt(minM.group(2));

        Matcher hourM = Pattern.compile("(mit\\s+)?(\\d+)\\s*(stunden?|std)\\s*pause").matcher(t);
        if (hourM.find()) return Integer.parseInt(hourM.group(2)) * 60;

        if (t.matches(".*(mit\\s+)?(einer?\\s+)?halbe[n]?\\s*stunde\\s*pause.*")) return 30;
        if (t.matches(".*(mit\\s+)?eine[r]?\\s*stunde\\s*pause.*")) return 60;
        if (t.matches(".*ohne\\s*pause.*")) return 0;

        return -1; // not specified
    }

    // ─── Project extraction ─────────────────────────────────

    private static String extractProject(String text) {
        Matcher m = Pattern.compile("\\bprojekt\\s+([^,]+?)(?:\\s+(?:und|mit|code|arbeitscode|pause)|$)",
                Pattern.CASE_INSENSITIVE).matcher(text);
        if (m.find()) {
            String project = m.group(1).trim();
            if (!project.isEmpty()) return project;
        }
        Matcher simple = Pattern.compile("\\bprojekt\\s+(\\S+)", Pattern.CASE_INSENSITIVE).matcher(text);
        if (simple.find()) return simple.group(1).trim();
        return null;
    }

    // ─── Work code matching ─────────────────────────────────

    private static int[] matchWorkCode(String text, List<WorkCode> codes) {
        if (codes == null || codes.isEmpty()) return new int[]{-1};

        Matcher m = Pattern.compile("\\b(?:code|arbeitscode|tätigkeitscode|taetigkeitscode)\\s+(.+?)(?:\\s+(?:und|mit|projekt|pause)|[,.]|$)",
                Pattern.CASE_INSENSITIVE).matcher(text);
        if (!m.find()) return new int[]{-1};

        String search = m.group(1).trim().toLowerCase();

        // Numeric ID
        try {
            int numId = Integer.parseInt(search);
            for (WorkCode c : codes) {
                if (c.id == numId) return new int[]{c.id};
            }
        } catch (NumberFormatException ignored) {}

        // Label contains search
        for (WorkCode c : codes) {
            if (c.label.toLowerCase().contains(search)) return new int[]{c.id};
        }

        // Reverse: search matches a word in label
        for (WorkCode c : codes) {
            for (String word : c.label.toLowerCase().split("[\\s,-]+")) {
                if (word.length() > 2 && word.equals(search)) return new int[]{c.id};
            }
        }

        return new int[]{-1}; // not found
    }

    // ─── Date extraction ────────────────────────────────────

    private static String extractDate(String text) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        Calendar cal = Calendar.getInstance();

        if (text.toLowerCase().contains("gestern")) {
            cal.add(Calendar.DAY_OF_MONTH, -1);
            return sdf.format(cal.getTime());
        }
        if (text.toLowerCase().contains("morgen")) {
            cal.add(Calendar.DAY_OF_MONTH, 1);
            return sdf.format(cal.getTime());
        }
        if (text.toLowerCase().contains("vorgestern")) {
            cal.add(Calendar.DAY_OF_MONTH, -2);
            return sdf.format(cal.getTime());
        }

        Matcher dm = Pattern.compile("\\bam\\s+(\\d{1,2})\\.(\\d{1,2})\\.?(\\d{2,4})?").matcher(text);
        if (dm.find()) {
            int day = Integer.parseInt(dm.group(1));
            int month = Integer.parseInt(dm.group(2));
            int year = dm.group(3) != null ? Integer.parseInt(dm.group(3)) : cal.get(Calendar.YEAR);
            if (year < 100) year += 2000;
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                return String.format(Locale.US, "%04d-%02d-%02d", year, month, day);
            }
        }

        return sdf.format(cal.getTime()); // default: today
    }

    // ─── Main parse function ────────────────────────────────

    public static ParsedEntry parse(String input, List<WorkCode> workCodes) {
        ParsedEntry result = new ParsedEntry();

        result.type = detectEntryType(input);
        result.date = extractDate(input);

        String[] timeRange = extractTimeRange(input);
        if (timeRange != null) {
            result.start = timeRange[0];
            result.end = timeRange[1];
        }

        int pause = extractPause(input);
        result.pause = pause >= 0 ? pause : 0;

        result.project = extractProject(input);

        int[] codeResult = matchWorkCode(input, workCodes);
        result.codeId = codeResult[0];
        if (result.codeId > 0 && workCodes != null) {
            for (WorkCode c : workCodes) {
                if (c.id == result.codeId) {
                    result.codeLabel = c.label;
                    break;
                }
            }
        }

        return result;
    }
}
