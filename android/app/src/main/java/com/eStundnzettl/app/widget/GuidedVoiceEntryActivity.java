package com.estundnzettl.app.widget;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Guided voice entry wizard that asks step-by-step questions.
 *
 * Flow:
 *   Step 1: "Wie ist die Startzeit?"        → "6 Uhr"      → 06:00
 *   Step 2: "Wie ist die Endzeit?"           → "16 Uhr 30"  → 16:30
 *   Step 3: "Wie viele Minuten Pause?"       → "30"          → 30
 *   Step 4: "Welcher Arbeitscode?"           → "Umbau"       → 12
 *   Step 5: "Welches Projekt?"               → "Dion 4.3"    → Dion 4.3
 *   → Confirmation → Save
 *
 * Each step: TTS speaks the question → visual display → listen → parse → show result
 * Optional steps (Code, Projekt) can be skipped.
 */
public class GuidedVoiceEntryActivity extends Activity {

    private static final String TAG = "GuidedVoice";
    private static final int REQUEST_SPEECH = 100;
    private static final int REQUEST_PERMISSION = 101;

    // ── UI Elements ──
    private TextView stepIndicator;
    private TextView questionText;
    private TextView listeningIndicator;
    private TextView answerText;
    private LinearLayout summaryContainer;
    private Button skipButton;
    private Button cancelButton;
    private LinearLayout mainContainer;

    // ── State ──
    private int currentStep = 0;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private final Handler handler = new Handler(Looper.getMainLooper());

    // ── Collected answers ──
    private String startTime = null;
    private String endTime = null;
    private int pauseMinutes = 0;
    private int codeId = -1;
    private String codeLabel = null;
    private String project = null;
    private List<SpeechEntryParser.WorkCode> workCodes;

    // ── Step definitions ──
    private static final String[][] STEPS = {
        // {question_tts, question_display, hint, required}
        {"Wie ist die Startzeit?", "Startzeit?", "z.B. \"6 Uhr\" oder \"7 Uhr 30\"", "true"},
        {"Und die Endzeit?", "Endzeit?", "z.B. \"16 Uhr 30\" oder \"15:00\"", "true"},
        {"Wie viele Minuten Pause?", "Pause?", "z.B. \"30\" oder \"keine\"", "true"},
        {"Welcher Arbeitscode?", "Arbeitscode?", "z.B. \"Umbau\" oder \"Montage\"", "false"},
        {"Welches Projekt?", "Projekt?", "z.B. \"Dion 4.3\"", "false"},
    };

    // ── Colors ──
    private static final int BG_COLOR = Color.parseColor("#09090B");       // zinc-950
    private static final int CARD_COLOR = Color.parseColor("#18181B");     // zinc-900
    private static final int TEXT_COLOR = Color.parseColor("#F4F4F5");     // zinc-100
    private static final int MUTED_COLOR = Color.parseColor("#71717A");   // zinc-500
    private static final int ACCENT_COLOR = Color.parseColor("#059669");  // emerald-600
    private static final int LISTENING_COLOR = Color.parseColor("#10B981"); // emerald-500
    private static final int ERROR_COLOR = Color.parseColor("#EF4444");   // red-500

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Load work codes
        WidgetDatabaseHelper dbHelper = new WidgetDatabaseHelper(this);
        workCodes = dbHelper.loadWorkCodes();

