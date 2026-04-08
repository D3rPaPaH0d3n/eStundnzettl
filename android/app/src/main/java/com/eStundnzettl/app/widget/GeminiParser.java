package com.estundnzettl.app.widget;

import android.content.Context;
import android.util.Log;

import com.google.mlkit.genai.prompt.PromptApi;
import com.google.mlkit.genai.prompt.PromptApiClient;
import com.google.mlkit.genai.prompt.PromptRequest;
import com.google.mlkit.genai.prompt.PromptResponse;
import com.google.android.gms.tasks.Tasks;

import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Parses spoken German time entries using Gemini Nano on-device AI.
 *
 * Uses ML Kit GenAI Prompt API to send a structured prompt to the
 * on-device Gemini Nano model. Falls back to SpeechEntryParser on failure.
 *
 * Requirements:
 * - Android 8.0+ (API 26+)
 * - Device with Gemini Nano support (Pixel 8+, Samsung S24+, etc.)
 * - No internet or API key needed (fully on-device)
 */
public class GeminiParser {

    private static final String TAG = "GeminiParser";
    private static final int TIMEOUT_SECONDS = 15;

    /**
     * Checks if Gemini Nano is likely available.
     */
    public static boolean isAvailable(Context context) {
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
     * IMPORTANT: Call from a background thread — this blocks.
     */
    public static SpeechEntryParser.ParsedEntry parse(
            Context context,
            String spokenText,
            List<SpeechEntryParser.WorkCode> workCodes
    ) {
        try {
            String prompt = buildPrompt(spokenText, workCodes);
            Log.d(TAG, "Sending prompt to Gemini Nano (" + prompt.length() + " chars)");

            PromptApiClient client = PromptApi.getClient();
            PromptRequest request = new PromptRequest.Builder()
                    .setPrompt(prompt)
                    .build();

            // Block until result (call from background thread!)
            PromptResponse response = Tasks.await(
                    client.generateContent(request),
                    TIMEOUT_SECONDS,
                    TimeUnit.SECONDS
            );

            String responseText = response.getText();
            Log.d(TAG, "Gemini response: " + responseText);

            if (responseText != null && !responseText.isEmpty()) {
                return parseJsonResponse(responseText, spokenText, workCodes);
            }
        } catch (Exception e) {
            Log.w(TAG, "Gemini parsing failed: " + e.getMessage());
        }

        Log.i(TAG, "Falling back to local parser");
        return SpeechEntryParser.parse(spokenText, workCodes);
    }

    /**
     * Builds the structured prompt for Gemini Nano.
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
        sb.append("Antwort als JSON:\n");
        sb.append("{\"type\":\"work\",\"start\":\"HH:MM\",\"end\":\"HH:MM\",");
        sb.append("\"pause\":MINUTEN,\"project\":\"NAME\",\"codeId\":NUMMER}\n\n");
        sb.append("Regeln:\n");
        sb.append("- type: \"work\", \"vacation\" (Urlaub), \"sick\" (Krank), \"time_comp\" (ZA/Zeitausgleich)\n");
        sb.append("- start/end: HH:MM (24h). null wenn nicht genannt.\n");
        sb.append("- pause: Minuten. 0 wenn \"keine/ohne Pause\" oder nicht genannt.\n");
        sb.append("- codeId: Nummer aus der Arbeitscode-Liste. null wenn nicht erkannt.\n");
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
            // Strip markdown code fences and find JSON
            String cleaned = jsonText.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
            }
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
