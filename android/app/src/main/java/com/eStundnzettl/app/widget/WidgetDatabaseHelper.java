package com.estundnzettl.app.widget;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Direct SQLite access for the Android Widget.
 *
 * Opens the same database that @capacitor-community/sqlite uses,
 * so entries created by the widget are visible in the app and vice versa.
 *
 * Database path: /data/data/<applicationId>/databases/estundnzettlSQLite.db
 */
public class WidgetDatabaseHelper {

    private static final String TAG = "WidgetDBHelper";
    private static final String DB_NAME = "estundnzettlSQLite.db";

    private final Context context;

    public WidgetDatabaseHelper(Context context) {
        this.context = context.getApplicationContext();
    }

    private File getDatabaseFile() {
        File dbDir = new File(context.getDatabasePath("x").getParent());
        return new File(dbDir, DB_NAME);
    }

    private SQLiteDatabase openDatabase() {
        File dbFile = getDatabaseFile();
        if (!dbFile.exists()) {
            Log.w(TAG, "Database file does not exist: " + dbFile.getAbsolutePath());
            return null;
        }
        try {
            return SQLiteDatabase.openDatabase(
                    dbFile.getAbsolutePath(),
                    null,
                    SQLiteDatabase.OPEN_READWRITE
            );
        } catch (Exception e) {
            Log.e(TAG, "Failed to open database", e);
            return null;
        }
    }

    /**
     * Inserts a new time entry into the database.
     *
     * @return true if the entry was inserted successfully
     */
    public boolean insertEntry(SpeechEntryParser.ParsedEntry entry) {
        // Validate before insert
        if ("work".equals(entry.type) && entry.start != null && entry.end != null) {
            int startMin = parseTimeToMinutes(entry.start);
            int endMin = parseTimeToMinutes(entry.end);
            if (endMin <= startMin) {
                Log.w(TAG, "Rejected: end time (" + entry.end + ") <= start time (" + entry.start + ")");
                return false;
            }
        }

        SQLiteDatabase db = openDatabase();
        if (db == null) return false;

        try {
            long entryId = generateEntryId();
            int netDuration = calculateNetDuration(entry);

            ContentValues values = new ContentValues();
            values.put("id", entryId);
            values.put("type", entry.type);
            values.put("date", entry.date);
            values.put("start", entry.start);
            values.put("end", entry.end);
            values.put("pause", entry.pause);
            values.put("project", entry.project);
            values.put("netDuration", netDuration);

            // Only store code for work entries
            if ("work".equals(entry.type) && entry.codeId > 0) {
                values.put("code", entry.codeId);
            }

            long result = db.insertOrThrow("entries", null, values);
            Log.i(TAG, "Entry inserted with id=" + entryId + ", netDuration=" + netDuration + "min");
            return result != -1;
        } catch (Exception e) {
            Log.e(TAG, "Failed to insert entry", e);
            return false;
        } finally {
            db.close();
        }
    }

    /**
     * Reads all work codes from the database for fuzzy matching.
     */
    public List<SpeechEntryParser.WorkCode> loadWorkCodes() {
        List<SpeechEntryParser.WorkCode> codes = new ArrayList<>();
        SQLiteDatabase db = openDatabase();
        if (db == null) return codes;

        try {
            Cursor cursor = db.rawQuery("SELECT id, label FROM work_codes ORDER BY id", null);
            while (cursor.moveToNext()) {
                int id = cursor.getInt(0);
                String label = cursor.getString(1);
                codes.add(new SpeechEntryParser.WorkCode(id, label));
            }
            cursor.close();
        } catch (Exception e) {
            Log.e(TAG, "Failed to load work codes", e);
        } finally {
            db.close();
        }

        return codes;
    }

