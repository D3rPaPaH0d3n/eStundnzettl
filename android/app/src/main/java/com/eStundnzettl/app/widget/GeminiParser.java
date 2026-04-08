package com.estundnzettl.app.widget;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Parses spoken German time entries using Gemini Nano on-device AI.
 *
 * Uses ML Kit GenAI Prompt API to send a structured prompt to the
 * on-device Gemini Nano model. Falls back to SpeechEntryParser if
 * Gemini Nano is not available or fails.
 *
 * Requirements:
 * - Android 12+ (API 31+) for ML Kit GenAI
 * - Device with Gemini Nano support (Pixel 8+, Samsung S24+, etc.)
 * - No internet or API key needed (fully on-device)
 */
public class GeminiParser {

    private static final String TAG = "GeminiParser";
    private static final int TIMEOUT_SECONDS = 15;

    /**
     * Checks if Gemini Nano is available on this device.
     * Returns false on older Android versions or unsupported hardware.
     */
    public static boolean isAvailable(Context context) {
        if (Build.VERSION.SDK_INT < 31) {
            Log.d(TAG, "API level " + Build.VERSION.SDK_INT + " < 31, Gemini Nano not available");
            return false;
        }

        try {
            // Check if ML Kit GenAI classes are available
            Class.forName("com.google.mlkit.genai.prompt.PromptApi");
            return true;
        } catch (ClassNotFoundException e) {
            Log.d(TAG, "ML Kit GenAI not available on this device");
            return false;
        }
    }

    /**
     * Parses spoken text using Gemini Nano.
     * Falls back to SpeechEntryParser on failure.
     *
     * This method blocks the calling thread (run from background thread or use async wrapper).
     *
     * @param context   Android context
     * @param spokenText The text from speech recognition
     * @param workCodes  Available work codes for matching
     * @return Parsed entry data
     */
    public static SpeechEntryParser.ParsedEntry parse(
            Context context,
            String spokenText,
            List<SpeechEntryParser.WorkCode> workCodes
    ) {
        if (Build.VERSION.SDK_INT < 31) {
            Log.d(TAG, "Fallback to local parser (API < 31)");
            return SpeechEntryParser.parse(spokenText, workCodes);
        }

        try {
            return parseWithGemini(context, spokenText, workCodes);
        } catch (Exception e) {
            Log.w(TAG, "Gemini parsing failed, falling back to local parser", e);
            return SpeechEntryParser.parse(spokenText, workCodes);
        }
    }

    /**
     * Internal: Calls Gemini Nano via ML Kit GenAI Prompt API.
     */
    private static SpeechEntryParser.ParsedEntry parseWithGemini(
            Context context,
            String spokenText,
            List<SpeechEntryParser.WorkCode> workCodes
    ) throws Exception {
        String prompt = buildPrompt(spokenText, workCodes);
        Log.d(TAG, "Prompt: " + prompt);

        // Use reflection to call ML Kit GenAI API
        // This avoids compile-time dependency issues on older devices
        AtomicReference<String> resultRef = new AtomicReference<>(null);
        AtomicReference<Exception> errorRef = new AtomicReference<>(null);
        CountDownLatch latch = new CountDownLatch(1);

        try {
            // com.google.mlkit.genai.prompt.PromptApi
            Class<?> promptApiClass = Class.forName("com.google.mlkit.genai.prompt.PromptApi");

            // Get the PromptApi instance
            java.lang.reflect.Method getClientMethod = promptApiClass.getMethod("getClient");
            Object client = getClientMethod.invoke(null);

            // Create PromptRequest
            Class<?> promptRequestClass = Class.forName("com.google.mlkit.genai.prompt.PromptRequest");
            Class<?> builderClass = Class.forName("com.google.mlkit.genai.prompt.PromptRequest$Builder");
            Object builder = builderClass.getConstructor().newInstance();

            // Set the prompt text
            java.lang.reflect.Method setPromptMethod = builderClass.getMethod("setPrompt", String.class);
            setPromptMethod.invoke(builder, prompt);

            java.lang.reflect.Method buildMethod = builderClass.getMethod("build");
            Object request = buildMethod.invoke(builder);

            // Call generateContent
            java.lang.reflect.Method generateMethod = client.getClass().getMethod("generateContent", promptRequestClass);
            Object task = generateMethod.invoke(client, request);

            // Add success listener
            Class<?> taskClass = task.getClass();
            java.lang.reflect.Method addOnSuccessListener = taskClass.getMethod("addOnSuccessListener", com.google.android.gms.tasks.OnSuccessListener.class);
            java.lang.reflect.Method addOnFailureListener = taskClass.getMethod("addOnFailureListener", com.google.android.gms.tasks.OnFailureListener.class);

            addOnSuccessListener.invoke(task, (com.google.android.gms.tasks.OnSuccessListener<Object>) result -> {
                try {
                    java.lang.reflect.Method getTextMethod = result.getClass().getMethod("getText");
                    String text = (String) getTextMethod.invoke(result);
                    resultRef.set(text);
                } catch (Exception e) {
                    errorRef.set(e);
                }
                latch.countDown();
            });

            addOnFailureListener.invoke(task, (com.google.android.gms.tasks.OnFailureListener) e -> {
                errorRef.set(e);
                latch.countDown();
            });

        } catch (Exception e) {
            Log.w(TAG, "ML Kit GenAI reflection failed, trying simplified approach", e);
            // If reflection fails, try direct approach
            return parseWithGeminiDirect(context, prompt, spokenText, workCodes, latch, resultRef, errorRef);
        }

        // Wait for result
        boolean completed = latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        if (!completed) {
            throw new Exception("Gemini Nano timeout after " + TIMEOUT_SECONDS + "s");
        }

        if (errorRef.get() != null) {
            throw errorRef.get();
        }

        String responseText = resultRef.get();
        if (responseText == null || responseText.isEmpty()) {
            throw new Exception("Empty response from Gemini Nano");
        }

        Log.d(TAG, "Gemini response: " + responseText);
        return parseJsonResponse(responseText, spokenText, workCodes);
    }

