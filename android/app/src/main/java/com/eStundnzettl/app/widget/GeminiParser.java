package com.estundnzettl.app.widget;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

import java.util.List;

/**
 * Parses spoken German time entries using Gemini Nano on-device AI.
 *
 * Uses ML Kit GenAI Prompt API via reflection to avoid compile-time
 * dependency issues. Falls back to SpeechEntryParser if Gemini Nano
 * is not available or fails.
 *
 * Requirements:
 * - Android 12+ (API 31+) for ML Kit GenAI
 * - Device with Gemini Nano support (Pixel 8+, Samsung S24+, etc.)
 * - No internet or API key needed (fully on-device)
 */
public class GeminiParser {

    private static final String TAG = "GeminiParser";

    /**
     * Checks if Gemini Nano is likely available on this device.
     * A full check happens at parse time; this is a quick pre-filter.
     */
    public static boolean isAvailable(Context context) {
        if (Build.VERSION.SDK_INT < 31) {
            return false;
        }
        try {
            Class.forName("com.google.mlkit.genai.prompt.PromptApi");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    /**
     * Parses spoken text using Gemini Nano on-device.
     * Falls back to SpeechEntryParser on any failure.
     *
     * IMPORTANT: Call this from a background thread — it blocks.
     */
    public static SpeechEntryParser.ParsedEntry parse(
            Context context,
            String spokenText,
            List<SpeechEntryParser.WorkCode> workCodes
    ) {
        if (Build.VERSION.SDK_INT < 31) {
            return SpeechEntryParser.parse(spokenText, workCodes);
        }

        try {
            String prompt = buildPrompt(spokenText, workCodes);
            String response = callGeminiNano(prompt);

            if (response != null && !response.isEmpty()) {
                Log.d(TAG, "Gemini response: " + response);
                return parseJsonResponse(response, spokenText, workCodes);
            }
        } catch (Exception e) {
            Log.w(TAG, "Gemini parsing failed", e);
        }

        Log.i(TAG, "Falling back to local parser");
        return SpeechEntryParser.parse(spokenText, workCodes);
    }

    /**
     * Calls Gemini Nano via ML Kit GenAI using pure reflection.
     * No compile-time dependency on ML Kit classes.
     */
    private static String callGeminiNano(String prompt) throws Exception {
        // All ML Kit GenAI access via reflection for maximum compatibility
        // This avoids build failures on CI or devices without ML Kit

        // 1. Get PromptApi client: PromptApi.getClient(new PromptApiOptions.Builder().build())
        //    Note: the actual API might differ — we try multiple known patterns
        Class<?> promptApiClass = Class.forName("com.google.mlkit.genai.prompt.PromptApi");

        Object client;
        try {
            // Try: PromptApi.getClient()
            java.lang.reflect.Method getClient = promptApiClass.getMethod("getClient");
            client = getClient.invoke(null);
        } catch (NoSuchMethodException e) {
            // Try: PromptApi.getClient(context) or similar overloads
            Log.w(TAG, "PromptApi.getClient() not found, API may have changed");
            throw e;
        }

        // 2. Create request
        Class<?> requestBuilderClass = Class.forName("com.google.mlkit.genai.prompt.PromptRequest$Builder");
        Object builder = requestBuilderClass.getConstructor().newInstance();

        java.lang.reflect.Method setPrompt = requestBuilderClass.getMethod("setPrompt", String.class);
        setPrompt.invoke(builder, prompt);

        java.lang.reflect.Method build = requestBuilderClass.getMethod("build");
        Object request = build.invoke(builder);

        // 3. Call generateContent — returns a Task
        Class<?> requestClass = Class.forName("com.google.mlkit.genai.prompt.PromptRequest");
        java.lang.reflect.Method generateContent = client.getClass().getMethod("generateContent", requestClass);
        Object task = generateContent.invoke(client, request);

        // 4. Block and wait for the Task result using Tasks.await()
        //    com.google.android.gms.tasks.Tasks.await(task, timeout, unit)
        Class<?> tasksClass = Class.forName("com.google.android.gms.tasks.Tasks");
        java.lang.reflect.Method awaitMethod = tasksClass.getMethod("await",
                Class.forName("com.google.android.gms.tasks.Task"),
                long.class,
                java.util.concurrent.TimeUnit.class);

        Object result = awaitMethod.invoke(null, task, 15L, java.util.concurrent.TimeUnit.SECONDS);

        // 5. Extract text from result
        if (result != null) {
            java.lang.reflect.Method getText = result.getClass().getMethod("getText");
            return (String) getText.invoke(result);
        }

        return null;
    }

    /**
     * Builds the prompt for Gemini Nano.
     */
    private static String buildPrompt(String spokenText, List<SpeechEntryParser.WorkCode> workCodes) {
        StringBuilder sb = new StringBuilder();
        sb.append("Extrahiere aus diesem deutschen Zeiteintrag die Felder als JSON.\n");
        sb.append("Gib NUR valides JSON zurück, keine Erklärung.\n\n");

        if (workCodes != null && !workCodes.isEmpty()) {
            sb.append("Verfügbare Arbeitscodes:\n");
            for (SpeechEntryParser.WorkCode code : workCodes) {
                sb.append(code.id).append(" - ").append(code.label).append("\n");
            }
            sb.append("\n");
        }

        sb.append("Text: \"").append(spokenText).append("\"\n\n");
        sb.append("Format: {\"type\":\"work\",\"start\":\"HH:MM\",\"end\":\"HH:MM\",");
        sb.append("\"pause\":MINUTEN,\"project\":\"NAME\",\"codeId\":NUMMER}\n\n");
        sb.append("Regeln:\n");
        sb.append("- type: \"work\", \"vacation\" (Urlaub), \"sick\" (Krank), \"time_comp\" (ZA/Zeitausgleich)\n");
        sb.append("- start/end: HH:MM (24h). null wenn nicht genannt.\n");
        sb.append("- pause: Minuten. 0 wenn \"keine/ohne Pause\" oder nicht genannt.\n");
        sb.append("- codeId: Nummer aus der Liste. null wenn nicht erkannt.\n");
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
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
            }
            // Find first { and last } to extract JSON from possible surrounding text
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
