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
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Freitext voice entry with Gemini Nano AI parsing.
 *
 * Flow:
 *   1. User speaks one natural sentence
 *   2. Text is shown on screen
 *   3. Gemini Nano parses the text into structured fields
 *   4. Confirmation dialog for review/edit
 *   5. Save to database
 *
 * Falls back to local SpeechEntryParser if Gemini is unavailable.
 */
public class GeminiVoiceEntryActivity extends Activity {

    private static final String TAG = "GeminiVoice";
    private static final int REQUEST_SPEECH = 100;
    private static final int REQUEST_PERMISSION = 101;

    private TextView titleText;
    private TextView recognizedText;
    private TextView statusText;
    private ProgressBar spinner;
    private Button retryButton;
    private Button cancelButton;

    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUI();

        // Check for API key first
        if (!GeminiParser.isAvailable(this)) {
            showApiKeyDialog();
            return;
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_PERMISSION);
        } else {
            startSpeechRecognition();
        }
    }

    private void showApiKeyDialog() {
        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);
        builder.setTitle("Gemini API Key");
        builder.setMessage("Für die KI-Spracheingabe wird ein kostenloser Gemini API Key benötigt.\n\nKey holen: aistudio.google.com/apikey");

        final android.widget.EditText input = new android.widget.EditText(this);
        input.setHint("API Key einfügen...");
        input.setSingleLine(true);
        builder.setView(input);

        builder.setPositiveButton("Speichern", (dialog, which) -> {
            String key = input.getText().toString().trim();
            if (!key.isEmpty()) {
                GeminiParser.setApiKey(this, key);
                // Now start speech recognition
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this,
                            new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_PERMISSION);
                } else {
                    startSpeechRecognition();
                }
            } else {
                Toast.makeText(this, "Kein Key eingegeben", Toast.LENGTH_SHORT).show();
                finish();
            }
        });

        builder.setNegativeButton("Abbrechen", (dialog, which) -> finish());
        builder.setOnCancelListener(d -> finish());
        builder.show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startSpeechRecognition();
            } else {
                Toast.makeText(this, "Mikrofon-Berechtigung wird benötigt", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }

    private void startSpeechRecognition() {
        titleText.setText("🎤 Sprich deinen Zeiteintrag");
        statusText.setText("z.B. \"6 Uhr bis 16 Uhr 30, 30 Minuten Pause, Projekt Dion, Code Umbau\"");
        statusText.setVisibility(View.VISIBLE);
        recognizedText.setVisibility(View.GONE);
        spinner.setVisibility(View.GONE);
        retryButton.setVisibility(View.GONE);

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.GERMAN.toLanguageTag());
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT,
                "Zeiteintrag sprechen...\nz.B. \"6 Uhr bis 16 Uhr 30, Pause 30 Minuten, Projekt Test, Code Umbau\"");
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

        try {
            startActivityForResult(intent, REQUEST_SPEECH);
        } catch (Exception e) {
            Log.e(TAG, "Speech recognition not available", e);
            Toast.makeText(this, "Spracherkennung nicht verfügbar", Toast.LENGTH_LONG).show();
            finish();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_SPEECH) {
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (results != null && !results.isEmpty()) {
                    processWithGemini(results.get(0));
                    return;
                }
            }
            // Cancelled or no result
            showRetry("Keine Sprache erkannt");
        }
    }

    private void processWithGemini(String spokenText) {
        // Show recognized text
        titleText.setText("Du hast gesagt:");
        recognizedText.setText("\"" + spokenText + "\"");
        recognizedText.setVisibility(View.VISIBLE);
        statusText.setText("🤖 Gemini analysiert...");
        statusText.setVisibility(View.VISIBLE);
        spinner.setVisibility(View.VISIBLE);
        retryButton.setVisibility(View.GONE);

        // Load work codes
        WidgetDatabaseHelper dbHelper = new WidgetDatabaseHelper(this);
        if (!dbHelper.isDatabaseReady()) {
            showRetry("Datenbank nicht verfügbar — bitte App zuerst öffnen");
            return;
        }
        List<SpeechEntryParser.WorkCode> workCodes = dbHelper.loadWorkCodes();

        // Run Gemini parsing in background thread
        new Thread(() -> {
            SpeechEntryParser.ParsedEntry entry;

            if (GeminiParser.isAvailable(this)) {
                entry = GeminiParser.parse(this, spokenText, workCodes);
                Log.i(TAG, "Gemini parsed: " + entry);
            } else {
                // Fallback to local parser
                Log.i(TAG, "Gemini not available, using local parser");
                entry = SpeechEntryParser.parse(spokenText, workCodes);
            }

            final SpeechEntryParser.ParsedEntry finalEntry = entry;

            handler.post(() -> {
                spinner.setVisibility(View.GONE);
                statusText.setText("✅ Analyse fertig");

                // Build summary text for confirmation activity
                StringBuilder summary = new StringBuilder(spokenText);

                // Open confirmation dialog
                Intent confirmIntent = new Intent(this, VoiceEntryConfirmActivity.class);
                confirmIntent.putExtra(VoiceEntryConfirmActivity.EXTRA_SPOKEN_TEXT, summary.toString());
                confirmIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(confirmIntent);

                // Small delay before finishing so user sees the "Analyse fertig" text
                handler.postDelayed(this::finish, 300);
            });
        }).start();
    }

    private void showRetry(String message) {
        titleText.setText("❌ " + message);
        recognizedText.setVisibility(View.GONE);
        statusText.setVisibility(View.GONE);
        spinner.setVisibility(View.GONE);
        retryButton.setVisibility(View.VISIBLE);
    }

    // ─── UI ─────────────────────────────────────────────────

    private void buildUI() {
        int pad = dp(24);
        int bgColor = Color.parseColor("#09090B");
        int textColor = Color.parseColor("#F4F4F5");
        int mutedColor = Color.parseColor("#71717A");
        int accentColor = Color.parseColor("#059669");

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(bgColor);

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(pad, dp(80), pad, pad);
        container.setGravity(Gravity.CENTER_HORIZONTAL);

        // Title
        titleText = new TextView(this);
        titleText.setText("🎤 Sprich deinen Zeiteintrag");
        titleText.setTextColor(textColor);
        titleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        titleText.setTypeface(null, Typeface.BOLD);
        titleText.setGravity(Gravity.CENTER);
        titleText.setPadding(0, 0, 0, dp(24));
        container.addView(titleText);

        // Recognized text
        recognizedText = new TextView(this);
        recognizedText.setTextColor(accentColor);
        recognizedText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        recognizedText.setGravity(Gravity.CENTER);
        recognizedText.setPadding(dp(16), dp(16), dp(16), dp(16));
        recognizedText.setBackgroundColor(Color.parseColor("#18181B"));
        recognizedText.setVisibility(View.GONE);
        container.addView(recognizedText);

        // Status text
        statusText = new TextView(this);
        statusText.setTextColor(mutedColor);
        statusText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        statusText.setGravity(Gravity.CENTER);
        statusText.setPadding(0, dp(16), 0, dp(16));
        container.addView(statusText);

        // Spinner
        spinner = new ProgressBar(this);
        spinner.setVisibility(View.GONE);
        spinner.setPadding(0, dp(16), 0, dp(16));
        container.addView(spinner);

        // Retry button
        retryButton = new Button(this);
        retryButton.setText("🔄 Nochmal versuchen");
        retryButton.setTextColor(textColor);
        retryButton.setBackgroundColor(accentColor);
        retryButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        retryButton.setPadding(dp(24), dp(14), dp(24), dp(14));
        retryButton.setVisibility(View.GONE);
        retryButton.setOnClickListener(v -> startSpeechRecognition());
        container.addView(retryButton);

        // Cancel button
        cancelButton = new Button(this);
        cancelButton.setText("Abbrechen");
        cancelButton.setTextColor(mutedColor);
        cancelButton.setBackgroundColor(Color.TRANSPARENT);
        cancelButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        cancelButton.setPadding(0, dp(20), 0, 0);
        cancelButton.setOnClickListener(v -> finish());
        container.addView(cancelButton);

        scroll.addView(container);
        setContentView(scroll);
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }
}
