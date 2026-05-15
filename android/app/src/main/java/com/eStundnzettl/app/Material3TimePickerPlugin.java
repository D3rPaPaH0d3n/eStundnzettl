package com.estundnzettl.app;

import android.app.Activity;
import android.content.Intent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Material3TimePicker")
public class Material3TimePickerPlugin extends Plugin {

    @PluginMethod
    public void pickTime(PluginCall call) {
        String value = call.getString("value", "06:00");
        String title = call.getString("title", "Uhrzeit auswählen");
        String confirmText = call.getString("confirmText", "OK");
        String dismissText = call.getString("dismissText", "Abbrechen");
        String accent = call.getString("accent", Material3TimePickerActivity.ACCENT_GREEN);
        String themeMode = call.getString("themeMode", Material3TimePickerActivity.THEME_SYSTEM);
        Boolean is24Hour = call.getBoolean("is24Hour", true);

        int hour = 6;
        int minute = 0;
        if (value != null && value.matches("^\\d{1,2}:\\d{2}$")) {
            String[] parts = value.split(":");
            try {
                hour = Math.max(0, Math.min(23, Integer.parseInt(parts[0])));
                minute = Math.max(0, Math.min(59, Integer.parseInt(parts[1])));
            } catch (NumberFormatException ignored) {
                hour = 6;
                minute = 0;
            }
        }

        Intent intent = new Intent(getContext(), Material3TimePickerActivity.class);
        intent.putExtra(Material3TimePickerActivity.EXTRA_INITIAL_HOUR, hour);
        intent.putExtra(Material3TimePickerActivity.EXTRA_INITIAL_MINUTE, minute);
        intent.putExtra(Material3TimePickerActivity.EXTRA_TITLE, title);
        intent.putExtra(Material3TimePickerActivity.EXTRA_CONFIRM_TEXT, confirmText);
        intent.putExtra(Material3TimePickerActivity.EXTRA_DISMISS_TEXT, dismissText);
        intent.putExtra(Material3TimePickerActivity.EXTRA_ACCENT, accent);
        intent.putExtra(Material3TimePickerActivity.EXTRA_THEME_MODE, themeMode);
        intent.putExtra(Material3TimePickerActivity.EXTRA_IS_24_HOUR, is24Hour != null ? is24Hour : true);

        startActivityForResult(call, intent, "handleTimePickerResult");
    }

    @ActivityCallback
    private void handleTimePickerResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject response = new JSObject();
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        int hour = data.getIntExtra(Material3TimePickerActivity.EXTRA_RESULT_HOUR, 0);
        int minute = data.getIntExtra(Material3TimePickerActivity.EXTRA_RESULT_MINUTE, 0);
        String value = String.format(java.util.Locale.US, "%02d:%02d", hour, minute);

        response.put("cancelled", false);
        response.put("hour", hour);
        response.put("minute", minute);
        response.put("value", value);
        call.resolve(response);
    }
}
