package com.estundnzettl.app.widget;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import com.estundnzettl.app.MainActivity;
import com.estundnzettl.app.R;

import java.util.ArrayList;

public class VoiceEntryBottomSheetActivity extends AppCompatActivity {

    private static final int REQUEST_RECORD_AUDIO_PERMISSION = 200;

    private TextView statusText;
    private TextView transcribedText;
    private LinearLayout actionButtons;
    private Button btnCancel;
    private Button btnSave;

    private SpeechRecognizer speechRecognizer;
    private Intent speechRecognizerIntent;
    private String parsedJsonResult = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_voice_bottom_sheet);

        // Make activity behave like a bottom sheet (translucent background, stick to bottom)
        getWindow().setLayout(android.view.ViewGroup.LayoutParams.MATCH_PARENT, android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        getWindow().setGravity(android.view.Gravity.BOTTOM);

        statusText = findViewById(R.id.status_text);
        transcribedText = findViewById(R.id.transcribed_text);
        actionButtons = findViewById(R.id.action_buttons);
        btnCancel = findViewById(R.id.btn_cancel);
        btnSave = findViewById(R.id.btn_save);

        btnCancel.setOnClickListener(v -> finish());
        btnSave.setOnClickListener(v -> saveAndLaunchMainApp());

        checkPermissionsAndStart();
    }

    private void checkPermissionsAndStart() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO_PERMISSION);
        } else {
            startListening();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_RECORD_AUDIO_PERMISSION && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startListening();
        } else {
            Toast.makeText(this, "Microphone permission required", Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    private void startListening() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        speechRecognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        speechRecognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        speechRecognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "de-DE");

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { statusText.setText("Ich höre zu..."); }
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() { statusText.setText("Verarbeite..."); }
            
            @Override 
            public void onError(int error) {
                statusText.setText("Fehler bei der Aufnahme.");
                actionButtons.setVisibility(View.VISIBLE);
            }

            @Override 
            public void onResults(Bundle results) {
                ArrayList<String> data = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (data != null && !data.isEmpty()) {
                    String spokenText = data.get(0);
                    transcribedText.setText(spokenText);
                    parseWithGemini(spokenText);
                }
            }

            @Override public void onPartialResults(Bundle partialResults) {}
            @Override public void onEvent(int eventType, Bundle params) {}
        });

        speechRecognizer.startListening(speechRecognizerIntent);
    }

    private void parseWithGemini(String text) {
        statusText.setText("KI analysiert...");
        GeminiParser.parseVoiceInput(text, new GeminiParser.Callback() {
            @Override
            public void onSuccess(String jsonResult) {
                runOnUiThread(() -> {
                    statusText.setText("Erkanntes Ergebnis:");
                    transcribedText.setText(jsonResult);
                    parsedJsonResult = jsonResult;
                    actionButtons.setVisibility(View.VISIBLE);
                });
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    statusText.setText("KI Fehler");
                    transcribedText.setText(error);
                    actionButtons.setVisibility(View.VISIBLE);
                });
            }
        });
    }

    private void saveAndLaunchMainApp() {
        if (parsedJsonResult != null) {
            Intent intent = new Intent(this, MainActivity.class);
            intent.putExtra("VOICE_ENTRY_JSON", parsedJsonResult);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
        }
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
        }
    }
}
