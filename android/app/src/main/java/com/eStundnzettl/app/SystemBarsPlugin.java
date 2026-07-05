package com.estundnzettl.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    @PluginMethod
    public void setTheme(PluginCall call) {
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        boolean statusBarDark = Boolean.TRUE.equals(call.getBoolean("statusBarDark", true));
        boolean navigationBarDark = Boolean.TRUE.equals(call.getBoolean("navigationBarDark", dark));

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        activity.runOnUiThread(() -> {
            Window window = activity.getWindow();
            if (window == null) {
                call.reject("Window not available");
                return;
            }
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                // Deprecated and a no-op on Android 15+, where edge-to-edge is
                // enforced and bars are transparent by default.
                window.setStatusBarColor(Color.TRANSPARENT);
                window.setNavigationBarColor(Color.TRANSPARENT);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }

            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(!statusBarDark);
            controller.setAppearanceLightNavigationBars(!navigationBarDark);

            JSObject result = new JSObject();
            result.put("dark", dark);
            result.put("statusBarDark", statusBarDark);
            result.put("navigationBarDark", navigationBarDark);
            call.resolve(result);
        });
    }
}
