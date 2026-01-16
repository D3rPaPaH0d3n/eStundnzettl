package com.estundnzettl.app;

import android.content.Intent;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required by the interface - intentionally empty
    }
    
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        Log.d("MainActivity", "onActivityResult: requestCode=" + requestCode + ", resultCode=" + resultCode);
        
        // Handle all Google-related request codes
        PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
        if (pluginHandle != null) {
            Plugin plugin = pluginHandle.getInstance();
            if (plugin instanceof ee.forgr.capacitor.social.login.SocialLoginPlugin) {
                ((ee.forgr.capacitor.social.login.SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
            }
        }
    }
}