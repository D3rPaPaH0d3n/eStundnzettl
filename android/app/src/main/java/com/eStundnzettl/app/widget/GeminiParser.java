package com.estundnzettl.app.widget;

import android.content.Context;
import android.util.Log;

import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.common.GenAiException;
import com.google.mlkit.genai.prompt.Candidate;
import com.google.mlkit.genai.prompt.GenerateContentRequest;
import com.google.mlkit.genai.prompt.GenerateContentResponse;
import com.google.mlkit.genai.prompt.Generation;
import com.google.mlkit.genai.prompt.GenerativeModel;
import com.google.mlkit.genai.prompt.TextPart;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;

import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Parses spoken German time entries using Gemini Nano on-device AI.
 *
 * Uses ML Kit GenAI Prompt API — runs entirely on-device.
 * No API key, no internet, no cloud needed.
 *
 * Requires: Android 8.0+ (API 26+), device with Gemini Nano support.
 * Falls back to SpeechEntryParser on unsupported devices.
 */
public class GeminiParser {

    private static final String TAG = "GeminiParser";

    private static GenerativeModelFutures sFutures = null;

    /**
     * Checks if Gemini Nano is available on this device.
     * Must be called from a background thread (blocks for status check).
     */
    public static boolean isAvailable(Context context) {
        try {
            GenerativeModelFutures futures = getFutures();
            int status = futures.checkStatus().get(5, TimeUnit.SECONDS);
            Log.d(TAG, "Gemini Nano status: " + status);
            return status == FeatureStatus.AVAILABLE || status == FeatureStatus.DOWNLOADABLE;
        } catch (Exception e) {
            Log.d(TAG, "Gemini Nano not available: " + e.getMessage());
            return false;
        }
    }

    /**
     * Quick check (no blocking) — just tries to load the class.
     */
    public static boolean isSupported() {
        try {
            Class.forName("com.google.mlkit.genai.prompt.Generation");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    private static GenerativeModelFutures getFutures() {
        if (sFutures == null) {
            GenerativeModel model = Generation.INSTANCE.getClient();
            sFutures = GenerativeModelFutures.from(model);
        }
        return sFutures;
    }

    /**
     * Ensures the Gemini Nano model is downloaded and ready.
     * Call this before parse() to avoid delays.
     */
    public static void ensureModelReady(Callback callback) {
        try {
            GenerativeModelFutures futures = getFutures();
            int status = futures.checkStatus().get(5, TimeUnit.SECONDS);

            if (status == FeatureStatus.AVAILABLE) {
                callback.onReady();
                return;
            }

            if (status == FeatureStatus.DOWNLOADABLE || status == FeatureStatus.DOWNLOADING) {
                Log.i(TAG, "Downloading Gemini Nano model...");
                futures.download(new DownloadCallback() {
                    @Override
                    public void onDownloadCompleted() {
                        Log.i(TAG, "Model download complete");
                        callback.onReady();
                    }

                    @Override
                    public void onDownloadFailed(GenAiException e) {
                        Log.w(TAG, "Model download failed", e);
                        callback.onError("Modell-Download fehlgeschlagen: " + e.getMessage());
                    }

                    @Override
                    public void onDownloadStarted(long bytesToDownload) {
                        Log.i(TAG, "Downloading " + (bytesToDownload / 1024 / 1024) + " MB");
                    }

                    @Override
                    public void onDownloadProgress(long totalBytesDownloaded) {
                        Log.d(TAG, "Downloaded " + (totalBytesDownloaded / 1024 / 1024) + " MB");
                    }
                });
                return;
            }

            callback.onError("Gemini Nano nicht verfügbar auf diesem Gerät");
        } catch (Exception e) {
            callback.onError("Fehler: " + e.getMessage());
        }
    }

    public interface Callback {
        void onReady();
        void onError(String message);
    }

    /**
     * Parses spoken text using Gemini Nano on-device.
     * Falls back to SpeechEntryParser on any failure.
     *
     * IMPORTANT: Call from a background thread — blocks.
     */
    public static SpeechEntryParser.ParsedEntry parse(
            Context context,
            String spokenText,
            List<SpeechEntryParser.WorkCode> workCodes
    ) {
        try {
            String prompt = buildPrompt(spokenText, workCodes);
            Log.d(TAG, "Sending prompt (" + prompt.length() + " chars)");

            GenerativeModelFutures futures = getFutures();

            GenerateContentRequest request = new GenerateContentRequest.Builder(
                    new TextPart(prompt)
            ).build();

            GenerateContentResponse response = futures.generateContent(request)
                    .get(15, TimeUnit.SECONDS);

            List<Candidate> candidates = response.getCandidates();
            if (candidates != null && !candidates.isEmpty()) {
                String text = candidates.get(0).getText();
                Log.d(TAG, "Gemini response: " + text);

                if (text != null && !text.isEmpty()) {
                    return parseJsonResponse(text, spokenText, workCodes);
                }
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
        sb.append("- start/end: HH:MM 24h. null wenn nicht genannt.\n");
        sb.append("- pause: Minuten. 0 wenn nicht oder \"keine Pause\" genannt.\n");
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
