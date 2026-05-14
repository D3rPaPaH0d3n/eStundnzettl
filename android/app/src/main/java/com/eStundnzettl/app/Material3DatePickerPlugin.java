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

@CapacitorPlugin(name = "Material3DatePicker")
public class Material3DatePickerPlugin extends Plugin {

    @PluginMethod
    public void pickDate(PluginCall call) {
        String value = call.getString("value", "");
        String title = call.getString("title", "Datum auswählen");
        String confirmText = call.getString("confirmText", "OK");
        String dismissText = call.getString("dismissText", "Abbrechen");

        Intent intent = new Intent(getContext(), Material3DatePickerActivity.class);
        intent.putExtra(Material3DatePickerActivity.EXTRA_INITIAL_DATE, value);
        intent.putExtra(Material3DatePickerActivity.EXTRA_TITLE, title);
        intent.putExtra(Material3DatePickerActivity.EXTRA_CONFIRM_TEXT, confirmText);
        intent.putExtra(Material3DatePickerActivity.EXTRA_DISMISS_TEXT, dismissText);

        startActivityForResult(call, intent, "handleDatePickerResult");
    }

    @ActivityCallback
    private void handleDatePickerResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject response = new JSObject();
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Intent data = result.getData();
        String value = data.getStringExtra(Material3DatePickerActivity.EXTRA_RESULT_DATE);
        int year = data.getIntExtra(Material3DatePickerActivity.EXTRA_RESULT_YEAR, 0);
        int month = data.getIntExtra(Material3DatePickerActivity.EXTRA_RESULT_MONTH, 0);
        int day = data.getIntExtra(Material3DatePickerActivity.EXTRA_RESULT_DAY, 0);

        response.put("cancelled", false);
        response.put("value", value);
        response.put("year", year);
        response.put("month", month);
        response.put("day", day);
        call.resolve(response);
    }
}
