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
        result.put("surfaceLight", readSystemColor(resources, "system_neutral1_10", "#F8FAFC"));
        result.put("surfaceContainerLight", readSystemColor(resources, "system_neutral1_50", "#FFFFFF"));
        result.put("surfaceDark", readSystemColor(resources, "system_neutral1_900", "#09090B"));
        result.put("surfaceContainerDark", readSystemColor(resources, "system_neutral1_800", "#27272A"));
        result.put("outlineLight", readSystemColor(resources, "system_neutral2_200", "#E4E4E7"));
        result.put("outlineDark", readSystemColor(resources, "system_neutral2_700", "#3F3F46"));
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
