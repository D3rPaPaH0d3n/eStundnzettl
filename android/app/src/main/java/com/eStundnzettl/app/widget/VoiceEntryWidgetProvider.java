package com.estundnzettl.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.estundnzettl.app.R;

/**
 * AppWidgetProvider for the voice entry widget.
 *
 * Shows two buttons:
 *   🎤 AI (green)  → GeminiVoiceEntryActivity (freitext with Gemini Nano)
 *   📋 Guided (gray) → GuidedVoiceEntryActivity (step-by-step)
 *
 * On devices without Gemini Nano, the 🎤 button falls back to the
 * local SpeechEntryParser automatically.
 */
public class VoiceEntryWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_voice_entry);

        // 🎤 AI button → Gemini freitext (with local parser fallback)
        Intent aiIntent = new Intent(context, GeminiVoiceEntryActivity.class);
        aiIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent aiPending = PendingIntent.getActivity(
                context, appWidgetId * 10 + 1, aiIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_mic_button, aiPending);

        // 📋 Guided button → step-by-step wizard
        Intent guidedIntent = new Intent(context, GuidedVoiceEntryActivity.class);
        guidedIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent guidedPending = PendingIntent.getActivity(
                context, appWidgetId * 10 + 2, guidedIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_guided_button, guidedPending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
        // First widget added to homescreen
    }

    @Override
    public void onDisabled(Context context) {
        // Last widget removed from homescreen
    }
}
