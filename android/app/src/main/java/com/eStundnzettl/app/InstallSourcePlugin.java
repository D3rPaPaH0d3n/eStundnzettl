package com.estundnzettl.app;

import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Reports which installer placed the APK on the device. The web layer
 * uses this to skip the GitHub-update check on Play Store installs
 * (Play already handles updates) and to enable it on sideloaded
 * installs (where users would otherwise miss new versions).
 *
 * Trusted source on API 30+ is `InstallSourceInfo.getInitiatingPackageName()`,
 * which the OS protects against spoofing. Older devices fall back to
 * the legacy `getInstallerPackageName()`.
 *
 * Common values:
 *   - "com.android.vending"          → Google Play Store
 *   - "com.amazon.venezia"           → Amazon Appstore
 *   - "org.fdroid.fdroid"            → F-Droid client
 *   - "de.izzysoft.fdroid.client"    → IzzyOnDroid client
 *   - null / a browser package       → Sideloaded (Browser-Download, ADB, …)
 */
@CapacitorPlugin(name = "InstallSource")
public class InstallSourcePlugin extends Plugin {

    @PluginMethod
    public void get(PluginCall call) {
        String installer = null;
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                InstallSourceInfo info = pm.getInstallSourceInfo(pkg);
                // Initiator is the package that actually started the
                // install, not just the installer (which can be the
                // session installer itself for newer Play installs).
                installer = info.getInitiatingPackageName();
                if (installer == null) {
                    installer = info.getInstallingPackageName();
                }
            } else {
                @SuppressWarnings("deprecation")
                String legacy = pm.getInstallerPackageName(pkg);
                installer = legacy;
            }
        } catch (Exception e) {
            // Treat unknown as sideload — better to occasionally show
            // an unneeded check than to miss real ones.
            installer = null;
        }

        JSObject result = new JSObject();
        result.put("installer", installer);
        call.resolve(result);
    }
}