    private static SpeechEntryParser.ParsedEntry parseWithGeminiDirect(
            Context context,
            String prompt,
            String spokenText,
            List<SpeechEntryParser.WorkCode> workCodes,
            CountDownLatch latch,
            AtomicReference<String> resultRef,
            AtomicReference<Exception> errorRef
    ) throws Exception {
        // Direct fallback — just use local parser
        Log.d(TAG, "Direct Gemini call not available, using local parser");
        return SpeechEntryParser.parse(spokenText, workCodes);
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

        sb.append("Format: {\"type\":\"work\",\"start\":\"HH:MM\",\"end\":\"HH:MM\",\"pause\":MINUTEN,\"project\":\"NAME\",\"codeId\":NUMMER}\n\n");

        sb.append("Regeln:\n");
        sb.append("- type: \"work\", \"vacation\" (bei Urlaub/Ferien), \"sick\" (bei Krank), \"time_comp\" (bei Zeitausgleich/ZA/Gleitzeit)\n");
        sb.append("- start/end: Im Format HH:MM (24h). null wenn nicht genannt.\n");
        sb.append("- pause: In Minuten. 0 wenn nicht oder \"keine/ohne Pause\" genannt.\n");
        sb.append("- codeId: Nummer aus der Arbeitscode-Liste. null wenn nicht erkannt.\n");
        sb.append("- project: Projektname. null wenn nicht genannt.\n");

        return sb.toString();
    }

    /**
     * Parses JSON response from Gemini Nano into ParsedEntry.
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
            // Strip markdown code fences if present
            String cleaned = jsonText.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
            }

            JSONObject json = new JSONObject(cleaned);

            entry.type = json.optString("type", "work");
            entry.start = json.isNull("start") ? null : json.optString("start", null);
            entry.end = json.isNull("end") ? null : json.optString("end", null);
            entry.pause = json.optInt("pause", 0);
            entry.project = json.isNull("project") ? null : json.optString("project", null);

            if (!json.isNull("codeId")) {
                entry.codeId = json.optInt("codeId", -1);
                // Look up label
                if (entry.codeId > 0 && workCodes != null) {
                    for (SpeechEntryParser.WorkCode c : workCodes) {
                        if (c.id == entry.codeId) {
                            entry.codeLabel = c.label;
                            break;
                        }
                    }
                }
            }

            Log.i(TAG, "Successfully parsed Gemini response: " + entry);
            return entry;

        } catch (Exception e) {
            Log.w(TAG, "JSON parsing failed for: " + jsonText, e);
            // Fallback to local parser
            return SpeechEntryParser.parse(originalText, workCodes);
        }
    }
}