    /**
     * Reads the user's workDays array from settings for target calculation.
     * Returns null if not found.
     */
    public int[] loadWorkDays() {
        SQLiteDatabase db = openDatabase();
        if (db == null) return null;

        try {
            Cursor cursor = db.rawQuery(
                    "SELECT value FROM settings WHERE key = 'user_data'", null);
            if (cursor.moveToFirst()) {
                String json = cursor.getString(0);
                cursor.close();
                // Parse workDays from JSON (simple extraction)
                return parseWorkDaysFromJson(json);
            }
            cursor.close();
        } catch (Exception e) {
            Log.e(TAG, "Failed to load workDays", e);
        } finally {
            db.close();
        }
        return null;
    }

    /**
     * Checks if the database exists and is accessible.
     */
    public boolean isDatabaseReady() {
        File dbFile = getDatabaseFile();
        return dbFile.exists() && dbFile.canRead();
    }

    // ─── Private helpers ────────────────────────────────────

    /**
     * Generates a unique entry ID matching the TypeScript pattern:
     * Date.now() * 1000 + random(0..999)
     */
    private long generateEntryId() {
        return System.currentTimeMillis() * 1000 + (long) (Math.random() * 1000);
    }

    /**
     * Calculates net duration in minutes.
     * For work: end - start - pause
     * For vacation/sick/time_comp without times: uses daily target
     */
    private int calculateNetDuration(SpeechEntryParser.ParsedEntry entry) {
        if (entry.start != null && entry.end != null) {
            int startMin = parseTimeToMinutes(entry.start);
            int endMin = parseTimeToMinutes(entry.end);
            if (endMin > startMin) {
                int gross = endMin - startMin;
                return "work".equals(entry.type) ? gross - entry.pause : gross;
            }
        }

        // No times → use daily target (for vacation/sick/time_comp)
        if (!"work".equals(entry.type)) {
            int[] workDays = loadWorkDays();
            return getTargetMinutesForDate(entry.date, workDays);
        }

        return 0;
    }

    private int parseTimeToMinutes(String hhmm) {
        if (hhmm == null || !hhmm.contains(":")) return 0;
        String[] parts = hhmm.split(":");
        try {
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * Returns daily target minutes for a given date.
     * Mirrors the TypeScript getTargetMinutesForDate logic.
     */
    private int getTargetMinutesForDate(String dateStr, int[] customWorkDays) {
        try {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
            java.util.Date date = sdf.parse(dateStr);
            java.util.Calendar cal = java.util.Calendar.getInstance();
            cal.setTime(date);
            // Calendar.DAY_OF_WEEK: 1=Sunday, 2=Monday, ..., 7=Saturday
            int day = cal.get(java.util.Calendar.DAY_OF_WEEK);
            // Convert to JS-style: 0=Sunday, 1=Monday, ..., 6=Saturday
            int jsDay = day - 1;

            if (customWorkDays != null && customWorkDays.length == 7) {
                return customWorkDays[jsDay];
            }

            // Default: Mon-Thu=510min(8.5h), Fri=270min(4.5h), Sat/Sun=0
            if (jsDay >= 1 && jsDay <= 4) return 510;
            if (jsDay == 5) return 270;
            return 0;
        } catch (Exception e) {
            return 510; // safe default
        }
    }

    /**
     * Simple JSON parser for workDays array from user_data settings.
     * Avoids pulling in a full JSON library for the widget.
     */
    private int[] parseWorkDaysFromJson(String json) {
        if (json == null) return null;
        try {
            // Find "workDays":[...]
            int idx = json.indexOf("\"workDays\"");
            if (idx == -1) return null;
            int arrStart = json.indexOf("[", idx);
            int arrEnd = json.indexOf("]", arrStart);
            if (arrStart == -1 || arrEnd == -1) return null;

            String arrStr = json.substring(arrStart + 1, arrEnd);
            String[] parts = arrStr.split(",");
            if (parts.length != 7) return null;

            int[] result = new int[7];
            for (int i = 0; i < 7; i++) {
                result[i] = Integer.parseInt(parts[i].trim());
            }
            return result;
        } catch (Exception e) {
            return null;
        }
    }
}