        // Initialize TTS
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int result = tts.setLanguage(Locale.GERMAN);
                ttsReady = (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) {}
                    @Override public void onDone(String utteranceId) {
                        // After TTS finishes speaking, start listening
                        handler.postDelayed(() -> startListening(), 300);
                    }
                    @Override public void onError(String utteranceId) {
                        handler.post(() -> startListening());
                    }
                });
            }
            // Start first step after TTS init
            handler.postDelayed(() -> {
                if (checkPermission()) showStep(0);
            }, 500);
        });

        buildUI();
    }

    private boolean checkPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_PERMISSION);
            return false;
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                showStep(0);
            } else {
                Toast.makeText(this, "Mikrofon-Berechtigung wird benötigt", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }

    // ─── Step Management ────────────────────────────────────

    private void showStep(int step) {
        currentStep = step;

        if (step >= STEPS.length) {
            showConfirmation();
            return;
        }

        String[] s = STEPS[step];
        boolean isRequired = "true".equals(s[3]);

        stepIndicator.setText("Schritt " + (step + 1) + " von " + STEPS.length);
        questionText.setText(s[1]);
        answerText.setText("");
        answerText.setVisibility(View.GONE);
        listeningIndicator.setVisibility(View.GONE);
        skipButton.setVisibility(isRequired ? View.GONE : View.VISIBLE);
        skipButton.setText("Überspringen →");

        updateSummary();

        // Speak the question, then listen
        if (ttsReady) {
            tts.speak(s[0], TextToSpeech.QUEUE_FLUSH, null, "step_" + step);
            listeningIndicator.setText("🔊 Frage wird gestellt...");
            listeningIndicator.setTextColor(MUTED_COLOR);
            listeningIndicator.setVisibility(View.VISIBLE);
        } else {
            // No TTS available — just start listening
            startListening();
        }
    }

    private void startListening() {
        listeningIndicator.setText("🎤 Ich höre zu...");
        listeningIndicator.setTextColor(LISTENING_COLOR);
        listeningIndicator.setVisibility(View.VISIBLE);

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.GERMAN.toLanguageTag());
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, STEPS[currentStep][2]);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

        try {
            startActivityForResult(intent, REQUEST_SPEECH);
        } catch (Exception e) {
            Log.e(TAG, "Speech not available", e);
            listeningIndicator.setText("❌ Spracherkennung nicht verfügbar");
            listeningIndicator.setTextColor(ERROR_COLOR);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_SPEECH) {
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (results != null && !results.isEmpty()) {
                    processAnswer(results.get(0));
                    return;
                }
            }
            // Cancelled or no result — show retry option
            listeningIndicator.setText("Nicht erkannt — tippe zum Wiederholen");
            listeningIndicator.setTextColor(ERROR_COLOR);
            listeningIndicator.setOnClickListener(v -> {
                listeningIndicator.setOnClickListener(null);
                startListening();
            });
        }
    }

    private void processAnswer(String spoken) {
        String parsed = null;
        boolean valid = true;

        switch (currentStep) {
            case 0: // Start time
                startTime = SpeechEntryParser.parseTimeExpression(spoken);
                if (startTime == null) startTime = extractTimeFromPhrase(spoken);
                parsed = startTime;
                valid = (startTime != null);
                break;

            case 1: // End time
                endTime = SpeechEntryParser.parseTimeExpression(spoken);
                if (endTime == null) endTime = extractTimeFromPhrase(spoken);
                parsed = endTime;
                valid = (endTime != null);
                break;

            case 2: // Pause
                pauseMinutes = parsePauseAnswer(spoken);
                parsed = pauseMinutes + " min";
                break;

            case 3: // Code
                resolveCode(spoken);
                parsed = codeLabel != null ? codeLabel : spoken;
                break;

            case 4: // Project
                project = spoken.trim();
                // Remove leading articles
                project = project.replaceAll("(?i)^(des|der|die|das|dem|den)\\s+", "");
                parsed = project;
                break;
        }

        if (!valid) {
            answerText.setText("\"" + spoken + "\" — nicht erkannt");
            answerText.setTextColor(ERROR_COLOR);
            answerText.setVisibility(View.VISIBLE);
            listeningIndicator.setText("Tippe zum Wiederholen");
            listeningIndicator.setTextColor(MUTED_COLOR);
            listeningIndicator.setOnClickListener(v -> {
                listeningIndicator.setOnClickListener(null);
                showStep(currentStep);
            });
            return;
        }

        // Show parsed answer
        answerText.setText("✅  " + parsed);
        answerText.setTextColor(ACCENT_COLOR);
        answerText.setVisibility(View.VISIBLE);
        listeningIndicator.setVisibility(View.GONE);

        // Brief pause then next step
        handler.postDelayed(() -> showStep(currentStep + 1), 1200);
    }

    private String extractTimeFromPhrase(String phrase) {
        // Try to find a time within a longer phrase
        // e.g. "Start um 6 Uhr" → "06:00"
        String cleaned = phrase.toLowerCase()
                .replaceAll("^(start|von|ab|um)\\s+", "")
                .replaceAll("\\s*uhr\\s*$", " uhr")
                .trim();
        String result = SpeechEntryParser.parseTimeExpression(cleaned);
        if (result != null) return result;

        // Try extracting just digits
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{1,2})[:.](\\d{2})").matcher(phrase);
        if (m.find()) return SpeechEntryParser.parseTimeExpression(m.group(0));

        m = java.util.regex.Pattern.compile("(\\d{1,2})\\s*uhr\\s*(\\d{0,2})").matcher(phrase.toLowerCase());
        if (m.find()) return SpeechEntryParser.parseTimeExpression(m.group(0));

        return null;
    }

    private int parsePauseAnswer(String spoken) {
        String t = spoken.toLowerCase().trim();

        // "keine" / "keine Pause" / "null" / "0"
        if (t.matches(".*(keine?|null|nein|ohne|nix|nichts).*")) return 0;

        // Extract number
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+)").matcher(t);
        if (m.find()) {
            int val = Integer.parseInt(m.group(1));
            // If someone says "1 Stunde" or "eine Stunde"
            if (t.contains("stunde")) return val * 60;
            // If they say "eine halbe Stunde"
            if (t.contains("halbe")) return 30;
            return val;
        }

        // Word numbers
        if (t.contains("halbe stunde")) return 30;
        if (t.contains("eine stunde") || t.contains("einer stunde")) return 60;

        // Try German number words
        int num = -1;
        for (String word : t.split("\\s+")) {
            int n = tryParseGermanNumber(word);
            if (n >= 0) { num = n; break; }
        }
        return num >= 0 ? num : 0;
    }

    private int tryParseGermanNumber(String word) {
        try { return Integer.parseInt(word); } catch (NumberFormatException ignored) {}
        // Common German number words for pause values
        switch (word.toLowerCase()) {
            case "null": case "keine": case "nein": return 0;
            case "fünf": case "fuenf": return 5;
            case "zehn": return 10;
            case "fünfzehn": case "fuenfzehn": return 15;
            case "zwanzig": return 20;
            case "fünfundzwanzig": return 25;
            case "dreißig": case "dreissig": return 30;
            case "fünfundvierzig": return 45;
            case "sechzig": return 60;
            default: return -1;
        }
    }

    private void resolveCode(String spoken) {
        String search = spoken.trim().toLowerCase()
                .replaceAll("^(code|arbeitscode)\\s+", "");

        if (workCodes == null || workCodes.isEmpty()) {
            codeId = -1;
            codeLabel = spoken;
            return;
        }

        // Try numeric
        try {
            int numId = Integer.parseInt(search);
            for (SpeechEntryParser.WorkCode c : workCodes) {
                if (c.id == numId) { codeId = c.id; codeLabel = c.label; return; }
            }
        } catch (NumberFormatException ignored) {}

        // Label contains
        for (SpeechEntryParser.WorkCode c : workCodes) {
            if (c.label.toLowerCase().contains(search)) {
                codeId = c.id; codeLabel = c.label; return;
            }
        }

        // Word match
        for (SpeechEntryParser.WorkCode c : workCodes) {
            for (String word : c.label.toLowerCase().split("[\\s,-]+")) {
                if (word.length() > 2 && (word.equals(search) || word.startsWith(search) || search.startsWith(word))) {
                    codeId = c.id; codeLabel = c.label; return;
                }
            }
        }

        codeId = -1;
        codeLabel = spoken;
    }

    // ─── Confirmation ───────────────────────────────────────

    private void showConfirmation() {
        // Build parsed entry
        SpeechEntryParser.ParsedEntry entry = new SpeechEntryParser.ParsedEntry();
        entry.type = "work";
        entry.date = new java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new java.util.Date());
        entry.start = startTime;
        entry.end = endTime;
        entry.pause = pauseMinutes;
        entry.project = project;
        entry.codeId = codeId;
        entry.codeLabel = codeLabel;

        // Pass to confirmation activity
        Intent confirmIntent = new Intent(this, VoiceEntryConfirmActivity.class);

        // Build a text summary for the confirm activity
        StringBuilder summary = new StringBuilder();
        if (startTime != null) summary.append(startTime);
        summary.append(" bis ");
        if (endTime != null) summary.append(endTime);
        if (pauseMinutes > 0) summary.append(", ").append(pauseMinutes).append(" min Pause");
        if (project != null) summary.append(", Projekt ").append(project);
        if (codeLabel != null) summary.append(", Code ").append(codeLabel);

        confirmIntent.putExtra(VoiceEntryConfirmActivity.EXTRA_SPOKEN_TEXT, summary.toString());
        confirmIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(confirmIntent);
        finish();
    }

    // ─── Skip Handler ───────────────────────────────────────

    private void skipCurrentStep() {
        switch (currentStep) {
            case 3: codeId = -1; codeLabel = null; break;
            case 4: project = null; break;
        }
        showStep(currentStep + 1);
    }

    // ─── Summary ────────────────────────────────────────────

    private void updateSummary() {
        summaryContainer.removeAllViews();

        if (startTime != null) addSummaryItem("Start", startTime);
        if (endTime != null) addSummaryItem("Ende", endTime);
        if (currentStep > 2) addSummaryItem("Pause", pauseMinutes + " min");
        if (codeLabel != null) addSummaryItem("Code", codeLabel);
        if (project != null) addSummaryItem("Projekt", project);
    }

    private void addSummaryItem(String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, dp(2), 0, dp(2));

        TextView lbl = new TextView(this);
        lbl.setText(label + ": ");
        lbl.setTextColor(MUTED_COLOR);
        lbl.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        row.addView(lbl);

        TextView val = new TextView(this);
        val.setText(value);
        val.setTextColor(TEXT_COLOR);
        val.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        val.setTypeface(null, Typeface.BOLD);
        row.addView(val);

        summaryContainer.addView(row);
    }

    // ─── Build UI ───────────────────────────────────────────

    private void buildUI() {
        int pad = dp(20);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG_COLOR);

        mainContainer = new LinearLayout(this);
        mainContainer.setOrientation(LinearLayout.VERTICAL);
        mainContainer.setPadding(pad, dp(60), pad, pad);

        // Step indicator
        stepIndicator = new TextView(this);
        stepIndicator.setTextColor(MUTED_COLOR);
        stepIndicator.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        stepIndicator.setPadding(0, 0, 0, dp(8));
        mainContainer.addView(stepIndicator);

        // Question
        questionText = new TextView(this);
        questionText.setTextColor(TEXT_COLOR);
        questionText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 32);
        questionText.setTypeface(null, Typeface.BOLD);
        questionText.setPadding(0, 0, 0, dp(16));
        mainContainer.addView(questionText);

        // Listening indicator
        listeningIndicator = new TextView(this);
        listeningIndicator.setTextColor(LISTENING_COLOR);
        listeningIndicator.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        listeningIndicator.setPadding(0, 0, 0, dp(12));
        listeningIndicator.setVisibility(View.GONE);
        mainContainer.addView(listeningIndicator);

        // Answer display
        answerText = new TextView(this);
        answerText.setTextColor(ACCENT_COLOR);
        answerText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        answerText.setTypeface(null, Typeface.BOLD);
        answerText.setPadding(0, 0, 0, dp(24));
        answerText.setVisibility(View.GONE);
        mainContainer.addView(answerText);

        // Summary of collected answers
        summaryContainer = new LinearLayout(this);
        summaryContainer.setOrientation(LinearLayout.VERTICAL);
        summaryContainer.setBackgroundColor(CARD_COLOR);
        summaryContainer.setPadding(dp(12), dp(12), dp(12), dp(12));
        mainContainer.addView(summaryContainer);

        // Button row
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setPadding(0, dp(20), 0, 0);
        btnRow.setGravity(Gravity.CENTER_HORIZONTAL);

        cancelButton = new Button(this);
        cancelButton.setText("Abbrechen");
        cancelButton.setTextColor(MUTED_COLOR);
        cancelButton.setBackgroundColor(Color.TRANSPARENT);
        cancelButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        cancelButton.setOnClickListener(v -> finish());
        btnRow.addView(cancelButton);

        skipButton = new Button(this);
        skipButton.setText("Überspringen →");
        skipButton.setTextColor(ACCENT_COLOR);
        skipButton.setBackgroundColor(Color.TRANSPARENT);
        skipButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        skipButton.setTypeface(null, Typeface.BOLD);
        skipButton.setVisibility(View.GONE);
        skipButton.setOnClickListener(v -> skipCurrentStep());
        btnRow.addView(skipButton);

        mainContainer.addView(btnRow);

        scroll.addView(mainContainer);
        setContentView(scroll);
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    // ─── Lifecycle ──────────────────────────────────────────

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }
}
