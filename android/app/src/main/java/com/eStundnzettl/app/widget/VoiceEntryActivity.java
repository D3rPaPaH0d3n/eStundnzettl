package com.estundnzettl.app.widget;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.util.Log;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Transparent activity that launches speech recognition and creates a time entry.
 *
 * Flow:
 *   1. Widget button click → starts this activity
 *   2. Activity requests RECORD_AUDIO permission if needed
 *   3. Launches Android SpeechRecognizer (system dialog)
 *   4. Receives recognized text
 *   5. Parses text via SpeechEntryParser
 *   6. Writes entry to SQLite via WidgetDatabaseHelper
 *   7. Shows toast confirmation and finishes
 */
public class VoiceEntryActivity extends Activity {

    private static final String TAG = "VoiceEntryActivity";
    private static final int REQUEST_SPEECH = 100;
    private static final int REQUEST_PERMISSION = 101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // No layout — this is a transparent activity

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_PERMISSION);
        } else {
            startSpeechRecognition();
        }
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
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.GERMAN.toLanguageTag());
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Zeiteintrag sprechen…\nz.B. \"6 Uhr bis 16 Uhr 30 mit 30 Minuten Pause\"");
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

        try {
            startActivityForResult(intent, REQUEST_SPEECH);
        } catch (Exception e) {
            Log.e(TAG, "Speech recognition not available", e);
            Toast.makeText(this, getString(getResources().getIdentifier(
                    "widget_speech_not_available", "string", getPackageName())),
                    Toast.LENGTH_LONG).show();
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
                    String spokenText = results.get(0);
                    Log.i(TAG, "Recognized: " + spokenText);
                    processVoiceInput(spokenText);
                } else {
                    showToast("Keine Sprache erkannt");
                }
            } else {
                // User cancelled or error
                Log.d(TAG, "Speech cancelled or failed, resultCode=" + resultCode);
            }
            finish();
        }
    }

    private void processVoiceInput(String text) {
        WidgetDatabaseHelper dbHelper = new WidgetDatabaseHelper(this);

        if (!dbHelper.isDatabaseReady()) {
            showToast("Datenbank nicht verfügbar — bitte App zuerst öffnen");
            return;
        }

        // Open confirmation activity with the recognized text
        Intent confirmIntent = new Intent(this, VoiceEntryConfirmActivity.class);
        confirmIntent.putExtra(VoiceEntryConfirmActivity.EXTRA_SPOKEN_TEXT, text);
        confirmIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(confirmIntent);
    }

    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
