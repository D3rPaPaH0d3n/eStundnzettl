package com.estundnzettl.app;

import android.content.res.Resources;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "DynamicColors")
public class DynamicColorsPlugin extends Plugin {

    @PluginMethod
    public void getPalette(PluginCall call) {
        JSObject result = new JSObject();
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
        result.put("supported", supported);

        if (!supported) {
            call.resolve(result);
            return;
        }

        Resources resources = getActivity().getResources();
        result.put("accentLight", readSystemColor(resources, "system_accent1_600", "#059669"));
        result.put("accentDark", readSystemColor(resources, "system_accent1_300", "#34D399"));
        result.put("accentContainerLight", readSystemColor(resources, "system_accent1_100", "#D1FAE5"));
        result.put("accentContainerDark", readSystemColor(resources, "system_accent1_700", "#065F46"));
        call.resolve(result);
    }

    private String readSystemColor(Resources resources, String name, String fallback) {
        int id = resources.getIdentifier(name, "color", "android");
        if (id == 0) return fallback;

        int color = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? resources.getColor(id, getActivity().getTheme())
            : resources.getColor(id);
        return String.format(Locale.US, "#%06X", 0xFFFFFF & color);
    }
}
