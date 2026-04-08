package com.estundnzettl.app.widget;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.List;

/**
 * Confirmation activity shown after speech recognition.
 *
 * Shows the recognized text, parsed fields, and lets the user
 * confirm or cancel before saving to the database.
 *
 * Layout is built programmatically (no XML) to keep the widget self-contained.
 */
public class VoiceEntryConfirmActivity extends Activity {

    public static final String EXTRA_SPOKEN_TEXT = "spoken_text";

    private EditText startField, endField, pauseField, projectField, codeField;
    private TextView typeLabel, dateLabel, recognizedTextView, warningLabel;
    private SpeechEntryParser.ParsedEntry parsedEntry;
    private List<SpeechEntryParser.WorkCode> workCodes;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        String spokenText = getIntent().getStringExtra(EXTRA_SPOKEN_TEXT);
        if (spokenText == null || spokenText.isEmpty()) {
            Toast.makeText(this, "Kein Text erkannt", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // Load work codes and parse
        WidgetDatabaseHelper dbHelper = new WidgetDatabaseHelper(this);
        workCodes = dbHelper.loadWorkCodes();
        parsedEntry = SpeechEntryParser.parse(spokenText, workCodes);

        buildUI(spokenText);

        // Make it look like a dialog
        Window window = getWindow();
        if (window != null) {
            window.setLayout(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.WRAP_CONTENT
            );
            window.setGravity(Gravity.CENTER);
            window.setBackgroundDrawableResource(android.R.color.transparent);
        }
    }

    private void buildUI(String spokenText) {
        int pad = dp(16);
        int padSmall = dp(8);
        int bgColor = Color.parseColor("#18181B"); // zinc-900
        int cardColor = Color.parseColor("#27272A"); // zinc-800
        int textColor = Color.parseColor("#F4F4F5"); // zinc-100
        int mutedColor = Color.parseColor("#A1A1AA"); // zinc-400
        int accentColor = Color.parseColor("#059669"); // emerald-600
        int errorColor = Color.parseColor("#EF4444"); // red-500

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.parseColor("#80000000")); // semi-transparent overlay
        scroll.setPadding(dp(20), dp(40), dp(20), dp(40));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundColor(bgColor);
        card.setPadding(pad, pad, pad, pad);

        // ── Title ──
        TextView title = new TextView(this);
        title.setText("Eintrag bestätigen");
        title.setTextColor(textColor);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setPadding(0, 0, 0, padSmall);
        card.addView(title);

        // ── Recognized text ──
        recognizedTextView = new TextView(this);
        recognizedTextView.setText("\"" + spokenText + "\"");
        recognizedTextView.setTextColor(mutedColor);
        recognizedTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        recognizedTextView.setPadding(0, 0, 0, pad);
        recognizedTextView.setBackgroundColor(cardColor);
        recognizedTextView.setPadding(padSmall, padSmall, padSmall, padSmall);
        card.addView(recognizedTextView);

        // ── Type + Date row ──
        LinearLayout typeRow = new LinearLayout(this);
        typeRow.setOrientation(LinearLayout.HORIZONTAL);
        typeRow.setPadding(0, pad, 0, padSmall);

        typeLabel = new TextView(this);
        typeLabel.setText(formatType(parsedEntry.type));
        typeLabel.setTextColor(accentColor);
        typeLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        typeLabel.setTypeface(null, android.graphics.Typeface.BOLD);
        typeRow.addView(typeLabel, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        dateLabel = new TextView(this);
        dateLabel.setText(parsedEntry.date);
        dateLabel.setTextColor(mutedColor);
        dateLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        dateLabel.setGravity(Gravity.END);
        typeRow.addView(dateLabel);

        card.addView(typeRow);

        // ── Time fields ──
        if ("work".equals(parsedEntry.type) || parsedEntry.start != null) {
            LinearLayout timeRow = new LinearLayout(this);
            timeRow.setOrientation(LinearLayout.HORIZONTAL);
            timeRow.setPadding(0, padSmall, 0, 0);

            startField = createEditField("Start", parsedEntry.start != null ? parsedEntry.start : "", cardColor, textColor);
            endField = createEditField("Ende", parsedEntry.end != null ? parsedEntry.end : "", cardColor, textColor);

            LinearLayout startCol = wrapWithLabel("Start", startField, mutedColor);
            LinearLayout endCol = wrapWithLabel("Ende", endField, mutedColor);

            timeRow.addView(startCol, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            timeRow.addView(endCol, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            card.addView(timeRow);

            // Pause field
            LinearLayout pauseRow = new LinearLayout(this);
            pauseRow.setOrientation(LinearLayout.HORIZONTAL);
            pauseRow.setPadding(0, padSmall, 0, 0);

            pauseField = createEditField("Pause (min)", String.valueOf(parsedEntry.pause), cardColor, textColor);
            pauseField.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
            LinearLayout pauseCol = wrapWithLabel("Pause (Minuten)", pauseField, mutedColor);
            pauseRow.addView(pauseCol);
            card.addView(pauseRow);
        }

        // ── Project field ──
        projectField = createEditField("Projekt", parsedEntry.project != null ? parsedEntry.project : "", cardColor, textColor);
        LinearLayout projCol = wrapWithLabel("Projekt", projectField, mutedColor);
        projCol.setPadding(0, padSmall, 0, 0);
        card.addView(projCol);

        // ── Code field ──
        String codeText = "";
        if (parsedEntry.codeLabel != null) {
            codeText = parsedEntry.codeLabel;
        } else if (parsedEntry.codeId > 0) {
            codeText = String.valueOf(parsedEntry.codeId);
        }
        codeField = createEditField("Code", codeText, cardColor, textColor);
        LinearLayout codeCol = wrapWithLabel("Arbeitscode", codeField, mutedColor);
        codeCol.setPadding(0, padSmall, 0, 0);
        card.addView(codeCol);

        // ── Warning label ──
        warningLabel = new TextView(this);
        warningLabel.setTextColor(errorColor);
        warningLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        warningLabel.setPadding(0, padSmall, 0, 0);
        warningLabel.setVisibility(View.GONE);
        card.addView(warningLabel);

        // Show initial warnings
        validateAndShowWarnings();

        // ── Buttons ──
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setPadding(0, pad, 0, 0);
        btnRow.setGravity(Gravity.END);

        Button cancelBtn = new Button(this);
        cancelBtn.setText("Abbrechen");
        cancelBtn.setTextColor(mutedColor);
        cancelBtn.setBackgroundColor(Color.TRANSPARENT);
        cancelBtn.setOnClickListener(v -> finish());
        btnRow.addView(cancelBtn);

        Button saveBtn = new Button(this);
        saveBtn.setText("  Speichern  ");
        saveBtn.setTextColor(Color.WHITE);
        saveBtn.setBackgroundColor(accentColor);
        saveBtn.setPadding(dp(24), dp(12), dp(24), dp(12));
        saveBtn.setOnClickListener(v -> onSave());
        btnRow.addView(saveBtn);

        card.addView(btnRow);

        scroll.addView(card);
        setContentView(scroll);
    }

    private void onSave() {
        // Read edited values back into parsedEntry
        if (startField != null) {
            String start = startField.getText().toString().trim();
            parsedEntry.start = start.isEmpty() ? null : start;
        }
        if (endField != null) {
            String end = endField.getText().toString().trim();
            parsedEntry.end = end.isEmpty() ? null : end;
        }
        if (pauseField != null) {
            try {
                parsedEntry.pause = Integer.parseInt(pauseField.getText().toString().trim());
            } catch (NumberFormatException e) {
                parsedEntry.pause = 0;
            }
        }

        String proj = projectField.getText().toString().trim();
        parsedEntry.project = proj.isEmpty() ? null : proj;

        String codeText = codeField.getText().toString().trim();
        resolveCodeFromText(codeText);

        // Validate
        if (!validate()) return;

        // Save
        WidgetDatabaseHelper dbHelper = new WidgetDatabaseHelper(this);
        boolean success = dbHelper.insertEntry(parsedEntry);

        if (success) {
            String msg = buildConfirmation();
            Toast.makeText(this, "✅ " + msg, Toast.LENGTH_LONG).show();
        } else {
            Toast.makeText(this, "❌ Fehler beim Speichern", Toast.LENGTH_LONG).show();
        }
        finish();
    }

    private boolean validate() {
        // End must be after start for work entries
        if ("work".equals(parsedEntry.type) && parsedEntry.start != null && parsedEntry.end != null) {
            int startMin = timeToMinutes(parsedEntry.start);
            int endMin = timeToMinutes(parsedEntry.end);
            if (endMin <= startMin) {
                warningLabel.setText("⚠️ Endzeit muss nach Startzeit liegen!");
                warningLabel.setVisibility(View.VISIBLE);
                return false;
            }
        }

        // Work entries need start and end
        if ("work".equals(parsedEntry.type)) {
            if (parsedEntry.start == null || parsedEntry.start.isEmpty()) {
                warningLabel.setText("⚠️ Startzeit fehlt");
                warningLabel.setVisibility(View.VISIBLE);
                return false;
            }
            if (parsedEntry.end == null || parsedEntry.end.isEmpty()) {
                warningLabel.setText("⚠️ Endzeit fehlt");
                warningLabel.setVisibility(View.VISIBLE);
                return false;
            }
        }

        return true;
    }

    private void validateAndShowWarnings() {
        if ("work".equals(parsedEntry.type) && parsedEntry.start != null && parsedEntry.end != null) {
            int startMin = timeToMinutes(parsedEntry.start);
            int endMin = timeToMinutes(parsedEntry.end);
            if (endMin <= startMin) {
                warningLabel.setText("⚠️ Endzeit liegt vor Startzeit");
                warningLabel.setVisibility(View.VISIBLE);
                return;
            }
        }
        if ("work".equals(parsedEntry.type) && (parsedEntry.start == null || parsedEntry.end == null)) {
            warningLabel.setText("⚠️ Zeitangabe unvollständig");
            warningLabel.setVisibility(View.VISIBLE);
            return;
        }
        warningLabel.setVisibility(View.GONE);
    }

    private void resolveCodeFromText(String codeText) {
        if (codeText.isEmpty()) {
            parsedEntry.codeId = -1;
            parsedEntry.codeLabel = null;
            return;
        }

        // Try numeric
        try {
            int numId = Integer.parseInt(codeText);
            if (workCodes != null) {
                for (SpeechEntryParser.WorkCode c : workCodes) {
                    if (c.id == numId) {
                        parsedEntry.codeId = c.id;
                        parsedEntry.codeLabel = c.label;
                        return;
                    }
                }
            }
            parsedEntry.codeId = numId;
            parsedEntry.codeLabel = codeText;
            return;
        } catch (NumberFormatException ignored) {}

        // Fuzzy search
        String search = codeText.toLowerCase();
        if (workCodes != null) {
            for (SpeechEntryParser.WorkCode c : workCodes) {
                if (c.label.toLowerCase().contains(search)) {
                    parsedEntry.codeId = c.id;
                    parsedEntry.codeLabel = c.label;
                    return;
                }
            }
        }

        parsedEntry.codeId = -1;
        parsedEntry.codeLabel = codeText;
    }

    private int timeToMinutes(String hhmm) {
        if (hhmm == null || !hhmm.contains(":")) return -1;
        try {
            String[] p = hhmm.split(":");
            return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
        } catch (Exception e) {
            return -1;
        }
    }

    private String formatType(String type) {
        switch (type) {
            case "vacation": return "🏖  Urlaub";
            case "sick": return "🤒  Krank";
            case "time_comp": return "⚖  Zeitausgleich";
            case "public_holiday": return "🎄  Feiertag";
            default: return "🔨  Arbeit";
        }
    }

    private String buildConfirmation() {
        StringBuilder sb = new StringBuilder();
        sb.append(formatType(parsedEntry.type).replaceAll("\\s+", " "));
        if (parsedEntry.start != null && parsedEntry.end != null) {
            sb.append(" ").append(parsedEntry.start).append("–").append(parsedEntry.end);
        }
        if (parsedEntry.pause > 0) sb.append(" (").append(parsedEntry.pause).append("min)");
        if (parsedEntry.project != null) sb.append(" · ").append(parsedEntry.project);
        return sb.toString();
    }

    // ── UI helpers ──

    private int dp(int value) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    private EditText createEditField(String hint, String value, int bgColor, int textColor) {
        EditText et = new EditText(this);
        et.setHint(hint);
        et.setText(value);
        et.setTextColor(textColor);
        et.setHintTextColor(Color.parseColor("#52525B")); // zinc-600
        et.setBackgroundColor(bgColor);
        et.setPadding(dp(12), dp(10), dp(12), dp(10));
        et.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        et.setSingleLine(true);
        return et;
    }

    private LinearLayout wrapWithLabel(String label, EditText field, int labelColor) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(0, 0, dp(8), 0);

        TextView lbl = new TextView(this);
        lbl.setText(label);
        lbl.setTextColor(labelColor);
        lbl.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        lbl.setPadding(0, 0, 0, dp(4));
        col.addView(lbl);
        col.addView(field);
        return col;
    }
}
