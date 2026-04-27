package com.estundnzettl.app;

import android.content.Context;

import com.estundnzettl.app.widget.GeminiParser;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

/**
 * Custom Capacitor plugin that reports whether Google Play Services
 * (and the Gemini Nano on-device model) are present on the device.
 *
 * The web layer uses this to grey out / hide Google-only features on
 * devices like GrapheneOS, /e/OS or Huawei where those services are
 * absent. The plugin itself never triggers any Google sign-in flow,
 * so it's safe to call on every app start.
 */
@CapacitorPlugin(name = "PlayServicesAvailability")
public class PlayServicesAvailabilityPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        Context context = getContext();
        int status = GoogleApiAvailability
            .getInstance()
            .isGooglePlayServicesAvailable(context);

        boolean googleServicesAvailable = status == ConnectionResult.SUCCESS;
        // GeminiParser.isSupported() is a class-presence check (no I/O),
        // safe to call from the bridge thread.
        boolean geminiNanoSupported = GeminiParser.isSupported();

        JSObject result = new JSObject();
        result.put("googleServicesAvailable", googleServicesAvailable);
        result.put("googleServicesStatus", status);
        result.put("geminiNanoSupported", geminiNanoSupported);
        call.resolve(result);
    }
}
