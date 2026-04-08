package com.estundnzettl.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Parses spoken German time entries using the Gemini REST API.
 *
 * Uses OkHttp3 (already in the project) to call the Gemini API.
 * API key is stored in SharedPreferences and configured on first use.
 *
 * Free tier: ~1500 requests/day, no credit card needed.
 * Get a key at: https://aistudio.google.com/apikey
 */
public class GeminiParser {

    private static final String TAG = "GeminiParser";
    private static final String PREFS_NAME = "gemini_settings";
    private static final String KEY_API_KEY = "api_key";
    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    private static final MediaType JSON_TYPE = MediaType.get("application/json; charset=utf-8");

    private static final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build();

    /**
     * Checks if a Gemini API key is configured.
     */
    public static boolean isAvailable(Context context) {
        String key = getApiKey(context);
        return key != null && !key.isEmpty();
    }

    /**
     * Gets the stored API key.
     */
    public static String getApiKey(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_API_KEY, null);
    }

    /**
     * Stores the API key.
     */
    public static void setApiKey(Context context, String apiKey) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_API_KEY, apiKey != null ? apiKey.trim() : null)
                .apply();
    }

    /**
     * Parses spoken text using the Gemini API.
     * Falls back to SpeechEntryParser on any failure.
     *
     * IMPORTANT: Call from a background thread — network I/O.
     */
    public static SpeechEntryParser.ParsedEntry parse(
            Context context,
            String spokenText,
            List<SpeechEntryParser.WorkCode> workCodes
    ) {
        String apiKey = getApiKey(context);
        if (apiKey == null || apiKey.isEmpty()) {
            Log.i(TAG, "No API key, falling back to local parser");
            return SpeechEntryParser.parse(spokenText, workCodes);
        }

        try {
            String prompt = buildPrompt(spokenText, workCodes);
            String response = callGeminiApi(apiKey, prompt);

            if (response != null && !response.isEmpty()) {
                Log.d(TAG, "Gemini response: " + response);
                return parseJsonResponse(response, spokenText, workCodes);
            }
        } catch (Exception e) {
            Log.w(TAG, "Gemini API failed: " + e.getMessage());
        }

        Log.i(TAG, "Falling back to local parser");
        return SpeechEntryParser.parse(spokenText, workCodes);
    }

    /**
     * Calls the Gemini REST API.
     */
    private static String callGeminiApi(String apiKey, String prompt) throws Exception {
        JSONObject textPart = new JSONObject().put("text", prompt);
        JSONArray parts = new JSONArray().put(textPart);
        JSONObject content = new JSONObject().put("parts", parts);
        JSONArray contents = new JSONArray().put(content);
        JSONObject body = new JSONObject().put("contents", contents);

        Request request = new Request.Builder()
                .url(API_URL + "?key=" + apiKey)
                .post(RequestBody.create(body.toString(), JSON_TYPE))
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "no body";
                Log.w(TAG, "API error " + response.code() + ": " + errorBody);
                throw new Exception("Gemini API error: " + response.code());
            }

            String responseBody = response.body() != null ? response.body().string() : null;
            if (responseBody == null) throw new Exception("Empty response");

            // Extract text from Gemini response
            JSONObject json = new JSONObject(responseBody);
            JSONArray candidates = json.optJSONArray("candidates");
            if (candidates != null && candidates.length() > 0) {
                JSONObject candidate = candidates.getJSONObject(0);
                JSONObject contentObj = candidate.optJSONObject("content");
                if (contentObj != null) {
                    JSONArray partsArr = contentObj.optJSONArray("parts");
                    if (partsArr != null && partsArr.length() > 0) {
                        return partsArr.getJSONObject(0).optString("text", null);
                    }
                }
            }

            return null;
        }
    }

    /**
     * Builds the structured prompt for Gemini.
     */
    private static String buildPrompt(String spokenText, List<SpeechEntryParser.WorkCode> workCodes) {
        StringBuilder sb = new StringBuilder();
        sb.append("Extrahiere aus diesem deutschen Zeiteintrag die Felder als JSON.\n");
        sb.append("Gib NUR valides JSON zurück, keine Erklärung, kein Markdown.\n\n");

        if (workCodes != null && !workCodes.isEmpty()) {
            sb.append("Verfügbare Arbeitscodes:\n");
            for (SpeechEntryParser.WorkCode code : workCodes) {
                sb.append(code.id).append(" - ").append(code.label).append("\n");
            }
            sb.append("\n");
        }

        sb.append("Text: \"").append(spokenText).append("\"\n\n");
        sb.append("Antwort als JSON:\n");
        sb.append("{\"type\":\"work\",\"start\":\"HH:MM\",\"end\":\"HH:MM\",");
        sb.append("\"pause\":MINUTEN,\"project\":\"NAME\",\"codeId\":NUMMER}\n\n");
        sb.append("Regeln:\n");
        sb.append("- type: \"work\", \"vacation\" (Urlaub), \"sick\" (Krank), \"time_comp\" (ZA)\n");
        sb.append("- start/end: HH:MM 24h-Format. null wenn nicht genannt.\n");
        sb.append("- pause: Minuten. 0 wenn \"keine/ohne Pause\" oder nicht genannt.\n");
        sb.append("- codeId: Nummer aus obiger Liste. null wenn nicht erkannt.\n");
        sb.append("- project: Projektname. null wenn nicht genannt.\n");

        return sb.toString();
    }

    /**
     * Parses Gemini's JSON response into a ParsedEntry.
     */
    static SpeechEntryParser.ParsedEntry parseJsonResponse(
            String jsonText,
            String originalText,
            List<SpeechEntryParser.WorkCode> workCodes
    ) {
        SpeechEntryParser.ParsedEntry entry = new SpeechEntryParser.ParsedEntry();
        entry.date = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                .format(new java.util.Date());

        try {
            String cleaned = jsonText.trim();
            // Strip markdown code fences
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
            }
            // Find JSON object
            int start = cleaned.indexOf('{');
            int end = cleaned.lastIndexOf('}');
            if (start >= 0 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }

            JSONObject json = new JSONObject(cleaned);

            entry.type = json.optString("type", "work");
            entry.start = json.isNull("start") ? null : json.optString("start", null);
            entry.end = json.isNull("end") ? null : json.optString("end", null);
            entry.pause = json.optInt("pause", 0);
            entry.project = json.isNull("project") ? null : json.optString("project", null);

            if (!json.isNull("codeId")) {
                entry.codeId = json.optInt("codeId", -1);
                if (entry.codeId > 0 && workCodes != null) {
                    for (SpeechEntryParser.WorkCode c : workCodes) {
                        if (c.id == entry.codeId) {
                            entry.codeLabel = c.label;
                            break;
                        }
                    }
                }
            }

            return entry;
        } catch (Exception e) {
            Log.w(TAG, "JSON parse failed: " + jsonText, e);
            return SpeechEntryParser.parse(originalText, workCodes);
        }
    }
}
