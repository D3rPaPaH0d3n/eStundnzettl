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
 * Displays a compact bar with the app logo and a microphone button.
 * Tapping the mic button launches VoiceEntryActivity for speech recognition.
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

        // Mic button → launches Guided Voice Entry (step by step)
        Intent voiceIntent = new Intent(context, GuidedVoiceEntryActivity.class);
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent voicePending = PendingIntent.getActivity(
                context, appWidgetId, voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_mic_button, voicePending);

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
